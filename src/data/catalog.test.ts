import {translationKey} from "../domain/translation-key";
import { describe, expect, it } from "vitest";
import { builtInPlays, builtInCatalogVersion } from "./seeds";
import { selectCatalog } from "./catalog-selection";
import { initialScene, sceneAt, type Scene } from "../domain/engine";
import type { Catalog } from "./repository";

describe("bővített taktikai katalógus", () => {
  it("legalább 60 külön névvel, azonosítóval és tényleges mozgásképpel rendelkezik", () => {
    expect(builtInPlays.length).toBeGreaterThanOrEqual(60);
    expect(new Set(builtInPlays.map((p) => p.id)).size).toBe(
      builtInPlays.length,
    );
    expect(new Set(builtInPlays.map((p) => p.title)).size).toBe(
      builtInPlays.length,
    );
    const fingerprint = builtInPlays.map((p) =>
      JSON.stringify({
        actors: p.actors.map(({ id, team, position }) => ({
          id,
          team,
          position,
        })),
        owner: p.ballOwnerId,
        phases: p.phases.map((ph) => ({
          actions: ph.actions.map(
            ({ kind, actorId, targetId, path, start, duration }) => ({
              kind,
              actorId,
              targetId,
              path,
              start,
              duration,
            }),
          ),
          branches: ph.next.length,
        })),
      }),
    );
    expect(new Set(fingerprint).size).toBe(builtInPlays.length);
    for (const p of builtInPlays) {
      expect(p.sources.length, p.title).toBeGreaterThan(0);
      expect(p.coachingPoints.length, p.title).toBeGreaterThanOrEqual(2);
    }
  });
  it("az összes befejezési ág véges és kapura lövéssel végződik", () => {
    let leaves = 0;
    for (const p of builtInPlays) {
      const walk = (id: string, base: Scene) => {
        const phase = p.phases.find((ph) => ph.id === id)!;
        const scene = sceneAt(p, id, phase.duration, base);
        expect(
          Object.values(scene.positions).every(
            (pt) => Number.isFinite(pt.x) && Number.isFinite(pt.y),
          ),
          p.title,
        ).toBe(true);
        if (!phase.next.length) {
          leaves++;
          expect(scene.ballOwnerId, p.title).toBeNull();
          expect(scene.ball, p.title).toEqual({ x: 10, y: 0 });
        }
        for (const next of phase.next) walk(next.phaseId, scene);
      };
      walk(p.entryPhaseId, initialScene(p));
    }
    expect(leaves).toBeGreaterThan(80);
  });
  it("a létszámhelyzetekben a megadott számú támadó és védő kerül a pályára", () => {
    for (const p of builtInPlays) {
      const match = ["7:6", "6:5", "6:4", "5:6"].find(
        (s) => p.tags.includes(s) || p.title.startsWith(s),
      );
      if (!match) continue;
      const [attack, defense] = match.split(":").map(Number);
      expect(p.actors.filter((a) => a.team === "attack").length, p.title).toBe(
        attack,
      );
      expect(p.actors.filter((a) => a.team === "defense").length, p.title).toBe(
        defense,
      );
    }
  });
  it("a régi és másik fiókhoz tartozó cache nem jelenhet meg vendégként", () => {
    const cached: Catalog = {
      schemaVersion: 1,
      contentVersion: builtInCatalogVersion,
      plays: builtInPlays,
      audience: "alice",
    };
    expect(selectCatalog(cached).plays).toEqual([]);
    expect(selectCatalog(cached, "bob").plays).toEqual([]);
    expect(selectCatalog(cached, "alice")).toBe(cached);
    expect(
      selectCatalog({ ...cached, audience: undefined }, "alice").plays,
    ).toEqual([]);
    const publicCache = { ...cached, audience: "public" };
    expect(selectCatalog(publicCache).plays).toHaveLength(5);
    expect(selectCatalog(publicCache).plays.every((p) => !p.requiresAuth)).toBe(
      true,
    );
  });
  it("minden katalógustaktika minden szövegéhez tartozik angol fordítás", () => {
    expect(builtInPlays.filter((p) => !p.requiresAuth)).toHaveLength(5);
    for (const p of builtInPlays) {
      const texts = [
        p.title,
        p.description,
        p.category,
        ...p.coachingPoints,
        ...p.phases.flatMap((ph) => [
          ph.title,
          ph.note,
          ...ph.next.map((n) => n.label),
        ]),
      ];
      for (const text of texts.filter(Boolean))
        expect(p.english?.[translationKey(text)], text).toBeTruthy();
    }
  });
});
