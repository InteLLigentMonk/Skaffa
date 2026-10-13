-- ----------------------------------------------------------------------------
-- Städköns RPC:er var anropbara för alla, även utan inloggning.
--
-- 20260823000200 återkallade execute från anon och authenticated, men båda
-- ärver execute från PUBLIC, och den grant:en rördes aldrig. Fällan är
-- beskriven i 20260926164217 och rättad för sweep_orphan_recipe_images och
-- delete_account, men inte för de här fyra.
--
-- Vad det öppnade, med bara den publika nyckeln ur appbundlen:
--   claim_storage_cleanup     -> läs alla köade sökvägar, alltså andra hems
--                                home_id, recipe_id och användar-id
--   complete_storage_cleanup  -> radera köraderna, så att filerna aldrig tas
--                                bort (ett raderat kontos avatar blir kvar)
--   fail_storage_cleanup      -> skriv i last_error och släpp leasen
--   enqueue_storage_delete    -> invoker och stoppas av RLS på kön, men står
--                                med så att avsikten är läsbar
--
-- Triggerfunktionerna som köar påverkas inte: de är security definer och ägs
-- av postgres, som behåller execute. Drain-skriptet kör som service_role.
-- ----------------------------------------------------------------------------

revoke execute on function claim_storage_cleanup(integer)
  from public, anon, authenticated;
revoke execute on function complete_storage_cleanup(bigint[])
  from public, anon, authenticated;
revoke execute on function fail_storage_cleanup(bigint, text)
  from public, anon, authenticated;
revoke execute on function enqueue_storage_delete(text, text)
  from public, anon, authenticated;

grant execute on function claim_storage_cleanup(integer)      to service_role;
grant execute on function complete_storage_cleanup(bigint[])  to service_role;
grant execute on function fail_storage_cleanup(bigint, text)  to service_role;
grant execute on function enqueue_storage_delete(text, text)  to service_role;
