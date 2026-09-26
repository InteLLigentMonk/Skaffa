-- ----------------------------------------------------------------------------
-- Ett recept är två inserts: receptet och dess rader. Supabase-klienten har
-- ingen transaktion, så gjordes det därifrån skulle ett fel på raderna lämna
-- ett tomt recept kvar. Det är inte hypotetiskt: trg_recipe_ingredients_-
-- amount_base kastar exception när en display_unit inte går att konvertera till
-- ingrediensens måttslag. Här rullas allt tillbaka i stället.
--
-- Funktionen är security INVOKER (alltså utan security definer, till skillnad
-- från create_home som måste vara definer för att skapa medlemskapet RLS självt
-- läser). Det betyder att recipes_all och recipe_ing_all gäller precis som
-- vanligt inne i funktionen — atomiciteten kostar inte bort säkerhetslagret.
--
-- amount_base skickas aldrig in. Den härleds av triggern ur display_amount +
-- display_unit; se 20260908195042_derive_amount_base.sql.
--
-- _ingredients är en jsonb-array:
--   [{"ingredient_id": "…", "display_amount": 250, "display_unit": "gram"}]
-- ----------------------------------------------------------------------------

create function create_recipe(_name text, _servings int, _ingredients jsonb)
returns uuid language plpgsql
set search_path = public as $$
declare
  _home   uuid;
  _recipe uuid;
begin
  _home := current_home_id();

  if _home is null then
    raise exception 'Du är inte med i något hem';
  end if;

  if length(trim(coalesce(_name, ''))) = 0 then
    raise exception 'Receptet måste ha ett namn';
  end if;

  if _ingredients is null
     or jsonb_typeof(_ingredients) <> 'array'
     or jsonb_array_length(_ingredients) = 0 then
    raise exception 'Receptet måste ha minst en ingrediens';
  end if;

  -- FK-referenser bryr sig inte om RLS, så ingredient_id kunde peka på ett
  -- annat hems privata ingrediens. Select-policyn ingredients_select släpper
  -- bara igenom frön (home_id null) och det egna hemmets rader — därför räcker
  -- `i.id is null`: en otillåten ingrediens är osynlig här och ser exakt ut som
  -- en som inte finns.
  if exists (
    select 1
    from jsonb_to_recordset(_ingredients) as x(ingredient_id uuid)
    left join ingredients i on i.id = x.ingredient_id
    where i.id is null
  ) then
    raise exception 'Okänd ingrediens';
  end if;

  -- servings vaktas av check (servings > 0) på kolumnen, namnet av
  -- check (length(trim(name)) > 0). Ingen dubblering här.
  insert into recipes (home_id, name, servings, created_by)
  values (_home, trim(_name), _servings, auth.uid())
  returning id into _recipe;

  -- display_unit typas till unit_code redan i recordset-listan, så en påhittad
  -- enhet från klienten smäller i castet innan den når tabellen.
  insert into recipe_ingredients
    (recipe_id, ingredient_id, display_amount, display_unit)
  select _recipe, x.ingredient_id, x.display_amount, x.display_unit
  from jsonb_to_recordset(_ingredients)
    as x(ingredient_id uuid, display_amount numeric, display_unit unit_code);

  return _recipe;
end;
$$;
