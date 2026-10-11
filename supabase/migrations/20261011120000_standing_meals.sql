-- ============================================================================
-- Stående måltider: spara/ta bort via RPC, och sådd för ett veckointervall.
--
-- seed_standing_meals sår en vecka EXAKT en gång (seeded_weeks), så en måltid
-- man tagit bort en enskild vecka inte återuppstår. Baksidan är att en regel
-- som skapas efteråt bara når veckor som ingen öppnat än — skapar man
-- "pannkakor varje torsdag" i dag syns den inte i veckan som redan är öppnad,
-- och det ser ut som en bugg. Därför:
--
--   * save_standing_meal lägger in regeln i redan sådda veckor, från i dag.
--     Osådda veckor får den av seed_standing_meals när de öppnas.
--   * Ändras eller tas en regel bort, tas dess kommande instanser bort (från
--     i dag, samma recept + måltid + veckodag). Instanserna är vanliga
--     planned_meals utan koppling till regeln, så en likadan måltid som
--     planerats för hand samma dag följer med. Det är ett medvetet val: att
--     lämna dem kvar gjorde att en borttagen regel levde vidare i sex veckor.
--
-- Bakåt i tiden rörs ingenting: det som redan ätits är historik.
--
-- Funktionerna är security invoker, som plan_meal: RLS (standing_all,
-- meals_all) begränsar redan till det egna hemmet.
-- ============================================================================


-- ---- Sådd hoppar över passerade dagar --------------------------------------
-- Sås innevarande vecka på en torsdag hamnade måndag–onsdag annars i planen
-- (och på veckans inköpslista) fast de redan passerat.
-- Oförändrad i övrigt jämfört med baseline.
create or replace function seed_standing_meals(_home_id uuid, _week_start date)
returns void language plpgsql security definer
set search_path = public as $$
begin
  if not is_home_member(_home_id) then
    raise exception 'Inte medlem i hemmet';
  end if;

  _week_start := week_monday(_week_start);

  -- Vinn kapplöpningen om markören; misslyckas den fanns veckan redan.
  insert into seeded_weeks (home_id, week_start)
  values (_home_id, _week_start)
  on conflict (home_id, week_start) do nothing;

  if not found then
    return;                                  -- redan sådd -> gör inget
  end if;

  insert into planned_meals (home_id, meal_date, slot, recipe_id, servings)
  select s.home_id,
         _week_start + (d.dow - 1),          -- dow 1..7 -> mån..sön
         s.slot, s.recipe_id, s.servings
  from standing_meals s
  cross join lateral unnest(s.weekdays) as d(dow)
  where s.home_id = _home_id
    and _week_start + (d.dow - 1) >= (now() at time zone 'Europe/Stockholm')::date
  on conflict (home_id, meal_date, slot, recipe_id) do nothing;
end;
$$;


-- ---- Så ett intervall av veckor i ett anrop --------------------------------
-- Planeringsarket läser sju veckor åt gången; ett anrop i stället för sju.
-- Klipps till innevarande vecka … sex veckor framåt, samma horisont som
-- plan_meal, så ett felaktigt intervall inte sår år av markörer.
create function seed_standing_weeks(_from date, _to date)
returns void language plpgsql
set search_path = public as $$
declare
  _home  uuid;
  _today date;
  _week  date;
  _last  date;
begin
  _home := current_home_id();

  if _home is null then
    raise exception 'Du är inte med i något hem';
  end if;

  _today := (now() at time zone 'Europe/Stockholm')::date;
  _week  := greatest(week_monday(_from), week_monday(_today));
  _last  := least(week_monday(_to), week_monday(_today) + 6 * 7);

  while _week <= _last loop
    perform seed_standing_meals(_home, _week);
    _week := _week + 7;
  end loop;
end;
$$;


-- ---- Skapa eller ändra en regel --------------------------------------------
-- _id null = ny regel. Returnerar regelns id.
create function save_standing_meal(
  _id        uuid,
  _recipe_id uuid,
  _slot      meal_slot,
  _weekdays  smallint[],
  _servings  int
)
returns uuid language plpgsql
set search_path = public as $$
declare
  _home  uuid;
  _today date;
  _old   standing_meals;
  _rule  uuid;
begin
  _home := current_home_id();

  if _home is null then
    raise exception 'Du är inte med i något hem';
  end if;

  -- Sorterad och utan dubbletter, så samma val alltid ser likadant ut.
  _weekdays := array(select distinct d from unnest(_weekdays) as d order by d);

  if cardinality(_weekdays) = 0 then
    raise exception 'Välj minst en dag';
  end if;

  if not exists (select 1 from recipes where id = _recipe_id) then
    raise exception 'Receptet finns inte';
  end if;

  _today := (now() at time zone 'Europe/Stockholm')::date;

  if _id is not null then
    select * into _old
    from standing_meals
    where id = _id and home_id = _home
    for update;

    if not found then
      raise exception 'Den stående måltiden finns inte längre';
    end if;

    -- Den gamla regelns kommande instanser bort; de nya läggs in nedan.
    delete from planned_meals
    where home_id = _home
      and recipe_id = _old.recipe_id
      and slot = _old.slot
      and meal_date >= _today
      and extract(isodow from meal_date)::smallint = any (_old.weekdays);

    update standing_meals
    set recipe_id = _recipe_id,
        slot      = _slot,
        weekdays  = _weekdays,
        servings  = _servings
    where id = _id;

    _rule := _id;
  else
    insert into standing_meals (home_id, recipe_id, slot, weekdays, servings, created_by)
    values (_home, _recipe_id, _slot, _weekdays, _servings, auth.uid())
    returning id into _rule;
  end if;

  -- In i veckor som redan är sådda. Finns måltiden redan (planerad för hand)
  -- får den ligga kvar med sina portioner.
  insert into planned_meals (home_id, meal_date, slot, recipe_id, servings)
  select _home, w.week_start + (d.dow - 1), _slot, _recipe_id, _servings
  from seeded_weeks w
  cross join unnest(_weekdays) as d(dow)
  where w.home_id = _home
    and w.week_start + (d.dow - 1) >= _today
  on conflict (home_id, meal_date, slot, recipe_id) do nothing;

  return _rule;
exception
  -- unique (home_id, recipe_id, slot) på standing_meals. planned_meals-
  -- inserten ovan kan inte ge den: den har on conflict do nothing.
  when unique_violation then
    raise exception 'Receptet är redan en stående måltid till den måltiden';
end;
$$;


-- ---- Ta bort en regel -------------------------------------------------------
create function delete_standing_meal(_id uuid)
returns void language plpgsql
set search_path = public as $$
declare
  _home  uuid;
  _old   standing_meals;
begin
  _home := current_home_id();

  select * into _old
  from standing_meals
  where id = _id and home_id = _home
  for update;

  -- Redan borttagen (av någon annan i hemmet): målet är nått.
  if not found then
    return;
  end if;

  delete from planned_meals
  where home_id = _home
    and recipe_id = _old.recipe_id
    and slot = _old.slot
    and meal_date >= (now() at time zone 'Europe/Stockholm')::date
    and extract(isodow from meal_date)::smallint = any (_old.weekdays);

  delete from standing_meals where id = _id;
end;
$$;
