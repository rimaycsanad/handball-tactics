import { spawnSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { loadEnvFile } from "node:process";
if (existsSync(".env")) loadEnvFile(".env");
const mode = process.argv[2];
const aliases = existsSync(".firebaserc")
  ? JSON.parse(readFileSync(".firebaserc", "utf8"))
  : {};
const project =
  process.env.FIREBASE_PROJECT_ID?.trim() || aliases.projects?.default;
if (!["web", "preview", "backend"].includes(mode))
  throw new Error(
    "Használat: node scripts/firebase-release.mjs web|preview|backend",
  );
if (!project)
  throw new Error(
    "Állítsd be az alapértelmezett projektet a .firebaserc fájlban, vagy a FIREBASE_PROJECT_ID környezeti változót.",
  );
if (!/^[a-z][a-z0-9-]{5,29}$/.test(project))
  throw new Error("Érvénytelen Firebase projektazonosító.");
const cli = resolve("node_modules/.bin/firebase");
if (!existsSync(cli))
  throw new Error(
    "Először telepítsd a Firebase CLI-t: npm install --save-dev firebase-tools",
  );
function run(command, args) {
  const result = spawnSync(command, args, { stdio: "inherit", shell: false });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}
if (mode !== "backend") run("npm", ["run", "build"]);
if (mode === "backend")
  run(cli, ["deploy", "--only", "auth,firestore", "--project", project]);
else if (mode === "web")
  run(cli, ["deploy", "--only", "hosting", "--project", project]);
else
  run(cli, [
    "hosting:channel:deploy",
    process.env.FIREBASE_PREVIEW_CHANNEL || "testers",
    "--only",
    "handball-playlab",
    "--expires",
    "7d",
    "--project",
    project,
  ]);
