import { build } from "esbuild";
import { mkdir, writeFile } from "node:fs/promises";
const bundled = await build({
  stdin: {
    contents:
      "export { builtInPlays, builtInCatalogVersion } from './src/data/seeds.ts'; export { validatePlay } from './src/domain/model.ts'; export { validateBallFlow } from './src/domain/engine.ts';",
    resolveDir: process.cwd(),
    loader: "ts",
  },
  bundle: true,
  platform: "node",
  format: "esm",
  write: false,
  logLevel: "silent",
});
const { builtInPlays, builtInCatalogVersion, validatePlay, validateBallFlow } =
  await import(
    "data:text/javascript;base64," +
      Buffer.from(bundled.outputFiles[0].contents).toString("base64")
  );
const contentVersion = Number(process.argv[2] ?? builtInCatalogVersion);
if (!Number.isInteger(contentVersion) || contentVersion < builtInCatalogVersion)
  throw new Error(`A tartalomverzió legalább ${builtInCatalogVersion} legyen.`);
for (const p of builtInPlays) {
  validatePlay(p);
  const errors = validateBallFlow(p);
  if (errors.length) throw new Error(errors.join(" "));
}
await mkdir("public/catalog", { recursive: true });
await writeFile(
  "public/catalog/catalog.json",
  JSON.stringify(
    { schemaVersion: 1, contentVersion, plays: builtInPlays },
    null,
    2,
  ) + "\n",
);
console.log(
  `Katalógus exportálva: ${builtInPlays.length} taktika, ${contentVersion}. tartalomverzió.`,
);
