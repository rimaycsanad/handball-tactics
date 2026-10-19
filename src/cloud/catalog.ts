import { canRead, profileSchema } from "./access";
import { z } from "zod";
import {
  collection,
  documentId,
  query,
  where,
  doc,
  getDocFromServer,
  getDocsFromServer,
  runTransaction,
  serverTimestamp,
  writeBatch,
} from "firebase/firestore";
import {
  catalogSchema,
  type Catalog,
  type CatalogSource,
} from "../data/repository";
import { validatePlay, type Play } from "../domain/model";
import { validateBallFlow } from "../domain/engine";
import type { CloudServices } from "./firebase";

const manifestSchema = z.object({
  schemaVersion: z.literal(1),
  contentVersion: z.number().int().positive(),
  releaseId: z.string().regex(/^[a-zA-Z0-9-]{1,100}$/),
  playCount: z.number().int().min(1).max(500),
  publicPlayIds: z.array(z.string()).min(1).max(5),
});

export class FirestoreCatalogSource implements CatalogSource {
  constructor(
    private cloud: CloudServices,
    private cached?: Catalog,
    private audience?: string,
  ) {}
  async fetch(): Promise<Catalog> {
    let audience = "public";
    const identity = this.cloud.auth.currentUser;
    if (this.audience !== "public" && identity?.emailVerified) {
      const snapshot = await getDocFromServer(
        doc(this.cloud.db, "users", identity.uid),
      );
      const parsed = snapshot.exists()
        ? profileSchema.safeParse(snapshot.data())
        : null;
      if (
        parsed?.success &&
        parsed.data.uid === identity.uid &&
        parsed.data.email === identity.email?.toLowerCase() &&
        canRead(parsed.data, true)
      )
        audience = identity.uid;
    }
    const snapshot = await getDocFromServer(
      doc(this.cloud.db, "catalog", "current"),
    );
    if (!snapshot.exists())
      throw new Error(
        "A központi taktikatár még nincs feltöltve. A beépített minták használhatók.",
      );
    const manifest = manifestSchema.parse(snapshot.data());
    if (
      this.cached?.audience === audience &&
      this.cached?.cloud?.projectId === this.cloud.projectId &&
      this.cached.cloud.releaseId === manifest.releaseId &&
      this.cached.contentVersion === manifest.contentVersion
    )
      return this.cached;
    const playsRef = collection(
      this.cloud.db,
      "catalogReleases",
      manifest.releaseId,
      "plays",
    );
    const documents = await getDocsFromServer(
      audience === "public"
        ? query(playsRef, where(documentId(), "in", manifest.publicPlayIds))
        : playsRef,
    );
    if (
      documents.size !==
      (audience === "public"
        ? manifest.publicPlayIds.length
        : manifest.playCount)
    )
      throw new Error(
        "A központi katalógus hiányos. A korábbi változatot megtartottuk.",
      );
    const entries = documents.docs
      .map((entry) => {
        const value = entry.data();
        if (!Number.isInteger(value.order) || value.play?.id !== entry.id)
          throw new Error("Hibás katalógustétel.");
        return value as { order: number; play: Play };
      })
      .sort((a, b) => a.order - b.order);
    return catalogSchema.parse({
      schemaVersion: 1,
      contentVersion: manifest.contentVersion,
      plays: entries.map((e) => e.play),
      audience,
      cloud: { projectId: this.cloud.projectId, releaseId: manifest.releaseId },
    });
  }
}

// Upload an unpublished release first. Only the final transaction makes it visible.
// A concurrent editor's publication fails the version check instead of being overwritten.
export async function publishCatalog(
  cloud: CloudServices,
  base: Catalog,
  plays: Play[],
): Promise<Catalog> {
  const catalog = catalogSchema.parse({
    schemaVersion: 1,
    contentVersion: base.contentVersion + 1,
    plays,
  });
  const publicPlayIds = plays.filter((p) => !p.requiresAuth).map((p) => p.id);
  if (!publicPlayIds.length || publicPlayIds.length > 5)
    throw new Error(
      "A közös tárban 1–5 nyilvános taktika lehet. Előbb állíts egy másik taktikát bejelentkezéshez kötöttre.",
    );
  const identity = cloud.auth.currentUser;
  if (!identity?.emailVerified)
    throw new Error("A közzétételhez megerősített e-mail-cím szükséges.");
  const size = (value: unknown) =>
    new TextEncoder().encode(JSON.stringify(value)).byteLength;
  if (size(catalog) > 5_000_000 || plays.some((p) => size(p) > 800_000))
    throw new Error("A katalógus túl nagy a közzétételhez.");
  const ref = doc(cloud.db, "catalog", "current");
  const current = await getDocFromServer(ref);
  const checkVersion = (value: unknown) => {
    if (
      value &&
      (manifestSchema.parse(value).contentVersion !== base.contentVersion ||
        manifestSchema.parse(value).releaseId !== base.cloud?.releaseId ||
        base.cloud?.projectId !== cloud.projectId)
    ) {
      throw new Error(
        "A központi taktikatár időközben változott. Frissítsd, majd végezd el újra a módosítást.",
      );
    }
  };
  checkVersion(current.exists() ? current.data() : null);
  const releaseId = crypto.randomUUID();
  for (let offset = 0; offset < plays.length; offset += 100) {
    const batch = writeBatch(cloud.db);
    plays.slice(offset, offset + 100).forEach((p, i) =>
      batch.set(doc(cloud.db, "catalogReleases", releaseId, "plays", p.id), {
        order: offset + i,
        play: p,
      }),
    );
    await batch.commit();
  }
  await runTransaction(cloud.db, async (transaction) => {
    const latest = await transaction.get(ref);
    checkVersion(latest.exists() ? latest.data() : null);
    transaction.set(doc(cloud.db, "catalogReleases", releaseId), {
      schemaVersion: 1,
      contentVersion: catalog.contentVersion,
      playCount: plays.length,
      publicPlayIds,
      createdBy: identity.uid,
      createdAt: serverTimestamp(),
    });
    transaction.set(ref, {
      schemaVersion: 1,
      contentVersion: catalog.contentVersion,
      releaseId,
      playCount: plays.length,
      publicPlayIds,
      updatedAt: serverTimestamp(),
    });
  });
  return {
    ...catalog,
    audience: identity.uid,
    cloud: { projectId: cloud.projectId, releaseId },
  };
}

export function replaceCatalogPlay(catalog: Catalog, value: Play): Play[] {
  const play = validatePlay(value);
  const errors = validateBallFlow(play);
  if (errors.length) throw new Error(errors.join(" "));
  const existing = catalog.plays.find((p) => p.id === play.id);
  const next = {
    ...play,
    revision: (existing?.revision ?? 0) + 1,
    updatedAt: new Date().toISOString(),
  };
  return existing
    ? catalog.plays.map((p) => (p.id === next.id ? next : p))
    : [...catalog.plays, next];
}
