import type { Actor, Play } from "../domain/model";
import { teachingSources as S } from "./catalog-sources";
import {
  carry,
  makeTactic,
  move,
  node,
  pass,
  shoot,
  sevenAttackers,
  twoPivots,
  withPositions,
  type Node,
  type TacticSpec,
} from "./tactic-builder";

const finish = (
  title: string,
  actor: string,
  point?: readonly [number, number],
) =>
  node(
    title,
    "A kapu felé nyíló helyzetet használd; zárt passzsávból ne erőltesd a befejezést.",
    point ? [carry(actor, ...point), shoot(actor)] : [shoot(actor)],
  );
const deliver = (title: string, from: string, to: string) =>
  node(
    title,
    "A bejátszás a szabad oldalra érkezzen, a befejező pedig forduljon a kapu felé.",
    [pass(from, to), shoot(to)],
  );
function tactic(
  id: string,
  title: string,
  category: string,
  defense: string,
  description: string,
  coachingPoints: string[],
  plan: Node,
  options: Partial<
    Omit<
      TacticSpec,
      | "id"
      | "title"
      | "category"
      | "defense"
      | "description"
      | "coachingPoints"
      | "plan"
    >
  > = {},
): TacticSpec {
  const sources =
    category === "Keresztek"
      ? [S.crossing, S.crossingDecision]
      : category === "Létszámhelyzetek"
        ? [S.superiority, S.analysis]
        : category === "Átmenetek"
          ? [S.fastBreak, S.education]
          : [S.education, S.giveGo];
  return {
    id,
    title,
    category,
    defense,
    description,
    coachingPoints,
    plan,
    sources,
    ...options,
  };
}
const fastPositions = (a: Actor[]) =>
  withPositions(a, {
    CB: { x: 10, y: 28 },
    LB: { x: 6, y: 29 },
    RB: { x: 14, y: 29 },
    LW: { x: 2, y: 22 },
    RW: { x: 18, y: 22 },
    PV: { x: 11, y: 18 },
  });
const outlet = (a: Actor[]) => [
  ...fastPositions(a),
  {
    id: "OGK",
    label: "SK",
    team: "keeper" as const,
    position: { x: 10, y: 39.2 },
  },
];
const outnumbered = (a: Actor[]) => a.filter((actor) => actor.id !== "CB");

// Original schematic adaptations of the linked tactical principles.
// Each document specifies its own ball sequence, support runs and decision points.
export const expandedSpecs: TacticSpec[] = [
  tactic(
    "cross-right",
    "Irányító–jobbátlövő kereszt",
    "Keresztek",
    "6:0",
    "Az irányító a jobbátlövő mögött keresztezi az útját. A jobb oldali belső védő reakciója dönti el, hogy átlövés vagy beállópassz következik.",
    [
      "A jobbátlövő először közvetlen kapuveszélyt teremtsen.",
      "Az irányító a labdás mögött kapjon teret, a beálló ne takarja a passzsávot.",
    ],
    node(
      "Jobb oldali kereszt",
      "Passz jobbra, majd két eltérő mélységű futás.",
      [
        pass("CB", "RB"),
        carry("RB", 10, 10, [["PV", 10.7, 6.7]], [["CB", 12, 10]]),
        pass("RB", "CB"),
      ],
      [
        {
          label: "A belső védő lent marad",
          node: finish("Irányító átlövése", "CB"),
        },
        {
          label: "A belső védő kilép",
          node: node(
            "Bejátszás a kilépés mögé",
            "A védő mozgása után nyisd a beálló passzsávját.",
            [move(["D4", 12, 9]), pass("CB", "PV"), shoot("PV")],
          ),
        },
      ],
    ),
  ),
  tactic(
    "back-back-cross",
    "Átlövő–átlövő kereszt",
    "Keresztek",
    "6:0",
    "A két átlövő középen cserél oldalirányú szerepet, az irányító hátrébb biztosít. A labda a keresztezésből érkező jobbátlövőhöz kerül.",
    [
      "Az átadás a keresztező játékos futóútjára érkezzen.",
      "Az irányító ne szűkítse a két átlövő közös munkaterületét.",
    ],
    node(
      "Két átlövő együttműködése",
      "A balátlövő közép felé indul, a jobbátlövő mögötte érkezik.",
      [
        pass("CB", "LB", [["CB", 10, 15]]),
        carry("LB", 11, 10, [], [["RB", 9, 11.5]]),
        pass("LB", "RB"),
      ],
      [
        {
          label: "A rés megnyílik",
          node: finish("Jobbátlövő befejezése", "RB", [9, 8.5]),
        },
      ],
    ),
  ),
  tactic(
    "return-cross",
    "Visszakereszt a bal oldalon",
    "Keresztek",
    "6:0",
    "Az első kereszt után a labda visszakerül az eredeti labdás oldalára. A második irányváltás a védelem visszarendeződését használja ki.",
    [
      "Az első keresztet is lövésveszéllyel hajtsátok végre.",
      "A visszakereszt előtt ne álljon meg a labda.",
    ],
    node(
      "Első kereszt",
      "Az irányító átveszi a támadás vezetését.",
      [
        pass("CB", "LB"),
        carry("LB", 10, 10, [], [["CB", 7, 11]]),
        pass("LB", "CB"),
      ],
      [
        {
          label: "A védők követik az első keresztet",
          node: node(
            "Visszakereszt",
            "A balátlövő ellenirányú futással újra belép a résbe.",
            [
              carry("CB", 9, 9, [], [["LB", 6.5, 10]]),
              pass("CB", "LB"),
              shoot("LB"),
            ],
          ),
        },
      ],
    ),
  ),
  tactic(
    "triple-cross",
    "Hármas kereszt a hátsó sorban",
    "Keresztek",
    "6:0",
    "A labda három hátsó játékos egymás mögötti keresztezésén keresztül jut a jobb oldali befejezőhöz. A szélsők szélességben maradnak.",
    [
      "Mindig a következő keresztező mögött legyen az átadás.",
      "Az új labdás már az átvételnél forduljon a kapu felé.",
    ],
    node(
      "Bal oldalról középre",
      "Az első kereszt előkészíti a második átadást.",
      [
        pass("CB", "LB"),
        carry("LB", 10, 10, [], [["CB", 7, 11]]),
        pass("LB", "CB"),
      ],
      [
        {
          label: "Folytatás a harmadik játékossal",
          node: node(
            "Jobb oldali második kereszt",
            "A jobbátlövő közép felé húz, a beálló megtartja a belső védőt.",
            [
              carry("CB", 11, 9.7, [["PV", 10, 6.6]], [["RB", 9.5, 10.7]]),
              pass("CB", "RB"),
              shoot("RB"),
            ],
          ),
        },
      ],
    ),
    { difficulty: "Haladó", ageGroup: "U18" },
  ),
  tactic(
    "back-wing-cross",
    "Jobbátlövő–szélső kereszt",
    "Keresztek",
    "6:0",
    "A jobb szélső hátrafelé és befelé indul a jobbátlövő mögött. Az átlövő a szélső korábbi sávjára húzza a védekezést.",
    [
      "A szélső futása az átlövő kapu felé indulásával legyen összhangban.",
      "Az átadás után az átlövő tartsa nyitva a jobb oldalt.",
    ],
    node(
      "Kereszt a szélen",
      "A jobbátlövő oldalra támad, a szélső hátulról érkezik.",
      [
        pass("CB", "RB"),
        carry("RB", 16, 9, [], [["RW", 13.5, 10.5]]),
        pass("RB", "RW"),
      ],
      [
        {
          label: "A kereszt után rés marad",
          node: finish("Szélsőből betörő játékos", "RW", [13, 7.3]),
        },
      ],
    ),
  ),
  tactic(
    "empty-cross",
    "Üres kereszt és gyenge oldali passz",
    "Keresztek",
    "5:1",
    "Két labda nélküli hátsó játékos keresztezi az útját, miközben a labdás a másik oldalon marad. Az elmozduló zavaró mögött nyílik meg a passz.",
    [
      "A labda nélküli kereszt ne zárja le az irányító látóterét.",
      "A labdás a zavaró fordulását figyelje.",
    ],
    node(
      "Labda nélküli elterelés",
      "A két átlövő mozog; az irányító még megtartja a labdát.",
      [move(["LB", 12, 11], ["RB", 7, 12], ["D3", 12, 10.5]), pass("CB", "RB")],
      [
        {
          label: "A zavaró másik oldalra került",
          node: finish("Bal oldali megnyíló rés", "RB", [7, 8.6]),
        },
      ],
    ),
  ),
  tactic(
    "cross-diagonal",
    "Keresztből hosszú diagonál a szélsőnek",
    "Keresztek",
    "6:0",
    "A bal oldali kereszt középre tömöríti a védelmet, majd az új labdás keresztpasszal a jobb szélsőt játssza meg.",
    [
      "A jobb szélső az utolsó pillanatig tartsa a szélességet.",
      "A diagonál előtt a labdás kösse le a belső védőt.",
    ],
    node(
      "Középső figyelem lekötése",
      "A jobb oldali védő besegít a keresztbe.",
      [
        pass("CB", "LB"),
        carry("LB", 10, 10, [], [["CB", 8, 10]]),
        pass("LB", "CB"),
        move(["D5", 12, 7.5]),
      ],
      [
        {
          label: "A gyenge oldali szélső szabad",
          node: node(
            "Diagonál a jobb szélre",
            "A szélső a nyitott passzsávból támad.",
            [pass("CB", "RW"), carry("RW", 16.7, 5.8), shoot("RW")],
          ),
        },
      ],
    ),
  ),
  tactic(
    "cross-back-cut",
    "Kereszt és átlövőbefutás",
    "Keresztek",
    "6:0",
    "A balátlövő a kereszt átadása után nem tér vissza, hanem második beállóba fut. A folytatásban két belső támadóhoz lehet bejátszani.",
    [
      "A befutás az átadás után induljon.",
      "Az eredeti beálló a másik belső védő mellett maradjon.",
    ],
    node(
      "Keresztből befutás",
      "A balátlövő a labda átadása után a vonalra lép.",
      [
        pass("CB", "LB"),
        carry("LB", 9, 10, [], [["CB", 7.5, 11]]),
        pass("LB", "CB", [
          ["LB", 7, 6.7],
          ["PV", 12.5, 6.7],
        ]),
      ],
      [
        {
          label: "A befutót nem veszik át",
          node: deliver("Második beálló befejezése", "CB", "LB"),
        },
        {
          label: "A befutót átveszik",
          node: deliver("Eredeti beálló szabadul", "CB", "PV"),
        },
      ],
    ),
    { formation: "3:3 → 2:4", difficulty: "Haladó", ageGroup: "U18" },
  ),

  tactic(
    "left-pivot-pair",
    "Balátlövő–beálló 2:2",
    "Páros kapcsolatok",
    "6:0",
    "A beálló a bal oldali belső védő mellett helyezkedik. A balátlövő az elzárás melletti kapufolyosót vagy a leváló beállót választja.",
    [
      "Az elzáró beálló megtartott helyzetből dolgozzon.",
      "Az átlövő a védő vállának és a passzsávnak a helyzetét figyelje.",
    ],
    node(
      "Bal oldali elzárás",
      "A beálló és az átlövő együtt hoz létre előnyt.",
      [pass("CB", "LB"), carry("LB", 6.7, 9.2, [["PV", 7.1, 6.8]])],
      [
        {
          label: "A védő az átlövőre lép",
          node: deliver("Bejátszás balra", "LB", "PV"),
        },
        {
          label: "A védő a beállón marad",
          node: finish("Balátlövő betörése", "LB", [6.8, 7.2]),
        },
      ],
    ),
  ),
  tactic(
    "right-pivot-pair",
    "Jobbátlövő–beálló 2:2",
    "Páros kapcsolatok",
    "6:0",
    "A jobbátlövő a beálló által kialakított jobb oldali térbe indul. A szélső a vonal mellett tartja a külső védőt.",
    [
      "A jobb szélső ne fusson korán a páros kapcsolat területére.",
      "A bejátszás a beálló szabad keze felé érkezzen.",
    ],
    node(
      "Jobb oldali páros kapcsolat",
      "A jobbátlövő a belső védő mellé húz.",
      [
        pass("CB", "RB"),
        carry("RB", 13, 9.4, [["PV", 12.9, 6.8]], [["RW", 18.5, 7]]),
      ],
      [
        {
          label: "Nyílik a beálló passzsávja",
          node: deliver("Jobb oldali beállópassz", "RB", "PV"),
        },
        { label: "A passzsáv zárt", node: finish("Jobbátlövő lövése", "RB") },
      ],
    ),
  ),
  tactic(
    "center-pivot-givego",
    "Irányító–beálló adok-kapok",
    "Páros kapcsolatok",
    "6:0",
    "Az irányító a kiálló beállónak passzol, majd mellette fut kapu felé. A beálló rövid visszapasszal teszi szabaddá az érkezőt.",
    [
      "A beálló a visszapassz előtt lássa az irányító futását.",
      "Az irányító passz után azonnal gyorsítson.",
    ],
    node(
      "Beálló mint visszapasszoló",
      "A beálló egy lépéssel kijjebb veszi át a labdát.",
      [move(["PV", 10, 8.5]), pass("CB", "PV", [["CB", 8.8, 7.8]])],
      [
        {
          label: "A védő nem vált",
          node: node(
            "Visszapassz az irányítónak",
            "Az irányító mozgás közben kapja vissza a labdát.",
            [pass("PV", "CB"), shoot("CB")],
          ),
        },
      ],
    ),
    { sources: [S.giveGo, S.education] },
  ),
  tactic(
    "back-wing-givego",
    "Balátlövő–szélső adok-kapok",
    "Páros kapcsolatok",
    "6:0",
    "A balátlövő a szélsőnek passzol, majd a külső védő mögé fut. A visszapassz a két szélső védő közötti rést használja.",
    [
      "A szélső a passz után továbbra is jelentsen lövésveszélyt.",
      "A befutó gyorsítását a védő fordulásához időzítsd.",
    ],
    node(
      "Passz a bal szélre",
      "A balátlövő befut a külső védő belső oldalán.",
      [pass("CB", "LB"), pass("LB", "LW", [["LB", 4.8, 7.5]])],
      [
        {
          label: "A külső védő a szélsőre fordul",
          node: node(
            "Visszapassz a befutónak",
            "A balátlövő az előkészített résbe érkezik.",
            [pass("LW", "LB"), carry("LB", 5.2, 6.9), shoot("LB")],
          ),
        },
      ],
    ),
    { ageGroup: "U14", difficulty: "Kezdő", sources: [S.giveGo, S.basics] },
  ),
  tactic(
    "wing-pivot-pair",
    "Jobbszélső–beálló kapcsolat",
    "Páros kapcsolatok",
    "6:0",
    "A beálló a jobb oldali külső és második védő között kínál passzsávot. A szélső befelé támad, és lövés vagy bejátszás között dönt.",
    [
      "A beálló a szélső befelé indulása előtt foglaljon helyet.",
      "A szélső ne ugorjon be zárt bejátszásra.",
    ],
    node(
      "Szélső befelé támad",
      "A jobb oldali vonaljátékos megnyitja a belső átadást.",
      [
        pass("CB", "RB"),
        pass("RB", "RW"),
        carry("RW", 16.5, 6.8, [["PV", 15, 6.6]]),
      ],
      [
        {
          label: "A második védő besegít",
          node: deliver("Szélső bejátszása", "RW", "PV"),
        },
        {
          label: "A második védő bent marad",
          node: finish("Szélső befejezése", "RW", [16.7, 5.8]),
        },
      ],
    ),
  ),
  tactic(
    "piston-to-wing",
    "Húzás és továbbpassz a jobb szélre",
    "Labdajáratás",
    "6:0",
    "A hátsó játékosok egymás után támadják a védők közötti réseket. A labda a tolódás irányában jut el a jobb szélsőig.",
    [
      "Minden átvétel után kapu felé indulj, és csak utána passzolj.",
      "A következő játékos akkor gyorsítson, amikor az előző védő lekötött.",
    ],
    node(
      "Folyamatos húzás",
      "A labda nem áll meg egyik hátsó játékosnál sem.",
      [
        pass("CB", "LB"),
        carry("LB", 7, 9.2),
        pass("LB", "CB"),
        carry("CB", 11, 9.5),
        pass("CB", "RB"),
        carry("RB", 15, 8.7),
      ],
      [
        {
          label: "A külső védő besegít",
          node: node(
            "Továbbpassz a szélre",
            "A szélső az érkező labdára indul.",
            [
              move(["D6", 15.3, 6.3]),
              pass("RB", "RW"),
              carry("RW", 17, 5.8),
              shoot("RW"),
            ],
          ),
        },
      ],
    ),
    { ageGroup: "U14", difficulty: "Kezdő", sources: [S.basics, S.education] },
  ),
  tactic(
    "center-wing-givego",
    "Irányító–balszélső adok-kapok",
    "Páros kapcsolatok",
    "Emberfogás",
    "Az irányító a bal szélsőhöz passzol, majd labda nélkül a követő védő mögé kerül. A szélső visszapassza a befutás sebességét használja.",
    [
      "Passz után változtasd meg a futás irányát és sebességét.",
      "A szélső időben forduljon a visszapasszhoz.",
    ],
    node(
      "Irányító kiszakadása",
      "A labda távol kerül a követő védőtől.",
      [pass("CB", "LW"), move(["CB", 5.8, 8.2], ["D3", 7, 9.8])],
      [
        {
          label: "A befutó előnybe kerül",
          node: node(
            "Visszaadás a kapu felé",
            "A befutó oldalról kerül a kapu elé.",
            [pass("LW", "CB"), shoot("CB")],
          ),
        },
      ],
    ),
    { ageGroup: "U14", difficulty: "Kezdő", sources: [S.giveGo, S.basics] },
  ),
  tactic(
    "screen-roll-outlet",
    "Elzárás–leválás szélső opcióval",
    "Páros kapcsolatok",
    "6:0",
    "A beálló elzárása után a balátlövő befelé támad. A beálló leválása vagy a külső védő besegítése két eltérő passzlehetőséget ad.",
    [
      "A beálló ne induljon el túl korán az elzárásból.",
      "A labdás a második és a külső védő kapcsolatát olvassa.",
    ],
    node(
      "Elzárás és leválás",
      "A beálló rövid elzárás után a szabad sávba fordul.",
      [
        pass("CB", "LB"),
        carry("LB", 7.5, 9.3, [["PV", 7.1, 6.8]]),
        move(["PV", 6.4, 6.6]),
      ],
      [
        {
          label: "A belső védő kilép",
          node: deliver("Beálló leválása", "LB", "PV"),
        },
        {
          label: "A külső védő befelé segít",
          node: node(
            "Bal szélső megjátszása",
            "A szélső a külső passzsávban marad.",
            [
              move(["D1", 5.5, 6]),
              pass("LB", "LW"),
              carry("LW", 3.5, 5.8),
              shoot("LW"),
            ],
          ),
        },
      ],
    ),
  ),

  tactic(
    "right-wing-cut",
    "Jobbszélső befutása beállóba",
    "Befutások",
    "6:0",
    "A jobb szélső a védők látóteréből belülre fut, miközben a balátlövő a másik oldalon tartja a labdát. A két belső támadó külön sávot foglal.",
    [
      "A befutó és az eredeti beálló ne ugyanarra a védőre érkezzen.",
      "A jobbátlövő tartsa nyitva a befutó mögött maradó oldalt.",
    ],
    node(
      "Befutás a jobb oldalról",
      "Az ellenoldali labdás a védők váltását figyeli.",
      [
        pass("CB", "LB", [
          ["RW", 12.7, 6.7],
          ["PV", 7.3, 6.7],
        ]),
        carry("LB", 7, 9.3),
      ],
      [
        {
          label: "A befutó szabadon marad",
          node: deliver("Jobb oldali befutó megjátszása", "LB", "RW"),
        },
        {
          label: "A befutót átveszik",
          node: deliver("Eredeti beálló megjátszása", "LB", "PV"),
        },
      ],
    ),
  ),
  tactic(
    "left-back-second-pivot",
    "Balátlövő befutása második beállóba",
    "Felállásváltások",
    "6:0",
    "A balátlövő passz után a vonalra fut. Az irányító és a jobbátlövő két hátsó játékosként két beállóval és két szélsővel folytatja.",
    [
      "A passz előzze meg a befutást.",
      "Az irányító a befutó által kiürített bal oldali sávot is tartsa elérhetően.",
    ],
    node(
      "Átalakulás két hátsó játékosra",
      "A balátlövő új belső helyet foglal.",
      [
        pass("CB", "LB"),
        pass("LB", "CB", [
          ["LB", 7, 6.7],
          ["PV", 12.7, 6.7],
        ]),
        carry("CB", 9, 10),
      ],
      [
        {
          label: "A bal oldali beálló szabad",
          node: deliver("Befutó átlövő kapja a labdát", "CB", "LB"),
        },
        {
          label: "A védelem balra zár",
          node: node(
            "Folytatás a jobb beállóval",
            "Az ellenoldali átlövő a másik beállót keresi.",
            [pass("CB", "RB"), pass("RB", "PV"), shoot("PV")],
          ),
        },
      ],
    ),
    { formation: "3:3 → 2:4", ageGroup: "U18", difficulty: "Haladó" },
  ),
  tactic(
    "right-back-second-pivot",
    "Jobbátlövő befutása második beállóba",
    "Felállásváltások",
    "5:1",
    "A jobbátlövő a zavaró mögött a vonalra fut. A két belső támadó miatt a mélyen maradó védőknek új átadási feladatuk lesz.",
    [
      "A befutás ne a zavaró előtt történjen.",
      "A két hátsó játékos egymástól megfelelő távolságban maradjon.",
    ],
    node(
      "Befutás a zavaró mögé",
      "A jobbátlövő az átadás után elhagyja a hátsó sort.",
      [
        pass("CB", "RB"),
        pass("RB", "LB", [
          ["RB", 13, 6.8],
          ["PV", 7.7, 6.7],
        ]),
        carry("LB", 7, 9.7),
      ],
      [
        {
          label: "A befutó előtt rés van",
          node: deliver("Keresztpassz a befutónak", "LB", "RB"),
        },
        {
          label: "A védő követi a befutót",
          node: finish("Balátlövő betörése", "LB", [7.8, 7.3]),
        },
      ],
    ),
    { formation: "3:3 → 2:4", ageGroup: "U18", difficulty: "Haladó" },
  ),
  tactic(
    "center-transition",
    "Irányító befutása a vonalra",
    "Felállásváltások",
    "6:0",
    "Az irányító a balátlövőnek adja a labdát és belső befutással második beállóvá válik. A szélesség és a két hátsó passzpont megmarad.",
    [
      "A befutó ne menjen az eredeti beálló helyére.",
      "A balátlövő az irányító mozgása közben is fenyegető maradjon.",
    ],
    node(
      "Irányító a vonalra fut",
      "Az irányító labda nélkül alakítja át a felállást.",
      [
        pass("CB", "LB", [
          ["CB", 8, 6.7],
          ["PV", 12.5, 6.7],
        ]),
        carry("LB", 6.8, 9.4),
      ],
      [
        {
          label: "A befutó irányító szabaddá válik",
          node: deliver("Bejátszás a befutó irányítónak", "LB", "CB"),
        },
      ],
    ),
    { formation: "3:3 → 2:4" },
  ),
  tactic(
    "wing-back-exchange",
    "Balszélső és balátlövő helycseréje",
    "Felállásváltások",
    "5:1",
    "A balátlövő kifelé fut, a bal szélső pedig hátsó támadóhelyet vesz át. A helycsere után az új hátsó labdás a megváltozott védőpárost támadja.",
    [
      "A két futó útja eltérő mélységben haladjon.",
      "A labdás a helycserét követően is nézzen kapu felé.",
    ],
    node(
      "Két támadó új szerepben",
      "A labda középen marad a helycsere alatt.",
      [move(["LB", 2, 8], ["LW", 6, 12]), pass("CB", "LW")],
      [
        {
          label: "Az új hátsó játékos résbe érkezik",
          node: finish("Szélsőből hátsó befejező", "LW", [6.8, 8.5]),
        },
      ],
    ),
  ),
  tactic(
    "pivot-back-exchange",
    "Beálló kiállása és átlövőbefutás",
    "Felállásváltások",
    "6:0",
    "A beálló kilép a hátsó sorba, a jobbátlövő pedig elfoglalja a megüresedő belső sávot. A védelem játékosátadását a kiálló beálló olvassa.",
    [
      "A kiálló beálló csak szabad passzsávba érkezzen.",
      "A befutó átlövő a védő mögött kérje a labdát.",
    ],
    node(
      "Beálló és átlövő szerepcseréje",
      "Az irányító a kiálló beállót játssza meg.",
      [move(["PV", 11, 10.5], ["RB", 12.8, 6.7]), pass("CB", "PV")],
      [
        {
          label: "A befutó védője késik",
          node: deliver("Új beálló befejezése", "PV", "RB"),
        },
        {
          label: "A védők bent maradnak",
          node: finish("Kiálló beálló távoli lövése", "PV"),
        },
      ],
    ),
  ),
  tactic(
    "two-pivot-cross",
    "Két beálló keresztmozgása",
    "Felállásváltások",
    "6:0",
    "A két beálló különböző mélységben cserél belső oldalt. Az irányító a védők átadásának késését használja ki.",
    [
      "A beállók ne ütközzenek egymás futóútjába.",
      "A passz a védőváltás után induljon.",
    ],
    node(
      "Vonalon történő helycsere",
      "Az egyik beálló kijjebb, a másik mélyebben halad.",
      [move(["PV", 7.7, 7.5], ["PV2", 12.3, 6.7]), carry("CB", 10, 10)],
      [
        {
          label: "A jobb oldali beállót későn veszik át",
          node: deliver("Átadás a jobb oldali beállónak", "CB", "PV2"),
        },
        {
          label: "A bal oldali beálló szabad",
          node: deliver("Visszapassz a bal oldali beállónak", "CB", "PV"),
        },
      ],
    ),
    {
      actors: twoPivots,
      formation: "2:4",
      ageGroup: "U18",
      difficulty: "Haladó",
    },
  ),
  tactic(
    "two-pivot-double-screen",
    "Két beálló két belső elzárással",
    "Felállásváltások",
    "6:0",
    "A két beálló két külön belső védő mellett zár. A labdás irányító középre indulva átlövést vagy valamelyik leváló beállót választja.",
    [
      "Az elzárások külön védőket érintsenek.",
      "A leválásokat a labdás döntése határozza meg.",
    ],
    node(
      "Középső tér megnyitása",
      "Az irányító a két elzárás közötti sávot támadja.",
      [
        carry("CB", 10, 9, [
          ["PV", 12.5, 6.8],
          ["PV2", 7.4, 6.8],
        ]),
      ],
      [
        {
          label: "Mindkét belső védő lent marad",
          node: finish("Középső lövés", "CB"),
        },
        {
          label: "A jobb belső védő kilép",
          node: deliver("Jobb oldali beállópassz", "CB", "PV"),
        },
        {
          label: "A bal belső védő kilép",
          node: deliver("Bal oldali beállópassz", "CB", "PV2"),
        },
      ],
    ),
    {
      actors: twoPivots,
      formation: "2:4",
      difficulty: "Haladó",
      ageGroup: "U18",
    },
  ),

  tactic(
    "behind-point-back-cut",
    "Átlövőbefutás a zavaró mögé",
    "Nyitott védelem ellen",
    "5:1",
    "A zavaró a bal oldali labdához tolódik. A jobbátlövő labda nélkül a mögötte maradó középső területre fut.",
    [
      "A zavaró fordulása után gyorsíts a háta mögé.",
      "A labdás ne a zavarón keresztül próbáljon passzolni.",
    ],
    node(
      "A zavaró egyik oldalra kötése",
      "A jobbátlövő a másik oldalról érkezik.",
      [
        pass("CB", "LB"),
        move(["D3", 7.8, 10.5], ["RB", 11, 8.4]),
        pass("LB", "RB"),
      ],
      [
        {
          label: "A középső terület nyitott",
          node: finish("Befutó jobbátlövő befejezése", "RB"),
        },
      ],
    ),
  ),
  tactic(
    "behind-point-givego",
    "Adok-kapok a zavaró mögött",
    "Nyitott védelem ellen",
    "5:1",
    "A kiálló beálló visszapasszoló pontot ad az irányítónak. A labda kikerüli a zavarót, az irányító pedig mögötte kapja vissza.",
    [
      "A beálló a mély védőktől is tartson távolságot.",
      "A visszapassz az irányító mozgására érkezzen.",
    ],
    node(
      "Passz a zavaró mögé",
      "A beálló oldalt kínál szabad passzsávot.",
      [
        move(["PV", 11.7, 8.2]),
        pass("CB", "PV", [
          ["CB", 8.5, 8.2],
          ["D3", 10.8, 10.4],
        ]),
      ],
      [
        {
          label: "A zavaró nem tud visszafordulni",
          node: node(
            "Visszapassz és befejezés",
            "A befutó irányító kapja vissza a labdát.",
            [pass("PV", "CB"), shoot("CB")],
          ),
        },
      ],
    ),
    { sources: [S.giveGo, S.education] },
  ),
  tactic(
    "point-drag-side",
    "Zavaró elvezetése és ellenoldali támadás",
    "Nyitott védelem ellen",
    "5+1",
    "Az irányító labda nélkül oldalra húzza személyes követőjét. A jobbátlövő az így megüresedő középső területet támadja.",
    [
      "A labda még az elvezetés előtt kerüljön a szabad hátsó játékoshoz.",
      "A labdás akkor gyorsítson, amikor a követő védő elhagyta a területet.",
    ],
    node(
      "Személyes követő elvezetése",
      "Az irányító balra fut, a labda jobbra kerül.",
      [
        pass("CB", "RB"),
        move(["CB", 3.5, 12], ["D3", 4.4, 11.5]),
        carry("RB", 11, 9.2),
      ],
      [
        {
          label: "A középső rés szabad",
          node: finish("Jobbátlövő középső betörése", "RB", [10.5, 7.2]),
        },
      ],
    ),
  ),
  tactic(
    "pivot-out-vs-point",
    "Beálló kiállása 5:1 ellen",
    "Nyitott védelem ellen",
    "5:1",
    "A beálló röviden feljebb lép a zavaró mögé, és új passzpontot ad. A hátsó játékosok a kiállás után oldalirányú előnyt keresnek.",
    [
      "A kiállás ne vigye a beállót a zavaróval egy vonalba.",
      "A következő átlövő a labda érkezésére gyorsítson.",
    ],
    node(
      "Belső összekötő pont",
      "A kiálló beálló gyorsan továbbadja a labdát.",
      [
        move(["PV", 9, 8.2]),
        pass("CB", "PV"),
        pass("PV", "LB", [["LB", 6.5, 9.2]]),
      ],
      [
        {
          label: "A bal oldali második védő kilép",
          node: node(
            "Beálló visszafutása",
            "A beálló a visszafutással újra bejátszási helyzetbe kerül.",
            [
              move(["PV", 7.8, 6.7], ["D2", 6.2, 8.7]),
              pass("LB", "PV"),
              shoot("PV"),
            ],
          ),
        },
      ],
    ),
  ),
  tactic(
    "321-weak-side",
    "3:2:1 ellen gyors gyenge oldali váltás",
    "Nyitott védelem ellen",
    "3:2:1",
    "A labda bal oldalon köti le a nyitott védelem felső játékosait, majd gyorsan a jobb oldalra kerül. A beálló az ellenoldalon biztosít passzpontot.",
    [
      "Az oldalváltás ne váljon lassú hátsó labdajáratássá.",
      "A jobbátlövő előre mozgásban fogadja a labdát.",
    ],
    node(
      "Bal oldal lekötése",
      "A két magas védő a labda oldalára tolódik.",
      [
        pass("CB", "LB"),
        carry("LB", 6.2, 9.8),
        move(["D2", 5.4, 9.1], ["D3", 8.5, 10.8]),
        pass("LB", "CB"),
        pass("CB", "RB", [["PV", 12.7, 6.7]]),
      ],
      [
        {
          label: "A jobb oldali védő nem ér vissza",
          node: finish("Gyenge oldali betörés", "RB", [13.8, 8.2]),
        },
        {
          label: "A jobb oldali védő kilép",
          node: deliver("Beállópassz a magas védő mögé", "RB", "PV"),
        },
      ],
    ),
    { difficulty: "Haladó", ageGroup: "U18" },
  ),
  tactic(
    "42-long-diagonal",
    "Hosszú diagonál 4:2 ellen",
    "Nyitott védelem ellen",
    "4:2",
    "A két előretolt védő középső nyomását hosszú szélsőpassz kerüli meg. A szélső és a beálló a mélyen maradó védővel szemben dolgozik együtt.",
    [
      "Az irányító ne vigye a labdát a két felső védő közé.",
      "A beálló a szélső átvételére kínáljon belső passzsávot.",
    ],
    node(
      "A felső vonal megkerülése",
      "Az irányító a balszélsőhöz küldi a labdát.",
      [pass("CB", "LW"), move(["PV", 5.5, 6.2]), carry("LW", 3.4, 6.6)],
      [
        {
          label: "A külső védő a szélsőre lép",
          node: deliver("Beállókapcsolat a szélről", "LW", "PV"),
        },
        {
          label: "A külső védő bent marad",
          node: finish("Szélső saját befejezése", "LW", [3.3, 5.7]),
        },
      ],
    ),
    { difficulty: "Haladó" },
  ),
  tactic(
    "42-two-pivots",
    "Két beállós szélesség 4:2 ellen",
    "Nyitott védelem ellen",
    "4:2",
    "A két beálló a magas védők mögött két eltérő passzsávot tart. Az irányító és a jobbátlövő gyors váltással hozza döntési helyzetbe a védekezést.",
    [
      "A beállók ne álljanak közvetlenül a magas védők takarásában.",
      "A hátsó játékosok ne kerüljenek túl közel egymáshoz.",
    ],
    node(
      "A felső vonal mögötti passzsávok",
      "Az oldalváltás után a második beálló kerül előnybe.",
      [
        carry("CB", 8.5, 11),
        pass("CB", "RB"),
        carry("RB", 15, 9.5, [["PV", 13, 6.7]], [["PV2", 7, 7]]),
      ],
      [
        {
          label: "A jobb magas védő a labdásra lép",
          node: deliver("Jobb oldali beálló mögötte", "RB", "PV"),
        },
        {
          label: "A mély védelem jobbra zár",
          node: deliver("Keresztpassz a másik beállónak", "RB", "PV2"),
        },
      ],
    ),
    {
      actors: twoPivots,
      formation: "2:4",
      difficulty: "Haladó",
      ageGroup: "U18",
    },
  ),
  tactic(
    "man-marker-screen",
    "Elzárás és adok-kapok emberfogás ellen",
    "Nyitott védelem ellen",
    "Emberfogás",
    "Az irányító rövid passz után a beálló mellett fut vissza. A beálló helyezkedése akadályozza a követő védő rövid útját.",
    [
      "A beálló elzárása ne mozgó ütközés legyen.",
      "Az irányító az elzárás közelében gyorsítson, hogy a védő ne férjen közéjük.",
    ],
    node(
      "Visszapassz előkészítése",
      "A labda a beállóhoz kerül, az irányító mögé fut.",
      [move(["PV", 9.4, 9]), pass("CB", "PV", [["CB", 8, 8.2]])],
      [
        {
          label: "A követő védő lemarad",
          node: node(
            "Visszapassz a követő mögé",
            "A beálló az átadás után helyben marad.",
            [pass("PV", "CB"), shoot("CB")],
          ),
        },
      ],
    ),
    { sources: [S.giveGo, S.education] },
  ),

  tactic(
    "six-five-wing",
    "6:5: továbbpassz a szabad szélsőnek",
    "Létszámhelyzetek",
    "5:0",
    "Az emberelőnyt folyamatos kapu felé húzással bontjuk ki. A labda addig halad jobbra, amíg a külső védő két támadó között kénytelen választani.",
    [
      "A létszámelőny önmagában nem nyit passzsávot: legyen kapuveszély.",
      "A jobb szélső türelmesen tartsa a szélességet.",
    ],
    node(
      "Védők egymás utáni lekötése",
      "A jobb oldali hátsó játékos és szélső helyi fölényt kap.",
      [
        pass("CB", "LB"),
        carry("LB", 7, 9.4),
        pass("LB", "CB"),
        carry("CB", 11, 9),
        pass("CB", "RB"),
        carry("RB", 14.8, 8.8),
      ],
      [
        {
          label: "A külső védő az átlövőre lép",
          node: node(
            "Szabad szélső",
            "Az utolsó passz a szabad oldali szélsőt találja.",
            [pass("RB", "RW"), carry("RW", 17, 5.9), shoot("RW")],
          ),
        },
      ],
    ),
    { tags: ["Emberelőny", "6:5", "Szélső"] },
  ),
  tactic(
    "six-five-pivot-continuity",
    "6:5: beállóelzárás és folytonos húzás",
    "Létszámhelyzetek",
    "5:0",
    "A beálló elzárja a tolódó belső védő útját. A hátsó játékosok a helyi létszámelőnyt passzokkal és kapu felé mozgással viszik tovább.",
    [
      "Az elzárás a tolódás útvonalát érintse.",
      "A második labdás is támadjon, ne csak továbbítsa a labdát.",
    ],
    node(
      "Elzárás a tolódás útjában",
      "A bal oldalról indított akció a jobb belső résig jut.",
      [
        pass("CB", "LB"),
        carry("LB", 7.5, 9.2, [["PV", 9, 6.8]]),
        pass("LB", "CB"),
        carry("CB", 11.5, 9),
        pass("CB", "RB"),
      ],
      [
        {
          label: "A jobb oldali védő késik",
          node: finish("Jobbátlövő a megnyíló résben", "RB", [13.8, 7.6]),
        },
      ],
    ),
    { tags: ["Emberelőny", "6:5", "Folytonosság"] },
  ),
  tactic(
    "six-four-two-pivots",
    "6:4: két beálló és ellenoldali befejezés",
    "Létszámhelyzetek",
    "4:0",
    "A két beálló a négy védőt belül tartja. A hátsó játékosok oldalváltása után a szélsőn vagy a beállón jelenhet meg a szabad ember.",
    [
      "Az emberelőnyben is legyen egymást követő kapu felé támadás.",
      "A két beálló külön belső védőt kössön le.",
    ],
    node(
      "Négy védő széthúzása",
      "A két beálló a belső passzsávokban marad.",
      [
        carry("CB", 8, 10, [
          ["PV2", 7, 6.7],
          ["PV", 13, 6.7],
        ]),
        pass("CB", "RB"),
        carry("RB", 15, 9.3),
      ],
      [
        {
          label: "A külső védő befelé lép",
          node: node(
            "Jobb szélső szabad",
            "A szélső a megnyíló külső területet használja.",
            [pass("RB", "RW"), carry("RW", 17.2, 6), shoot("RW")],
          ),
        },
        {
          label: "A belső védő az átlövőre lép",
          node: deliver("Jobb beálló szabad", "RB", "PV"),
        },
      ],
    ),
    {
      actors: twoPivots,
      formation: "2:4",
      difficulty: "Haladó",
      tags: ["Emberelőny", "6:4"],
    },
  ),
  tactic(
    "five-six-circulation",
    "5:6: türelmes oldalváltás",
    "Létszámhelyzetek",
    "6:0",
    "Öt támadó két hátsó passzponttal és három első vonali játékossal tartja mozgásban a védelmet. Az akció egy védő kilépése után gyorsul fel.",
    [
      "Kerüld az előkészítetlen, zárt helyzetű lövést.",
      "A két hátsó játékos őrizze a biztonságos visszapassz lehetőségét.",
    ],
    node(
      "Biztonságos labdajáratás",
      "A jobb szélső visszaadja a labdát, majd a másik oldal következik.",
      [
        pass("LB", "RB"),
        pass("RB", "RW"),
        pass("RW", "RB"),
        pass("RB", "LB"),
        carry("LB", 6.7, 9.5),
      ],
      [
        {
          label: "A második védő kilép",
          node: deliver("Beállópassz az üres sávba", "LB", "PV"),
        },
        {
          label: "A második védő bent marad",
          node: finish("Előkészített távoli lövés", "LB"),
        },
      ],
    ),
    {
      actors: outnumbered,
      owner: "LB",
      formation: "2:3",
      difficulty: "Haladó",
      ageGroup: "U18",
      tags: ["Emberhátrány", "5:6"],
    },
  ),
  tactic(
    "five-six-pivot",
    "5:6: jobbátlövő–beálló páros akció",
    "Létszámhelyzetek",
    "6:0",
    "Emberhátrányban a jobb oldali kétjátékos kapcsolat rövid döntési helyzetet hoz létre. A bal oldali támadók a visszapasszhoz elérhetők maradnak.",
    [
      "Ne gyűljön minden támadó a páros kapcsolat köré.",
      "Zárt helyzetben maradjon lehetőség a támadás újraszervezésére.",
    ],
    node(
      "Jobb oldali kis csoport",
      "A jobbátlövő egy belső elzárással támad.",
      [pass("LB", "RB"), carry("RB", 13.5, 9.2, [["PV", 12.7, 6.7]])],
      [
        {
          label: "A védő kilép",
          node: deliver("Belső bejátszás emberhátrányban", "RB", "PV"),
        },
        {
          label: "A belső védő nem lép ki",
          node: finish("Jobbátlövő átlövése", "RB"),
        },
      ],
    ),
    {
      actors: outnumbered,
      owner: "LB",
      formation: "2:3",
      difficulty: "Haladó",
      ageGroup: "U18",
      tags: ["Emberhátrány", "5:6"],
    },
  ),
  tactic(
    "seven-six-inner",
    "7:6: két beálló közötti belső kapcsolat",
    "Létszámhelyzetek",
    "6:0",
    "Hét mezőnyjátékos két beállóval terheli a mély védelmet. Az irányító bejátszása után a beállók közötti rövid passz a besegítést használja ki.",
    [
      "A két beálló külön belső sávban kezdjen.",
      "Az üres saját kapu miatt a labdavesztés utáni visszacserélés rendjét is tisztázzátok.",
    ],
    node(
      "Első beálló lekötése",
      "A labda az egyik beállóhoz kerül.",
      [
        carry("CB", 9, 9.7, [
          ["PV2", 7, 6.7],
          ["PV", 12.5, 6.7],
        ]),
        pass("CB", "PV2"),
      ],
      [
        {
          label: "A másik belső védő besegít",
          node: node(
            "Beállók közötti passz",
            "Az ellenoldali beálló a befelé záró védő mögött marad.",
            [move(["D4", 8.8, 6.7]), pass("PV2", "PV"), shoot("PV")],
          ),
        },
        {
          label: "A másik védő helyben marad",
          node: finish("Első beálló befejezése", "PV2"),
        },
      ],
    ),
    {
      actors: sevenAttackers,
      formation: "3:4",
      ageGroup: "Felnőtt",
      difficulty: "Haladó",
      tags: ["7:6", "Két beálló"],
      sources: [S.analysis, S.superiority],
    },
  ),
  tactic(
    "seven-six-weak-side",
    "7:6: gyors váltás a gyenge oldalra",
    "Létszámhelyzetek",
    "6:0",
    "A bal oldali átlövő és beálló kapcsolatára záró védelem ellen a labda gyorsan a jobb oldali átlövő–szélső pároshoz kerül.",
    [
      "A bal oldali előkészítés kényszerítse tolódásra a védőket.",
      "Az oldalváltás két gyors passzból történjen.",
    ],
    node(
      "Bal oldal túlsúlya",
      "Két beálló mellett bal oldalon indul a támadás.",
      [
        pass("CB", "LB"),
        carry("LB", 7, 9.5, [["PV2", 7.2, 6.7]]),
        pass("LB", "CB"),
        pass("CB", "RB", [["PV", 13, 6.7]]),
      ],
      [
        {
          label: "A külső védő befelé segít",
          node: node(
            "Jobb oldali szélesség",
            "A jobb szélső a helyi fölényből fejez be.",
            [
              carry("RB", 15.2, 9),
              pass("RB", "RW"),
              carry("RW", 17, 5.8),
              shoot("RW"),
            ],
          ),
        },
        {
          label: "A jobb belső védő kilép",
          node: deliver("Ellenoldali beállópassz", "RB", "PV"),
        },
      ],
    ),
    {
      actors: sevenAttackers,
      formation: "3:4",
      ageGroup: "Felnőtt",
      difficulty: "Haladó",
      tags: ["7:6", "Gyenge oldal"],
      sources: [S.analysis, S.education],
    },
  ),
  tactic(
    "seven-six-three-pivots",
    "7:6: három beállós 2:5 felállás",
    "Létszámhelyzetek",
    "6:0",
    "Két hátsó játékos három belső támadóval és két szélsővel alakít ki döntési helyzetet. A középső beálló a két elzárás között kínál passzsávot.",
    [
      "A három beálló egymástól elkülönülő helyet foglaljon.",
      "A saját kapu üres: a visszacserélésért felelős játékos legyen kijelölve.",
    ],
    node(
      "Három belső passzpont",
      "Az irányító jobbra húz, majd a másik hátsó játékoshoz adja a labdát.",
      [
        carry("CB", 8.5, 10, [
          ["PV2", 6.5, 6.7],
          ["PV3", 13.5, 6.7],
        ]),
        pass("CB", "RB"),
        carry("RB", 14, 9.5),
      ],
      [
        {
          label: "A középső védő kilép",
          node: deliver("Középső beállópassz", "RB", "PV"),
        },
        {
          label: "A szélső belső védő zár középre",
          node: deliver("Jobb oldali harmadik beálló", "RB", "PV3"),
        },
      ],
    ),
    {
      actors: (a) => [
        ...sevenAttackers(a).filter((actor) => actor.id !== "LB"),
        {
          id: "PV3",
          label: "BE3",
          team: "attack",
          position: { x: 13.5, y: 6.7 },
        },
      ],
      formation: "2:5",
      ageGroup: "Felnőtt",
      difficulty: "Haladó",
      tags: ["7:6", "Három beálló"],
      sources: [S.education, S.analysis],
    },
  ),

  tactic(
    "keeper-outlet-left",
    "Kapusindítás a bal szélsőnek",
    "Átmenetek",
    "Rendezetlen",
    "A saját kapus hosszú indítása az első hullámban futó bal szélsőt keresi. A befejező a labdaátvétel után a külső támadósávot használja.",
    [
      "A kapus az indítás előtt nézze meg a visszafutó védőt.",
      "A szélső a futóútja előtt kérje a labdát.",
    ],
    node(
      "Első hullám bal oldalon",
      "A szélső előrefut, a kapus hosszú passzt ad.",
      [
        move(["LW", 2, 14], ["RW", 18, 14]),
        pass("OGK", "LW"),
        carry("LW", 2.8, 8),
      ],
      [
        {
          label: "A visszafutó nem zárja a külső sávot",
          node: finish("Bal szélső gyorsindításból", "LW", [3.5, 5.9]),
        },
      ],
    ),
    {
      actors: outlet,
      owner: "OGK",
      court: "full",
      formation: "Első hullám",
      ageGroup: "U14",
      difficulty: "Kezdő",
      sources: [S.fastBreak, S.basics],
    },
  ),
  tactic(
    "keeper-outlet-right",
    "Kapusindítás a jobb szélsőnek",
    "Átmenetek",
    "Rendezetlen",
    "A saját kapus a jobb oldali első hullámot indítja, a középső futó biztosítja a belső továbbpassz lehetőségét.",
    [
      "A szélső a pálya szélén fusson, hogy látható passzsávja legyen.",
      "A középső futó a labdás mögött is maradjon elérhető.",
    ],
    node(
      "Első hullám jobb oldalon",
      "A belső futó nem zárja a kapus hosszú passzát.",
      [
        move(["RW", 18, 13], ["CB", 11, 18]),
        pass("OGK", "RW"),
        carry("RW", 17.5, 8),
      ],
      [
        {
          label: "A visszafutó belül marad",
          node: finish("Jobb szélső gyorsindításból", "RW", [16.7, 5.8]),
        },
      ],
    ),
    {
      actors: outlet,
      owner: "OGK",
      court: "full",
      formation: "Első hullám",
      ageGroup: "U14",
      difficulty: "Kezdő",
      sources: [S.fastBreak, S.basics],
    },
  ),
  tactic(
    "fast-two-one",
    "Gyorsindítás 2:1 döntési helyzettel",
    "Átmenetek",
    "Rendezetlen",
    "Két támadó egy visszafutó védő ellen érkezik. A középső labdás a védő döntésére reagál: saját betörés vagy szélsőpassz.",
    [
      "A két támadó tartson akkora távolságot, hogy a védő ne érje el egyszerre mindkettőt.",
      "A labdás a védőt támadja, és csak a kilépés után passzoljon.",
    ],
    node(
      "Egy visszafutó védő lekötése",
      "A középső támadó előtt választásra kényszerül a védő.",
      [
        carry(
          "CB",
          10,
          11,
          [],
          [
            ["LW", 3, 8],
            ["D3", 9.5, 8.5],
          ],
        ),
      ],
      [
        {
          label: "A védő a labdásra lép",
          node: node(
            "Passz a társnak",
            "A szélső a szabad külső sávon fejez be.",
            [pass("CB", "LW"), carry("LW", 4, 6), shoot("LW")],
          ),
        },
        {
          label: "A védő a passzt zárja",
          node: finish("Labdás saját befejezése", "CB", [10.5, 7]),
        },
      ],
    ),
    {
      actors: (a) =>
        fastPositions(a).filter((actor) =>
          ["CB", "LW", "D3", "GK"].includes(actor.id),
        ),
      court: "full",
      formation: "2:1",
      ageGroup: "U14",
      difficulty: "Kezdő",
      sources: [S.fastBreak, S.basics],
    },
  ),
  tactic(
    "fast-three-two",
    "Gyorsindítás 3:2 két passzponttal",
    "Átmenetek",
    "Rendezetlen",
    "Három szélességben érkező támadó két visszafutó védő ellen halad. Az első passz után az új labdás olvassa a második védőt.",
    [
      "Az első passz után is maradjon három külön futósáv.",
      "A második labdás a védőre támadjon, ne automatikusan továbbpasszoljon.",
    ],
    node(
      "Három futósáv",
      "A jobb oldali támadó kapja az első passzt.",
      [
        carry(
          "CB",
          10,
          13,
          [],
          [
            ["LW", 3, 9],
            ["RW", 17, 10],
            ["D3", 8, 8],
            ["D4", 12.5, 8],
          ],
        ),
        pass("CB", "RW"),
      ],
      [
        {
          label: "A jobb védő a labdásra lép",
          node: node(
            "Második passz középre",
            "A középső futó a két védő közé érkezik.",
            [move(["CB", 10, 7.5]), pass("RW", "CB"), shoot("CB")],
          ),
        },
        {
          label: "Mindkét védő középen marad",
          node: finish("Jobb oldali befejezés", "RW", [16.5, 6.2]),
        },
      ],
    ),
    {
      actors: (a) =>
        fastPositions(a).filter((actor) =>
          ["CB", "LW", "RW", "D3", "D4", "GK"].includes(actor.id),
        ),
      court: "full",
      formation: "3:2",
      ageGroup: "U16",
      sources: [S.fastBreak, S.basics],
    },
  ),
  tactic(
    "second-wave-back",
    "Második hullám: érkező átlövő",
    "Átmenetek",
    "Rendezetlen",
    "Az első hullám szélsőit követő balátlövő a hátsó sorból érkezik lövőhelyzetbe. Az irányító az előre mozgó játékosnak adja a labdát.",
    [
      "A második hullám ne torlódjon a szélsők mögé.",
      "Az érkező átlövő a labdát már kapu felé mozgásban vegye át.",
    ],
    node(
      "A hátsó sor beérkezése",
      "A balátlövő az irányító mellett érkezik előre.",
      [
        carry(
          "CB",
          10,
          16,
          [],
          [
            ["LB", 6, 14],
            ["RB", 14, 17],
            ["LW", 2, 8],
            ["RW", 18, 8],
          ],
        ),
        pass("CB", "LB"),
        carry("LB", 7, 10),
      ],
      [
        {
          label: "A védelem még rendeződik",
          node: finish("Érkező balátlövő lövése", "LB", [7.5, 8.5]),
        },
      ],
    ),
    {
      actors: fastPositions,
      court: "full",
      formation: "Második hullám",
      sources: [S.fastBreak, S.education],
    },
  ),
  tactic(
    "second-wave-pivot",
    "Második hullám: korai beállókapcsolat",
    "Átmenetek",
    "Rendezetlen",
    "A beálló a visszarendeződő védők közé érkezik, és az előre haladó jobbátlövővel alakít ki rövid belső kapcsolatot.",
    [
      "A beálló ne ugyanabban a futósávban haladjon, mint a labdás.",
      "A belső passz a védők teljes rendeződése előtt érkezzen.",
    ],
    node(
      "Korai belső összeköttetés",
      "Az irányító jobbra adja a labdát a beérkező beálló mellett.",
      [
        carry(
          "CB",
          10,
          18,
          [],
          [
            ["RB", 14, 15],
            ["PV", 12, 8],
          ],
        ),
        pass("CB", "RB"),
        carry("RB", 13.5, 10.5, [], [["PV", 12.7, 6.7]]),
      ],
      [
        {
          label: "A belső védő kifelé figyel",
          node: deliver("Beállópassz rendeződés közben", "RB", "PV"),
        },
        {
          label: "A beállót követik",
          node: finish("Jobbátlövő korai lövése", "RB"),
        },
      ],
    ),
    {
      actors: fastPositions,
      court: "full",
      formation: "Második hullám",
      sources: [S.fastBreak, S.education],
    },
  ),
  tactic(
    "quick-throwoff",
    "Gyors középkezdés két előrefutóval",
    "Átmenetek",
    "Rendezetlen",
    "A középkezdést követő gyors passz a balátlövőt indítja. A másik oldali futó külön sávban kínál folytatást a visszarendeződés előtt.",
    [
      "A kezdődobást a mindenkori szabályok szerint, a játékvezető jelére hajtsátok végre.",
      "Az első passz után maradjon széles az előrefutók elhelyezkedése.",
    ],
    node(
      "Gyors labdaindítás középről",
      "A balátlövő a középkezdés után indul támadásba.",
      [
        pass("CB", "LB", [
          ["LB", 6, 16],
          ["RB", 14, 15],
          ["RW", 18, 10],
          ["LW", 2, 10],
        ]),
        carry("LB", 7, 11),
        pass("LB", "RB"),
      ],
      [
        {
          label: "A jobb oldal még nem zárt",
          node: finish("Jobb oldali korai támadás", "RB", [14, 8.4]),
        },
      ],
    ),
    {
      actors: (a) =>
        withPositions(a, {
          CB: { x: 10, y: 20 },
          LB: { x: 6, y: 22 },
          RB: { x: 14, y: 22 },
          LW: { x: 2, y: 20 },
          RW: { x: 18, y: 20 },
          PV: { x: 10, y: 16 },
        }),
      court: "full",
      formation: "Gyors középkezdés",
      sources: [S.analysis, S.education],
    },
  ),
  tactic(
    "extended-break-side-switch",
    "Elhúzódó gyorsindítás oldalváltással",
    "Átmenetek",
    "Rendezetlen",
    "Az első hullám bal oldali befejezése bezárul. A labda visszakerül a beérkező hátsó sorhoz, majd a jobb oldalon folytatódik a támadás.",
    [
      "Zárt első hullámból ne erőltesd a lövést.",
      "A visszapassz után a második hullám azonnal támadjon az ellenoldalon.",
    ],
    node(
      "Első hullám visszapassza",
      "A balszélső a beérkező irányítóhoz adja vissza a labdát.",
      [
        pass("CB", "LW"),
        move(["CB", 9, 15], ["RB", 14, 13], ["RW", 18, 9]),
        pass("LW", "CB"),
        pass("CB", "RB"),
      ],
      [
        {
          label: "A védelem balra tömörült",
          node: node(
            "Második hullám jobb oldalon",
            "A jobbátlövő az ellenoldali szélsőt is bevonja.",
            [
              carry("RB", 14, 9),
              pass("RB", "RW"),
              carry("RW", 16.8, 6),
              shoot("RW"),
            ],
          ),
        },
      ],
    ),
    {
      actors: fastPositions,
      court: "full",
      formation: "Első → második hullám",
      sources: [S.fastBreak, S.education],
    },
  ),
];

export const expandedPlays: Play[] = expandedSpecs.map(makeTactic);
