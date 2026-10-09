-- ----------------------------------------------------------------------------
-- save_recipe: hela receptet i en transaktion — receptet, ingredienserna,
-- stegen och bildsökvägen. Ersätter create_recipe (som tas bort i en senare
-- migration, när klienten slutat anropa den).
--
-- Varför en RPC för allt och inte en separat replace_recipe_steps: klienten har
-- ingen transaktion. Två anrop hade kunnat lämna ett sparat recept utan steg
-- när det andra anropet fallerar.
--
-- security INVOKER, precis som create_recipe: recipes_all, recipe_ing_all och
-- recipe_steps_all gäller inne i funktionen.
--
-- Id:t genereras av klienten när formuläret öppnas. Två skäl:
--   * Bildens sökväg ({home_id}/{recipe_id}/{uuid}.jpg) måste vara känd innan
--     receptet finns, eftersom bilden laddas upp medan formuläret är öppet.
--   * Det gör sparningen idempotent. Ett omförsök eller ett dubbeltryck blir en
--     uppdatering av samma recept, inte två recept.
--
-- Upsert med on conflict i stället för "update, annars insert": två samtidiga
-- anrop med samma id hade annars båda kunnat missa i update och smälla i
-- inserten. Ett id som tillhör ett annat hem är osynligt via RLS, och
-- konfliktgrenen nekas då av recipes_all — klienten får ett fel, inget läcker.
--
-- Ingredienser och steg ersätts helt (delete + insert). Inget pekar på
-- enskilda rader i recipe_ingredients eller recipe_steps, och det slipper
-- unique (recipe_id, position) som krockar när steg byter plats med updates.
--
-- _ingredients är samma jsonb-array som till create_recipe:
--   [{"ingredient_id": "…", "display_amount": 250, "display_unit": "gram"}]
-- _steps är en array av strängar i visningsordning:
--   ["Koka pastan.", "Stek löken."]
-- ----------------------------------------------------------------------------

create function save_recipe(
  _id           uuid,
  _name         text,
  _servings     int,
  _prep_minutes int,
  _image_path   text,
  _ingredients  jsonb,
  _steps        jsonb
)
returns uuid language plpgsql
set search_path = public as $$
declare
  _home uuid;
begin
  _home := current_home_id();

  if _home is null then
    raise exception 'Du är inte med i något hem';
  end if;

  if _id is null then
    raise exception 'Receptet saknar id';
  end if;

  if length(trim(coalesce(_name, ''))) = 0 then
    raise exception 'Receptet måste ha ett namn';
  end if;

  if _ingredients is null
     or jsonb_typeof(_ingredients) <> 'array'
     or jsonb_array_length(_ingredients) = 0 then
    raise exception 'Receptet måste ha minst en ingrediens';
  end if;

  if _steps is not null and jsonb_typeof(_steps) <> 'array' then
    raise exception 'Stegen har fel format';
  end if;

  -- Bilden måste ligga i det här receptets mapp. Storage-policyn räcker inte:
  -- den styr vem som får ladda upp, inte vad image_path får peka på. Utan
  -- kontrollen kunde en sökväg till en annan fil sparas här, och städtriggern
  -- (security definer) hade köat den filen för radering vid nästa bildbyte.
  if _image_path is not null
     and not starts_with(_image_path, _home::text || '/' || _id::text || '/') then
    raise exception 'Ogiltig bildsökväg';
  end if;

  -- Se create_recipe: en ingrediens i ett annat hem är osynlig och ser ut
  -- precis som en som inte finns.
  if exists (
    select 1
    from jsonb_to_recordset(_ingredients) as x(ingredient_id uuid)
    left join ingredients i on i.id = x.ingredient_id
    where i.id is null
  ) then
    raise exception 'Okänd ingrediens';
  end if;

  -- home_id och created_by rörs inte vid en uppdatering. Byts image_path
  -- köar trg_recipes_image_cleanup den gamla filen.
  insert into recipes
    (id, home_id, name, servings, prep_minutes, image_path, created_by)
  values
    (_id, _home, trim(_name), _servings, _prep_minutes, _image_path, auth.uid())
  on conflict (id) do update
    set name         = excluded.name,
        servings     = excluded.servings,
        prep_minutes = excluded.prep_minutes,
        image_path   = excluded.image_path;

  delete from recipe_ingredients where recipe_id = _id;

  insert into recipe_ingredients
    (recipe_id, ingredient_id, display_amount, display_unit)
  select _id, x.ingredient_id, x.display_amount, x.display_unit
  from jsonb_to_recordset(_ingredients)
    as x(ingredient_id uuid, display_amount numeric, display_unit unit_code);

  delete from recipe_steps where recipe_id = _id;

  -- Tomma steg filtreras här också, inte bara i klienten. with ordinality
  -- numrerar före filtret, så positionen räknas om med row_number() efteråt
  -- för att bli 1..n utan glapp.
  insert into recipe_steps (recipe_id, position, content)
  select _id, row_number() over (order by s.ord), trim(s.content)
  from jsonb_array_elements_text(coalesce(_steps, '[]'::jsonb))
    with ordinality as s(content, ord)
  where length(trim(s.content)) > 0;

  return _id;
end;
$$;


-- ----------------------------------------------------------------------------
-- Samma regel på tabellen, för skrivningar som inte går via save_recipe.
-- recipes_all låter en medlem uppdatera image_path direkt via PostgREST, och
-- då gäller samma risk som ovan: en sökväg till ett annat hems fil, och nästa
-- bildbyte köar den för radering.
--
-- Mappen är {home_id}/ — receptets eget id kontrolleras bara i save_recipe,
-- så att eventuella äldre bilder direkt under hemmets mapp fortfarande är
-- giltiga. Går det inte att lägga till constraint:en finns det redan rader
-- som bryter mot den, och hela migrationen rullas tillbaka.
-- ----------------------------------------------------------------------------

alter table recipes add constraint recipes_image_path_in_home
  check (image_path is null or starts_with(image_path, home_id::text || '/'));
