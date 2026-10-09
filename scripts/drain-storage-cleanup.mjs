#!/usr/bin/env node

/**
 * Dränerar storage_cleanup_queue: hämtar ett gäng köade objekt, raderar dem ur
 * Storage och rapporterar tillbaka. Kör med `npm run drain-storage`.
 *
 * Kön fylls på av triggers i skaffa_storage_cleanup.sql varje gång ett recept
 * raderas eller byter bild. Postgres kan inte tömma den själv – att radera
 * raden ur storage.objects lämnar kvar filen i S3, bara storage-api tar bort
 * den på riktigt.
 *
 * Kräver service role: RPC:erna är SECURITY DEFINER med execute återkallat för
 * anon och authenticated, och bucketarna är privata.
 *
 * Flaggor:
 *   --dry-run     visa vad som skulle raderas, rör ingenting
 *   --limit=N     antal per omgång (default 100)
 *   --once        kör en omgång i stället för tills kön är tom
 */

import { createClient } from "@supabase/supabase-js";

const args = process.argv.slice(2);
const hasFlag = (name) => args.includes(`--${name}`);
const flagValue = (name, fallback) => {
  const hit = args.find((a) => a.startsWith(`--${name}=`));
  return hit ? Number(hit.split("=")[1]) : fallback;
};

const dryRun = hasFlag("dry-run");
const once = hasFlag("once");
const limit = flagValue("limit", 100);

const url = process.env.SUPABASE_URL ?? process.env.EXPO_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!url || !serviceRoleKey) {
  console.error(
    "Saknar SUPABASE_URL och/eller SUPABASE_SERVICE_ROLE_KEY.\n" +
      "Lägg dem i .env (som är gitignorerad). Prefixa INTE service role-nyckeln\n" +
      "med EXPO_PUBLIC_ – då bakas den in i appbundlen och blir läsbar för alla."
  );
  process.exit(1);
}

const supabase = createClient(url, serviceRoleKey, {
  auth: { persistSession: false, autoRefreshToken: false },
});

/** Grupperar köraderna per bucket – remove() tar en lista åt gången. */
const groupByBucket = (rows) => {
  const groups = new Map();
  for (const row of rows) {
    const paths = groups.get(row.bucket_id) ?? [];
    paths.push(row);
    groups.set(row.bucket_id, paths);
  }
  return groups;
};

// Receptbilder som laddats upp men aldrig sparats på ett recept (appen
// kraschade eller tappade nätet innan den hann städa själv). Svepet lägger dem
// på kön, och loopen nedan raderar dem som vilka köade objekt som helst. I
// dry-run listas de bara.
const { data: orphans, error: sweepError } = await supabase.rpc(
  "sweep_orphan_recipe_images",
  { _enqueue: !dryRun }
);

if (sweepError) {
  console.error("Kunde inte svepa efter föräldralösa bilder:", sweepError.message);
  process.exit(1);
}

if (orphans.length) {
  console.log(
    `${dryRun ? "[dry-run] skulle köa" : "Köade"} ${orphans.length} föräldralösa receptbilder:`
  );
  for (const row of orphans) console.log(`  recipes/${row.path}`);
}

let removed = 0;
let failed = 0;
let rounds = 0;

while (true) {
  const { data: claimed, error: claimError } = await supabase.rpc(
    "claim_storage_cleanup",
    { _limit: limit }
  );

  if (claimError) {
    console.error("Kunde inte hämta ur kön:", claimError.message);
    process.exit(1);
  }

  if (!claimed?.length) break;

  rounds += 1;

  for (const [bucket, rows] of groupByBucket(claimed)) {
    const paths = rows.map((r) => r.object_path);

    if (dryRun) {
      console.log(`[dry-run] ${bucket}: ${paths.length} objekt`);
      for (const p of paths) console.log(`  ${p}`);
      continue;
    }

    const { error: removeError } = await supabase.storage
      .from(bucket)
      .remove(paths);

    if (removeError) {
      // Hela batchen får samma fel – claimed_at nollställs så nästa körning
      // tar om dem, och attempts har redan räknats upp av claim.
      failed += rows.length;
      console.error(`${bucket}: ${removeError.message}`);
      for (const row of rows) {
        await supabase.rpc("fail_storage_cleanup", {
          _id: row.id,
          _error: removeError.message,
        });
      }
      continue;
    }

    // remove() klagar inte på filer som redan är borta, vilket är precis vad vi
    // vill: målet är att de inte ska finnas, inte att vi tog bort dem.
    removed += rows.length;
    await supabase.rpc("complete_storage_cleanup", {
      _ids: rows.map((r) => r.id),
    });
  }

  // I dry-run släpper vi aldrig claimen, så en loop hade snurrat på samma
  // rader tills leasen gick ut. En omgång räcker för att visa vad som väntar.
  if (once || dryRun) break;
}

if (dryRun) {
  console.log("\nDry run – ingenting raderades.");
} else {
  console.log(`Raderade ${removed} objekt över ${rounds} omgångar.`);
  if (failed) console.log(`${failed} misslyckades och ligger kvar för omtag.`);
}

// Rader som gett upp (attempts >= 5) plockas inte längre av claim och skulle
// annars tystna helt. Kön är också felrapporten.
const { data: stuck } = await supabase
  .from("storage_cleanup_queue")
  .select("bucket_id, object_path, attempts, last_error")
  .gte("attempts", 5)
  .limit(20);

if (stuck?.length) {
  console.log(`\n${stuck.length} rader har gett upp efter 5 försök:`);
  for (const row of stuck) {
    console.log(`  ${row.bucket_id}/${row.object_path} – ${row.last_error}`);
  }
  console.log(
    "Åtgärda orsaken och nollställ med:\n" +
      "  update storage_cleanup_queue set attempts = 0, claimed_at = null where attempts >= 5;"
  );
}

process.exit(failed ? 1 : 0);
