-- ----------------------------------------------------------------------------
-- Städkön raderar det en sökvägskolumn pekar på, så sökvägen måste tillhöra
-- den som skrev den.
--
-- 20261009120000 stängde det här för recipes.image_path. Samma mönster fanns
-- kvar på två ställen:
--
--   public_recipes.image_path -- alla publicerade sökvägar är läsbara för
--     alla. Publicera ett eget recept med image_path = någon annans bild,
--     radera det, och trg_public_recipes_image_cleanup (security definer) köar
--     offrets fil. Drain-skriptet kör som service role och raderar den.
--   profiles.avatar_path -- samma sak för en hemkompis avatar.
--
-- Mappkonventionen är redan densamma som storage-policyerna kräver
-- (20260823000100): public_recipes/<user_id>/…, profile/<user_id>/….
--
-- public_recipes: published_by blir null när kontot raderas. starts_with(x,
-- null) är null, och en check släpper igenom null — ett raderat konto spärrar
-- alltså inte raden.
--
-- not valid: nya och ändrade rader kontrolleras, befintliga inte. Finns det
-- redan en rad som bryter mot regeln ska migrationen inte dö på den; leta upp
-- den med frågorna längst ner och kör sedan `validate constraint`.
-- ----------------------------------------------------------------------------

alter table public_recipes add constraint public_recipes_image_path_owner
  check (starts_with(image_path, published_by::text || '/')) not valid;

alter table profiles add constraint profiles_avatar_path_owner
  check (avatar_path is null or starts_with(avatar_path, id::text || '/')) not valid;


-- ----------------------------------------------------------------------------
-- Typ- och storleksgräns på bucketarna.
--
-- Insert-policyerna kontrollerar bara mappen, så vilken fil som helst gick att
-- lägga upp. Klienten kodar alltid om receptbilder till JPEG på högst 1200 px
-- (use-recipe-image.ts), och resultatet ligger långt under 5 MB.
-- ----------------------------------------------------------------------------

update storage.buckets
set file_size_limit    = 5 * 1024 * 1024,
    allowed_mime_types = array['image/jpeg']
where id = 'recipes';

update storage.buckets
set file_size_limit    = 5 * 1024 * 1024,
    allowed_mime_types = array['image/jpeg', 'image/png', 'image/webp']
where id in ('profile', 'public_recipes');


-- ----------------------------------------------------------------------------
-- Ingen uppladdning till public_recipes tills publicering finns i appen.
--
-- Bucketen är publik: allt som laddas upp går att hämta via CDN utan token.
-- Med insert-policyn kvar var den gratis publik filhosting för vem som helst
-- med ett konto, för en funktion som inte används. Lägg tillbaka policyn
-- (se 20260823000100) när publicering byggs.
-- ----------------------------------------------------------------------------

drop policy "public_recipes insert" on storage.objects;


-- ----------------------------------------------------------------------------
-- Hitta rader som bryter mot reglerna, och validera sedan:
--   select id, image_path from public_recipes
--   where not starts_with(image_path, published_by::text || '/');
--   select id, avatar_path from profiles
--   where avatar_path is not null and not starts_with(avatar_path, id::text || '/');
--
--   alter table public_recipes validate constraint public_recipes_image_path_owner;
--   alter table profiles validate constraint profiles_avatar_path_owner;
-- ----------------------------------------------------------------------------
