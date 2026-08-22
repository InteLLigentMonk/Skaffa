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
| `20260823000300_seed_ingredients.sql` | Frödatabasen: 314 ingredienser med `diet_tag` |

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
