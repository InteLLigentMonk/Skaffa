-- ----------------------------------------------------------------------------
-- Receptbanken visar recepten, inte vem som publicerade dem eller från vilket
-- hem.
--
-- public_recipes_select är using (true), så alla inloggade kunde läsa
-- source_home_id och published_by — ett register över hem- och användar-id:n
-- för alla som någonsin publicerat. Id:n är inga hemligheter i sig, men de är
-- det enda som skiljer en angripare från andra hems rader (se
-- 20261013120200), och appen visar dem ingenstans.
--
-- Kolumnrättigheter i stället för en vy: klienten läser tabellen direkt
-- (getRecipe i recipes/api.ts), och public_recipe_facets och
-- copy_public_recipe läser bara kolumnerna nedan.
--
-- Policyerna (public_recipes_insert/_delete) läser fortfarande published_by
-- och source_home_id. Det fungerar: rättigheter kontrolleras mot kolumnerna i
-- själva frågan, inte mot det RLS lägger till.
--
-- anon har ingen select-policy alls och får ingenting tillbaka.
-- ----------------------------------------------------------------------------

revoke select on public_recipes from anon, authenticated;

grant select (id, name, servings, description, image_path, prep_minutes, published_at)
  on public_recipes to authenticated;
