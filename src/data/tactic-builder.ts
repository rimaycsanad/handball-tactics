import type { Action, Actor, Phase, Play, Point } from "../domain/model";
import { defenseActors } from "./actors";

export type Move = readonly [actor: string, x: number, y: number];
export type Beat = {
  pass?: readonly [string, string];
  run?: readonly Move[];
  dribble?: Move;
  screen?: readonly Move[];
  shot?: string;
};
export type Node = {
  title: string;
  note: string;
  steps: Beat[];
  next?: { label: string; node: Node }[];
};
export type TacticSpec = {
  id: string;
  title: string;
  category: string;
  defense: string;
  description: string;
  coachingPoints: string[];
  plan: Node;
  ageGroup?: string;
  difficulty?: Play["difficulty"];
  formation?: string;
  court?: Play["court"];
  owner?: string;
  actors?: (actors: Actor[]) => Actor[];
  sources: Play["sources"];
  tags?: string[];
};
export const node = (
  title: string,
  note: string,
  steps: Beat[],
  next?: Node["next"],
): Node => ({ title, note, steps, next });
export const pass = (
  from: string,
  to: string,
  run: readonly Move[] = [],
): Beat => ({ pass: [from, to], run });
export const carry = (
  actor: string,
  x: number,
  y: number,
  screen: readonly Move[] = [],
  run: readonly Move[] = [],
): Beat => ({ dribble: [actor, x, y], screen, run });
export const move = (...run: Move[]): Beat => ({ run });
export const shoot = (actor: string): Beat => ({ shot: actor });

export function makeTactic(spec: TacticSpec): Play {
  const actors =
    spec.actors?.(defenseActors(spec.defense)) ?? defenseActors(spec.defense);
  const phases: Phase[] = [];
  let nextId = 0;
  const compile = (
    n: Node,
    positions: Record<string, Point>,
    owner: string | null,
  ): string => {
    const id = nextId++ === 0 ? "start" : `phase-${nextId}`;
    const phase: Phase = {
      id,
      title: n.title,
      note: n.note,
      duration: Math.max(1.2, n.steps.length * 1.2),
      actions: [],
      next: [],
    };
    phases.push(phase);
    positions = structuredClone(positions);
    const position = (actor: string) => {
      const p = positions[actor];
      if (!p) throw new Error(`${spec.title}: hiányzó játékos: ${actor}`);
      return p;
    };
    const add = (
      kind: Action["kind"],
      actorId: string,
      path: Point[],
      start: number,
      duration: number,
      targetId?: string,
    ) =>
      phase.actions.push({
        id: `${spec.id}-${id}-${phase.actions.length}`,
        kind,
        actorId,
        path,
        start,
        duration,
        ...(targetId ? { targetId } : {}),
      });
    n.steps.forEach((s, i) => {
      const start = Math.round(i * 1.2 * 10) / 10;
      for (const [actor, x, y] of s.run ?? []) {
        position(actor);
        add("run", actor, [{ x, y }], start, 1);
      }
      for (const [actor, x, y] of s.screen ?? []) {
        position(actor);
        add("screen", actor, [{ x, y }], start, 1);
      }
      if (s.dribble) {
        const [actor, x, y] = s.dribble;
        if (owner !== actor)
          throw new Error(`${spec.title}: labda nélküli labdavezetés`);
        add("dribble", actor, [{ x, y }], start, 1);
      }
      if (s.pass) {
        const [from, to] = s.pass;
        if (owner !== from)
          throw new Error(`${spec.title}: labda nélküli passz`);
        position(from);
        const moving = s.run?.find((m) => m[0] === to);
        const target = moving ? { x: moving[1], y: moving[2] } : position(to);
        add("pass", from, [target], start, 0.5, to);
        owner = to;
      }
      if (s.shot) {
        if (owner !== s.shot)
          throw new Error(`${spec.title}: labda nélküli lövés`);
        add("shot", s.shot, [{ x: 10, y: 0 }], start, 0.6);
        owner = null;
      }
      for (const [actor, x, y] of [
        ...(s.run ?? []),
        ...(s.screen ?? []),
        ...(s.dribble ? [s.dribble] : []),
      ])
        positions[actor] = { x, y };
    });
    phase.next = (n.next ?? []).map((branch) => ({
      label: branch.label,
      phaseId: compile(branch.node, positions, owner),
    }));
    return id;
  };
  const owner = spec.owner ?? "CB";
  compile(
    spec.plan,
    Object.fromEntries(actors.map((a) => [a.id, a.position])),
    owner,
  );
  return {
    schemaVersion: 1,
    requiresAuth: true,
    id: spec.id,
    revision: 1,
    title: spec.title,
    category: spec.category,
    defense: spec.defense,
    ageGroup: spec.ageGroup ?? "U16",
    difficulty: spec.difficulty ?? "Középhaladó",
    formation: spec.formation ?? "3:3",
    court: spec.court ?? "half",
    description: spec.description,
    tags: spec.tags ?? [spec.category, spec.defense],
    actors,
    ballOwnerId: owner,
    entryPhaseId: "start",
    phases,
    coachingPoints: spec.coachingPoints,
    sources: spec.sources,
    updatedAt: "2026-10-14T19:30:00.000Z",
  };
}
export function withPositions(actors: Actor[], points: Record<string, Point>) {
  for (const [id, p] of Object.entries(points))
    actors.find((a) => a.id === id)!.position = p;
  return actors;
}
export function twoPivots(actors: Actor[]) {
  return [
    ...actors.filter((a) => a.id !== "LB"),
    {
      id: "PV2",
      label: "BE2",
      team: "attack" as const,
      position: { x: 7, y: 6.7 },
    },
  ];
}
export function sevenAttackers(actors: Actor[]) {
  return [
    ...actors,
    {
      id: "PV2",
      label: "BE2",
      team: "attack" as const,
      position: { x: 7, y: 6.7 },
    },
  ];
}
