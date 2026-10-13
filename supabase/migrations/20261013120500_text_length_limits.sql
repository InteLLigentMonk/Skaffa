-- ----------------------------------------------------------------------------
-- Maxlängd på fritext.
--
-- Ingen textkolumn hade ett tak, så ett anrop direkt mot API:t kunde lägga
-- megabyte i ett receptnamn eller ett steg. Det fyller databasen, och raden
-- renderas sedan i varje hemkompis lista. Gränserna ligger gott över vad
-- formulären tillåter (maxLength i klienten), så de märks bara för den som går
-- runt appen.
--
-- not valid: nya och ändrade rader kontrolleras, befintliga inte.
--
-- display_name kommer från användarens egen auth-metadata, och triggrarna som
-- kopierar den får aldrig kasta (se handle_new_user). Där kortas namnet i
-- stället — se längre ner.
-- ----------------------------------------------------------------------------

alter table profiles add constraint profiles_display_name_length
  check (length(display_name) <= 50) not valid;

alter table homes add constraint homes_name_length
  check (length(name) <= 60) not valid;

alter table ingredients add constraint ingredients_name_length
  check (length(name) <= 80) not valid;

alter table recipes add constraint recipes_name_length
  check (length(name) <= 120) not valid;
alter table recipes add constraint recipes_description_length
  check (description is null or length(description) <= 2000) not valid;

alter table recipe_steps add constraint recipe_steps_content_length
  check (length(content) <= 2000) not valid;

alter table public_recipes add constraint public_recipes_name_length
  check (length(name) <= 120) not valid;
alter table public_recipes add constraint public_recipes_description_length
  check (description is null or length(description) <= 2000) not valid;

alter table public_recipe_steps add constraint public_recipe_steps_content_length
  check (length(content) <= 2000) not valid;

alter table shopping_list_items add constraint shopping_list_items_name_length
  check (length(name) <= 120) not valid;

alter table recurring_items add constraint recurring_items_name_length
  check (length(name) <= 120) not valid;


-- ----------------------------------------------------------------------------
-- Triggrarna som kopierar display_name kortar till 50 tecken.
--
-- Ett fel i handle_new_user sänker registreringen, och ett fel i
-- sync_profile_display_name rullar tillbaka hela auth-uppdateringen. Därför
-- left() här och inte ett fel. Kropparna är oförändrade i övrigt jämfört med
-- baseline och 20261012120100.
-- ----------------------------------------------------------------------------

create or replace function handle_new_user()
returns trigger language plpgsql security definer
set search_path = public as $$
begin
  insert into profiles (id, display_name)
  values (
    new.id,
    left(
      coalesce(
        nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''),
        nullif(trim(new.raw_user_meta_data ->> 'full_name'), ''),
        nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
        'Användare'
      ),
      50
    )
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create or replace function sync_profile_display_name()
returns trigger language plpgsql security definer
set search_path = public as $$
declare
  _name text := left(nullif(trim(new.raw_user_meta_data ->> 'display_name'), ''), 50);
begin
  if _name is not null
     and _name is distinct from
         left(nullif(trim(old.raw_user_meta_data ->> 'display_name'), ''), 50) then
    update profiles set display_name = _name where id = new.id;
  end if;
  return new;
end;
$$;
