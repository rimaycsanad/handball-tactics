import { z } from "zod";

export const pointSchema = z.object({
  x: z.number().min(0).max(20),
  y: z.number().min(0).max(40),
});
export type Point = z.infer<typeof pointSchema>;
export const actionKinds = [
  "run",
  "dribble",
  "pass",
  "screen",
  "shot",
] as const;
export const actionLabels: Record<ActionKind, string> = {
  run: "Futás",
  dribble: "Labdavezetés",
  pass: "Passz",
  screen: "Elzárás",
  shot: "Lövés",
};
export type ActionKind = (typeof actionKinds)[number];
const actorSchema = z.object({
  id: z.string().min(1).max(80),
  label: z.string().min(1).max(12),
  team: z.enum(["attack", "defense", "keeper"]),
  position: pointSchema,
});
const actionSchema = z.object({
  id: z.string().min(1).max(80),
  kind: z.enum(actionKinds),
  actorId: z.string(),
  targetId: z.string().optional(),
  path: z.array(pointSchema).min(1).max(20),
  start: z.number().min(0).max(60),
  duration: z.number().positive().max(60),
});
const phaseSchema = z.object({
  id: z.string().min(1).max(80),
  title: z.string().min(1).max(120),
  duration: z.number().positive().max(60),
  note: z.string().max(2000),
  actions: z.array(actionSchema).max(100),
  next: z
    .array(z.object({ label: z.string().min(1).max(120), phaseId: z.string() }))
    .max(8),
});
export const playSchema = z
  .object({
    schemaVersion: z.literal(1),
    id: z.string().min(1).max(100),
    revision: z.number().int().positive(),
    requiresAuth: z.boolean().default(true),
    english: z.record(z.string().max(80), z.string().max(3000)).optional(),
    title: z.string().min(1).max(120),
    description: z.string().max(3000),
    category: z.string().min(1).max(80),
    defense: z.string().min(1).max(40),
    ageGroup: z.string().min(1).max(40),
    difficulty: z.enum(["Kezdő", "Középhaladó", "Haladó"]),
    formation: z.string().max(40),
    court: z.enum(["half", "full"]),
    tags: z.array(z.string().max(50)).max(20),
    actors: z.array(actorSchema).min(1).max(30),
    ballOwnerId: z.string(),
    entryPhaseId: z.string(),
    phases: z.array(phaseSchema).min(1).max(100),
    coachingPoints: z.array(z.string().max(500)).max(30),
    sources: z
      .array(z.object({ title: z.string().max(200), url: z.string().url() }))
      .max(20),
    updatedAt: z.string().datetime(),
  })
  .superRefine((play, ctx) => {
    const issue = (message: string) =>
      ctx.addIssue({ code: "custom", message });
    const actors = new Set(play.actors.map((a) => a.id));
    const phases = new Set(play.phases.map((p) => p.id));
    if (actors.size !== play.actors.length)
      issue("A játékosazonosítók nem egyediek.");
    if (phases.size !== play.phases.length)
      issue("A fázisazonosítók nem egyediek.");
    if (!actors.has(play.ballOwnerId)) issue("A kezdő labdabirtokos hiányzik.");
    if (!phases.has(play.entryPhaseId)) issue("A kezdőfázis hiányzik.");
    const actionIds = new Set<string>();
    if (
      play.court === "half" &&
      (play.actors.some((a) => a.position.y > 20) ||
        play.phases.some((p) =>
          p.actions.some((a) => a.path.some((pt) => pt.y > 20)),
        ))
    )
      issue("Félpályán minden pontnak a 20 méteres tartományban kell lennie.");
    for (const phase of play.phases) {
      for (const next of phase.next)
        if (!phases.has(next.phaseId))
          issue("Az elágazás nem létező fázisra mutat.");
      for (const a of phase.actions) {
        if (actionIds.has(a.id)) issue("A műveletazonosítók nem egyediek.");
        actionIds.add(a.id);
        if (!actors.has(a.actorId)) issue("A művelet játékosa hiányzik.");
        if (a.targetId && !actors.has(a.targetId))
          issue("A céljátékos hiányzik.");
        if (a.kind === "pass" && (!a.targetId || a.targetId === a.actorId))
          issue("A passzhoz másik céljátékos szükséges.");
        if (
          a.kind === "pass" &&
          a.targetId &&
          play.actors.find((actor) => actor.id === a.targetId)?.team ===
            "defense"
        )
          issue("Passz nem adható a védelem játékosának.");
        if (a.start + a.duration > phase.duration + 0.001)
          issue("A művelet túlnyúlik a fázison.");
      }
      for (const id of actors) {
        const moves = phase.actions
          .filter(
            (a) =>
              a.actorId === id && ["run", "dribble", "screen"].includes(a.kind),
          )
          .sort((a, b) => a.start - b.start);
        for (let i = 1; i < moves.length; i++)
          if (moves[i].start < moves[i - 1].start + moves[i - 1].duration)
            issue("Egy játékos mozgásai időben átfedik egymást.");
      }
      const ball = phase.actions
        .filter((a) => ["pass", "dribble", "shot"].includes(a.kind))
        .sort((a, b) => a.start - b.start);
      for (let i = 1; i < ball.length; i++)
        if (ball[i].start < ball[i - 1].start + ball[i - 1].duration)
          issue("A labdaműveletek időben átfedik egymást.");
    }
    const visit = (id: string, stack: Set<string>, done: Set<string>) => {
      if (stack.has(id)) {
        issue("A fázisok nem alkothatnak kört.");
        return;
      }
      if (done.has(id)) return;
      stack.add(id);
      for (const n of play.phases.find((p) => p.id === id)?.next ?? [])
        visit(n.phaseId, stack, done);
      stack.delete(id);
      done.add(id);
    };
    const done = new Set<string>();
    visit(play.entryPhaseId, new Set(), done);
    if (done.size !== phases.size)
      issue("Minden fázisnak elérhetőnek kell lennie a kezdőfázisból.");
  });
export type Play = z.infer<typeof playSchema>;
export type Actor = Play["actors"][number];
export type Action = Play["phases"][number]["actions"][number];
export type Phase = Play["phases"][number];
export const uid = () => crypto.randomUUID();
export function validatePlay(value: unknown): Play {
  const parsed = playSchema.safeParse(value);
  if (!parsed.success)
    throw new Error(parsed.error.issues.map((i) => i.message).join(" "));
  return parsed.data;
}
export function copyPlay(play: Play): Play {
  return {
    ...structuredClone(play),
    id: uid(),
    revision: 1,
    title: `${play.title.slice(0, 112)} · saját`,
    updatedAt: new Date().toISOString(),
  };
}
