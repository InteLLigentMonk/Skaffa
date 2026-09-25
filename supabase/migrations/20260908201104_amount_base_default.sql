-- ----------------------------------------------------------------------------
-- Defaulten finns BARA för att göra kolumnen valfri i de genererade
-- klienttyperna. amount_base härleds av trg_*_amount_base ur display_amount +
-- display_unit, så klienten ska aldrig skicka den — men "not null utan default"
-- får supabase gen types att markera fältet som obligatoriskt vid insert.
--
-- Värdet 0 når aldrig disk: defaults appliceras före before-triggers, triggern
-- skriver över, och check (amount_base > 0) utvärderas först därefter. Skulle
-- triggern någon gång tas bort börjar den checken faila direkt, vilket är rätt
-- beteende — då är kolumnen inte längre härledd av någon.
-- ----------------------------------------------------------------------------

alter table recipe_ingredients        alter column amount_base set default 0;
alter table public_recipe_ingredients alter column amount_base set default 0;
