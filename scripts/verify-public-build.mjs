import { rm, readdir, readFile } from "node:fs/promises";
// The local HTTP example is intentionally excluded from Hosting. Visibility can
// change in Firestore without having to publish new static copies of tactics.
await rm("dist/catalog", { recursive: true, force: true });
for (const file of await readdir("dist/assets")) {
  if (!file.endsWith(".js")) continue;
  const content = await readFile(`dist/assets/${file}`, "utf8");
  if (content.includes('"cross-right"') || content.includes('"sample-1"'))
    throw new Error("Tactic payload detected in the public JavaScript bundle.");
}
console.log("Public build verified: no bundled tactics or catalog JSON.");
