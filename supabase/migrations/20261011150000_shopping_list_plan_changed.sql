-- Inköpslistan vet när veckoplanen ändrats efter att listan genererades.
--
-- planned_meals har ingen updated_at, och en borttagen måltid lämnar inget
-- spår alls — klienten kan alltså inte själv avgöra om listan är inaktuell.
-- I stället stämplar en trigger veckans lista varje gång en måltid läggs till,
-- ändras eller tas bort. Klienten visar "Planen har ändrats" när
-- plan_changed_at > generated_at.
--
-- generate_shopping_list sätter generated_at = now() i sin egen transaktion,
-- så en omgenerering släcker bannern utan att röra plan_changed_at.
--
-- Ändringar i ett recepts ingredienser fångas inte: de rör inte planned_meals.

alter table shopping_lists add column plan_changed_at timestamptz;

-- security definer: triggern ska stämpla listan oavsett vem som ändrade
-- planen, och raden den skriver är en tidsstämpel, inget användaren väljer.
-- Finns ingen lista för veckan än gör uppdateringen ingenting — det finns då
-- inget att varna för.
create or replace function touch_shopping_list_plan()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  if tg_op in ('UPDATE', 'DELETE') then
    update shopping_lists
    set plan_changed_at = now()
    where home_id = old.home_id
      and week_start = week_monday(old.meal_date);
  end if;

  -- En flyttad måltid kan byta vecka: då är båda listorna inaktuella.
  if tg_op in ('INSERT', 'UPDATE') then
    update shopping_lists
    set plan_changed_at = now()
    where home_id = new.home_id
      and week_start = week_monday(new.meal_date);
  end if;

  return null;
end;
$$;

create trigger planned_meals_touch_shopping_list
after insert or update or delete on planned_meals
for each row execute function touch_shopping_list_plan();
