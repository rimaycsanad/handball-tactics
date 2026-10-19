import { createHash } from "node:crypto";
// Trusted local operations only. This file and CLI credentials never enter the web build.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import { createRequire } from "node:module";
import { existsSync } from "node:fs";
import { loadEnvFile } from "node:process";
import { build } from "esbuild";

const require = createRequire(import.meta.url);
const cliAuth = require("firebase-tools/lib/auth");
if (existsSync(".env")) loadEnvFile(".env");
const project =
  process.env.FIREBASE_PROJECT_ID ||
  JSON.parse(await readFile(".firebaserc", "utf8")).projects.default;
if (!/^[a-z][a-z0-9-]{5,29}$/.test(project))
  throw new Error("Érvénytelen projektazonosító.");
const command = process.argv[2];
if (
  ![
    "status",
    "seed",
    "invite-admin",
    "prepare-access",
    "migrate-access",
    "prepare-membership",
    "migrate-membership",
  ].includes(command)
)
  throw new Error(
    "Használat: node scripts/firebase-data.mjs status|seed|invite-admin email|prepare-access|migrate-access|prepare-membership|migrate-membership",
  );
const account = cliAuth.getGlobalDefaultAccount();
if (!account) throw new Error("Előbb jelentkezz be: npx firebase login");
const token = await cliAuth.getAccessToken(account.tokens.refresh_token, []);
async function api(url, { method = "GET", body, missing = false } = {}) {
  const response = await fetch(url, {
    method,
    headers: {
      Authorization: `Bearer ${token.access_token}`,
      "Content-Type": "application/json",
      "x-goog-user-project": project,
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
    signal: AbortSignal.timeout(30000),
  });
  if (missing && response.status === 404) return null;
  const data = await response.json();
  if (!response.ok)
    throw new Error(
      `${response.status}: ${data.error?.message || "Firebase API hiba"}`,
    );
  return data;
}
const root = `https://firestore.googleapis.com/v1/projects/${project}/databases/(default)/documents`;
function field(value) {
  if (value === null) return { nullValue: null };
  if (value instanceof Date) return { timestampValue: value.toISOString() };
  if (typeof value === "string") return { stringValue: value };
  if (typeof value === "boolean") return { booleanValue: value };
  if (typeof value === "number")
    return Number.isInteger(value)
      ? { integerValue: String(value) }
      : { doubleValue: value };
  if (Array.isArray(value)) return { arrayValue: { values: value.map(field) } };
  return {
    mapValue: {
      fields: Object.fromEntries(
        Object.entries(value).map(([key, v]) => [key, field(v)]),
      ),
    },
  };
}
function create(path, value) {
  return {
    update: {
      name: `projects/${project}/databases/(default)/documents/${path}`,
      fields: field(value).mapValue.fields,
    },
    currentDocument: { exists: false },
  };
}
if (command === "status") {
  const billing = await api(
    `https://cloudbilling.googleapis.com/v1/projects/${project}/billingInfo`,
  ).catch(() => null);
  const auth = await api(
    `https://identitytoolkit.googleapis.com/admin/v2/projects/${project}/config`,
    { missing: true },
  );
  const manifest = await api(`${root}/catalog/current`, { missing: true });
  console.log(
    JSON.stringify(
      {
        project,
        billingEnabled: billing?.billingEnabled ?? "not-available",
        emailPasswordEnabled: auth?.signIn?.email?.enabled ?? false,
        passwordRequired: auth?.signIn?.email?.passwordRequired ?? false,
        catalogVersion: manifest?.fields?.contentVersion?.integerValue ?? null,
      },
      null,
      2,
    ),
  );
} else if (command === "seed") {
  if (await api(`${root}/catalog/current`, { missing: true }))
    throw new Error(
      "A közös katalógus már létezik. A feltöltést megszakítottuk; a meglévő adatokat megőriztük.",
    );
  await mkdir(".firebase", { recursive: true });
  await build({
    stdin: {
      contents: "export { catalogSchema } from './src/data/repository.ts';",
      resolveDir: process.cwd(),
      loader: "ts",
    },
    bundle: true,
    packages: "external",
    platform: "node",
    format: "esm",
    outfile: ".firebase/catalog-validation.mjs",
    logLevel: "silent",
  });
  const { catalogSchema } = await import("../.firebase/catalog-validation.mjs");
  const catalog = catalogSchema.parse(
    JSON.parse(await readFile(".firebase/seed-catalog.json", "utf8")),
  );
  const releaseId = crypto.randomUUID();
  const now = new Date();
  const writes = catalog.plays.map((play, order) =>
    create(`catalogReleases/${releaseId}/plays/${play.id}`, { play, order }),
  );
  writes.push(
    create(`catalogReleases/${releaseId}`, {
      schemaVersion: 1,
      contentVersion: catalog.contentVersion,
      playCount: catalog.plays.length,
      publicPlayIds: catalog.plays
        .filter((p) => !p.requiresAuth)
        .map((p) => p.id),
      createdBy: "bootstrap",
      createdAt: now,
    }),
  );
  writes.push(
    create("catalog/current", {
      schemaVersion: 1,
      contentVersion: catalog.contentVersion,
      releaseId,
      playCount: catalog.plays.length,
      publicPlayIds: catalog.plays
        .filter((p) => !p.requiresAuth)
        .map((p) => p.id),
      updatedAt: now,
    }),
  );
  await api(`${root}:commit`, { method: "POST", body: { writes } });
  console.log(
    `Feltöltve: ${catalog.plays.length} taktika, ${catalog.contentVersion}. verzió. A meglévő adatokat nem írtuk felül.`,
  );
} else if (command === "prepare-access") {
  await mkdir(".firebase", { recursive: true });
  const manifest = await api(`${root}/catalog/current`);
  const decode = (value) => {
    if ("mapValue" in value)
      return Object.fromEntries(
        Object.entries(value.mapValue.fields ?? {}).map(([key, v]) => [
          key,
          decode(v),
        ]),
      );
    if ("arrayValue" in value)
      return (value.arrayValue.values ?? []).map(decode);
    if ("integerValue" in value) return Number(value.integerValue);
    if ("doubleValue" in value) return value.doubleValue;
    if ("booleanValue" in value) return value.booleanValue;
    return value.stringValue ?? value.timestampValue ?? null;
  };
  const current = decode({ mapValue: { fields: manifest.fields } });
  if (current.publicPlayIds)
    throw new Error(
      "A hozzáférési migráció már megtörtént. A meglévő beállításokat megőriztük.",
    );
  let entries = [],
    pageToken = "";
  do {
    const result = await api(
      `${root}/catalogReleases/${current.releaseId}/plays?pageSize=500${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ""}`,
    );
    entries.push(...(result.documents ?? []));
    pageToken = result.nextPageToken ?? "";
  } while (pageToken);
  if (entries.length !== current.playCount)
    throw new Error("A távoli katalógus hiányos, migráció megszakítva.");
  await build({
    stdin: {
      contents:
        "export {englishFor} from './src/data/catalog-translation.ts'; export {catalogSchema} from './src/data/repository.ts';",
      resolveDir: process.cwd(),
      loader: "ts",
    },
    bundle: true,
    packages: "external",
    platform: "node",
    format: "esm",
    outfile: ".firebase/migration-model.mjs",
    logLevel: "silent",
  });
  const { englishFor, catalogSchema } =
    await import("../.firebase/migration-model.mjs");
  const records = entries
    .map((d) => decode({ mapValue: { fields: d.fields } }))
    .sort((a, b) => a.order - b.order);
  const plays = records.map(({ play }, index) => ({
    ...play,
    requiresAuth: index >= 5,
    english: { ...englishFor(play), ...play.english },
  }));
  const catalog = catalogSchema.parse({
    schemaVersion: 1,
    contentVersion: current.contentVersion + 1,
    plays,
  });
  const releaseId = crypto.randomUUID(),
    publicPlayIds = plays.filter((p) => !p.requiresAuth).map((p) => p.id),
    now = new Date();
  const writes = catalog.plays.map((play, order) =>
    create(`catalogReleases/${releaseId}/plays/${play.id}`, { play, order }),
  );
  writes.push(
    create(`catalogReleases/${releaseId}`, {
      schemaVersion: 1,
      contentVersion: catalog.contentVersion,
      playCount: plays.length,
      publicPlayIds,
      createdBy: "access-migration",
      createdAt: now,
    }),
  );
  const currentWrite = create("catalog/current", {
    schemaVersion: 1,
    contentVersion: catalog.contentVersion,
    releaseId,
    playCount: plays.length,
    publicPlayIds,
    updatedAt: now,
  });
  currentWrite.currentDocument = { updateTime: manifest.updateTime };
  writes.push(currentWrite);
  await writeFile(
    ".firebase/catalog-before-access.json",
    JSON.stringify({ manifest, entries }, null, 2),
  );
  await writeFile(
    ".firebase/catalog-access-migration.json",
    JSON.stringify({
      project,
      previousUpdateTime: manifest.updateTime,
      writes,
    }),
  );
  console.log(
    JSON.stringify(
      {
        project,
        previousVersion: current.contentVersion,
        nextVersion: catalog.contentVersion,
        total: plays.length,
        public: publicPlayIds.length,
        publicTitles: plays.slice(0, 5).map((p) => p.title),
        backup: ".firebase/catalog-before-access.json",
      },
      null,
      2,
    ),
  );
} else if (command === "migrate-access") {
  const prepared = JSON.parse(
    await readFile(".firebase/catalog-access-migration.json", "utf8"),
  );
  if (prepared.project !== project)
    throw new Error("Eltérő projekt a migrációs fájlban.");
  const current = await api(`${root}/catalog/current`);
  if (current.updateTime !== prepared.previousUpdateTime)
    throw new Error(
      "A katalógus változott az előkészítés óta; készíts új migrációt.",
    );
  await api(`${root}:commit`, {
    method: "POST",
    body: { writes: prepared.writes },
  });
  console.log(
    "Hozzáférési migráció kész: 5 nyilvános taktika, a többi bejelentkezéshez kötött. A korábbi adatokról helyi mentés készült.",
  );
} else if (command === "prepare-membership") {
  async function all(collection) {
    let documents = [],
      pageToken = "";
    do {
      const result = await api(
        `${root}/${collection}?pageSize=500${pageToken ? `&pageToken=${encodeURIComponent(pageToken)}` : ""}`,
      );
      documents.push(...(result.documents ?? []));
      pageToken = result.nextPageToken ?? "";
    } while (pageToken);
    return documents;
  }
  const [users, invitations] = await Promise.all([
    all("users"),
    all("invitations"),
  ]);
  const writes = [];
  for (const user of users) {
    if ("admitted" in user.fields) continue;
    writes.push({
      update: { name: user.name, fields: { admitted: { booleanValue: true } } },
      updateMask: { fieldPaths: ["admitted"] },
      currentDocument: { updateTime: user.updateTime },
    });
  }
  for (const invite of invitations) {
    const email = invite.name.split("/").at(-1).toLowerCase();
    const key =
      invite.fields.registrationKey?.stringValue ??
      createHash("sha256").update(email).digest("hex");
    if (!invite.fields.registrationKey)
      writes.push({
        update: {
          name: invite.name,
          fields: { registrationKey: { stringValue: key } },
        },
        updateMask: { fieldPaths: ["registrationKey"] },
        currentDocument: { updateTime: invite.updateTime },
      });
    const permit = await api(`${root}/registrationPermits/${key}`, {
      missing: true,
    });
    if (!permit)
      writes.push(create(`registrationPermits/${key}`, { active: true }));
  }
  if (writes.length > 450)
    throw new Error(
      "Túl nagy migráció egyetlen atomi művelethez; a meglévő adatokat megőriztük.",
    );
  await mkdir(".firebase", { recursive: true });
  await writeFile(
    ".firebase/membership-before-invites.json",
    JSON.stringify({ users, invitations }, null, 2),
  );
  await writeFile(
    ".firebase/membership-migration.json",
    JSON.stringify({ project, writes }, null, 2),
  );
  console.log(
    JSON.stringify(
      {
        project,
        existingUsers: users.length,
        existingAdmins: users.filter(
          (u) => u.fields.role?.stringValue === "admin",
        ).length,
        pendingInvitations: invitations.length,
        writes: writes.length,
        backup: ".firebase/membership-before-invites.json",
      },
      null,
      2,
    ),
  );
} else if (command === "migrate-membership") {
  const prepared = JSON.parse(
    await readFile(".firebase/membership-migration.json", "utf8"),
  );
  if (prepared.project !== project)
    throw new Error("Eltérő projekt a migrációs fájlban.");
  if (prepared.writes.length)
    await api(`${root}:commit`, {
      method: "POST",
      body: { writes: prepared.writes },
    });
  console.log(
    "A meglévő fiókok csapattagsága és a korábbi adminmeghívók regisztrációs engedélyei megőrizve. Új csapattag csak adminmeghívással léphet be.",
  );
} else {
  const email = process.argv[3]?.trim().toLowerCase();
  if (!email || !/^[^@/\s]+@[^@/\s]+\.[^@/\s]+$/.test(email))
    throw new Error("Érvényes e-mail-címet adj meg.");
  await api(`${root}:commit`, {
    method: "POST",
    body: {
      writes: [
        create(`invitations/${email}`, {
          role: "admin",
          registrationKey: createHash("sha256").update(email).digest("hex"),
          createdBy: "bootstrap",
          createdAt: new Date(),
        }),
        create(
          `registrationPermits/${createHash("sha256").update(email).digest("hex")}`,
          { active: true },
        ),
      ],
    },
  });
  console.log(
    `Adminjog előkészítve: ${email}. Regisztráció és e-mail-megerősítés után, egyszer használható fel.`,
  );
}
