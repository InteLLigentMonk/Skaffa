-- ----------------------------------------------------------------------------
-- Receptets detaljsida: kopiera från receptbanken, duplicera, favorit och
-- inplanering i veckoplanen.
--
-- Alla fyra funktionerna är security INVOKER, precis som create_recipe: RLS
-- på recipes, recipe_ingredients, recipe_steps och planned_meals gäller inne i
-- dem. Det de tillför är atomicitet — klienten har ingen transaktion.
-- ----------------------------------------------------------------------------


-- ----------------------------------------------------------------------------
-- Ett bankrecept kan bara planeras som ett hemrecept (planned_meals.recipe_id
-- pekar på recipes). Kopian minns sitt ursprung så att samma bankrecept inte
-- blir tio kopior när det planeras tio gånger. on delete set null: tas
-- bankreceptet bort lever hemmets kopia vidare som ett vanligt recept.
-- ----------------------------------------------------------------------------

alter table recipes
  add column copied_from uuid references public_recipes (id) on delete set null;

create unique index recipes_home_copied_from_uniq
  on recipes (home_id, copied_from)
  where copied_from is not null;


-- ----------------------------------------------------------------------------
-- Returnerar hemmets kopia av bankreceptet; skapar den om den saknas.
--
-- Bilden följer inte med: bankens bilder ligger i bucketen public_recipes,
-- hemmets i den privata recipes, och Storage-objekt kan inte kopieras från
-- SQL. image_path lämnas null tills klienten kan kopiera filen.
--
-- Två medlemmar som planerar samma bankrecept samtidigt: den ena inserten
-- smäller i det unika indexet. on conflict do nothing + ny select gör att båda
-- får tillbaka samma kopia i stället för ett fel.
-- ----------------------------------------------------------------------------

create function copy_public_recipe(_public_id uuid)
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

  select id into _recipe
  from recipes
  where home_id = _home and copied_from = _public_id;

  if _recipe is not null then
    return _recipe;
  end if;

  insert into recipes
    (home_id, name, servings, description, prep_minutes, copied_from, created_by)
  select _home, p.name, p.servings, p.description, p.prep_minutes, p.id, auth.uid()
  from public_recipes p
  where p.id = _public_id
  on conflict (home_id, copied_from) where copied_from is not null do nothing
  returning id into _recipe;

  if _recipe is null then
    -- Antingen finns bankreceptet inte, eller så hann någon annan först.
    select id into _recipe
    from recipes
    where home_id = _home and copied_from = _public_id;

    if _recipe is null then
      raise exception 'Receptet finns inte längre';
    end if;

    return _recipe;
  end if;

  -- amount_base härleds av triggern ur display_amount + display_unit, precis
  -- som när receptet skapades.
  insert into recipe_ingredients
    (recipe_id, ingredient_id, display_amount, display_unit)
  select _recipe, pri.ingredient_id, pri.display_amount, pri.display_unit
  from public_recipe_ingredients pri
  where pri.public_recipe_id = _public_id;

  insert into recipe_steps (recipe_id, position, content)
  select _recipe, prs.position, prs.content
  from public_recipe_steps prs
  where prs.public_recipe_id = _public_id;

  return _recipe;
end;
$$;


-- ----------------------------------------------------------------------------
-- Duplicerar ett av hemmets recept. Kopian är ett eget recept: favoritmärket
-- och kopplingen till banken följer inte med (det unika indexet på
-- copied_from hade dessutom stoppat det). Bilden delas inte heller — tas
-- originalet bort städas filen bort, och kopian hade pekat på ingenting.
-- ----------------------------------------------------------------------------

create function duplicate_recipe(_recipe_id uuid)
returns uuid language plpgsql
set search_path = public as $$
declare
  _recipe uuid;
begin
  -- RLS (recipes_all) gör ett annat hems recept osynligt, så det ser ut
  -- exakt som ett recept som inte finns.
  insert into recipes
    (home_id, name, servings, description, prep_minutes, diet_override, tags, created_by)
  select r.home_id,
         r.name || ' (kopia)',
         r.servings,
         r.description,
         r.prep_minutes,
         r.diet_override,
         array_remove(r.tags, 'favorit'),
         auth.uid()
  from recipes r
  where r.id = _recipe_id
  returning id into _recipe;

  if _recipe is null then
    raise exception 'Receptet finns inte';
  end if;

  insert into recipe_ingredients
    (recipe_id, ingredient_id, display_amount, display_unit)
  select _recipe, ri.ingredient_id, ri.display_amount, ri.display_unit
  from recipe_ingredients ri
  where ri.recipe_id = _recipe_id;

  insert into recipe_steps (recipe_id, position, content)
  select _recipe, rs.position, rs.content
  from recipe_steps rs
  where rs.recipe_id = _recipe_id;

  return _recipe;
end;
$$;


-- ----------------------------------------------------------------------------
-- Favorit är taggen 'favorit' i recipes.tags. Ändringen görs här i stället för
-- att klienten skriver hela arrayen: två medlemmar som samtidigt sätter
-- favorit och en annan tagg hade annars skrivit över varandras ändring.
-- ----------------------------------------------------------------------------

create function set_recipe_favorite(_recipe_id uuid, _favorite boolean)
returns void language plpgsql
set search_path = public as $$
begin
  update recipes
  set tags = case
    when _favorite then array_append(array_remove(tags, 'favorit'), 'favorit')
    else array_remove(tags, 'favorit')
  end
  where id = _recipe_id;

  if not found then
    raise exception 'Receptet finns inte';
  end if;
end;
$$;


-- ----------------------------------------------------------------------------
-- Lägger ett recept på en dag + måltid.
--
-- _replace = true betyder "Ersätt": övriga recept i samma dag + måltid tas
-- bort. Borttagningen och inserten sker i samma transaktion, så ett fel på
-- inserten lämnar aldrig måltiden tom.
--
-- Samma recept redan inplanerat i måltiden: unikheten på (hem, datum, slot,
-- recept) gör det till en uppdatering av portionerna i stället för ett fel.
--
-- Intervallet är innevarande vecka till och med sex veckor framåt, räknat i
-- svensk tid. Databasen kör i UTC; utan omräkningen hade en planering strax
-- efter midnatt natten mot måndag nekats för att servern fortfarande tror att
-- det är söndag.
-- ----------------------------------------------------------------------------

create function plan_meal(
  _recipe_id uuid,
  _date      date,
  _slot      meal_slot,
  _servings  int,
  _replace   boolean default false
)
returns uuid language plpgsql
set search_path = public as $$
declare
  _home  uuid;
  _today date;
  _meal  uuid;
begin
  _home := current_home_id();

  if _home is null then
    raise exception 'Du är inte med i något hem';
  end if;

  _today := (now() at time zone 'Europe/Stockholm')::date;

  if _date < _today then
    raise exception 'Det går inte att planera bakåt i tiden';
  end if;

  if _date > week_monday(_today) + 6 * 7 + 6 then
    raise exception 'Du kan planera upp till sex veckor framåt';
  end if;

  if not exists (select 1 from recipes where id = _recipe_id) then
    raise exception 'Receptet finns inte';
  end if;

  if _replace then
    delete from planned_meals
    where home_id = _home
      and meal_date = _date
      and slot = _slot
      and recipe_id <> _recipe_id;
  end if;

  insert into planned_meals (home_id, meal_date, slot, recipe_id, servings)
  values (_home, _date, _slot, _recipe_id, _servings)
  on conflict (home_id, meal_date, slot, recipe_id)
  do update set servings = excluded.servings
  returning id into _meal;

  return _meal;
end;
$$;
