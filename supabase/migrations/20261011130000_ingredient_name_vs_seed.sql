-- ============================================================================
-- En hemingrediens får inte heta samma sak som en frö-ingrediens.
--
-- ingredients_owner_name_uniq gäller per ägare: (home_id, namn). Frön har
-- home_id null och ett hem har sitt id, så "Aluminiumfolie" i Övrigt gick att
-- skapa fast fröraden "Aluminiumfolie" i Hushåll redan fanns. Då har hemmet
-- två varor med samma namn, och inköpslistan — som summerar per ingrediens —
-- visar dem som två rader. Precis det indexets kommentar säger att det ska
-- förhindra, fast bara inom samma ägare.
--
-- Ett unikt index kan inte uttrycka "unikt mot en annan ägare", så det blir
-- en trigger. Klienten döljer redan "Skapa" vid exakt träff, men namnfältet
-- i formuläret går att ändra efteråt — därför måste databasen säga nej.
--
-- Bara nya skrivningar kontrolleras. Dubbletter som redan finns ligger kvar:
-- de kan bära recept och inköpsrader, och att slå ihop dem automatiskt kunde
-- byta måttslag under en receptrad.
--
-- Åt andra hållet (en ny frörad som krockar med ett hems vara) gäller inte:
-- frön läggs bara till via migrationer, och där är det migrationens ansvar.
-- ============================================================================

create function guard_ingredient_name_vs_seed()
returns trigger language plpgsql
set search_path = public as $$
declare
  _seed text;
begin
  if new.home_id is null then
    return new;
  end if;

  select name into _seed
  from ingredients
  where home_id is null
    and lower(trim(name)) = lower(trim(new.name))
  limit 1;

  if found then
    raise exception 'Det finns redan en ingrediens som heter %', _seed;
  end if;

  return new;
end;
$$;

create trigger trg_ingredient_name_vs_seed
  before insert or update of name on ingredients
  for each row execute function guard_ingredient_name_vs_seed();
