-- ----------------------------------------------------------------------------
-- Konverteringsfaktorer. Basenheten är gram för vikt, milliliter för volym och
-- styck för antal. De svenska volymmåtten är exakta ml-multiplar, så alla
-- faktorer är heltal och konverteringen är förlustfri.
--
-- Saknas ett värde i case-satsen returneras null, vilket krockar med
-- amount_base not null. Det är avsiktligt: lägger någon till ett enum-värde
-- utan att röra den här funktionen ska det smälla direkt, inte tyst räkna fel.
-- ----------------------------------------------------------------------------

create function unit_to_base(_amount numeric, _unit unit_code)
returns numeric language sql immutable as $$
  select _amount * case _unit
    when 'gram'       then 1
    when 'kilogram'   then 1000
    when 'milliliter' then 1
    when 'centiliter' then 10
    when 'deciliter'  then 100
    when 'liter'      then 1000
    when 'matsked'    then 15
    when 'tesked'     then 5
    when 'kryddmatt'  then 1
    when 'styck'      then 1
  end;
$$;

create function unit_dimension_of(_unit unit_code)
returns unit_dimension language sql immutable as $$
  select case _unit
    when 'gram'     then 'vikt'
    when 'kilogram' then 'vikt'
    when 'styck'    then 'antal'
    else 'volym'
  end::unit_dimension;
$$;


-- ----------------------------------------------------------------------------
-- amount_base HÄRLEDS, den skrivs aldrig av klienten. Appen skickar bara
-- display_amount + display_unit — det användaren faktiskt skrev — och
-- databasen räknar. Det är enda sättet att garantera att de två värdena
-- beskriver samma mängd.
--
-- Tvärdimension (3 dl mjöl på en vikt-ingrediens) kräver densitet. Saknas den
-- avvisas raden i stället för att gissa. Samma kontroll fångar en display_unit
-- ur fel dimension, vilket kolumnen själv inte kan veta något om.
-- ----------------------------------------------------------------------------

create function set_amount_base()
returns trigger language plpgsql as $$
declare
  _dim     unit_dimension;
  _density numeric;
  _udim    unit_dimension;
  _base    numeric;
begin
  select dimension, density_g_per_ml
  into _dim, _density
  from ingredients
  where id = new.ingredient_id;

  _udim := unit_dimension_of(new.display_unit);
  _base := unit_to_base(new.display_amount, new.display_unit);

  if _udim = _dim then
    new.amount_base := _base;

  elsif _density is null then
    raise exception
      'Ingrediensen mäts i % och saknar densitet – enheten % kan inte användas',
      _dim, new.display_unit;

  elsif _dim = 'vikt' and _udim = 'volym' then
    new.amount_base := _base * _density;      -- ml -> g

  elsif _dim = 'volym' and _udim = 'vikt' then
    new.amount_base := _base / _density;      -- g -> ml

  else
    -- antal går inte att brygga med densitet åt något håll.
    raise exception 'Enheten % kan inte konverteras till %', new.display_unit, _dim;
  end if;

  return new;
end;
$$;

-- Samma funktion på båda tabellerna: de har identiska kolumnnamn, och triggern
-- bryr sig bara om fälten den läser ur new.
create trigger trg_recipe_ingredients_amount_base
  before insert or update on recipe_ingredients
  for each row execute function set_amount_base();

create trigger trg_public_recipe_ingredients_amount_base
  before insert or update on public_recipe_ingredients
  for each row execute function set_amount_base();
