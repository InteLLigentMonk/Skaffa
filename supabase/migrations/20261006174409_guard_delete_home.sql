-- ----------------------------------------------------------------------------
-- delete_home kollade bara ägarskap, så en ägare kunde radera hemmet med andra
-- medlemmar kvar och ta deras recept, veckoplaner och inköpslistor med sig.
--
-- Skälet att stänga det är att inget användningsfall tappas: när den SISTA
-- medlemmen lämnar raderar leave_home hemmet automatiskt. "Vi är klara med det
-- här hushållet" var alltså redan löst, och det enda delete_home tillförde med
-- folk kvar var att radera andras data åt dem.
--
-- Det tog också bort en asymmetri: leave_home vägrar låta sista ägaren
-- strandsätta de andra, medan delete_home lät samma ägare radera allt de hade.
-- Den ena vaktade mot olyckor, den andra tillät avsiktlig förstörelse.
--
-- Ägarens väg ut är densamma som förut: gör någon annan till ägare och lämna.
--
-- Kropparna i övrigt är oförändrade jämfört med baseline. Ordningen på
-- delete-satserna i delete_home är fortfarande medveten: ingredients-FK:n
-- skapas före recipes-FK:n, så en cascade hade raderat ingredienserna först och
-- guard_ingredient_delete stoppat varje hemradering där en privat ingrediens
-- används i ett recept.
-- ----------------------------------------------------------------------------

create or replace function delete_home(_home_id uuid)
returns void language plpgsql security definer
set search_path = public as $$
begin
  if not is_home_owner(_home_id) then
    raise exception 'Bara hemmets ägare kan radera det';
  end if;

  -- Samma radlås som guard_last_owner och leave_home tar. Utan det kan en
  -- medlem hinna gå med mellan kontrollen och raderingen nedan.
  perform 1 from homes where id = _home_id for update;

  if exists (
    select 1 from home_members
    where home_id = _home_id and user_id <> auth.uid()
  ) then
    raise exception
      'Hemmet har andra medlemmar – gör någon annan till ägare och lämna det i stället';
  end if;

  delete from standing_meals  where home_id = _home_id;
  delete from planned_meals   where home_id = _home_id;
  delete from shopping_lists  where home_id = _home_id;
  delete from recurring_items where home_id = _home_id;
  delete from recipes         where home_id = _home_id;
  delete from homes           where id = _home_id;
end;
$$;


-- redeem_invite tar nu samma lås. Annars är kontrollen ovan rådgivande: låset
-- på homes hindrar inte ett insert i home_members, så någon kunde gå med i
-- exakt det fönstret och få sitt medlemskap cascade-raderat direkt efteråt.
-- Inbjudningar är sällsynta, låset kostar inget.
create or replace function redeem_invite(_token text)
returns uuid language plpgsql security definer
set search_path = public as $$
declare _home uuid;
begin
  if auth.uid() is null then
    raise exception 'Ej inloggad';
  end if;

  select home_id into _home
  from invite_tokens
  where token = _token and not revoked and expires_at > now();

  if _home is null then
    raise exception 'Inbjudan har gått ut eller är ogiltig';
  end if;

  perform 1 from homes where id = _home for update;

  if exists (select 1 from home_members where user_id = auth.uid()) then
    raise exception 'Du är redan med i ett hem – lämna det först';
  end if;

  insert into home_members (home_id, user_id, role)
  values (_home, auth.uid(), 'member');

  return _home;
end;
$$;
