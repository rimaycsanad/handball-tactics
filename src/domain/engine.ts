import type { Action, Play, Point } from "./model";
export type Scene = {
  positions: Record<string, Point>;
  ball: Point;
  ballOwnerId: string | null;
};
const lerp = (a: Point, b: Point, t: number): Point => ({
  x: a.x + (b.x - a.x) * t,
  y: a.y + (b.y - a.y) * t,
});
export function alongPath(points: Point[], progress: number): Point {
  if (points.length === 1) return points[0];
  const lengths = points
    .slice(1)
    .map((p, i) => Math.hypot(p.x - points[i].x, p.y - points[i].y));
  let distance =
    Math.max(0, Math.min(1, progress)) * lengths.reduce((a, b) => a + b, 0);
  for (let i = 0; i < lengths.length; i++) {
    if (distance <= lengths[i] && lengths[i] > 0)
      return lerp(points[i], points[i + 1], distance / lengths[i]);
    distance -= lengths[i];
  }
  return points[points.length - 1];
}
export function initialScene(play: Play): Scene {
  const positions = Object.fromEntries(
    play.actors.map((a) => [a.id, { ...a.position }]),
  );
  return {
    positions,
    ball: positions[play.ballOwnerId],
    ballOwnerId: play.ballOwnerId,
  };
}
export function sceneAt(
  play: Play,
  phaseId: string,
  time: number,
  base: Scene,
): Scene {
  const phase = play.phases.find((p) => p.id === phaseId);
  if (!phase) return structuredClone(base);
  const positionsAt = (t: number) => {
    const result = structuredClone(base.positions);
    for (const a of [...phase.actions].sort((a, b) => a.start - b.start)) {
      if (!["run", "dribble", "screen"].includes(a.kind) || t < a.start)
        continue;
      result[a.actorId] = alongPath(
        [result[a.actorId], ...a.path],
        (t - a.start) / a.duration,
      );
    }
    return result;
  };
  const positions = positionsAt(time);
  let owner = base.ballOwnerId;
  let ball = base.ball;
  for (const a of [...phase.actions].sort((a, b) => a.start - b.start)) {
    if (!["pass", "shot"].includes(a.kind) || time < a.start) continue;
    const origin = positionsAt(a.start)[a.actorId];
    if (time < a.start + a.duration) {
      const target =
        a.kind === "pass" && a.targetId
          ? positionsAt(a.start + a.duration)[a.targetId]
          : a.path[a.path.length - 1];
      ball = alongPath(
        [origin, ...a.path.slice(0, -1), target],
        (time - a.start) / a.duration,
      );
      owner = null;
    } else {
      owner = a.kind === "pass" ? (a.targetId ?? null) : null;
      ball =
        a.kind === "pass" && owner
          ? positions[owner]
          : a.path[a.path.length - 1];
    }
  }
  if (owner) ball = positions[owner];
  return { positions, ball, ballOwnerId: owner };
}
export function phaseBase(play: Play, route: string[], index: number): Scene {
  let scene = initialScene(play);
  for (const id of route.slice(0, index)) {
    const phase = play.phases.find((p) => p.id === id);
    if (phase) scene = sceneAt(play, id, phase.duration, scene);
  }
  return scene;
}
export function validateBallFlow(play: Play): string[] {
  const errors = new Set<string>();
  const visited = new Set<string>();
  const walk = (id: string, base: Scene) => {
    const key = `${id}:${base.ballOwnerId}`;
    if (visited.has(key)) return;
    visited.add(key);
    const phase = play.phases.find((p) => p.id === id);
    if (!phase) {
      errors.add("Hiányzó fázis.");
      return;
    }
    let owner = base.ballOwnerId;
    for (const a of [...phase.actions].sort((a, b) => a.start - b.start)) {
      if (!["pass", "dribble", "shot"].includes(a.kind)) continue;
      if (owner !== a.actorId)
        errors.add(
          `${phase.title}: ${a.actorId} nem birtokolja a labdát a művelet kezdetén.`,
        );
      if (a.kind === "pass") owner = a.targetId ?? null;
      if (a.kind === "shot") owner = null;
    }
    const final = sceneAt(play, id, phase.duration, base);
    for (const n of phase.next) walk(n.phaseId, final);
  };
  walk(play.entryPhaseId, initialScene(play));
  return [...errors];
}
export function actionStart(scene: Scene, action: Action): Point {
  return scene.positions[action.actorId];
}
