-- ----------------------------------------------------------------------------
-- Visningsnamnet fanns på två ställen som aldrig synkades:
--   auth.users.raw_user_meta_data ->> 'display_name'  (det kontot visar)
--   profiles.display_name                              (det medlemslistan visar)
--
-- handle_new_user() kopierar namnet en gång, vid registrering. När appen nu
-- låter användaren byta namn via auth.updateUser({ data }) hade profilen
-- blivit kvar på det gamla.
--
-- Metadatan förblir sanningen och profilen följer efter, i stället för
-- tvärtom: sessionen bär metadatan, så kontoskärmen kan visa nya namnet utan
-- en extra fråga. Klienten skriver alltså bara på ett ställe.
--
-- Ett tomt namn skrivs inte över — profiles har en check mot tomma namn, och
-- ett fel här skulle rulla tillbaka hela auth-uppdateringen (samma skäl som
-- att handle_new_user aldrig får kasta).
-- ----------------------------------------------------------------------------

create or replace function sync_profile_display_name()
returns trigger language plpgsql security definer
set search_path = public as $$
declare
  _name text := nullif(trim(new.raw_user_meta_data ->> 'display_name'), '');
begin
  if _name is not null
     and _name is distinct from
         nullif(trim(old.raw_user_meta_data ->> 'display_name'), '') then
    update profiles set display_name = _name where id = new.id;
  end if;
  return new;
end;
$$;

create trigger on_auth_user_metadata_updated
  after update of raw_user_meta_data on auth.users
  for each row execute function sync_profile_display_name();
