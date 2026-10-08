-- ----------------------------------------------------------------------------
-- Likhetströskeln i sök-RPC:erna: 0.3, uttryckt i SQL i stället för som GUC.
--
-- Förra migrationen satte tröskeln med `set pg_trgm.word_similarity_threshold`
-- i funktionsdefinitionen och använde operatorn <%. Det är skört på Supabase:
-- är pg_trgm-biblioteket inte laddat i sessionen när parametern sätts, blir den
-- en okänd platshållare som bara en superuser får sätta. `alter function … set`
-- dog på exakt det ("permission denied to set parameter"), och samma sak kan
-- hända när rollen authenticated anropar funktionen. Ett rakt
-- word_similarity(q, name) >= 0.3 kräver inga rättigheter och läses direkt.
--
-- Priset är att likhetsgrenen inte kan använda trigramindexet (<% kan, ett
-- funktionsanrop med jämförelse kan inte). Det är rimligt i v1: RLS begränsar
-- hemmets recept till ett hem, och vyerna räknar ändå ut kostklassen rad för
-- rad. Blir receptbanken stor är vägen tillbaka att ladda pg_trgm i
-- databasens shared_preload_libraries eller att filtrera med % först.
--
-- Tröskeln är uppmätt mot den riktiga databasen (word_similarity):
--   kotbular  → Köttbullar med potatismos   0.36   ← missades med 0.4
--   lasange   → Lasagne                     0.50
--   soppa     → Sopa de ajo                 0.57
--   kött      → Kycklinggryta               0.20   brus
--   fisk      → Fläskfilé                   0.20   brus
--   kyckling  → Köttfärssås                 0.11   brus
-- 0.3 ligger mellan de två grupperna.
--
-- create or replace skriver om hela definitionen, inklusive set-klausulerna,
-- så GUC:n från förra migrationen försvinner här.
-- ----------------------------------------------------------------------------

create or replace function search_home_recipes(
  _query  text       default null,
  _quick  boolean    default false,
  _diet   diet_class default null,
  _limit  int        default 20,
  _offset int        default 0
)
returns setof recipe_facets
language sql stable
set search_path = public
as $$
  select f.*
  from recipe_facets f,
       -- q = trimmad sökterm eller null. like_q = samma med %, _ och \
       -- escapade, så en sökning på "50%" inte blir ett wildcard.
       lateral (
         select nullif(trim(_query), '') as q
       ) p,
       lateral (
         select replace(replace(replace(p.q, '\', '\\'), '%', '\%'), '_', '\_')
           as like_q
       ) e
  where (p.q is null
         or f.name ilike '%' || e.like_q || '%'
         or word_similarity(p.q, f.name) >= 0.3)
    and (not coalesce(_quick, false) or f.is_quick)
    and (_diet is null or f.diet = _diet)
  order by
    case when p.q is null then 0 else word_similarity(p.q, f.name) end desc,
    f.created_at desc,
    f.id
  limit least(greatest(coalesce(_limit, 20), 1), 100)
  offset greatest(coalesce(_offset, 0), 0);
$$;


create or replace function search_public_recipes(
  _query  text       default null,
  _quick  boolean    default false,
  _diet   diet_class default null,
  _limit  int        default 20,
  _offset int        default 0
)
returns setof public_recipe_facets
language sql stable
set search_path = public
as $$
  select f.*
  from public_recipe_facets f,
       lateral (
         select nullif(trim(_query), '') as q
       ) p,
       lateral (
         select replace(replace(replace(p.q, '\', '\\'), '%', '\%'), '_', '\_')
           as like_q
       ) e
  where (p.q is null
         or f.name ilike '%' || e.like_q || '%'
         or word_similarity(p.q, f.name) >= 0.3)
    and (not coalesce(_quick, false) or f.is_quick)
    and (_diet is null or f.diet = _diet)
  order by
    case when p.q is null then 0 else word_similarity(p.q, f.name) end desc,
    f.published_at desc,
    f.id
  limit least(greatest(coalesce(_limit, 20), 1), 100)
  offset greatest(coalesce(_offset, 0), 0);
$$;
