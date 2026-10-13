-- ----------------------------------------------------------------------------
-- En rad får bara peka på recept och ingredienser som hemmet självt ser.
--
-- Policyerna i baseline kontrollerar radens egen home_id, men inte vad
-- recipe_id och ingredient_id pekar på. FK-kontroller bryr sig inte om RLS, så
-- en direkt insert via PostgREST kunde referera ett annat hems recept eller
-- privata ingrediens. RPC:erna (plan_meal, save_recipe, save_standing_meal …)
-- gör redan den kontrollen. Det här stänger vägen runt dem.
--
-- Vad det öppnade:
--   planned_meals.recipe_id -> generate_shopping_list (security definer) läste
--     det främmande receptets ingredienser och mängder och skrev in dem i
--     angriparens inköpslista.
--   *.ingredient_id -> läckte namnet på ett annat hems privata ingrediens, och
--     guard_ingredient_delete hindrade sedan ägaren från att radera den.
--
-- Det krävs ett känt uuid, men en f.d. medlem har alla id:n från sitt gamla hem.
--
-- Bara with check ändras. using är redan rätt: den styr vilka rader man ser,
-- och de är fortfarande hemmets egna.
-- ----------------------------------------------------------------------------

alter policy meals_all on planned_meals
  with check (
    home_id = (select current_home_id())
    and exists (select 1 from recipes r
                where r.id = recipe_id and r.home_id = (select current_home_id()))
  );

alter policy standing_all on standing_meals
  with check (
    home_id = (select current_home_id())
    and exists (select 1 from recipes r
                where r.id = recipe_id and r.home_id = (select current_home_id()))
  );

alter policy recipe_ing_all on recipe_ingredients
  with check (
    exists (select 1 from recipes r
            where r.id = recipe_id and r.home_id = (select current_home_id()))
    and exists (select 1 from ingredients i
                where i.id = ingredient_id
                  and (i.home_id is null or i.home_id = (select current_home_id())))
  );

-- ingredient_id och recurring_item_id är null för fritextrader.
alter policy list_items_all on shopping_list_items
  with check (
    exists (select 1 from shopping_lists l
            where l.id = list_id and l.home_id = (select current_home_id()))
    and (ingredient_id is null
         or exists (select 1 from ingredients i
                    where i.id = ingredient_id
                      and (i.home_id is null or i.home_id = (select current_home_id()))))
    and (recurring_item_id is null
         or exists (select 1 from recurring_items ri
                    where ri.id = recurring_item_id
                      and ri.home_id = (select current_home_id())))
  );

alter policy recurring_all on recurring_items
  with check (
    home_id = (select current_home_id())
    and (ingredient_id is null
         or exists (select 1 from ingredients i
                    where i.id = ingredient_id
                      and (i.home_id is null or i.home_id = (select current_home_id()))))
  );


-- ----------------------------------------------------------------------------
-- generate_shopping_list läser bara hemmets egna recept och ingredienser.
--
-- Policyerna ovan stoppar nya korsreferenser, men inte rader som redan kan
-- finnas. Funktionen är security definer och går förbi RLS, så den filtrerar
-- själv. Oförändrad i övrigt jämfört med 20260908180243.
-- ----------------------------------------------------------------------------

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
    and r.home_id = _home_id
    and (i.home_id is null or i.home_id = _home_id)
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
  left join ingredients i
    on i.id = rec.ingredient_id
   and (i.home_id is null or i.home_id = _home_id)
  where rec.home_id = _home_id
  on conflict (list_id, recurring_item_id) where source = 'recurring'
  do nothing;

  update shopping_lists set generated_at = now() where id = _list;

  return _list;
end;
$$;
