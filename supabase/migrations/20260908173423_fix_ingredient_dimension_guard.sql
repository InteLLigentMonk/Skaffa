drop trigger trg_ingredient_unit on ingredients;
drop function guard_ingredient_unit();

create function guard_ingredient_dimension() returns trigger language plpgsql as $$
begin
if new.dimension <> old.dimension then
    raise exception 'Ingrediensens dimension kan inte ändras efter skapande';
  end if;
  -- Skydda även mot att flytta en privat ingrediens till/från frö.
  if new.home_id is distinct from old.home_id then
    raise exception 'En ingrediens ägarskap (home_id) kan inte ändras';
  end if;
  return new;
end;
$$;

create trigger trg_ingredient_dimension
  before update on ingredients
  for each row execute function guard_ingredient_dimension();

alter type unit_code rename value 'kryddmått' to 'kryddmatt';