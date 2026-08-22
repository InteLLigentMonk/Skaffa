-- ============================================================================
-- Skaffa – Storage-policies för buckets: recipes, public_recipes, profile
-- Kör EFTER skaffa_schema.sql. En nyskapad bucket har inga policies, vilket
-- betyder att ingenting går att läsa eller skriva från klienten alls.
--
-- SÖKVÄGSKONVENTION (policyerna hänger helt på den – bryts den, bryts skyddet):
--   recipes/<home_id>/<uuid>.<ext>          hem-privat receptbild
--   public_recipes/<user_id>/<uuid>.<ext>   publicerad receptbild
--   profile/<user_id>/<uuid>.<ext>          avatar
--
-- Kolumnen image_path / avatar_path lagrar hela objektsökvägen inklusive
-- mappen, alltså 'a1b2.../c3d4....jpg' – inte bara filnamnet.
--
-- Mappen jämförs som TEXT mot uuid::text, aldrig tvärtom. Ett `::uuid`-cast på
-- mappnamnet hade kastat fel i stället för att neka när någon laddar upp till
-- en sökväg som inte är ett uuid, och ett fel i en policy blir 500, inte 403.
-- ============================================================================


-- ----------------------------------------------------------------------------
-- 1) Bucket-synlighet
--    public = true  -> objekten nås via CDN utan token. Bra för receptbanken:
--                      bilderna är ändå offentliga, och slipp signerade URL:er
--                      som går ut mitt i en scroll.
--    public = false -> kräver signerad URL eller auth-header. Rätt för hemmets
--                      egna bilder och avatarer.
--
--    Obs: i en publik bucket gäller INTE select-policyn för CDN-hämtning – den
--    styr bara list/API. Sekretessen i public_recipes vilar alltså på att
--    sökvägen är ogissbar, vilket är rimligt för redan publicerat material.
-- ----------------------------------------------------------------------------

update storage.buckets set public = false where id in ('recipes', 'profile');
update storage.buckets set public = true  where id = 'public_recipes';


-- ----------------------------------------------------------------------------
-- 2) recipes – hemmets egna receptbilder
--    Alla i hemmet får läsa, ladda upp, byta ut och radera. Bilden ägs av
--    hemmet, inte av den som råkade fota den.
-- ----------------------------------------------------------------------------

create policy "recipes select" on storage.objects for select to authenticated
  using (
    bucket_id = 'recipes'
    and (storage.foldername(name))[1] = (select current_home_id())::text
  );

create policy "recipes insert" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'recipes'
    and (storage.foldername(name))[1] = (select current_home_id())::text
  );

create policy "recipes update" on storage.objects for update to authenticated
  using (
    bucket_id = 'recipes'
    and (storage.foldername(name))[1] = (select current_home_id())::text
  )
  with check (
    bucket_id = 'recipes'
    and (storage.foldername(name))[1] = (select current_home_id())::text
  );

create policy "recipes delete" on storage.objects for delete to authenticated
  using (
    bucket_id = 'recipes'
    and (storage.foldername(name))[1] = (select current_home_id())::text
  );


-- ----------------------------------------------------------------------------
-- 3) public_recipes – bilder till den offentliga receptbanken
--    Läsning sker via CDN (public bucket). Select-policyn finns ändå för
--    API-anrop. Skrivning: bara i sin egen mapp, och bara sitt eget objekt
--    får ändras/raderas – speglar public_recipes_delete i schemat, där bara
--    published_by får ta bort sitt recept.
--
--    storage.objects.owner sätts automatiskt till auth.uid() vid uppladdning,
--    så den är en säkrare grund för update/delete än sökvägen.
-- ----------------------------------------------------------------------------

create policy "public_recipes select" on storage.objects for select to authenticated
  using (bucket_id = 'public_recipes');

create policy "public_recipes insert" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'public_recipes'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "public_recipes update" on storage.objects for update to authenticated
  using (bucket_id = 'public_recipes' and owner = (select auth.uid()))
  with check (bucket_id = 'public_recipes' and owner = (select auth.uid()));

create policy "public_recipes delete" on storage.objects for delete to authenticated
  using (bucket_id = 'public_recipes' and owner = (select auth.uid()));


-- ----------------------------------------------------------------------------
-- 4) profile – avatarer
--    Läs: sin egen + hemkompisarnas, exakt samma krets som profiles-tabellen.
--    Skriv: bara sin egen mapp.
-- ----------------------------------------------------------------------------

create policy "profile select" on storage.objects for select to authenticated
  using (
    bucket_id = 'profile'
    and (
      (storage.foldername(name))[1] = (select auth.uid())::text
      or exists (
        select 1 from home_members m
        where m.home_id = (select current_home_id())
          and m.user_id::text = (storage.foldername(name))[1]
      )
    )
  );

create policy "profile insert" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'profile'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "profile update" on storage.objects for update to authenticated
  using (
    bucket_id = 'profile'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  )
  with check (
    bucket_id = 'profile'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );

create policy "profile delete" on storage.objects for delete to authenticated
  using (
    bucket_id = 'profile'
    and (storage.foldername(name))[1] = (select auth.uid())::text
  );


-- ============================================================================
-- Kvar att lösa utanför den här filen:
--   * Föräldralösa filer. Raderas ett recept försvinner raden men inte bilden –
--     Postgres känner inte till Storage. Antingen en after delete-trigger som
--     lägger sökvägen i en städkö, eller ett schemalagt jobb som jämför
--     storage.objects mot recipes.image_path. Inget av det är gratis, men utan
--     det växer bucketen monotont.
--   * Signerade URL:er för recipes och profile (createSignedUrl), eftersom de
--     bucketarna är privata. Sätt en giltighetstid som överlever en session –
--     expo-image cachar på URL, så korta TTL:er ger onödiga omhämtningar.
-- ============================================================================
