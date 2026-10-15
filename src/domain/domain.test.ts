import { describe, expect, it } from "vitest";
import { builtInPlays, newPlay } from "../data/seeds";
import { copyPlay, validatePlay } from "./model";
import {
  alongPath,
  initialScene,
  phaseBase,
  sceneAt,
  validateBallFlow,
} from "./engine";
import {
  catalogSchema,
  importPlays,
  Repository,
  type Catalog,
} from "../data/repository";
import type { FileStore } from "../data/storage";

class MemoryFiles implements FileStore {
  readonly kind = "Test files";
  files = new Map<string, string>();
  async read(name: string) {
    return this.files.get(name) ?? null;
  }
  async write(name: string, value: string) {
    this.files.set(name, value);
  }
}
describe("taktikai modell és lejátszás", () => {
  it("minden mintataktika lejátszható, a labdaáramlása is érvényes", () => {
    for (const play of builtInPlays) {
      expect(() => validatePlay(play), play.title).not.toThrow();
      expect(validateBallFlow(play), play.title).toEqual([]);
    }
  });
  it("az útvonalon távolság szerint interpolál, és a végpontnál megáll", () => {
    const path = [
      { x: 0, y: 0 },
      { x: 1, y: 0 },
      { x: 1, y: 3 },
    ];
    expect(alongPath(path, 0.5)).toEqual({ x: 1, y: 1 });
    expect(alongPath(path, 2)).toEqual({ x: 1, y: 3 });
  });
  it("az elágazás megörökli az előző fázis pozícióit és labdabirtokosát", () => {
    const p = builtInPlays[0];
    const base = phaseBase(p, ["start", "pivot"], 1);
    expect(base.ballOwnerId).toBe("CB");
    expect(base.positions.CB).toEqual({ x: 8, y: 10 });
    const final = sceneAt(p, "pivot", 3, base);
    expect(final.ballOwnerId).toBeNull();
    expect(final.ball).toEqual({ x: 10, y: 0 });
  });
  it("az animáció közbeni passz labdája a pályán mozog", () => {
    const p = builtInPlays[0];
    const midway = sceneAt(p, "start", 0.3, initialScene(p));
    expect(midway.ballOwnerId).toBeNull();
    expect(midway.ball.x).toBeCloseTo(7.75);
  });
  it("elutasítja a fázisok körkörös és hibás hivatkozásait", () => {
    const p = newPlay();
    p.phases[0].next = [{ label: "kör", phaseId: p.entryPhaseId }];
    expect(() => validatePlay(p)).toThrow("kört");
    p.phases[0].next = [{ label: "hiányzik", phaseId: "missing" }];
    expect(() => validatePlay(p)).toThrow();
  });
  it("elutasítja a félpályán kívüli pontokat és az átfedő labdaműveleteket", () => {
    const p = structuredClone(builtInPlays[0]);
    p.actors[0].position.y = 25;
    expect(() => validatePlay(p)).toThrow("Félpályán");
    p.actors[0].position.y = 7;
    p.phases[0].actions.find((a) => a.kind === "dribble")!.start = 0.2;
    expect(() => validatePlay(p)).toThrow("labdaműveletek");
  });
  it("jelzi, ha a játékos labda nélkül passzolna", () => {
    const p = structuredClone(builtInPlays[0]);
    p.ballOwnerId = "RB";
    expect(validateBallFlow(p).length).toBeGreaterThan(0);
  });
  it("másolatot készít, a beépített minta módosítása nélkül", () => {
    const source = builtInPlays[0];
    const copy = copyPlay(source);
    copy.actors[0].position.x = 19;
    expect(copy.id).not.toBe(source.id);
    expect(source.actors[0].position.x).toBe(2);
  });
});
describe("helyi fájlok, import és HTTP-frissítés", () => {
  it("visszaállítja a még érvénytelen időzítésű piszkozatot, a mentett könyvtár érintése nélkül", async () => {
    const files = new MemoryFiles();
    const repo = new Repository(files);
    const p = newPlay();
    await repo.save({ ...(await repo.load()), plays: [p] });
    const draft = structuredClone(p);
    draft.title = "";
    draft.phases[0].duration = 100;
    await repo.saveDraft(draft);
    expect((await repo.loadDraft())?.phases[0].duration).toBe(100);
    expect((await repo.load()).plays[0].phases[0].duration).toBe(3);
  });
  it("visszatölti a mentést, és megőrzi az előző fájlt biztonsági másolatként", async () => {
    const store = new MemoryFiles();
    const repo = new Repository(store);
    const original = await repo.load();
    await repo.save(original);
    await repo.save({ ...original, plays: [newPlay()] });
    expect((await repo.load()).plays).toHaveLength(1);
    expect(JSON.parse(store.files.get("library.backup.json")!).plays).toEqual(
      [],
    );
  });
  it("a sérült helyi adatot nem cseréli üres könyvtárra", async () => {
    const store = new MemoryFiles();
    store.files.set("library.json", "broken");
    const repo = new Repository(store);
    await expect(repo.load()).rejects.toThrow();
    expect(store.files.get("library.json")).toBe("broken");
  });
  it("a teljes importot elutasítja, ha egyik taktika hibás", () => {
    const invalid = structuredClone(builtInPlays[0]);
    invalid.phases[0].actions[0].actorId = "missing";
    expect(() =>
      importPlays(JSON.stringify([builtInPlays[1], invalid])),
    ).toThrow();
    expect(
      importPlays(JSON.stringify({ schemaVersion: 1, plays: builtInPlays })),
    ).toHaveLength(builtInPlays.length);
  });
  it("hibás vagy régebbi frissítés után megtartja a működő katalógust és saját taktikát", async () => {
    const store = new MemoryFiles();
    const repo = new Repository(store);
    const local = await repo.load();
    await repo.save({ ...local, plays: [newPlay()] });
    const valid: Catalog = {
      schemaVersion: 1,
      contentVersion: 2,
      plays: builtInPlays,
    };
    await repo.updateCatalog({ fetch: async () => valid }, 1);
    const before = store.files.get("catalog.json");
    await expect(
      repo.updateCatalog(
        { fetch: async () => ({ ...valid, contentVersion: 1 }) },
        2,
      ),
    ).rejects.toThrow("régebbi");
    const invalid = structuredClone(valid);
    invalid.plays[0].phases[0].next[0].phaseId = "missing";
    await expect(
      repo.updateCatalog({ fetch: async () => invalid }, 2),
    ).rejects.toThrow();
    expect(store.files.get("catalog.json")).toBe(before);
    expect((await repo.load()).plays).toHaveLength(1);
  });
  it("az érvénytelen katalógus körkörös fázisai nem akasztják meg az ellenőrzést", () => {
    const invalid = structuredClone(builtInPlays[0]);
    invalid.phases[0].next = [{ label: "kör", phaseId: "start" }];
    expect(() =>
      catalogSchema.parse({
        schemaVersion: 1,
        contentVersion: 1,
        plays: [invalid],
      }),
    ).toThrow();
  });
  it("a sikertelen mentés után a mentési sor tovább használható", async () => {
    const store = new MemoryFiles();
    const repo = new Repository(store);
    const local = await repo.load();
    const originalWrite = store.write.bind(store);
    let fail = true;
    store.write = async (n, v) => {
      if (fail) {
        fail = false;
        throw new Error("Disk full");
      }
      return originalWrite(n, v);
    };
    await expect(repo.save(local)).rejects.toThrow("Disk full");
    await repo.save({ ...local, plays: [newPlay()] });
    expect((await repo.load()).plays).toHaveLength(1);
  });
});
