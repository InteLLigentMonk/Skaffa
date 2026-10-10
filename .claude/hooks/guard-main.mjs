// PreToolUse-hook för Edit/Write: stoppar filändringar i projektet när main
// är utcheckad. Exit 2 blockerar verktygsanropet och stderr går tillbaka
// till Claude som förklaring.
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";

const input = JSON.parse(readFileSync(0, "utf8").replace(/^﻿/, ""));
const projectDir = path.resolve(process.env.CLAUDE_PROJECT_DIR ?? input.cwd ?? process.cwd());
const filePath = input.tool_input?.file_path ?? input.tool_input?.notebook_path;

// Filer utanför repot (minne, scratchpad) berörs inte av branchregeln.
if (!filePath) process.exit(0);
const relative = path.relative(projectDir, path.resolve(filePath));
if (relative.startsWith("..") || path.isAbsolute(relative)) process.exit(0);

let branch;
try {
  branch = execSync("git rev-parse --abbrev-ref HEAD", {
    cwd: projectDir,
    encoding: "utf8",
  }).trim();
} catch {
  process.exit(0);
}

if (branch === "main" || branch === "master") {
  console.error(
    `Du står på ${branch}. Skapa en branch innan du ändrar filer, t.ex. ` +
      "`git switch -c feat/<kort-beskrivning>` (prefix enligt Conventional Commits).",
  );
  process.exit(2);
}
