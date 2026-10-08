-- ----------------------------------------------------------------------------
-- Sökning i Recept-fliken: hemmets recept och receptbanken, med samma filter.
--
-- Varför RPC och inte .from("recipe_facets") från klienten: fuzzy-sökningen
-- ska RANKA på likhet, så "kotbular" ger "Köttbullar" överst. PostgREST kan
-- filtrera med operatorer men inte sortera på ett uttryck som
-- word_similarity(q, name). Sorteringen måste ligga här.
--
-- Matchning, två vägar som kompletterar varandra:
--   name ilike '%q%'  — exakt delsträng. Fångar korta söktermer ("ris") som
--                       har för få trigram för att nå likhetströskeln.
--   q <% name         — word_similarity över tröskeln. Tål stavfel och fångar
--                       q som liknar ETT ORD i namnet, inte hela namnet; det är
--                       rätt mått för korta söktermer mot långa receptnamn.
-- Tröskeln (standard 0.6) sänks till 0.4 per funktion, med `set` i
-- definitionen. Den gäller bara under anropet och läcker inte till sessionen.--
-- Paginering med limit/offset. Sorteringen slutar på id, så två rader med
-- samma likhet och tidsstämpel byter aldrig plats mellan två sidhämtningar.
-- Annars kunde ett recept hamna på både sida 1 och 2, eller på ingen av dem.
--
-- Security INVOKER (som create_recipe): vyerna är security_invoker, så RLS på
-- recipes avgör vilket hem man ser. Därför finns inget home_id-filter här.
-- recipes_all släpper bara igenom det egna hemmets rader.
--
-- pg_trgm ligger i public (baseline), så search_path = public räcker för
-- både <%-operatorn och word_similarity().
-- ----------------------------------------------------------------------------

-- public_recipes.name har haft sitt index sedan baseline. recipes.name saknade det.
create index if not exists recipes_name_trgm
  on recipes using gin (name gin_trgm_ops);


create function search_home_recipes(
  _query  text       default null,
  _quick  boolean    default false,
  _diet   diet_class default null,
  _limit  int        default 20,
  _offset int        default 0
)
returns setof recipe_facets
language sql stable
set search_path = public
set pg_trgm.word_similarity_threshold = 0.4
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
         or p.q <% f.name)
    and (not coalesce(_quick, false) or f.is_quick)
    and (_diet is null or f.diet = _diet)
  order by
    case when p.q is null then 0 else word_similarity(p.q, f.name) end desc,
    f.created_at desc,
    f.id
  limit least(greatest(coalesce(_limit, 20), 1), 100)
  offset greatest(coalesce(_offset, 0), 0);
$$;


-- Exakt samma form mot receptbanken. Två funktioner i stället för en med en
-- scope-parameter, eftersom returtyperna skiljer sig (public_recipe_facets har
-- published_at men saknar home_id/tags), och då blir de genererade
-- klienttyperna raka.
create function search_public_recipes(
  _query  text       default null,
  _quick  boolean    default false,
  _diet   diet_class default null,
  _limit  int        default 20,
  _offset int        default 0
)
returns setof public_recipe_facets
language sql stable
set search_path = public
set pg_trgm.word_similarity_threshold = 0.4
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
         or p.q <% f.name)
    and (not coalesce(_quick, false) or f.is_quick)
    and (_diet is null or f.diet = _diet)
  order by
    case when p.q is null then 0 else word_similarity(p.q, f.name) end desc,
    f.published_at desc,
    f.id
  limit least(greatest(coalesce(_limit, 20), 1), 100)
  offset greatest(coalesce(_offset, 0), 0);
$$;
