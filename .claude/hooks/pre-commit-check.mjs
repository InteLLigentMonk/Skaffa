// PreToolUse-hook för Bash/PowerShell: när Claude ska köra `git commit`
// körs lint och typkontroll först. Misslyckas någon blockeras commiten
// (exit 2) och felutskriften skickas tillbaka till Claude.
import { execSync, spawnSync } from "node:child_process";
import { readFileSync } from "node:fs";

const input = JSON.parse(readFileSync(0, "utf8").replace(/^﻿/, ""));
const command = input.tool_input?.command ?? "";

if (!/\bgit\b[^\n;|&]*\bcommit\b/.test(command)) process.exit(0);

const cwd = process.env.CLAUDE_PROJECT_DIR ?? input.cwd ?? process.cwd();

const branch = execSync("git rev-parse --abbrev-ref HEAD", {
  cwd,
  encoding: "utf8",
}).trim();
if (branch === "main" || branch === "master") {
  console.error(
    `Commit direkt på ${branch} är inte tillåtet. Flytta ändringarna till en ` +
      "branch först: `git switch -c <typ>/<kort-beskrivning>`.",
  );
  process.exit(2);
}

const checks = [
  ["lint", "npm run lint"],
  ["typkontroll", "npx tsc --noEmit"],
];

for (const [name, cmd] of checks) {
  // shell: true behövs på Windows där npm/npx är .cmd-filer.
  const result = spawnSync(cmd, { cwd, shell: true, encoding: "utf8" });
  if (result.status !== 0) {
    console.error(`Commit stoppad: ${name} (${cmd}) misslyckades.\n`);
    console.error(`${result.stdout ?? ""}${result.stderr ?? ""}`.trim());
    process.exit(2);
  }
}
