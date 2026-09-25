# Databasen

Allt schema ligger som migrationer i `migrations/`. Databasen ändras aldrig
genom att man redigerar en befintlig fil och kör om den — varje ändring är en
ny tidsstämplad fil. Det är tråkigare, men det är den enda formen som håller
när mer än en person rör databasen.

| Migration | Innehåll |
|---|---|
| `20260823000000_baseline.sql` | Tabeller, vyer, RLS, triggers, RPC:er |
| `20260823000100_storage_policies.sql` | Policies för buckets `recipes`, `public_recipes`, `profile` |
| `20260823000200_storage_cleanup.sql` | Städkö för föräldralösa Storage-objekt |
| `20260823000300_seed_ingredients.sql` | Frödatabasen: 314 ingredienser med `diet_tag` (ersatt, se nedan) |
| `20260908163945_units_dimensions.sql` | `unit_dimension` + `unit_code`, `ingredients.unit` → `dimension`, `density_g_per_ml` |
| `20260908173423_fix_ingredient_dimension_guard.sql` | Triggern låser dimensionen i stället för enheten |
| `20260908180243_alter_recipe_ingredients.sql` | `amount_base` + `display_amount`/`display_unit`, `generate_shopping_list` omskriven, `unit_type` droppad |
| `20260908195042_derive_amount_base.sql` | `unit_to_base`/`unit_dimension_of` + trigger som härleder `amount_base` |
| `20260908201104_amount_base_default.sql` | Default på `amount_base` så kolumnen blir valfri i klienttyperna |
| `20260908202423_seed_ingredients_dimensions.sql` | Frödatabasen v2: samma 314 rader med `dimension` |
| `20260908205759_seed_ingredient_densities.sql` | `density_g_per_ml` för 8 torrvaror (källa: ICA) |

Enheter fungerar så här: ingrediensen bär ett **måttslag** (`dimension`), inte ett
mått. Användaren väljer enhet per receptrad, och `amount_base` härleds av en
trigger till dimensionens basenhet — gram, milliliter eller styck. Därför är
inköpslistans summering fortfarande en rak `sum()`. `density_g_per_ml` låter
torrvaror korsa gränsen, så mjöl kan anges i både gram och dl.

Seed-filen från augusti är ersatt av `..._seed_ingredients_dimensions.sql`. Den
gamla redigeras inte — den är applicerad, och dess `insert` refererar en kolumn
som inte finns längre.

Frö-ingredienserna är en migration, inte `seed.sql`. `seed.sql` körs bara vid
lokal `db reset` och följer aldrig med `db push`, och de här raderna är
produktionsdata som Skaffa äger — inte dev-fixtures. Därför är `[db.seed]`
avstängt i `config.toml`.

## Första gången: koppla mot projektet

Migrationerna ovan är redan körda för hand i SQL-editorn. CLI:t vet inte om
det, så den måste få veta — annars försöker den applicera dem igen och dör på
`create type`.

```sh
npx supabase link --project-ref <ditt-project-ref>
npx supabase migration list          # visa vad remote tror är kört
npx supabase migration repair --status applied 20260823000000
npx supabase migration repair --status applied 20260823000100
npx supabase migration repair --status applied 20260823000200
npx supabase migration repair --status applied 20260823000300
npx supabase migration list          # ska nu matcha på båda sidor
```

Kör `migration list` före och efter. Har någon av dem faktiskt inte körts ska
den inte repareras utan pushas — se nedan.

## Ändra något

```sh
npx supabase migration new beskrivande_namn
# skriv din alter i den nya filen
npx supabase db push
```

## Verifiera att filerna beskriver verkligheten

```sh
npx supabase db diff --linked
```

Tom utdata betyder att migrationerna och databasen säger samma sak. Kommer det
ut DDL har någon ändrat i dashboarden utan att skriva en migration, och driften
har redan börjat.

Frestelsen när det händer är att köra `supabase db pull` och låta CLI:t skriva
en ny baseline. Gör inte det — den genererar DDL från `pg_dump`, och
`--`-kommentarerna överlever inte den resan. Motiveringarna i baseline-filen
(varför `diet_tag` inte är `category`, varför medlemskap bara skapas via RPC,
varför städkön finns) är filens hela värde. Skriv i stället en migration för
hand som fångar ändringen.
