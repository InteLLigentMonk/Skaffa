-- ----------------------------------------------------------------------------
-- Svep efter föräldralösa receptbilder + create_recipe tas bort.
--
-- Bilder laddas upp medan receptformuläret är öppet, innan receptet sparats.
-- Klienten raderar själv det som aldrig sparades (när formuläret stängs eller
-- när en annan bild sparas), men en app som kraschar eller tappar nätet hinner
-- inte. Triggrarna i 20260823000200 fångar bara filer som en recipes-rad har
-- pekat på — de här har ingen rad alls.
--
-- Svepet hittar objekt i bucketen recipes som ingen recipes.image_path pekar
-- på och som är äldre än _min_age. Åldersgränsen finns för att inte ta en bild
-- vars formulär fortfarande är öppet.
--
-- _enqueue = false listar bara. Kör alltid den först och läs igenom listan
-- (samma råd som i 20260823000200): svepet raderar allt som inte refereras,
-- även filer som av någon anledning lagts dit för hand.
--
-- Körs av scripts/drain-storage-cleanup.mjs med service role.
-- ----------------------------------------------------------------------------

create function sweep_orphan_recipe_images(
  _min_age interval default interval '24 hours',
  _enqueue boolean default false
)
returns table (path text)
language plpgsql security definer
set search_path = public as $$
begin
  if _enqueue then
    -- FOR-loop och inte RETURN QUERY: plpgsql tar en INSERT … RETURNING som
    -- källa för FOR, och path är funktionens utkolumn.
    for path in
      insert into storage_cleanup_queue (bucket_id, object_path)
      select o.bucket_id, o.name
      from storage.objects o
      where o.bucket_id = 'recipes'
        and o.created_at < now() - _min_age
        and not exists (select 1 from recipes r where r.image_path = o.name)
      on conflict (bucket_id, object_path) do nothing
      returning storage_cleanup_queue.object_path
    loop
      return next;
    end loop;
  else
    return query
    select o.name
    from storage.objects o
    where o.bucket_id = 'recipes'
      and o.created_at < now() - _min_age
      and not exists (select 1 from recipes r where r.image_path = o.name);
  end if;
end;
$$;

-- PUBLIC måste med. anon och authenticated ärver execute från PUBLIC, så en
-- revoke som bara nämner dem biter inte (se 20260926164217). Utan den här
-- raden hade vem som helst kunnat köa radering av hela bucketen.
revoke execute on function sweep_orphan_recipe_images(interval, boolean)
  from public, anon, authenticated;
grant execute on function sweep_orphan_recipe_images(interval, boolean)
  to service_role;


-- ----------------------------------------------------------------------------
-- Klienten sparar via save_recipe (20261009120000) sedan samma version.
-- ----------------------------------------------------------------------------

drop function create_recipe(text, int, jsonb);
