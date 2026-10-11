-- ============================================================================
-- Ändra en planerad måltid: portioner, byt recept eller flytta, i ett anrop.
--
-- Veckoplanens "…"-meny har tre ändringar som alla är samma sak — raden får
-- nytt (recept, datum, måltid, portioner). En RPC i stället för en update från
-- klienten av två skäl:
--
--   * unique (home_id, meal_date, slot, recipe_id). Flyttar man pastan till en
--     middag som redan har pasta skulle en rak update krascha. Här slås raderna
--     ihop: den flyttade raden försvinner och den som redan låg där får
--     portionerna.
--   * "Ersätt" (ta bort det andra i målmåltiden) och själva flytten måste ske i
--     samma transaktion, annars kan ett avbrott lämna måltiden tom.
--
-- Samma datumgränser som plan_meal: inget bakåt i tiden, högst sex veckor
-- framåt. Det gäller både var raden ligger nu och vart den ska — det som redan
-- ätits är historik och ändras inte härifrån.
--
-- security invoker, som plan_meal: RLS (meals_all) begränsar till hemmet.
-- ============================================================================

create function update_planned_meal(
  _id        uuid,
  _recipe_id uuid,
  _date      date,
  _slot      meal_slot,
  _servings  int,
  _replace   boolean default false
)
returns uuid language plpgsql
set search_path = public as $$
declare
  _home     uuid;
  _today    date;
  _old      planned_meals;
  _existing uuid;
begin
  _home := current_home_id();

  if _home is null then
    raise exception 'Du är inte med i något hem';
  end if;

  select * into _old
  from planned_meals
  where id = _id and home_id = _home
  for update;

  -- Borttagen av någon annan i hemmet medan menyn var öppen.
  if not found then
    raise exception 'Måltiden finns inte längre';
  end if;

  _today := (now() at time zone 'Europe/Stockholm')::date;

  if _old.meal_date < _today or _date < _today then
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
      and id <> _id
      and recipe_id <> _recipe_id;
  end if;

  -- Finns receptet redan i målmåltiden slås raderna ihop.
  select id into _existing
  from planned_meals
  where home_id = _home
    and meal_date = _date
    and slot = _slot
    and recipe_id = _recipe_id
    and id <> _id;

  if _existing is not null then
    delete from planned_meals where id = _id;
    update planned_meals set servings = _servings where id = _existing;
    return _existing;
  end if;

  update planned_meals
  set recipe_id = _recipe_id,
      meal_date = _date,
      slot      = _slot,
      servings  = _servings
  where id = _id;

  return _id;
end;
$$;
