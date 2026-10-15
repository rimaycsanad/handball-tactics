import { uid, type Phase, type Play } from "../domain/model";
import { defaultActors, defenseActors } from "./actors";
import { expandedPlays } from "./expanded-tactics";
import { teachingSources } from "./catalog-sources";
export { defaultActors } from "./actors";
export const builtInCatalogVersion = 2;

const action = (
  kind: Play["phases"][number]["actions"][number]["kind"],
  actorId: string,
  x: number,
  y: number,
  start: number,
  duration: number,
  targetId?: string,
) => ({
  id: uid(),
  kind,
  actorId,
  path: [{ x, y }],
  start,
  duration,
  ...(targetId ? { targetId } : {}),
});
const phase = (
  id: string,
  title: string,
  note: string,
  actions: Phase["actions"],
  next: Phase["next"] = [],
  duration = 3.5,
): Phase => ({ id, title, note, actions, next, duration });
const cross = (): Phase[] => [
  phase(
    "start",
    "Kereszt és elzárás",
    "Az irányító passzol, majd a balátlövő mögött keresztezi a mozgását. A beálló a belső védő mellett helyezkedik.",
    [
      action("pass", "CB", 5.5, 11, 0, 0.6, "LB"),
      action("run", "CB", 8, 10, 0.6, 1.4),
      action("dribble", "LB", 10, 10, 0.7, 1),
      action("screen", "PV", 9, 6.7, 0.7, 1.5),
      action("pass", "LB", 8, 10, 2, 0.5, "CB"),
    ],
    [
      { label: "A védő bent marad", phaseId: "shot" },
      { label: "A védő kilép", phaseId: "pivot" },
    ],
  ),
  phase(
    "shot",
    "Átlövés",
    "Az irányító a szabad lövőfolyosót használja.",
    [action("shot", "CB", 10, 0, 1, 0.6)],
    [],
    2.5,
  ),
  phase(
    "pivot",
    "Bejátszás a beállónak",
    "A kilépő védő mögött nyíló területre érkezik a labda.",
    [
      action("run", "D3", 8.5, 9.3, 0, 0.7),
      action("pass", "CB", 9, 6.7, 0.8, 0.6, "PV"),
      action("shot", "PV", 10, 0, 1.8, 0.5),
    ],
    [],
    3,
  ),
];
const wing = (): Phase[] => [
  phase(
    "start",
    "Szélső befutása",
    "A bal szélső labda nélkül a két belső védő közé fut. A támadók szélességben tartják a védelmet.",
    [
      action("run", "LW", 7, 6.8, 0, 2),
      action("pass", "CB", 14.5, 11, 0, 0.6, "RB"),
      action("dribble", "RB", 13, 9, 0.8, 1.2),
    ],
    [{ label: "A befutó szabaddá válik", phaseId: "finish" }],
  ),
  phase(
    "finish",
    "Passz a befutónak",
    "A passz akkor indul, amikor a befutó megmutatja magát a védő mellett.",
    [
      action("pass", "RB", 7, 6.8, 0.2, 0.7, "LW"),
      action("shot", "LW", 10, 0, 1.4, 0.6),
    ],
    [],
    2.5,
  ),
];
const pivot = (): Phase[] => [
  phase(
    "start",
    "Beálló leválása",
    "A beálló helyezkedéssel alakít ki passzsávot. Az irányító támadó mozgással köti le a védőt.",
    [
      action("screen", "PV", 12, 6.7, 0, 1),
      action("dribble", "CB", 10.5, 9, 0, 1.6),
    ],
    [
      { label: "Nyílik a bejátszás", phaseId: "finish" },
      { label: "A védő zárja a beállót", phaseId: "outside" },
    ],
  ),
  phase(
    "finish",
    "Bejátszás és befejezés",
    "A beálló leválik, megkapja a labdát és befejezi az akciót.",
    [
      action("run", "PV", 13, 6.5, 0, 0.6),
      action("pass", "CB", 13, 6.5, 0.7, 0.6, "PV"),
      action("shot", "PV", 10, 0, 1.7, 0.6),
    ],
    [],
    3,
  ),
  phase(
    "outside",
    "Továbbpassz az átlövőnek",
    "A beállóra záró védelem mellett a jobbátlövő kap lehetőséget.",
    [
      action("pass", "CB", 14.5, 11, 0, 0.6, "RB"),
      action("dribble", "RB", 13, 9, 0.8, 1),
      action("shot", "RB", 10, 0, 2, 0.5),
    ],
    [],
    3,
  ),
];
const doubleCross = (): Phase[] => [
  phase(
    "start",
    "Első kereszt",
    "A balátlövő közép felé támad, az irányító a megnyíló bal oldali területre fut.",
    [
      action("pass", "CB", 5.5, 11, 0, 0.5, "LB"),
      action("dribble", "LB", 10, 10, 0.6, 1.2),
      action("run", "CB", 6, 10, 0.6, 1.4),
    ],
    [{ label: "Folytatás jobb oldalra", phaseId: "second" }],
  ),
  phase(
    "second",
    "Második kereszt",
    "A jobbátlövő átveszi a labdát, majd a keresztezésből támad.",
    [
      action("run", "RB", 11, 9, 0, 1.4),
      action("pass", "LB", 11, 9, 1.4, 0.5, "RB"),
      action("shot", "RB", 10, 0, 2.4, 0.6),
    ],
    [],
    3.5,
  ),
];
const transition = (): Phase[] => [
  phase(
    "start",
    "Első hullám",
    "A két szélső szélességben fut előre. Az irányító a szabad passzsávot keresi.",
    [
      action("run", "LW", 2, 8, 0, 2.5),
      action("run", "RW", 18, 8, 0, 2.5),
      action("dribble", "CB", 10, 15, 0, 2),
    ],
    [{ label: "Bal oldali befejezés", phaseId: "finish" }],
  ),
  phase(
    "finish",
    "Indítás és lövés",
    "A bal szélső mozgás közben kapja a labdát, majd a kapu felé fordul.",
    [
      action("pass", "CB", 2, 8, 0, 1, "LW"),
      action("dribble", "LW", 4, 5.5, 1.2, 0.8),
      action("shot", "LW", 10, 0, 2.3, 0.7),
    ],
    [],
    3.5,
  ),
];
const configs = [
  ["Kereszt + beálló elzárás", "Keresztek", "6:0", "U16", "Középhaladó", cross],
  ["Szélső befutása", "Befutások", "6:0", "U14", "Kezdő", wing],
  [
    "Irányító–beálló kapcsolat",
    "Páros kapcsolatok",
    "5:1",
    "U14",
    "Középhaladó",
    pivot,
  ],
  ["Kettős kereszt", "Keresztek", "6:0", "U18", "Haladó", doubleCross],
  ["Befutás a zavaró mögé", "Befutások", "5:1", "U16", "Középhaladó", wing],
  [
    "Kereszt nyitott védelem ellen",
    "Keresztek",
    "3:2:1",
    "U16",
    "Középhaladó",
    cross,
  ],
  ["Két beállós átalakulás", "Felállásváltások", "6:0", "U18", "Haladó", wing],
  ["Beálló leválása", "Páros kapcsolatok", "6:0", "U14", "Kezdő", pivot],
  [
    "Emberelőny: belső kapcsolat",
    "Speciális helyzetek",
    "5:0",
    "Felnőtt",
    "Középhaladó",
    pivot,
  ],
  [
    "7:6: beálló megjátszása",
    "Speciális helyzetek",
    "6:0",
    "Felnőtt",
    "Haladó",
    pivot,
  ],
  [
    "Szélesség emberfogás ellen",
    "Befutások",
    "Emberfogás",
    "U12",
    "Kezdő",
    wing,
  ],
  [
    "Gyorsindítás első hullámban",
    "Átmenetek",
    "Rendezetlen",
    "U14",
    "Kezdő",
    transition,
  ],
] as const;
// Illustrative coaching templates, not verified competition-ready plays.
// Stable action IDs keep built-in documents identical between app launches.
const legacyPlays: Play[] = configs.map(
  ([title, category, defense, ageGroup, difficulty, factory], i) => {
    const actors = defenseActors(defense);
    if (defense === "5:1")
      actors.find((a) => a.id === "D3")!.position = { x: 10, y: 10 };
    if (defense === "3:2:1") {
      actors.find((a) => a.id === "D3")!.position = { x: 10, y: 11 };
      actors.find((a) => a.id === "D2")!.position = { x: 6, y: 9 };
      actors.find((a) => a.id === "D5")!.position = { x: 14, y: 9 };
    }
    if (title.startsWith("Emberelőny"))
      actors.splice(
        actors.findIndex((a) => a.id === "D6"),
        1,
      );
    if (title.startsWith("7:6")) {
      actors.push({
        id: "PV2",
        label: "BE2",
        team: "attack",
        position: { x: 7, y: 6.7 },
      });
    }
    if (title.startsWith("Gyorsindítás")) {
      actors.find((a) => a.id === "CB")!.position = { x: 10, y: 30 };
      actors.find((a) => a.id === "LW")!.position = { x: 2, y: 25 };
      actors.find((a) => a.id === "RW")!.position = { x: 18, y: 25 };
    }
    const phases = factory();
    if (i === 6) {
      phases[0].title = "Átlövő befutása második beállóba";
      phases[0].note =
        "A balátlövő labda nélkül a vonalra fut. A jobbátlövő és az irányító két hátsó passzpontot tart, a szélsők szélességben maradnak.";
      phases[0].actions[0].actorId = "LB";
      phases[1].note =
        "A vonalra befutó átlövő a védők közötti passzsávban kapja meg a labdát.";
      phases[1].actions[0].targetId = "LB";
      phases[1].actions[1].actorId = "LB";
    }
    if (i === 9) {
      phases[0].actions.push(action("screen", "PV2", 7.2, 6.7, 0.2, 1.3));
      phases[0].next.push({
        label: "A második beálló szabaddá válik",
        phaseId: "second-pivot",
      });
      phases.push(
        phase(
          "second-pivot",
          "Második beálló megjátszása",
          "A két beálló külön belső védőket köt le. A második beálló a szabad passzsávban fordul a kapu felé.",
          [
            action("pass", "CB", 7.2, 6.7, 0, 0.6, "PV2"),
            action("shot", "PV2", 10, 0, 1.5, 0.6),
          ],
          [],
          3,
        ),
      );
    }
    for (const [pi, p] of phases.entries())
      for (const [ai, a] of p.actions.entries())
        a.id = `sample-${i + 1}-action-${pi}-${ai}`;
    return {
      schemaVersion: 1,
      id: `sample-${i + 1}`,
      revision: 2,
      title,
      category,
      defense,
      ageGroup,
      difficulty,
      formation: title.startsWith("7:6")
        ? "3:4"
        : i === 6
          ? "3:3 → 2:4"
          : "3:3",
      court: title.startsWith("Gyorsindítás") ? "full" : "half",
      description:
        i === 0
          ? "Keresztezésből kialakított döntési helyzet: átlövés vagy bejátszás a beállónak, a védelem reakciójától függően."
          : `${title} szemléltető mozgássora. Figyeld a passzsávokat, a távolságokat és a védelem reakcióját.`,
      tags: [category, defense],
      actors,
      ballOwnerId: "CB",
      entryPhaseId: "start",
      phases,
      coachingPoints: [
        "A labdás játékos a kapu felé jelentsen veszélyt.",
        "Tartsátok a megfelelő távolságot és a passzsávokat.",
        "Az időzítés és a védő reakciója határozza meg a folytatást.",
      ],
      sources: [
        teachingSources.education,
        ...(category === "Keresztek"
          ? [teachingSources.crossing]
          : category === "Átmenetek"
            ? [teachingSources.fastBreak]
            : category === "Speciális helyzetek"
              ? [teachingSources.analysis, teachingSources.superiority]
              : [teachingSources.giveGo]),
      ],
      updatedAt: "2026-10-14T00:00:00.000Z",
    };
  },
);
export const builtInPlays: Play[] = [...legacyPlays, ...expandedPlays];

export function newPlay(): Play {
  return {
    schemaVersion: 1,
    id: uid(),
    revision: 1,
    title: "Új taktika",
    description: "",
    category: "Saját taktika",
    defense: "6:0",
    ageGroup: "U16",
    difficulty: "Kezdő",
    formation: "3:3",
    court: "half",
    tags: [],
    actors: structuredClone(defaultActors),
    ballOwnerId: "CB",
    entryPhaseId: "start",
    phases: [phase("start", "1. fázis", "", [], [], 3)],
    coachingPoints: [],
    sources: [],
    updatedAt: new Date().toISOString(),
  };
}
