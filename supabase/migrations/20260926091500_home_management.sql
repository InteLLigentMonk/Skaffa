-- ----------------------------------------------------------------------------
-- Hem-hantering i appen: medlemslista med namn, rollbyten, lämna hemmet och
-- förhandsvisning av en inbjudan innan man tackar ja.
--
-- Fyra saker schemat saknar. Allt annat finns redan i baseline:
--   döpa om hemmet  -> homes_update
--   skapa/återkalla -> tokens_insert / tokens_update
--   byta roll       -> members_update
-- ----------------------------------------------------------------------------


-- ---- 1) Medlem -> profil ---------------------------------------------------
-- home_members.user_id och profiles.id pekar var för sig på auth.users, och en
-- gemensam förälder är INTE en relation PostgREST kan bädda in. Utan den här
-- FK:n går select('role, profiles(display_name)') inte ens att skriva, och
-- medlemslistan blir två frågor och en handgjord join i klienten.
--
-- FK:n mot auth.users står kvar; den är sanningen om att användaren finns.
-- Den här finns för läsbarheten. on delete cascade därför att
-- profiles.id -> auth.users.id redan cascadar: en raderad användare tappar
-- profil och medlemskap samtidigt, oavsett vilken väg cascaden råkar ta.
--
-- Skulle constraintet kastas finns ett medlemskap utan profilrad. Det ska inte
-- kunna hända (handle_new_user() plus backfillen i baseline) — backfilla
-- profiles i så fall, ändra inte constraintet.
alter table home_members
  add constraint home_members_user_id_profiles_fkey
  foreign key (user_id) references profiles (id) on delete cascade;


-- ---- 2) Vakt: ett hem blir aldrig utan ägare -------------------------------
-- Flera ägare är tillåtet (ingen unique på role). Det som ska vara omöjligt är
-- att ta bort den SISTA ägaren medan det finns medlemmar kvar — då kan ingen
-- längre ändra roller, bjuda in eller radera hemmet.
--
-- Varför trigger och inte app-logik: members_delete släpper igenom
-- `user_id = auth.uid()`, så vem som helst kan radera sitt eget medlemskap rakt
-- mot tabellen utan att gå via leave_home(). En invariant som bara finns i
-- klienten är en rekommendation, inte en invariant.
--
-- security definer: invoker skulle råka fungera idag, eftersom members_select
-- och homes_select exponerar precis de rader vakten behöver. Men då vilar
-- invarianten på hur de policyerna råkar vara formulerade. Definer tar bort
-- beroendet — och låset nedan måste kunna tas på en rad RLS annars filtrerar
-- bort (ett lås på en rad man inte ser tas aldrig).
create or replace function guard_last_owner()
returns trigger language plpgsql security definer
set search_path = public as $$
declare
  _owners_left  int;
  _members_left int;
begin
  -- Samma undantag som guard_ingredient_delete: när hela hemmet raderas fyras
  -- FK-cascaden som en AFTER-trigger på homes, alltså när föräldraraden redan
  -- är borta. Det är signalen. Utan undantaget hade vakten stoppat varje
  -- hemradering där ägaren raderas före de övriga medlemmarna.
  --
  -- Villkoret på tg_op är inte kosmetiskt: att returnera OLD ur en BEFORE
  -- UPDATE betyder "skriv OLD i stället för NEW", dvs. uppdateringen blir en
  -- tyst no-op i stället för ett fel.
  if tg_op = 'DELETE'
     and not exists (select 1 from homes where id = old.home_id) then
    return old;
  end if;

  -- Serialisera medlemsändringar per hem. Utan låset kan två ägare degradera
  -- varandra samtidigt: båda läser "det finns en annan ägare kvar", båda
  -- commitar, och hemmet står utan ägare. Det går inte att reparera i
  -- efterhand, eftersom rollbyten kräver en ägare. Medlemsändringar är
  -- sällsynta — låset kostar ingenting.
  perform 1 from homes where id = old.home_id for update;

  if tg_op = 'UPDATE' then
    -- Ett medlemskap byter aldrig hem eller person. members_update ger ägaren
    -- fria händer på raden, så utan detta kan en ägare skriva om user_id och
    -- foga in vem som helst i hemmet, helt utanför token-flödet.
    -- unique (user_id) stoppar bara den som redan har ett hem.
    if new.home_id <> old.home_id or new.user_id <> old.user_id then
      raise exception
        'Ett medlemskap kan inte flyttas till ett annat hem eller en annan person';
    end if;

    if old.role = 'owner' and new.role <> 'owner' then
      select count(*) into _owners_left
      from home_members
      where home_id = old.home_id
        and role = 'owner'
        and user_id <> old.user_id;

      if _owners_left = 0 then
        raise exception
          'Hemmet måste ha minst en ägare – gör någon annan till ägare först';
      end if;
    end if;

    return new;
  end if;

  -- DELETE. Den sista medlemmen får alltid gå: då finns inget hem kvar att
  -- vakta, och leave_home() raderar det i stället. En ägare som lämnar folk
  -- kvar måste först ha utsett en efterträdare.
  select count(*) into _members_left
  from home_members
  where home_id = old.home_id and user_id <> old.user_id;

  if _members_left > 0 and old.role = 'owner' then
    select count(*) into _owners_left
    from home_members
    where home_id = old.home_id
      and role = 'owner'
      and user_id <> old.user_id;

    if _owners_left = 0 then
      raise exception 'Gör någon annan till ägare innan du lämnar hemmet';
    end if;
  end if;

  return old;
end;
$$;

create trigger trg_home_members_last_owner
  before update or delete on home_members
  for each row execute function guard_last_owner();


-- ---- 3) leave_home() -------------------------------------------------------
-- "Lämna hemmet" är tre olika operationer beroende på vem som gör det, och
-- klienten ska inte behöva välja gren. Den KAN inte heller göra det utan att
-- tävla med de andra medlemmarna: mellan "räkna medlemmar" och "radera" kan
-- någon annan ha lämnat.
--
-- Notera att sista-ägare-kontrollen INTE upprepas här. Deleten längst ner fyrar
-- guard_last_owner, som kastar exakt den texten. Invarianten bor på ett ställe.
--
-- security definer därför att sista-medlemmen-grenen anropar delete_home() och
-- därför att medlemsräkningen ska se hemmet som det faktiskt ser ut.
create or replace function leave_home()
returns void language plpgsql security definer
set search_path = public as $$
declare
  _home   uuid;
  _others int;
begin
  select home_id into _home from home_members where user_id = auth.uid();

  if _home is null then
    raise exception 'Du är inte med i något hem';
  end if;

  -- Samma lås som vakten tar. Utan det kan två medlemmar lämna samtidigt, båda
  -- se "en annan finns kvar", och hemmet bli kvar utan medlemmar: osynligt för
  -- alla (homes_select kräver medlemskap) och därmed omöjligt att radera.
  perform 1 from homes where id = _home for update;

  select count(*) into _others
  from home_members
  where home_id = _home and user_id <> auth.uid();

  if _others = 0 then
    -- Ingen kvar att lämna hemmet till, så det måste bort nu.
    -- delete_home() anropas i stället för ett rakt `delete from homes` eftersom
    -- den tömmer barnen i den ordning guard_ingredient_delete kräver. Att den
    -- kräver ägarskap är ok: vakten håller "minst en ägare", så den sista
    -- medlemmen är alltid ägare.
    perform delete_home(_home);
    return;
  end if;

  delete from home_members where user_id = auth.uid();
end;
$$;


-- ---- 4) peek_invite() ------------------------------------------------------
-- tokens_select är ägarens, och den inbjudna är per definition inte ägare —
-- men hon ska kunna se vilket hem hon går med i innan hon tackar ja. Definer
-- och smalt tilltagen: bara det som ska stå på bekräftelseskärmen, och bara för
-- en token som fortfarande går att lösa in.
--
-- Noll rader betyder ogiltig, återkallad ELLER utgången. Klienten behöver inte
-- veta vilket: svaret är detsamma (be om en ny länk), och att skilja på fallen
-- gör funktionen till ett orakel för utomstående.
--
-- Alla kolumnreferenser är tabellkvalificerade så att OUT-parametrarna
-- (home_id, home_name) inte kan skugga dem.
create or replace function peek_invite(_token text)
returns table (home_id uuid, home_name text, member_count int)
language sql security definer stable
set search_path = public as $$
  select h.id,
         h.name,
         (select count(*)::int from home_members m where m.home_id = h.id)
  from invite_tokens t
  join homes h on h.id = t.home_id
  where t.token = _token
    and not t.revoked
    and t.expires_at > now();
$$;
