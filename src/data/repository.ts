import { z } from "zod";
import { playSchema, validatePlay, type Play } from "../domain/model";
import { validateBallFlow } from "../domain/engine";
import type { FileStore } from "./storage";

export const catalogSchema = z
  .object({
    schemaVersion: z.literal(1),
    contentVersion: z.number().int().positive(),
    plays: z.array(playSchema).min(1).max(500),
  })
  .superRefine((c, ctx) => {
    if (new Set(c.plays.map((p) => p.id)).size !== c.plays.length)
      ctx.addIssue({
        code: "custom",
        message: "A katalógus azonosítói nem egyediek.",
      });
    for (const p of c.plays)
      for (const message of validateBallFlow(p))
        ctx.addIssue({ code: "custom", message });
  });
export type Catalog = z.infer<typeof catalogSchema>;
export interface CatalogSource {
  fetch(): Promise<Catalog>;
}
export class HttpCatalogSource implements CatalogSource {
  constructor(private url: string) {
    const u = new URL(url);
    if (
      u.protocol !== "https:" &&
      !(
        u.protocol === "http:" &&
        ["localhost", "127.0.0.1"].includes(u.hostname)
      )
    )
      throw new Error("A katalógus URL-je HTTPS-cím legyen.");
  }
  async fetch() {
    const response = await fetch(this.url, {
      cache: "no-store",
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok)
      throw new Error(`A katalógus letöltése sikertelen (${response.status}).`);
    const body = await response.text();
    if (body.length > 5_000_000) throw new Error("A katalógus túl nagy.");
    return catalogSchema.parse(JSON.parse(body));
  }
}
export type Library = {
  schemaVersion: 1;
  plays: Play[];
  favorites: string[];
  catalogUrl: string;
};
const phaseShape = playSchema.shape.phases.element;
const draftSchema = z.object(playSchema.shape).extend({
  title: z.string().max(120),
  phases: z
    .array(
      phaseShape.extend({
        duration: z.number().finite(),
        actions: z
          .array(
            phaseShape.shape.actions.element.extend({
              start: z.number().finite(),
              duration: z.number().finite(),
            }),
          )
          .max(100),
      }),
    )
    .min(1)
    .max(100),
  coachingPoints: z.array(z.string().max(10000)).max(500),
});
const librarySchema = z.object({
  schemaVersion: z.literal(1),
  plays: z.array(playSchema).max(500),
  favorites: z.array(z.string()).max(1000),
  catalogUrl: z.string().max(2000),
});
export class Repository {
  private queue = Promise.resolve();
  constructor(readonly store: FileStore) {}
  private enqueue<T>(job: () => Promise<T>): Promise<T> {
    const task = this.queue.then(job);
    this.queue = task.then(
      () => {},
      () => {},
    );
    return task;
  }
  async load(): Promise<Library> {
    const raw = await this.store.read("library.json");
    if (raw === null)
      return {
        schemaVersion: 1,
        plays: [],
        favorites: [],
        catalogUrl: import.meta.env.VITE_CATALOG_URL ?? "",
      };
    return librarySchema.parse(JSON.parse(raw));
  }
  save(library: Library) {
    return this.enqueue(async () => {
      const valid = librarySchema.parse(library);
      const previous = await this.store.read("library.json");
      if (previous) await this.store.write("library.backup.json", previous);
      await this.store.write("library.json", JSON.stringify(valid));
    });
  }
  async loadCatalog(): Promise<Catalog | null> {
    const raw = await this.store.read("catalog.json");
    return raw === null ? null : catalogSchema.parse(JSON.parse(raw));
  }
  updateCatalog(source: CatalogSource, minimumVersion: number) {
    return this.enqueue(async () => {
      const catalog = catalogSchema.parse(await source.fetch());
      if (catalog.contentVersion < minimumVersion)
        throw new Error("A katalógus régebbi a jelenlegi változatnál.");
      await this.store.write("catalog.json", JSON.stringify(catalog));
      return catalog;
    });
  }
  saveDraft(play: Play | null) {
    return this.enqueue(() =>
      this.store.write("draft.json", JSON.stringify(play)),
    );
  }
  async loadDraft(): Promise<Play | null> {
    const raw = await this.store.read("draft.json");
    if (!raw || raw === "null") return null;
    // An unfinished draft may have empty metadata or incomplete transitions.
    const draft = draftSchema.parse(JSON.parse(raw));
    return draft;
  }
  async recoveryFile() {
    return this.store.read("library.json");
  }
}
export function importPlays(text: string): Play[] {
  if (text.length > 5_000_000)
    throw new Error("Legfeljebb 5 MB-os JSON importálható.");
  const parsed: unknown = JSON.parse(text);
  const values = Array.isArray(parsed)
    ? parsed
    : parsed && typeof parsed === "object" && "plays" in parsed
      ? (parsed as { plays: unknown }).plays
      : [parsed];
  if (!Array.isArray(values) || values.length === 0 || values.length > 500)
    throw new Error("A fájl nem tartalmaz érvényes taktikákat.");
  const plays = values.map(validatePlay);
  if (new Set(plays.map((p) => p.id)).size !== plays.length)
    throw new Error("A fájl ismétlődő azonosítókat tartalmaz.");
  for (const p of plays) {
    const errors = validateBallFlow(p);
    if (errors.length) throw new Error(errors.join(" "));
  }
  return plays;
}
