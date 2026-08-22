-- ============================================================================
-- Skaffa – städkö för föräldralösa Storage-objekt
-- Kör EFTER skaffa_schema.sql och skaffa_storage_policies.sql.
--
-- Problemet: Postgres känner inte till Storage. `delete from recipes` tar bort
-- raden men lämnar bilden kvar i bucketen för alltid, och samma sak händer vid
-- varje bildbyte – den gamla filen blir kvar utan att något pekar på den.
--
-- Varför en kö och inte ett direkt anrop: raderingen sker i en transaktion som
-- kan rullas tillbaka, och Storage-API:t kan vara nere. Ett HTTP-anrop mitt i
-- en transaktion är antingen en lögn (filen försvann fast raderingen ångrades)
-- eller en förlust (filen blev kvar fast raden är borta). Kön flyttar
-- osäkerheten till ett ställe där den går att göra om: raden ligger kvar tills
-- någon bevisat tagit bort filen.
--
-- OBS: det räcker INTE att radera raden ur storage.objects. Den tabellen är
-- bara metadata – själva filen ligger i S3 och tas bort av storage-api. Kön
-- måste dräneras av något som talar med API:t, se avsnitt 5.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1) Kötabellen
--    Ingen RLS-policy alls => bara service role kommer åt den. Klienten ska
--    varken se eller röra kön.
-- ----------------------------------------------------------------------------

create table storage_cleanup_queue (
  id           bigint generated always as identity primary key,
  bucket_id    text not null,
  object_path  text not null,
  enqueued_at  timestamptz not null default now(),
  claimed_at   timestamptz,                 -- satt medan en dränering pågår
  attempts     integer not null default 0,
  last_error   text,
  unique (bucket_id, object_path)
);

-- Driver claim-frågan: bara det som väntar är intressant.
create index storage_cleanup_pending
  on storage_cleanup_queue (enqueued_at)
  where claimed_at is null;

alter table storage_cleanup_queue enable row level security;


-- ----------------------------------------------------------------------------
-- 2) Läggs på kön
--    Tål NULL och tom sträng, så triggrarna slipper upprepa den kontrollen.
--    on conflict do nothing: samma sökväg två gånger är samma jobb.
-- ----------------------------------------------------------------------------

create or replace function enqueue_storage_delete(_bucket text, _path text)
returns void language sql as $$
  insert into storage_cleanup_queue (bucket_id, object_path)
  select _bucket, _path
  where _path is not null and length(trim(_path)) > 0
  on conflict (bucket_id, object_path) do nothing;
$$;


-- ----------------------------------------------------------------------------
-- 3) Triggers – fångar både radering OCH bildbyte
--    Bildbytet är det lömska fallet: raden finns kvar, så inget "raderas", men
--    den gamla filen är lika föräldralös som om receptet strukits.
--
--    Cascade-raderingar fyrar radtriggers, så ett `delete_home()` som tömmer
--    recipes lägger varje bild på kön utan att vi behöver göra något extra.
-- ----------------------------------------------------------------------------

create or replace function queue_recipe_image_cleanup()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    perform enqueue_storage_delete('recipes', old.image_path);
  elsif old.image_path is distinct from new.image_path then
    perform enqueue_storage_delete('recipes', old.image_path);
  end if;
  return null;
end;
$$;
create trigger trg_recipes_image_cleanup
  after update or delete on recipes
  for each row execute function queue_recipe_image_cleanup();

create or replace function queue_public_recipe_image_cleanup()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    perform enqueue_storage_delete('public_recipes', old.image_path);
  elsif old.image_path is distinct from new.image_path then
    perform enqueue_storage_delete('public_recipes', old.image_path);
  end if;
  return null;
end;
$$;
create trigger trg_public_recipes_image_cleanup
  after update or delete on public_recipes
  for each row execute function queue_public_recipe_image_cleanup();

create or replace function queue_avatar_cleanup()
returns trigger language plpgsql as $$
begin
  if tg_op = 'DELETE' then
    perform enqueue_storage_delete('profile', old.avatar_path);
  elsif old.avatar_path is distinct from new.avatar_path then
    perform enqueue_storage_delete('profile', old.avatar_path);
  end if;
  return null;
end;
$$;
create trigger trg_profiles_avatar_cleanup
  after update or delete on profiles
  for each row execute function queue_avatar_cleanup();


-- ----------------------------------------------------------------------------
-- 4) Dräneringens API
--    claim -> radera filerna -> complete (lyckade) / fail (misslyckade).
--
--    `for update skip locked` gör att två samtidiga dräneringar tar olika
--    rader i stället för att blockera varandra eller radera samma fil två
--    gånger. claimed_at fungerar som lease: en dränering som dör mitt i låser
--    inte raden för evigt, den plockas upp igen efter fem minuter.
--
--    attempts < 5 gör att en rad som aldrig går att radera slutar snurra.
--    Den ligger kvar med last_error ifylld i stället för att tyst försvinna –
--    kön är också felrapporten.
-- ----------------------------------------------------------------------------

create or replace function claim_storage_cleanup(_limit integer default 100)
returns table (id bigint, bucket_id text, object_path text)
language sql security definer set search_path = public as $$
  update storage_cleanup_queue q
  set claimed_at = now(),
      attempts   = q.attempts + 1
  from (
    select c.id
    from storage_cleanup_queue c
    where (c.claimed_at is null or c.claimed_at < now() - interval '5 minutes')
      and c.attempts < 5
    order by c.enqueued_at
    limit _limit
    for update skip locked
  ) s
  where q.id = s.id
  returning q.id, q.bucket_id, q.object_path;
$$;

-- Filen är borta. Gäller även 404 från Storage: målet är att den inte ska
-- finnas, och då är "fanns inte" ett lyckat utfall, inte ett fel.
create or replace function complete_storage_cleanup(_ids bigint[])
returns void language sql security definer set search_path = public as $$
  delete from storage_cleanup_queue where id = any(_ids);
$$;

-- Släpper leasen direkt så nästa körning tar om den. attempts är redan räknad.
create or replace function fail_storage_cleanup(_id bigint, _error text)
returns void language sql security definer set search_path = public as $$
  update storage_cleanup_queue
  set claimed_at = null,
      last_error = left(_error, 500)
  where id = _id;
$$;

-- Kön är service-role-territorium. Utan dessa hade vilken inloggad användare
-- som helst kunnat dränera den – funktionerna är SECURITY DEFINER och går
-- förbi RLS, så tabellens frånvaro av policies skyddar inte i sig.
revoke execute on function claim_storage_cleanup(integer)    from anon, authenticated;
revoke execute on function complete_storage_cleanup(bigint[]) from anon, authenticated;
revoke execute on function fail_storage_cleanup(bigint, text) from anon, authenticated;
revoke execute on function enqueue_storage_delete(text, text) from anon, authenticated;


-- ----------------------------------------------------------------------------
-- 5) Kvar: något som dränerar kön
--    Kön fylls nu på av sig själv men töms av ingen. Se separat drainer.
--
--    Hälsokoll – vad ligger och skräpar?
--      select bucket_id, count(*), min(enqueued_at) as äldst,
--             count(*) filter (where attempts >= 5) as fastnade
--      from storage_cleanup_queue group by bucket_id;
--
--    Har något runnit förbi kön (t.ex. filer uppladdade före den här filen
--    kördes)? Den här hittar objekt som ingen rad pekar på:
--      select o.bucket_id, o.name
--      from storage.objects o
--      where o.bucket_id = 'recipes'
--        and not exists (select 1 from recipes r where r.image_path = o.name);
--    Kör den som service role och lägg träffarna på kön med
--    enqueue_storage_delete() om de ser rätt ut. Läs igenom listan först.
-- ----------------------------------------------------------------------------
