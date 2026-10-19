import { before, beforeEach, after, test } from "node:test";
import assert from "node:assert/strict";
import { readFile, mkdir } from "node:fs/promises";
import { build } from "esbuild";
import {
  initializeTestEnvironment,
  assertFails,
  assertSucceeds,
} from "@firebase/rules-unit-testing";
import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  deleteDoc,
  writeBatch,
  setLogLevel,
} from "firebase/firestore";

const projectId = "demo-handball-tactics";
setLogLevel("silent"); // Permission-denied cases below are intentional assertions.
if (process.env.FIRESTORE_EMULATOR_HOST !== "127.0.0.1:8085")
  throw new Error("A teszt kizárólag a helyi Firestore-emulátoron futtatható.");
let env, models;
const seed = JSON.parse(await readFile("public/catalog/catalog.json", "utf8"));
seed.plays = seed.plays.slice(0, 2);
seed.plays[1].requiresAuth = true;
const publicPlayIds = [seed.plays[0].id];
const profile = (uid, role = "user", status = "active") => ({
  uid,
  admitted: true,
  email: `${uid}@example.com`,
  displayName: uid,
  role,
  status,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp(),
});
function context(uid, verified = true) {
  const db = uid
    ? env
        .authenticatedContext(uid, {
          email: `${uid}@example.com`,
          email_verified: verified,
        })
        .firestore()
    : env.unauthenticatedContext().firestore();
  return {
    db,
    projectId,
    auth: {
      currentUser: uid
        ? { uid, email: `${uid}@example.com`, emailVerified: verified }
        : null,
    },
  };
}
before(async () => {
  await mkdir(".firebase", { recursive: true });
  await build({
    stdin: {
      contents:
        "export * from './src/cloud/invitations.ts'; export * from './src/cloud/catalog.ts'; export * from './src/cloud/users.ts'; export { Repository } from './src/data/repository.ts';",
      resolveDir: process.cwd(),
      loader: "ts",
    },
    bundle: true,
    packages: "external",
    platform: "node",
    format: "esm",
    outfile: ".firebase/verify-client.mjs",
    logLevel: "silent",
  });
  models = await import("../.firebase/verify-client.mjs");
  env = await initializeTestEnvironment({
    projectId,
    firestore: {
      host: "127.0.0.1",
      port: 8085,
      rules: await readFile("firestore.rules", "utf8"),
    },
  });
});
beforeEach(async () => {
  await env.clearFirestore();
  await env.withSecurityRulesDisabled(async (ctx) => {
    const db = ctx.firestore(),
      batch = writeBatch(db);
    for (const [uid, role, status] of [
      ["admin", "admin", "active"],
      ["editor", "editor", "active"],
      ["editor2", "editor", "active"],
      ["reader", "user", "active"],
      ["suspended", "editor", "suspended"],
    ])
      batch.set(doc(db, "users", uid), profile(uid, role, status));
    batch.set(doc(db, "catalog", "current"), {
      schemaVersion: 1,
      contentVersion: seed.contentVersion,
      playCount: 2,
      publicPlayIds,
      releaseId: "seed",
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, "catalogReleases", "seed"), {
      schemaVersion: 1,
      contentVersion: seed.contentVersion,
      playCount: 2,
      publicPlayIds,
      createdBy: "bootstrap",
      createdAt: serverTimestamp(),
    });
    seed.plays.forEach((play, order) =>
      batch.set(doc(db, "catalogReleases", "seed", "plays", play.id), {
        order,
        play,
      }),
    );
    await batch.commit();
  });
});
after(async () => {
  await env?.cleanup();
});

test("a vendég csak a nyilvános taktikát kapja, a tag a teljes katalógust", async () => {
  const loaded = await new models.FirestoreCatalogSource(context()).fetch();
  assert.equal(loaded.cloud.releaseId, "seed");
  assert.deepEqual(loaded.plays, [seed.plays[0]]);
  const member = await new models.FirestoreCatalogSource(
    context("reader"),
  ).fetch();
  assert.equal(member.plays.length, 2);
  assert.equal(member.audience, "reader");
  const guest = context();
  await assertFails(
    getDoc(doc(guest.db, "catalogReleases", "seed", "plays", seed.plays[1].id)),
  );
  await assertFails(
    getDocs(collection(guest.db, "catalogReleases", "seed", "plays")),
  );
  // A member cache must never satisfy a guest fetch of the same release.
  assert.equal(
    (await new models.FirestoreCatalogSource(guest, member).fetch()).plays
      .length,
    1,
  );
});
test("saját profil csak meghívással hozható létre; önkényes jogosultságnövelés tiltott", async () => {
  const cloud = context("new");
  await assertFails(
    setDoc(doc(cloud.db, "users", "new"), profile("new", "admin")),
  );
  await assertFails(setDoc(doc(cloud.db, "users", "new"), profile("new")));
  await models.createInvitation(context("admin"), "new@example.com");
  await assertSucceeds(models.claimInvitation(cloud));
  await assertFails(
    updateDoc(doc(cloud.db, "users", "new"), {
      role: "editor",
      updatedAt: serverTimestamp(),
    }),
  );
  await assertFails(setDoc(doc(cloud.db, "users", "other"), profile("other")));
  await assertFails(deleteDoc(doc(cloud.db, "users", "new")));
});
test("felhasználói listát csak admin olvashat, legfeljebb 50-es lapokban", async () => {
  for (const cloud of [context(), context("reader"), context("editor")]) {
    await assertFails(getDocs(query(collection(cloud.db, "users"), limit(25))));
    await assertFails(getDoc(doc(cloud.db, "users", "admin")));
  }
  const cloud = context("admin");
  await assertSucceeds(
    getDocs(query(collection(cloud.db, "users"), limit(25))),
  );
  await assertFails(getDocs(collection(cloud.db, "users")));
});
test("az admin mások jogát módosíthatja, de saját magát nem zárhatja ki", async () => {
  const cloud = context("admin");
  await assertSucceeds(
    updateDoc(doc(cloud.db, "users", "reader"), {
      role: "editor",
      status: "suspended",
      updatedAt: serverTimestamp(),
    }),
  );
  await assertFails(
    updateDoc(doc(cloud.db, "users", "admin"), {
      role: "user",
      updatedAt: serverTimestamp(),
    }),
  );
  await assertFails(
    updateDoc(doc(cloud.db, "users", "admin"), {
      status: "suspended",
      updatedAt: serverTimestamp(),
    }),
  );
  await assertFails(
    updateDoc(doc(cloud.db, "users", "reader"), {
      email: "hijacked@example.com",
      updatedAt: serverTimestamp(),
    }),
  );
});
test("vendég, olvasó, felfüggesztett és nem megerősített szerkesztő nem írhat", async () => {
  for (const cloud of [
    context(),
    context("reader"),
    context("suspended"),
    context("editor", false),
  ]) {
    await assertFails(
      setDoc(
        doc(cloud.db, "catalogReleases", "attempt", "plays", seed.plays[0].id),
        { order: 0, play: seed.plays[0] },
      ),
    );
    await assertFails(
      updateDoc(doc(cloud.db, "catalog", "current"), {
        contentVersion: 100,
        updatedAt: serverTimestamp(),
      }),
    );
  }
  await assertFails(
    updateDoc(doc(context("suspended").db, "users", "suspended"), {
      status: "active",
      updatedAt: serverTimestamp(),
    }),
  );
});
test("a szerkesztő új verziót tehet közzé, a kiadott verziót nem módosíthatja", async () => {
  const cloud = context("editor"),
    base = await new models.FirestoreCatalogSource(cloud).fetch();
  const published = await models.publishCatalog(
    cloud,
    base,
    models.replaceCatalogPlay(base, {
      ...base.plays[0],
      description: "Új közös leírás",
    }),
  );
  const loaded = await new models.FirestoreCatalogSource(context()).fetch();
  assert.equal(loaded.contentVersion, base.contentVersion + 1);
  assert.equal(loaded.plays[0].description, "Új közös leírás");
  assert.equal(loaded.cloud.releaseId, published.cloud.releaseId);
  await assertFails(
    updateDoc(
      doc(cloud.db, "catalogReleases", "seed", "plays", base.plays[0].id),
      { order: 10 },
    ),
  );
  await assertFails(
    deleteDoc(doc(cloud.db, "catalogReleases", published.cloud.releaseId)),
  );
  await assertFails(
    setDoc(
      doc(
        cloud.db,
        "catalogReleases",
        published.cloud.releaseId,
        "plays",
        "extra",
      ),
      { order: 2, play: { ...base.plays[0], id: "extra" } },
    ),
  );
});
test("a párhuzamos közzététel nem írja felül észrevétlenül a másik szerkesztőt", async () => {
  const first = context("editor"),
    second = context("editor2");
  const base = await new models.FirestoreCatalogSource(first).fetch();
  const results = await Promise.allSettled([
    models.publishCatalog(
      first,
      base,
      models.replaceCatalogPlay(base, {
        ...base.plays[0],
        description: "Első",
      }),
    ),
    models.publishCatalog(
      second,
      base,
      models.replaceCatalogPlay(base, {
        ...base.plays[0],
        description: "Második",
      }),
    ),
  ]);
  assert.equal(results.filter((r) => r.status === "fulfilled").length, 1);
  assert.equal(results.filter((r) => r.status === "rejected").length, 1);
  assert.equal(
    (await new models.FirestoreCatalogSource(context()).fetch()).contentVersion,
    base.contentVersion + 1,
  );
});
test("hiányos frissítés megőrzi a működő helyi katalógust", async () => {
  const files = new Map();
  const repo = new models.Repository({
    read: async (name) => files.get(name) ?? null,
    write: async (name, value) => {
      files.set(name, value);
    },
  });
  const original = await repo.updateCatalog(
    new models.FirestoreCatalogSource(context()),
    1,
  );
  await env.withSecurityRulesDisabled(async (ctx) => {
    await deleteDoc(
      doc(
        ctx.firestore(),
        "catalogReleases",
        "seed",
        "plays",
        original.plays[0].id,
      ),
    );
  });
  await assert.rejects(
    repo.updateCatalog(new models.FirestoreCatalogSource(context()), 1),
    /hiányos/,
  );
  assert.deepEqual(await repo.loadCatalog(), original);
});
test("a cache csak ugyanahhoz a Firebase-projekthez és verzióhoz használható újra", async () => {
  const cloud = context(),
    cached = await new models.FirestoreCatalogSource(cloud).fetch();
  await env.withSecurityRulesDisabled(async (ctx) => {
    await deleteDoc(
      doc(
        ctx.firestore(),
        "catalogReleases",
        "seed",
        "plays",
        cached.plays[0].id,
      ),
    );
  });
  assert.equal(
    await new models.FirestoreCatalogSource(cloud, cached).fetch(),
    cached,
  );
  await assert.rejects(
    new models.FirestoreCatalogSource(cloud, {
      ...cached,
      cloud: undefined,
    }).fetch(),
    /hiányos/,
  );
});
test("az adminmeghívást csak az e-mail megerősített tulajdonosa használhatja egyszer", async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), "invitations", "reader@example.com"), {
      role: "admin",
      createdAt: serverTimestamp(),
    });
  });
  const owner = context("reader");
  await assertFails(
    getDoc(doc(context("editor").db, "invitations", "reader@example.com")),
  );
  await assertFails(
    getDoc(
      doc(context("reader", false).db, "invitations", "reader@example.com"),
    ),
  );
  await assertFails(
    updateDoc(doc(owner.db, "users", "reader"), {
      role: "admin",
      updatedAt: serverTimestamp(),
    }),
  );
  await assertFails(
    deleteDoc(doc(owner.db, "invitations", "reader@example.com")),
  );
  await models.claimInvitation(owner);
  assert.equal(
    (await getDoc(doc(owner.db, "users", "reader"))).data().role,
    "admin",
  );
  assert.equal(
    (await getDoc(doc(owner.db, "invitations", "reader@example.com"))).exists(),
    false,
  );
  await assertFails(
    setDoc(doc(owner.db, "invitations", "reader@example.com"), {
      role: "admin",
    }),
  );
});
test("a felfüggesztett meghívott sem állíthatja vissza a saját hozzáférését", async () => {
  await env.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), "invitations", "reader@example.com"), {
      role: "admin",
    });
    await updateDoc(doc(ctx.firestore(), "users", "reader"), {
      status: "suspended",
    });
  });
  const cloud = context("reader"),
    batch = writeBatch(cloud.db);
  batch.update(doc(cloud.db, "users", "reader"), {
    role: "admin",
    status: "active",
    updatedAt: serverTimestamp(),
  });
  batch.delete(doc(cloud.db, "invitations", "reader@example.com"));
  await assertFails(batch.commit());
});

test("a nyilvános hozzáférés módosítható, a régi kiadás vendégként nem olvasható", async () => {
  const cloud = context("editor");
  const base = await new models.FirestoreCatalogSource(cloud).fetch();
  const next = base.plays.map((p) => ({
    ...p,
    requiresAuth: p.id === base.plays[0].id,
  }));
  const published = await models.publishCatalog(cloud, base, next);
  const guest = context();
  const loaded = await new models.FirestoreCatalogSource(guest).fetch();
  assert.deepEqual(
    loaded.plays.map((p) => p.id),
    [base.plays[1].id],
  );
  await assertFails(
    getDoc(doc(guest.db, "catalogReleases", "seed", "plays", base.plays[0].id)),
  );
  await assertFails(
    getDoc(
      doc(
        guest.db,
        "catalogReleases",
        published.cloud.releaseId,
        "plays",
        base.plays[0].id,
      ),
    ),
  );
});
test("hat nyilvános taktika nem tehető közzé, a szabályok kézi API-hívással sem kerülhetők meg", async () => {
  const cloud = context("editor");
  const base = await new models.FirestoreCatalogSource(cloud).fetch();
  const six = Array.from({ length: 6 }, (_, i) => ({
    ...base.plays[0],
    id: `six-${i}`,
    requiresAuth: false,
  }));
  await assert.rejects(models.publishCatalog(cloud, base, six), /1–5/);
  const batch = writeBatch(cloud.db);
  const ids = six.map((p) => p.id);
  batch.set(doc(cloud.db, "catalogReleases", "bad-cap"), {
    schemaVersion: 1,
    contentVersion: base.contentVersion + 1,
    playCount: 6,
    publicPlayIds: ids,
    createdBy: "editor",
    createdAt: serverTimestamp(),
  });
  batch.set(doc(cloud.db, "catalog", "current"), {
    schemaVersion: 1,
    contentVersion: base.contentVersion + 1,
    playCount: 6,
    publicPlayIds: ids,
    releaseId: "bad-cap",
    updatedAt: serverTimestamp(),
  });
  await assertFails(batch.commit());
});
test("kijelentkezéskor a katalógus törölhető a saját könyvtár elvesztése nélkül", async () => {
  const files = new Map();
  const repo = new models.Repository({
    read: async (key) => files.get(key) ?? null,
    write: async (key, value) => {
      files.set(key, value);
    },
  });
  const member = await repo.updateCatalog(
    new models.FirestoreCatalogSource(context("reader")),
    1,
  );
  await repo.save({
    schemaVersion: 1,
    plays: [member.plays[0]],
    favorites: [],
    catalogUrl: "",
  });
  assert.deepEqual(
    (await repo.loadCatalog()).plays.map((p) => p.id),
    [seed.plays[0].id],
  );
  assert.equal((await repo.loadCatalog("reader")).plays.length, 2);
  await repo.clearCatalog("reader");
  assert.equal(await repo.loadCatalog("reader"), null);
  assert.equal((await repo.load()).plays.length, 1);
});

test("a nyilvános engedélylista nem jelölhet privát dokumentumot nyilvánosként", async () => {
  const cloud = context("editor"),
    batch = writeBatch(cloud.db);
  const meta = {
    schemaVersion: 1,
    contentVersion: seed.contentVersion + 1,
    playCount: 1,
    publicPlayIds: [seed.plays[1].id],
  };
  batch.set(
    doc(cloud.db, "catalogReleases", "wrong-access", "plays", seed.plays[1].id),
    { order: 0, play: seed.plays[1] },
  );
  batch.set(doc(cloud.db, "catalogReleases", "wrong-access"), {
    ...meta,
    createdBy: "editor",
    createdAt: serverTimestamp(),
  });
  batch.set(doc(cloud.db, "catalog", "current"), {
    ...meta,
    releaseId: "wrong-access",
    updatedAt: serverTimestamp(),
  });
  await assertFails(batch.commit());
});

test("a közös szerkesztés piszkozata fiókhoz kötött, a saját piszkozat megmarad", async () => {
  const files = new Map();
  const repo = new models.Repository({
    read: async (key) => files.get(key) ?? null,
    write: async (key, value) => {
      files.set(key, value);
    },
  });
  await repo.saveDraft(seed.plays[1], "editor");
  assert.equal(await repo.loadDraft(), null);
  assert.equal(await repo.loadDraft("reader"), null);
  assert.equal((await repo.loadDraft("editor")).id, seed.plays[1].id);
  await repo.saveDraft(seed.plays[0]);
  await repo.saveDraft(null, "editor");
  assert.equal(await repo.loadDraft("editor"), null);
  assert.equal((await repo.loadDraft()).id, seed.plays[0].id);
});

test("csak admin hívhat meg csapattagot; a nyilvános ellenőrzés nem árul el e-mailt vagy szerepkört", async () => {
  const admin = context("admin"),
    email = "invited@example.com";
  for (const cloud of [
    context(),
    context("reader"),
    context("editor"),
    context("suspended"),
    context("admin", false),
  ])
    await assert.rejects(models.createInvitation(cloud, email, "admin"));
  await models.createInvitation(admin, "  INVITED@EXAMPLE.COM  ", "editor");
  const key = await models.registrationKey(email),
    guest = context();
  const permit = await getDoc(doc(guest.db, "registrationPermits", key));
  assert.deepEqual(permit.data(), { active: true });
  await assertFails(getDocs(collection(guest.db, "registrationPermits")));
  await assertFails(getDoc(doc(guest.db, "invitations", email)));
  for (const cloud of [guest, context("reader"), context("editor")])
    await assertFails(
      getDocs(query(collection(cloud.db, "invitations"), limit(25))),
    );
  await assertSucceeds(
    getDocs(query(collection(admin.db, "invitations"), limit(25))),
  );
  await assertFails(getDocs(collection(admin.db, "invitations")));
  await models.requireRegistrationPermit(guest, email);
  await assert.rejects(
    models.requireRegistrationPermit(guest, "unknown@example.com"),
    /nincs aktív meghívás/,
  );
  await assert.rejects(
    models.createInvitation(admin, email, "admin"),
    /már van függő/,
  );
  assert.equal(
    (await getDoc(doc(admin.db, "invitations", email))).data().role,
    "editor",
  );
  await assert.rejects(models.revokeInvitation(context("editor"), email));
});
test("meghívás nélkül a közvetlen Auth-fiók sem hozhat létre tagprofilt és nem olvashat védett taktikát", async () => {
  for (const cloud of [
    context("stranger"),
    context("stranger", false),
    context("reader", false),
    context("suspended"),
  ]) {
    await assertFails(
      getDoc(
        doc(cloud.db, "catalogReleases", "seed", "plays", seed.plays[1].id),
      ),
    );
    await assertFails(
      getDocs(collection(cloud.db, "catalogReleases", "seed", "plays")),
    );
    const loaded = await new models.FirestoreCatalogSource(cloud).fetch();
    assert.equal(loaded.audience, "public");
    assert.deepEqual(loaded.plays, [seed.plays[0]]);
  }
  const stranger = context("stranger");
  await assertFails(
    setDoc(doc(stranger.db, "users", "stranger"), profile("stranger")),
  );
  assert.equal(await models.claimInvitation(stranger), false);
});
test("a megerősített meghívott egyszerre kapja meg a kijelölt tagságot és fogyasztja el a meghívást", async () => {
  const email = "invited@example.com",
    owner = context("invited"),
    unverified = context("invited", false);
  await models.createInvitation(context("admin"), email, "editor");
  const key = await models.registrationKey(email);
  assert.equal(await models.claimInvitation(unverified), false);
  await assertFails(getDoc(doc(unverified.db, "invitations", email)));
  await assertFails(
    setDoc(
      doc(unverified.db, "users", "invited"),
      profile("invited", "editor"),
    ),
  );
  await assertFails(
    setDoc(doc(owner.db, "users", "invited"), profile("invited", "editor")),
  );
  const forged = writeBatch(owner.db);
  forged.set(doc(owner.db, "users", "invited"), profile("invited", "admin"));
  forged.delete(doc(owner.db, "invitations", email));
  forged.delete(doc(owner.db, "registrationPermits", key));
  await assertFails(forged.commit());
  assert.equal(await models.claimInvitation(owner), true);
  const member = (await getDoc(doc(owner.db, "users", "invited"))).data();
  assert.equal(member.admitted, true);
  assert.equal(member.role, "editor");
  assert.equal(
    (await new models.FirestoreCatalogSource(owner).fetch()).plays.length,
    2,
  );
  assert.equal(
    (await getDoc(doc(context().db, "registrationPermits", key))).exists(),
    false,
  );
  assert.equal(
    (await getDoc(doc(owner.db, "invitations", email))).exists(),
    false,
  );
  assert.equal(await models.claimInvitation(owner), false);
});
test("a meghívás visszavonása megszünteti a regisztrációs engedélyt és a tagság megszerzését", async () => {
  const admin = context("admin"),
    email = "revoked@example.com";
  await models.createInvitation(admin, email);
  await models.revokeInvitation(admin, email);
  await assert.rejects(
    models.requireRegistrationPermit(context(), email),
    /nincs aktív meghívás/,
  );
  assert.equal(await models.claimInvitation(context("revoked")), false);
  await assertFails(
    getDoc(
      doc(
        context("revoked").db,
        "catalogReleases",
        "seed",
        "plays",
        seed.plays[1].id,
      ),
    ),
  );
});
test("a szerver nem fogad el külön létrehozott tagságot vagy fel nem használt regisztrációs engedélyt", async () => {
  const email = "incomplete@example.com",
    owner = context("incomplete");
  await models.createInvitation(context("admin"), email);
  const batch = writeBatch(owner.db);
  batch.set(doc(owner.db, "users", "incomplete"), profile("incomplete"));
  batch.delete(doc(owner.db, "invitations", email));
  await assertFails(batch.commit());
  const data = (await getDoc(doc(owner.db, "invitations", email))).data();
  await assertFails(
    deleteDoc(doc(owner.db, "registrationPermits", data.registrationKey)),
  );
  assert.equal(
    (await getDoc(doc(owner.db, "users", "incomplete"))).exists(),
    false,
  );
});
test("a tagság visszavonása után a korábbi teljes katalóguscache sem használható újra", async () => {
  const reader = context("reader");
  const cached = await new models.FirestoreCatalogSource(reader).fetch();
  await updateDoc(doc(context("admin").db, "users", "reader"), {
    status: "suspended",
    updatedAt: serverTimestamp(),
  });
  const current = await new models.FirestoreCatalogSource(
    reader,
    cached,
  ).fetch();
  assert.equal(current.audience, "public");
  assert.equal(current.plays.length, 1);
  await assertFails(
    getDoc(
      doc(reader.db, "catalogReleases", "seed", "plays", seed.plays[1].id),
    ),
  );
  await assertFails(
    updateDoc(doc(context("admin").db, "users", "admin"), {
      admitted: false,
      updatedAt: serverTimestamp(),
    }),
  );
});
