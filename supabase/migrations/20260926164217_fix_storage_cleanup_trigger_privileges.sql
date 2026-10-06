-- ----------------------------------------------------------------------------
-- Städkötriggarna kunde inte skriva till kön för alla roller, och det gjorde
-- `delete from auth.users` omöjligt.
--
-- Kedjan: auth-tjänsten raderar användaren -> FK-cascaden tar profiles-raden ->
-- trg_profiles_avatar_cleanup fyras -> enqueue_storage_delete ->
-- insert into storage_cleanup_queue -> permission denied -> hela transaktionen
-- rullas tillbaka, och API:t svarar "Database error deleting user".
--
-- Skillnaden mellan de två stegen är vilken roll som kör dem:
--   FK-cascader kör som tabellägaren (postgres) - därför går den delen bra.
--   Triggers kör som ANROPANDE roll, dvs. supabase_auth_admin här.
--
-- storage_cleanup_queue har RLS utan en enda policy (avsiktligt - kön är
-- service roles territorium) och supabase_auth_admin finns inte i Supabases
-- standard-grants på public. Att avatar_path är null räddar inte: filtret sitter
-- i enqueue_storage_delete:s where-sats, men rättighetskontrollen på INSERT sker
-- när satsen körs, oavsett om den producerar noll rader.
--
-- Samma mekanism träffar authenticated: den rollen HAR insert på kön via
-- Supabases default privileges, men stoppas av RLS så fort det faktiskt blir en
-- rad. Noll rader kontrolleras inte, så det har inte märkts - men att radera ett
-- recept eller byta avatar DÄR EN BILD FINNS gick samma väg.
--
-- Fixen: de tre triggerfunktionerna blir security definer. De ägs av postgres,
-- som äger kön, och äger man tabellen gäller varken RLS eller grants.
--
-- Varför funktionerna och inte enqueue_storage_delete, som är den som faktiskt
-- skriver: enqueue går att anropa direkt som RPC. Revoke-raderna i
-- 20260823000200 nämner bara anon och authenticated, och båda är medlemmar i
-- PUBLIC som Postgres ger execute som standard - så revoken biter inte, och en
-- definer-enqueue hade låtit vem som helst köa radering av valfri fil i Storage.
-- Triggerfunktioner går däremot inte att anropa alls utom som trigger. Därför är
-- det där rättigheten hör hemma: samma effekt, ingen ny angreppsyta.
--
-- set search_path = public av vanliga skäl för definer-funktioner, men här också
-- konkret: supabase_auth_admin har inte nödvändigtvis public i sin search_path,
-- och utan raden hittas varken kön eller enqueue_storage_delete.
--
-- Funktionskropparna är oförändrade jämfört med 20260823000200.
-- ----------------------------------------------------------------------------

create or replace function queue_recipe_image_cleanup()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    perform enqueue_storage_delete('recipes', old.image_path);
  elsif old.image_path is distinct from new.image_path then
    perform enqueue_storage_delete('recipes', old.image_path);
  end if;
  return null;
end;
$$;

create or replace function queue_public_recipe_image_cleanup()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    perform enqueue_storage_delete('public_recipes', old.image_path);
  elsif old.image_path is distinct from new.image_path then
    perform enqueue_storage_delete('public_recipes', old.image_path);
  end if;
  return null;
end;
$$;

create or replace function queue_avatar_cleanup()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  if tg_op = 'DELETE' then
    perform enqueue_storage_delete('profile', old.avatar_path);
  elsif old.avatar_path is distinct from new.avatar_path then
    perform enqueue_storage_delete('profile', old.avatar_path);
  end if;
  return null;
end;
$$;
