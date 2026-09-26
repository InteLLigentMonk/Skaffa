-- Databasens sanning
alter table recipe_ingredients rename column amount to amount_base;
alter table public_recipe_ingredients rename column amount to amount_base;

-- Bevarar användarens val av mängd och enhet för visning i receptet
alter table recipe_ingredients add column display_amount numeric not null check (display_amount > 0);
alter table public_recipe_ingredients add column display_amount numeric not null check (display_amount > 0);

alter table recipe_ingredients add column display_unit unit_code not null;
alter table public_recipe_ingredients add column display_unit unit_code not null;

alter table shopping_list_items drop column unit;
alter table shopping_list_items add column dimension unit_dimension;

alter table recurring_items drop column unit;
alter table recurring_items add column dimension unit_dimension;
alter table recurring_items rename column amount to amount_base;


create or replace function generate_shopping_list(_home_id uuid, _week_start date)
returns uuid language plpgsql security definer
set search_path = public as $$
declare
  _list uuid;
begin
  if not is_home_member(_home_id) then
    raise exception 'Inte medlem i hemmet';
  end if;

  _week_start := week_monday(_week_start);

  -- Hämta eller skapa veckans lista.
  insert into shopping_lists (home_id, week_start)
  values (_home_id, _week_start)
  on conflict (home_id, week_start) do nothing;

  select id into _list
  from shopping_lists
  where home_id = _home_id and week_start = _week_start;

  -- Föräldralösmärk allt genererat först; upserten nedan tar tillbaka det som
  -- fortfarande behövs. Ett pass, inget behov av att hålla mängden två gånger.
  update shopping_list_items
  set is_orphaned = true
  where list_id = _list and source = 'generated' and not is_orphaned;

  insert into shopping_list_items
    (list_id, source, ingredient_id, name, amount, dimension, category, is_orphaned)
  select _list,
         'generated',
         i.id,
         i.name,
         round(sum(ri.amount_base * pm.servings::numeric / r.servings), 2),
         i.dimension,
         i.category,
         false
  from planned_meals pm
  join recipes r             on r.id = pm.recipe_id
  join recipe_ingredients ri on ri.recipe_id = r.id
  join ingredients i         on i.id = ri.ingredient_id
  where pm.home_id = _home_id
    and pm.meal_date between _week_start and _week_start + 6
  group by i.id, i.name, i.dimension, i.category
  -- checked står medvetet inte med i do update: har du redan lagt varan i
  -- vagnen ska en omgenerering inte bocka av den åt dig igen.
  on conflict (list_id, ingredient_id) where source = 'generated'
  do update set
    amount      = excluded.amount,
    name        = excluded.name,
    dimension   = excluded.dimension,
    category    = excluded.category,
    is_orphaned = false;

  -- Så hemmets återkommande varor. Partiella unika indexet gör det till en
  -- no-op andra gången, så en bortbockad återkommande vara inte återuppstår.
  insert into shopping_list_items
    (list_id, source, ingredient_id, recurring_item_id, name, amount, dimension, category)
  select _list,
         'recurring',
         rec.ingredient_id,
         rec.id,
         rec.name,
         rec.amount_base,
         coalesce(rec.dimension, i.dimension),
         i.category
  from recurring_items rec
  left join ingredients i on i.id = rec.ingredient_id
  where rec.home_id = _home_id
  on conflict (list_id, recurring_item_id) where source = 'recurring'
  do nothing;

  update shopping_lists set generated_at = now() where id = _list;

  return _list;
end;
$$;

drop type unit_type;