-- ============================================================================
-- Skaffa – Supabase-schema (PostgreSQL 15+)
-- Matplanering med hem-ägarskap, global frödatabas och delad inköpslista.
--
-- Bärande principer som schemat kodar:
--   * Allt ägs av ett HEM. En användare tillhör exakt ETT hem (DB-tvingat).
--   * Medlemskap skapas ALDRIG direkt av klienten. Skapa hem -> create_home(),
--     gå med -> redeem_invite(). Båda är SECURITY DEFINER och atomära.
--   * Ingredienser: global frödatabas (home_id IS NULL, ägs av Skaffa,
--     läsbar för alla, skrivbar för ingen användare) + hem-privata (home_id satt).
--   * En ingrediens har en FAST enhet, oföränderlig efter skapande.
--   * En ingrediens som används någonstans kan ALDRIG raderas (utom när hela
--     hemmet raderas – då städar cascaden).
--   * Recept ägs av hemmet. En planerad måltid REFERERAR hemmets recept
--     (ingen ögonblicksbild – hemmet tar smällen vid ändring mitt i veckan).
--   * Offentlig receptbank = fristående kopior. Publicering kräver bild, steg
--     och minst en ingrediens, och får bara ske med frö-ingredienser (v1).
--     Ingen ompublicering.
--   * Inköpslista är veckobaserad med tre radtyper: genererad, manuell,
--     återkommande. Avbockat är ett tillstånd, inte radering.
--
-- Körordning: enums -> tabeller -> vyer -> hjälpfunktioner -> RLS -> triggers
--             -> rpc -> realtid. Kör i Supabase SQL editor eller som migration.
-- ============================================================================

create extension if not exists pgcrypto;   -- gen_random_uuid(), gen_random_bytes()
create extension if not exists pg_trgm;    -- fuzzy-sökning på namn


-- ----------------------------------------------------------------------------
-- 1) ENUMS – slutna uppsättningar som appen förlitar sig på
-- ----------------------------------------------------------------------------

-- Fasta måttenheter. Fri text är förbjuden – annars kan listan inte summera.
create type unit_type as enum (
  'gram', 'deciliter', 'tesked', 'matsked', 'kryddmatt', 'styck'
);

-- Kategorier (speglar temats cat-* färger). Styr gruppering på inköpslistan.
-- 'other' är utvägen för privata ingredienser som inte passar någon annanstans;
-- utan den tvingas användaren gissa fel och listan grupperas konstigt.
create type ingredient_category as enum (
  'produce', 'protein', 'seafood', 'dairy', 'bakery', 'grains',
  'fruit', 'beverages', 'frozen', 'snacks', 'spices', 'household', 'other'
);

-- Måltidsslottar i FAST kronologisk ordning. I Postgres är enums
-- deklarationsordning också sorteringsordning, så `order by slot` ger
-- kronologisk ordning gratis — ingen separat sort_order-kolumn behövs.
-- Kanonisk uppsättning: frukost > brunch > mellanmål 1 > lunch >
-- mellanmål 2 > middag > snacks.
create type meal_slot as enum (
  'frukost', 'brunch', 'mellanmal_1', 'lunch',
  'mellanmal_2', 'middag', 'snacks'
);

create type member_role as enum ('owner', 'member');

-- Radtyp på inköpslistan. Avgör hur en rad beter sig vid omgenerering:
--   generated – ägs av generatorn, skrivs över/föräldralösmärks vid omkörning
--   manual    – skriven för hand, generatorn rör den aldrig
--   recurring – sådd ur recurring_items, en gång per lista och regel
create type list_item_source as enum ('generated', 'manual', 'recurring');

-- Kostklass för recept. Härleds ur ingrediensernas diet_tag (se vyn
-- recipe_facets), men kan överskridas manuellt per recept när härledningen
-- blir fel (t.ex. dold buljong/fisksås i ett annars "vegetariskt" recept).
create type diet_class as enum ('vegetariskt', 'kott', 'fisk');


-- ----------------------------------------------------------------------------
-- 2) PROFILER – appens läsbara spegling av auth.users
--    auth.users går inte att läsa via PostgREST, så utan den här tabellen kan
--    UI:t inte visa ett enda namn (medlemslistan, "skapat av" på recept …).
--    Raden skapas av en trigger på auth.users; klienten skapar den aldrig.
-- ----------------------------------------------------------------------------

create table profiles (
  id           uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (length(trim(display_name)) > 0),
  avatar_path  text,                              -- valfri (Storage)
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);


-- ----------------------------------------------------------------------------
-- 3) HEM & MEDLEMSKAP
--    Ägarskapet bor ENBART i home_members.role. En separat homes.owner_id vore
--    en andra sanning som driftar isär vid ägaröverlåtelse.
-- ----------------------------------------------------------------------------

create table homes (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (length(trim(name)) > 0),
  created_at  timestamptz not null default now()
);

-- Ett medlemskap per användare -> unik user_id tvingar "ett hem åt gången".
create table home_members (
  home_id     uuid not null references homes (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  role        member_role not null default 'member',
  joined_at   timestamptz not null default now(),
  primary key (home_id, user_id),
  unique (user_id)                    -- <- kärnan i "exakt ett hem"
);
create index on home_members (user_id);

-- Inbjudningstoken: flergångs, tidsbegränsad, återkallbar. Skild från home_id.
-- hex (inte base64) eftersom token hamnar i en deep link – base64:s '+' och '/'
-- överlever inte en URL.
create table invite_tokens (
  id          uuid primary key default gen_random_uuid(),
  token       text not null unique default encode(gen_random_bytes(18), 'hex'),
  home_id     uuid not null references homes (id) on delete cascade,
  created_by  uuid not null references auth.users (id) on delete cascade,
  expires_at  timestamptz not null default (now() + interval '7 days'),
  revoked     boolean not null default false,
  created_at  timestamptz not null default now()
);
create index on invite_tokens (home_id);

-- Butiksordning m.m. – delade hem-inställningar (listan är gemensam).
-- Raden skapas av create_home(); kolumndefaults skapar ingen rad av sig själva.
create table home_settings (
  home_id         uuid primary key references homes (id) on delete cascade,
  category_order  ingredient_category[] not null default array[
    'produce','fruit','bakery','protein','seafood','dairy',
    'grains','spices','snacks','beverages','frozen','household','other'
  ]::ingredient_category[],
  -- Vilka måltidsslottar som visas som tomma "lägg till"-fält i planeringen.
  -- Hem-nivå (delad plan => delad uppsättning). Styr bara synlighet av TOMMA
  -- slots; redan inplanerade måltider i en avstängd slot visas ändå.
  -- Slottarnas ordning styrs alltid av meal_slot-enumet, inte av denna array.
  visible_slots   meal_slot[] not null default array[
    'frukost','lunch','mellanmal_1','middag'
  ]::meal_slot[]
);


-- ----------------------------------------------------------------------------
-- 4) INGREDIENSER (global frödatabas + hem-privata)
--    home_id IS NULL  => frö (Skaffa-ägd, read-only för användare)
--    home_id satt      => privat, ägs av hemmet
-- ----------------------------------------------------------------------------

create table ingredients (
  id            uuid primary key default gen_random_uuid(),
  home_id       uuid references homes (id) on delete cascade,   -- NULL = frö
  name          text not null check (length(trim(name)) > 0),
  unit          unit_type not null,               -- oföränderlig (se trigger)
  category      ingredient_category not null,     -- butikshylla, inte kost
  -- Kostmarkering. NULL = neutral (grönsak, mjöl, kryddor …). Medvetet skild
  -- från category: kategorin finns för att gruppera i butiken, och där ligger
  -- tofu, linser och ägg under samma hylla som köttet. Att härleda kost ur
  -- hyllan gör varje bönrätt till en köttdrätt.
  diet_tag      diet_class check (diet_tag in ('kott', 'fisk')),
  package_size  text,                             -- valfri typisk förpackning
  created_at    timestamptz not null default now()
);
create index on ingredients (home_id);
-- Snabb fuzzy-sökning på namn (trigram).
create index ingredients_name_trgm on ingredients using gin (name gin_trgm_ops);
-- Ett namn per ägare. NULLS NOT DISTINCT gör att regeln även gäller frön
-- (home_id IS NULL). Utan den här samlar hemmet på sig tre "Mjölk" och
-- inköpslistans summering – hela poängen med appen – faller isär.
create unique index ingredients_owner_name_uniq
  on ingredients (home_id, lower(trim(name))) nulls not distinct;


-- ----------------------------------------------------------------------------
-- 5) RECEPT (hem-ägda) + rader + steg
-- ----------------------------------------------------------------------------

create table recipes (
  id            uuid primary key default gen_random_uuid(),
  home_id       uuid not null references homes (id) on delete cascade,
  name          text not null check (length(trim(name)) > 0),
  servings      integer not null check (servings > 0),   -- golv: krävs för skalning
  description   text,                                     -- valfri
  image_path    text,                                     -- valfri (Storage)
  -- Valfri tillagningstid. Kan INTE härledas ur ingredienser -> eget fält.
  -- Nullable: blockerar aldrig sparande. "Snabbt"-filtret gäller bara recept
  -- som råkar ha den ifylld (se recipe_facets.is_quick).
  prep_minutes  integer check (prep_minutes is null or prep_minutes > 0),
  -- Manuell korrigering av kostklass. NULL = använd härledningen ur
  -- ingrediensernas diet_tag (recipe_facets.diet). Satt = användaren har
  -- korrigerat och overriden vinner.
  diet_override diet_class,
  -- Hemägda, frivilliga taggar (barnvänligt, favorit, meal-prep …). Subjektiva
  -- och kan aldrig härledas -> alltid manuella. Tomt som standard.
  tags          text[] not null default '{}',
  created_by    uuid references auth.users (id) on delete set null,
  created_at    timestamptz not null default now()
);
create index on recipes (home_id);
-- GIN-index för snabb tagg-filtrering (tags @> array['barnvänligt']).
create index recipes_tags_gin on recipes using gin (tags);

create table recipe_ingredients (
  id            uuid primary key default gen_random_uuid(),
  recipe_id     uuid not null references recipes (id) on delete cascade,
  ingredient_id uuid not null references ingredients (id),  -- enhet ärvs härifrån
  amount        numeric not null check (amount > 0),
  unique (recipe_id, ingredient_id)
);
create index on recipe_ingredients (recipe_id);
create index on recipe_ingredients (ingredient_id);

-- position är deferrable så att en omsortering kan skrivas som ett enda UPDATE
-- (`set constraints all deferred`). Immediate unique dör mitt i bytet av två steg.
create table recipe_steps (
  id         uuid primary key default gen_random_uuid(),
  recipe_id  uuid not null references recipes (id) on delete cascade,
  position   integer not null,
  content    text not null,
  constraint recipe_steps_position_uniq unique (recipe_id, position)
    deferrable initially immediate
);
create index on recipe_steps (recipe_id);


-- ----------------------------------------------------------------------------
-- 5b) HÄRLEDDA RECEPTFILTER (vy)
--     En denormaliserad rad per recept med effektiv kostklass + snabb-flagga.
--     Underlag både för rutnätet i Recept-fliken och för att räkna ut vilka
--     filter som har träffar (visa aldrig ett filter som ger noll resultat).
--
--     security_invoker = on  => vyn kör med anroparens rättigheter, så RLS på
--     recipes/recipe_ingredients/ingredients gäller precis som vanligt. (PG15+)
--
--     Kostklass: override vinner; annars härledd ur ingrediensernas diet_tag.
--     Kött prioriteras före fisk (surf & turf räknas som köttdrätt) — enkel,
--     förutsägbar regel för v1.
--     "Snabbt" = tillagningstid ifylld OCH <= 20 min. Tröskeln är en konstant
--     här; kan lyftas till home_settings senare om det behövs.
-- ----------------------------------------------------------------------------

create view recipe_facets
with (security_invoker = true) as
select
  r.id,
  r.home_id,
  r.name,
  r.image_path,
  r.prep_minutes,
  (r.prep_minutes is not null and r.prep_minutes <= 20) as is_quick,
  coalesce(
    r.diet_override,
    case
      when exists (
        select 1 from recipe_ingredients ri
        join ingredients i on i.id = ri.ingredient_id
        where ri.recipe_id = r.id and i.diet_tag = 'kott'
      ) then 'kott'::diet_class
      when exists (
        select 1 from recipe_ingredients ri
        join ingredients i on i.id = ri.ingredient_id
        where ri.recipe_id = r.id and i.diet_tag = 'fisk'
      ) then 'fisk'::diet_class
      else 'vegetariskt'::diet_class
    end
  ) as diet,
  r.tags,
  r.created_at
from recipes r;

-- Så här bygger Recept-fliken en självstädande filterrad (bara filter med
-- träffar visas). Alla tre respekterar RLS via vyn ovan:
--
--   -- kostklasser som faktiskt förekommer, med antal:
--   select diet, count(*) from recipe_facets
--   where home_id = :home group by diet;
--
--   -- finns snabba recept alls?
--   select count(*) from recipe_facets
--   where home_id = :home and is_quick;
--
--   -- taggar som faktiskt används, mest använda först:
--   select tag, count(*) from recipe_facets, unnest(tags) as tag
--   where home_id = :home group by tag order by count(*) desc;


-- ----------------------------------------------------------------------------
-- 6) OFFENTLIG RECEPTBANK (fristående kopior; navelsträngen klippt)
--    Publicering kräver bild, minst ett steg och minst en ingrediens (trigger).
--    Frö-ingredienser enbart (trigger på radnivå, inte bara vid publicering).
--    Ingen ompublicering i v1 -> ingen update-policy.
-- ----------------------------------------------------------------------------

create table public_recipes (
  id             uuid primary key default gen_random_uuid(),
  name           text not null,
  servings       integer not null check (servings > 0),
  description    text,
  image_path     text not null,                 -- krävs vid publicering
  prep_minutes   integer check (prep_minutes is null or prep_minutes > 0),
  source_home_id uuid references homes (id) on delete set null,
  published_by   uuid references auth.users (id) on delete set null,
  published_at   timestamptz not null default now()
);
create index public_recipes_name_trgm
  on public_recipes using gin (name gin_trgm_ops);

create table public_recipe_ingredients (
  id                uuid primary key default gen_random_uuid(),
  public_recipe_id  uuid not null references public_recipes (id) on delete cascade,
  ingredient_id     uuid not null references ingredients (id),   -- frö enbart
  amount            numeric not null check (amount > 0),
  unique (public_recipe_id, ingredient_id)
);
create index on public_recipe_ingredients (public_recipe_id);
create index on public_recipe_ingredients (ingredient_id);

create table public_recipe_steps (
  id                uuid primary key default gen_random_uuid(),
  public_recipe_id  uuid not null references public_recipes (id) on delete cascade,
  position          integer not null,
  content           text not null,
  constraint public_recipe_steps_position_uniq unique (public_recipe_id, position)
    deferrable initially immediate
);
create index on public_recipe_steps (public_recipe_id);

-- Samma facetter som hemmets recept, så receptbanken kan filtreras med exakt
-- samma UI. Fungerar eftersom publicerade recept bara får frö-ingredienser och
-- frön har korrekt ifylld diet_tag.
create view public_recipe_facets
with (security_invoker = true) as
select
  p.id,
  p.name,
  p.image_path,
  p.prep_minutes,
  (p.prep_minutes is not null and p.prep_minutes <= 20) as is_quick,
  case
    when exists (
      select 1 from public_recipe_ingredients pri
      join ingredients i on i.id = pri.ingredient_id
      where pri.public_recipe_id = p.id and i.diet_tag = 'kott'
    ) then 'kott'::diet_class
    when exists (
      select 1 from public_recipe_ingredients pri
      join ingredients i on i.id = pri.ingredient_id
      where pri.public_recipe_id = p.id and i.diet_tag = 'fisk'
    ) then 'fisk'::diet_class
    else 'vegetariskt'::diet_class
  end as diet,
  p.published_at
from public_recipes p;


-- ----------------------------------------------------------------------------
-- 7) VECKOPLAN – planerade måltider (referens till recept, ej snapshot)
--    Flera recept per slot = flera rader. Portioner anges PER recept.
--    Unikhet på (hem, datum, slot, recept) gör sådden idempotent utan race.
-- ----------------------------------------------------------------------------

create table planned_meals (
  id          uuid primary key default gen_random_uuid(),
  home_id     uuid not null references homes (id) on delete cascade,
  meal_date   date not null,
  slot        meal_slot not null,
  recipe_id   uuid not null references recipes (id) on delete cascade,
  servings    integer not null check (servings > 0),   -- skalning vid inplanering
  created_at  timestamptz not null default now(),
  unique (home_id, meal_date, slot, recipe_id)
);
create index on planned_meals (home_id, meal_date);


-- ----------------------------------------------------------------------------
-- 7b) STÅENDE (ÅTERKOMMANDE) MÅLTIDER
--     En mall per hem: recept + slot + vilka veckodagar den gäller. Sås in i
--     varje NY vecka som vanliga planned_meals (se seed_standing_meals nedan).
--     Efter sådd är instanserna heltvanliga rader — byt/ta bort som vilken
--     annan måltid. Ingen undantagsdata; regeln rör bara framtida veckor.
--     weekdays: ISO-veckodag 1=mån … 7=sön. UI-mönstren (varje dag / vardagar /
--     helger / vissa dagar) är bara olika delmängder och härleds i klienten.
-- ----------------------------------------------------------------------------

create table standing_meals (
  id          uuid primary key default gen_random_uuid(),
  home_id     uuid not null references homes (id) on delete cascade,
  recipe_id   uuid not null references recipes (id) on delete cascade,  -- referens
  slot        meal_slot not null,
  weekdays    smallint[] not null
                check (cardinality(weekdays) between 1 and 7
                       and weekdays <@ array[1,2,3,4,5,6,7]::smallint[]),
  servings    integer not null check (servings > 0),
  created_by  uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now(),
  unique (home_id, recipe_id, slot)   -- samma recept två ggr i samma slot = meningslöst
);
create index on standing_meals (home_id);

-- Markör: vilka (hem, vecka) som redan fått sina stående måltider sådda.
-- Garanterar att sådden körs EXAKT en gång per vecka, så en måltid du tagit
-- bort en enskild vecka aldrig återuppstår nästa gång veckan öppnas.
create table seeded_weeks (
  home_id     uuid not null references homes (id) on delete cascade,
  week_start  date not null check (extract(isodow from week_start) = 1),
  seeded_at   timestamptz not null default now(),
  primary key (home_id, week_start)
);


-- ----------------------------------------------------------------------------
-- 8) INKÖPSLISTA – en per hem per vecka + rader
--    week_start måste vara en måndag; annars ger en klientbugg två "veckor"
--    för samma vecka och unique (home_id, week_start) fångar ingenting.
-- ----------------------------------------------------------------------------

create table shopping_lists (
  id           uuid primary key default gen_random_uuid(),
  home_id      uuid not null references homes (id) on delete cascade,
  week_start   date not null check (extract(isodow from week_start) = 1),
  total_cost   numeric check (total_cost >= 0),  -- valfritt totalbelopp
  generated_at timestamptz,                      -- null tills första generering
  created_at   timestamptz not null default now(),
  unique (home_id, week_start)
);
create index on shopping_lists (home_id);

create table shopping_list_items (
  id                uuid primary key default gen_random_uuid(),
  list_id           uuid not null references shopping_lists (id) on delete cascade,
  source            list_item_source not null,
  -- Genererade rader pekar på ingrediens; manuella fri-text-rader gör inte det.
  ingredient_id     uuid references ingredients (id),
  -- Sådd ur en återkommande-regel. Låter generatorn se att raden redan finns
  -- utan att matcha på namn. Regeln kan tas bort utan att raden försvinner.
  recurring_item_id uuid,                      -- FK läggs på efter recurring_items
  name              text not null,               -- alltid satt för rendering
  amount            numeric check (amount is null or amount > 0),
  unit              unit_type,                   -- null för enhetslös fri-text
  category          ingredient_category,
  checked           boolean not null default false, -- avbockad -> sjunker till botten
  is_orphaned       boolean not null default false, -- planen kräver ej längre raden
  created_at        timestamptz not null default now(),
  -- Genererade rader ska ha en ingrediens; annat är fri text.
  check (source <> 'generated' or ingredient_id is not null)
);
create index on shopping_list_items (list_id);
create index on shopping_list_items (ingredient_id);
-- Låter generatorn uppdatera i stället för att duplicera vid omkörning. Att
-- constrainten är partiell är hela poängen: manuella rader med samma ingrediens
-- får finnas parallellt, generatorns rad är unik.
create unique index shopping_list_items_generated_uniq
  on shopping_list_items (list_id, ingredient_id)
  where source = 'generated';
create unique index shopping_list_items_recurring_uniq
  on shopping_list_items (list_id, recurring_item_id)
  where source = 'recurring';

-- Återkommande varor: regler som lever mellan veckor (hanteras i Profil).
-- Sås som source='recurring' i varje ny veckolista av generate_shopping_list().
create table recurring_items (
  id            uuid primary key default gen_random_uuid(),
  home_id       uuid not null references homes (id) on delete cascade,
  ingredient_id uuid references ingredients (id),  -- valfritt (kan vara fri text)
  name          text not null,
  amount        numeric check (amount is null or amount > 0),
  unit          unit_type,
  created_at    timestamptz not null default now()
);
create index on recurring_items (home_id);
create index on recurring_items (ingredient_id);

-- FK:n från shopping_list_items deklareras här eftersom recurring_items
-- skapas efter tabellen som pekar på den.
alter table shopping_list_items
  add constraint shopping_list_items_recurring_item_fkey
  foreign key (recurring_item_id) references recurring_items (id) on delete set null;


-- ============================================================================
-- 9) HJÄLPFUNKTIONER
--    SECURITY DEFINER => kör med ägarrättigheter och kringgår RLS. Detta är
--    avsiktligt: annars blir home_members-policyn rekursiv (policyn frågar
--    home_members, som utlöser policyn, som frågar home_members ...).
-- ============================================================================

create or replace function is_home_member(_home_id uuid)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from home_members
    where home_id = _home_id and user_id = auth.uid()
  );
$$;

create or replace function is_home_owner(_home_id uuid)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1 from home_members
    where home_id = _home_id and user_id = auth.uid() and role = 'owner'
  );
$$;

-- Anroparens hem, eller NULL. Entydig tack vare unique (user_id) på
-- home_members – "exakt ett hem" gör den här enradiga funktionen möjlig, och
-- det är den som gör RLS billig (se kommentaren vid policy-avsnittet).
create or replace function current_home_id()
returns uuid language sql security definer stable
set search_path = public as $$
  select home_id from home_members where user_id = auth.uid();
$$;

-- Delar anroparen hem med _user_id? Driver profil-synligheten.
create or replace function shares_home_with(_user_id uuid)
returns boolean language sql security definer stable
set search_path = public as $$
  select exists (
    select 1
    from home_members me
    join home_members them on them.home_id = me.home_id
    where me.user_id = auth.uid() and them.user_id = _user_id
  );
$$;

-- Måndagen i den ISO-vecka datumet ligger i.
create or replace function week_monday(_d date)
returns date language sql immutable as $$
  select (date_trunc('week', _d::timestamp))::date;
$$;


-- ============================================================================
-- 10) RLS – aktivera på allt och lås ner
--     `to authenticated` gör att policyn inte ens utvärderas för anon-rollen.
--
--     Perf: hetvägen skrivs som `home_id = (select current_home_id())`, inte
--     som `is_home_member(home_id)`. Skillnaden är att det förra uttrycket inte
--     refererar raden – planeraren lyfter det till en InitPlan och kör det EN
--     gång per fråga, medan varje radberoende variant blir ett SubPlan som körs
--     per rad. (Att svepa `is_home_member(home_id)` i en subselect hjälper inte:
--     korrelationen finns kvar.) Att det här ens går att skriva så är en direkt
--     utdelning på "exakt ett hem"-invarianten.
--
--     is_home_owner() får stå kvar där den används – de policyerna rör en
--     handfull rader (hemmet självt, medlemmar, tokens), inte listor.
-- ============================================================================

alter table profiles                  enable row level security;
alter table homes                     enable row level security;
alter table home_members              enable row level security;
alter table invite_tokens             enable row level security;
alter table home_settings             enable row level security;
alter table ingredients               enable row level security;
alter table recipes                   enable row level security;
alter table recipe_ingredients        enable row level security;
alter table recipe_steps              enable row level security;
alter table public_recipes            enable row level security;
alter table public_recipe_ingredients enable row level security;
alter table public_recipe_steps       enable row level security;
alter table planned_meals             enable row level security;
alter table standing_meals            enable row level security;
alter table seeded_weeks              enable row level security;
alter table shopping_lists            enable row level security;
alter table shopping_list_items       enable row level security;
alter table recurring_items           enable row level security;

-- ---- PROFILES --------------------------------------------------------------
-- Läs: sin egen + hemkompisarnas. Aldrig hela användarregistret.
create policy profiles_select on profiles for select to authenticated
  using (id = (select auth.uid()) or shares_home_with(id));
-- Raden skapas normalt av triggern på auth.users; self-insert finns som
-- självläkning om triggern inte hunnit/funnits.
create policy profiles_insert on profiles for insert to authenticated
  with check (id = (select auth.uid()));
create policy profiles_update on profiles for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- ---- HOMES -----------------------------------------------------------------
-- Ingen insert-policy: hem skapas ENBART via create_home(). En direktinsert
-- kunde ändå inte fungera – select-policyn kräver ett medlemskap som inte
-- finns än, så `insert ... returning` hade gett tomt tillbaka, och kraschade
-- klienten mellan de två anropen låg hemmet kvar utan ägare och gick varken
-- att se eller radera.
create policy homes_select on homes for select to authenticated
  using (id = (select current_home_id()));
create policy homes_update on homes for update to authenticated
  using (is_home_owner(id))
  with check (is_home_owner(id));
create policy homes_delete on homes for delete to authenticated
  using (is_home_owner(id));                     -- radering (med app-friktion)

-- ---- HOME_MEMBERS ----------------------------------------------------------
-- Ingen insert-policy heller här: create_home() och redeem_invite() är definer
-- och kringgår RLS. Utan den regeln kunde vem som helst foga in sig i ett känt
-- home_id och gå runt token-flödet helt.
create policy members_select on home_members for select to authenticated
  using (home_id = (select current_home_id()));  -- se sina medmedlemmar
create policy members_update on home_members for update to authenticated
  using (is_home_owner(home_id))                 -- t.ex. ägaröverlåtelse
  with check (is_home_owner(home_id));
create policy members_delete on home_members for delete to authenticated
  using (user_id = (select auth.uid()) or is_home_owner(home_id));

-- ---- INVITE_TOKENS ---------------------------------------------------------
-- Ägaren hanterar sina tokens. Inlösen sker inte via select här utan via
-- redeem_invite() (definer), så en icke-medlem aldrig behöver läsa tabellen.
create policy tokens_select on invite_tokens for select to authenticated
  using (is_home_owner(home_id));
create policy tokens_insert on invite_tokens for insert to authenticated
  with check (is_home_owner(home_id) and created_by = (select auth.uid()));
create policy tokens_update on invite_tokens for update to authenticated
  using (is_home_owner(home_id))                 -- återkalla
  with check (is_home_owner(home_id));

-- ---- HOME_SETTINGS ---------------------------------------------------------
create policy settings_all on home_settings for all to authenticated
  using (home_id = (select current_home_id()))
  with check (home_id = (select current_home_id()));

-- ---- INGREDIENTS -----------------------------------------------------------
-- Läs: frö (home_id null) för alla inloggade + egna hem-privata.
create policy ingredients_select on ingredients for select to authenticated
  using (home_id is null or home_id = (select current_home_id()));
-- Skapa: bara hem-privata. Ingen användare kan skapa frö (home_id måste vara satt).
create policy ingredients_insert on ingredients for insert to authenticated
  with check (home_id = (select current_home_id()));
-- Ändra: bara egna hem-privata (frö är read-only). Enhet skyddas av trigger.
create policy ingredients_update on ingredients for update to authenticated
  using (home_id = (select current_home_id()))
  with check (home_id = (select current_home_id()));
-- Radera: bara egna, och "oanvänd" bevakas av trigger.
create policy ingredients_delete on ingredients for delete to authenticated
  using (home_id = (select current_home_id()));

-- ---- RECIPES ---------------------------------------------------------------
create policy recipes_all on recipes for all to authenticated
  using (home_id = (select current_home_id()))
  with check (home_id = (select current_home_id()));

create policy recipe_ing_all on recipe_ingredients for all to authenticated
  using (exists (select 1 from recipes r
                 where r.id = recipe_id and r.home_id = (select current_home_id())))
  with check (exists (select 1 from recipes r
                 where r.id = recipe_id and r.home_id = (select current_home_id())));

create policy recipe_steps_all on recipe_steps for all to authenticated
  using (exists (select 1 from recipes r
                 where r.id = recipe_id and r.home_id = (select current_home_id())))
  with check (exists (select 1 from recipes r
                 where r.id = recipe_id and r.home_id = (select current_home_id())));

-- ---- PUBLIC RECIPES (läsbara för alla inloggade; skapas av källhemmet) ------
create policy public_recipes_select on public_recipes for select to authenticated
  using (true);
create policy public_recipes_insert on public_recipes for insert to authenticated
  with check (source_home_id = (select current_home_id())
              and published_by = (select auth.uid()));
create policy public_recipes_delete on public_recipes for delete to authenticated
  using (published_by = (select auth.uid()));    -- ingen update -> ingen omdelning

create policy public_ri_select on public_recipe_ingredients for select to authenticated
  using (true);
create policy public_ri_insert on public_recipe_ingredients for insert to authenticated
  with check (exists (select 1 from public_recipes p
              where p.id = public_recipe_id
                and p.source_home_id = (select current_home_id())));

create policy public_rs_select on public_recipe_steps for select to authenticated
  using (true);
create policy public_rs_insert on public_recipe_steps for insert to authenticated
  with check (exists (select 1 from public_recipes p
              where p.id = public_recipe_id
                and p.source_home_id = (select current_home_id())));

-- ---- PLANNED MEALS ---------------------------------------------------------
create policy meals_all on planned_meals for all to authenticated
  using (home_id = (select current_home_id()))
  with check (home_id = (select current_home_id()));

-- ---- STÅENDE MÅLTIDER + sådd-markör ----------------------------------------
create policy standing_all on standing_meals for all to authenticated
  using (home_id = (select current_home_id()))
  with check (home_id = (select current_home_id()));

create policy seeded_weeks_all on seeded_weeks for all to authenticated
  using (home_id = (select current_home_id()))
  with check (home_id = (select current_home_id()));

-- ---- SHOPPING LISTS + ITEMS (realtid inom hemmet) --------------------------
create policy lists_all on shopping_lists for all to authenticated
  using (home_id = (select current_home_id()))
  with check (home_id = (select current_home_id()));

create policy list_items_all on shopping_list_items for all to authenticated
  using (exists (select 1 from shopping_lists l
                 where l.id = list_id and l.home_id = (select current_home_id())))
  with check (exists (select 1 from shopping_lists l
                 where l.id = list_id and l.home_id = (select current_home_id())));

create policy recurring_all on recurring_items for all to authenticated
  using (home_id = (select current_home_id()))
  with check (home_id = (select current_home_id()));


-- ============================================================================
-- 11) TRIGGERS – invarianter som RLS inte kan uttrycka
-- ============================================================================

-- (a) Profil skapas automatiskt för varje ny auth-användare.
--     Får ALDRIG kasta: ett fel här sänker hela registreringen. Därför
--     coalesce-kedja ner till en garanterad fallback, och do nothing vid krock.
create or replace function handle_new_user()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  insert into profiles (id, display_name)
  values (
    new.id,
    coalesce(
      nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
      nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
      nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
      'Användare'
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Backfill för användare som redan finns när schemat körs.
insert into profiles (id, display_name)
select u.id,
       coalesce(
         nullif(trim(u.raw_user_meta_data ->> 'display_name'), ''),
         nullif(trim(u.raw_user_meta_data ->> 'full_name'), ''),
         nullif(split_part(coalesce(u.email, ''), '@', 1), ''),
         'Användare'
       )
from auth.users u
on conflict (id) do nothing;

create or replace function touch_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end;
$$;
create trigger trg_profiles_updated_at
  before update on profiles
  for each row execute function touch_updated_at();

-- (b) Ingrediensens enhet är oföränderlig efter skapande.
create or replace function guard_ingredient_unit()
returns trigger language plpgsql as $$
begin
  if new.unit <> old.unit then
    raise exception 'Ingrediensens enhet kan inte ändras efter skapande';
  end if;
  -- Skydda även mot att flytta en privat ingrediens till/från frö.
  if new.home_id is distinct from old.home_id then
    raise exception 'En ingrediens ägarskap (home_id) kan inte ändras';
  end if;
  return new;
end;
$$;
create trigger trg_ingredient_unit
  before update on ingredients
  for each row execute function guard_ingredient_unit();

-- (c) En ingrediens som används någonstans kan aldrig raderas.
--     UNDANTAG: när hela hemmet raderas. FK-cascadetriggers fyras i den ordning
--     constraints skapades, och ingredients-FK:n skapas före recipes-FK:n – så
--     vid `delete from homes` raderas ingredienserna FÖRST och guarden hade
--     stoppat varje hemradering där en privat ingrediens används i ett recept.
--     När cascaden kör är föräldraraden i homes redan borta; det är signalen.
create or replace function guard_ingredient_delete()
returns trigger language plpgsql as $$
begin
  if old.home_id is not null
     and not exists (select 1 from homes where id = old.home_id) then
    return old;                                  -- hemmet raderas, låt cascaden gå
  end if;

  if exists (select 1 from recipe_ingredients where ingredient_id = old.id)
     or exists (select 1 from public_recipe_ingredients where ingredient_id = old.id)
     or exists (select 1 from shopping_list_items where ingredient_id = old.id)
     or exists (select 1 from recurring_items where ingredient_id = old.id) then
    raise exception 'Ingrediensen används och kan inte raderas';
  end if;
  return old;
end;
$$;
create trigger trg_ingredient_delete
  before delete on ingredients
  for each row execute function guard_ingredient_delete();

-- (d) Publicerade recept får bara innehålla frö-ingredienser. Kontrollen sitter
--     på raden, inte bara på publiceringen: insert-policyn tillåter en medlem
--     att lägga till rader i ett redan publicerat recept i en senare
--     transaktion, och då hade en commit-time-kontroll på public_recipes aldrig
--     kört.
create or replace function guard_public_recipe_seed_only()
returns trigger language plpgsql as $$
begin
  if exists (select 1 from ingredients i
             where i.id = new.ingredient_id and i.home_id is not null) then
    raise exception 'Publicerade recept får endast innehålla ingredienser ur frödatabasen';
  end if;
  return new;
end;
$$;
create trigger trg_public_ri_seed_only
  before insert or update on public_recipe_ingredients
  for each row execute function guard_public_recipe_seed_only();

-- (e) Publicering kräver minst ett steg och minst en ingrediens. Körs på
--     committime (constraint trigger) så att steg- och ingrediensrader hunnit
--     skrivas i samma transaktion. (image_path not null sköts av kolumnen.)
create or replace function guard_publish_requirements()
returns trigger language plpgsql as $$
begin
  if not exists (select 1 from public_recipe_steps where public_recipe_id = new.id) then
    raise exception 'Publicering kräver minst ett tillagningssteg';
  end if;
  if not exists (select 1 from public_recipe_ingredients where public_recipe_id = new.id) then
    raise exception 'Publicering kräver minst en ingrediens';
  end if;
  return new;
end;
$$;
create constraint trigger trg_publish_requirements
  after insert on public_recipes
  deferrable initially deferred
  for each row execute function guard_publish_requirements();


-- ============================================================================
-- 12) RPC – hem: skapa och gå med
--     Båda SECURITY DEFINER: de skriver i home_members, som medvetet saknar
--     insert-policy. Båda tvingar "exakt ett hem".
-- ============================================================================

-- Skapar hem + ägarmedlemskap + inställningsrad i EN transaktion och returnerar
-- hemmets id. Klienten läser sedan hemmet på vanligt sätt – medlemskapet finns
-- redan, så select-policyn släpper igenom.
create or replace function create_home(_name text)
returns uuid language plpgsql security definer
set search_path = public as $$
declare
  _home uuid;
begin
  if auth.uid() is null then
    raise exception 'Ej inloggad';
  end if;

  if length(trim(coalesce(_name, ''))) = 0 then
    raise exception 'Hemmet måste ha ett namn';
  end if;

  if exists (select 1 from home_members where user_id = auth.uid()) then
    raise exception 'Du är redan med i ett hem – lämna det först';
  end if;

  insert into homes (name) values (trim(_name)) returning id into _home;
  insert into home_members (home_id, user_id, role) values (_home, auth.uid(), 'owner');
  insert into home_settings (home_id) values (_home);

  return _home;
end;
$$;

-- Raderar ett hem och allt det äger. Bara ägaren.
--
-- Varför en RPC i stället för `delete from homes`: cascaden ensam är känslig för
-- i vilken ordning FK-triggers råkar fyra. Raderas ingredients före recipes
-- hinner guard_ingredient_delete säga "ingrediensen används" och hela
-- raderingen rullas tillbaka. Guarden har ett undantag för just det fallet, men
-- att i stället tömma barnen i uttalad ordning gör resultatet oberoende av
-- Postgres interna triggerordning – och ger ett ställe att hänga app-friktionen
-- ("skriv hemmets namn för att bekräfta") på.
create or replace function delete_home(_home_id uuid)
returns void language plpgsql security definer
set search_path = public as $$
begin
  if not is_home_owner(_home_id) then
    raise exception 'Bara hemmets ägare kan radera det';
  end if;

  delete from standing_meals  where home_id = _home_id;
  delete from planned_meals   where home_id = _home_id;
  delete from shopping_lists  where home_id = _home_id;   -- cascadar till rader
  delete from recurring_items where home_id = _home_id;
  delete from recipes         where home_id = _home_id;   -- cascadar till rader/steg
  -- Nu är inga hem-privata ingredienser längre använda.
  delete from homes           where id = _home_id;        -- cascadar resten
end;
$$;

-- Löser in en inbjudningstoken. Validerar token, tvingar "ett hem",
-- skapar medlemskap och returnerar hemmets id.
create or replace function redeem_invite(_token text)
returns uuid language plpgsql security definer
set search_path = public as $$
declare
  _home uuid;
begin
  if auth.uid() is null then
    raise exception 'Ej inloggad';
  end if;

  select home_id into _home
  from invite_tokens
  where token = _token
    and not revoked
    and expires_at > now();

  if _home is null then
    raise exception 'Inbjudan har gått ut eller är ogiltig';
  end if;

  if exists (select 1 from home_members where user_id = auth.uid()) then
    raise exception 'Du är redan med i ett hem – lämna det först';
  end if;

  insert into home_members (home_id, user_id, role)
  values (_home, auth.uid(), 'member');

  return _home;
end;
$$;


-- ============================================================================
-- 13) RPC – så stående måltider för en vecka (SECURITY DEFINER; idempotent)
--      Klienten anropar denna när en vecka öppnas. Kör bara om veckan inte
--      redan är sådd (seeded_weeks-markören), så exakt en gång per hem+vecka.
--      Lägger en planned_meal per (regel × matchande veckodag). Rör ALDRIG en
--      redan sådd vecka -> raderingar består.
-- ============================================================================

create or replace function seed_standing_meals(_home_id uuid, _week_start date)
returns void language plpgsql security definer
set search_path = public as $$
begin
  if not is_home_member(_home_id) then
    raise exception 'Inte medlem i hemmet';
  end if;

  _week_start := week_monday(_week_start);

  -- Vinn kapplöpningen om markören; misslyckas den fanns veckan redan.
  insert into seeded_weeks (home_id, week_start)
  values (_home_id, _week_start)
  on conflict (home_id, week_start) do nothing;

  if not found then
    return;                                  -- redan sådd -> gör inget
  end if;

  insert into planned_meals (home_id, meal_date, slot, recipe_id, servings)
  select s.home_id,
         _week_start + (d.dow - 1),          -- dow 1..7 -> mån..sön
         s.slot, s.recipe_id, s.servings
  from standing_meals s
  cross join lateral unnest(s.weekdays) as d(dow)
  where s.home_id = _home_id
  on conflict (home_id, meal_date, slot, recipe_id) do nothing;
end;
$$;


-- ============================================================================
-- 14) RPC – generera veckans inköpslista (SECURITY DEFINER; idempotent)
--      Motorn: summerar veckans planerade måltider till ingrediensrader.
--
--      Mängd per ingrediens = Σ (receptrad.amount × måltid.servings / recept.servings)
--      över alla planerade måltider mån–sön. Enheten kommer alltid från
--      ingrediensen, aldrig från receptraden – därför är summan alltid giltig.
--
--      Vad omkörning gör (och inte gör):
--        * manual-rader                – rörs aldrig
--        * checked                     – bevaras, även när mängden ändras
--        * rad som planen inte längre kräver -> is_orphaned = true, INTE raderad
--        * rad som kommer tillbaka     -> is_orphaned = false igen
--        * recurring-regler            -> sås en gång per lista, aldrig dubbelt
--
--      Mängder avrundas till 2 decimaler. Att avrunda uppåt till hel förpackning
--      är ett butiksbeslut som hör hemma i UI:t, inte här.
-- ============================================================================

create or replace function generate_shopping_list(_home_id uuid, _week_start date)
returns uuid language plpgsql security definer
set search_path = public as $$
declare
  _list uuid;
begin
  if not is_home_member(_home_id) then
    raise exception 'Inte medlem i hemmet';
  end if;

  _week_start := week_monday(_week_start);

  -- Hämta eller skapa veckans lista.
  insert into shopping_lists (home_id, week_start)
  values (_home_id, _week_start)
  on conflict (home_id, week_start) do nothing;

  select id into _list
  from shopping_lists
  where home_id = _home_id and week_start = _week_start;

  -- Föräldralösmärk allt genererat först; upserten nedan tar tillbaka det som
  -- fortfarande behövs. Ett pass, inget behov av att hålla mängden två gånger.
  update shopping_list_items
  set is_orphaned = true
  where list_id = _list and source = 'generated' and not is_orphaned;

  insert into shopping_list_items
    (list_id, source, ingredient_id, name, amount, unit, category, is_orphaned)
  select _list,
         'generated',
         i.id,
         i.name,
         round(sum(ri.amount * pm.servings::numeric / r.servings), 2),
         i.unit,
         i.category,
         false
  from planned_meals pm
  join recipes r             on r.id = pm.recipe_id
  join recipe_ingredients ri on ri.recipe_id = r.id
  join ingredients i         on i.id = ri.ingredient_id
  where pm.home_id = _home_id
    and pm.meal_date between _week_start and _week_start + 6
  group by i.id, i.name, i.unit, i.category
  -- checked står medvetet inte med i do update: har du redan lagt varan i
  -- vagnen ska en omgenerering inte bocka av den åt dig igen.
  on conflict (list_id, ingredient_id) where source = 'generated'
  do update set
    amount      = excluded.amount,
    name        = excluded.name,
    unit        = excluded.unit,
    category    = excluded.category,
    is_orphaned = false;

  -- Så hemmets återkommande varor. Partiella unika indexet gör det till en
  -- no-op andra gången, så en bortbockad återkommande vara inte återuppstår.
  insert into shopping_list_items
    (list_id, source, ingredient_id, recurring_item_id, name, amount, unit, category)
  select _list,
         'recurring',
         rec.ingredient_id,
         rec.id,
         rec.name,
         rec.amount,
         coalesce(rec.unit, i.unit),
         i.category
  from recurring_items rec
  left join ingredients i on i.id = rec.ingredient_id
  where rec.home_id = _home_id
  on conflict (list_id, recurring_item_id) where source = 'recurring'
  do nothing;

  update shopping_lists set generated_at = now() where id = _list;

  return _list;
end;
$$;


-- ============================================================================
-- 15) REALTID – publicera de tabeller butiksläget behöver
-- ============================================================================

alter publication supabase_realtime add table shopping_lists;
alter publication supabase_realtime add table shopping_list_items;
alter publication supabase_realtime add table planned_meals;

-- ============================================================================
-- Klart. Nästa steg utanför detta schema:
--   * Klienten: skapa hem via `select create_home('Namn')`, gå med via
--     `select redeem_invite(token)`, radera via `select delete_home(id)`.
--     Ingen direkt insert i homes/home_members.
--   * När en vecka öppnas i planeringen: `select seed_standing_meals(hem, måndag)`
--     (billig no-op efter första gången), och `select generate_shopping_list(
--     hem, måndag)` när listan ska räknas om. Sådden först, generatorn sedan.
--   * Seeda ingredients med de vanligaste frö-varorna (home_id NULL) via en
--     separat seed-migration eller service-role-skript. Sätt diet_tag på kött-
--     och fiskvarorna där – hela kostfiltret hänger på den kolumnen.
--   * Storage-buckets för receptbilder + avatarer, med policies.
--   * Ägaröverlåtelse / ensam-ägare-lämnar hanteras i app-logik ovanpå
--     members_update / members_delete / homes_delete.
-- ============================================================================
