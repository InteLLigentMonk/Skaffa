-- ----------------------------------------------------------------------------
-- Radera konto. Krav från både App Store och Google Play: den som kan skapa ett
-- konto i appen ska kunna radera det i appen.
--
-- Att bara radera raden i auth.users räcker inte, trots att allt cascadar:
--
--   Ensam i hemmet -> home_members-raden cascadar bort, men homes står kvar
--   utan medlemmar. Osynligt för alla (homes_select kräver medlemskap) och
--   därmed omöjligt att radera — samma fälla som låset i leave_home() finns för.
--
--   Sista ägaren med andra kvar -> guard_last_owner kastar mitt i cascaden,
--   och klienten får bara "Database error deleting user".
--
-- leave_home() har redan båda grenarna: sista medlemmen raderar hemmet via
-- delete_home(), sista ägaren får vaktens P0001-text som klienten kan visa
-- rakt av. Den anropas därför först, och invarianten bor kvar på ett ställe.
--
-- Resten sköter FK:erna: profil och inbjudningar cascadar, created_by på
-- recept och ingredienser blir null, och avatarbilden köas för städning av
-- triggern som 20260926164217 gjorde körbar för just den här vägen.
--
-- security definer därför att authenticated inte har delete på auth.users.
-- Funktionen raderar bara anroparen själv — auth.uid() är det enda id:t den
-- någonsin rör.
-- ----------------------------------------------------------------------------

create or replace function delete_account()
returns void language plpgsql security definer
set search_path = public as $$
declare
  _uid uuid := auth.uid();
begin
  if _uid is null then
    raise exception 'Ej inloggad';
  end if;

  if exists (select 1 from home_members where user_id = _uid) then
    perform leave_home();
  end if;

  delete from auth.users where id = _uid;
end;
$$;

-- PUBLIC måste med, se 20260926164217. anon har inget att radera, men en
-- explicit grant gör avsikten läsbar.
revoke execute on function delete_account() from public, anon;
grant execute on function delete_account() to authenticated;
