import type { Actor } from "../domain/model";
export const defaultActors: Actor[] = [
  { id: "LW", label: "BSZ", team: "attack", position: { x: 2, y: 7.5 } },
  { id: "LB", label: "BÁ", team: "attack", position: { x: 5.5, y: 11 } },
  { id: "CB", label: "IR", team: "attack", position: { x: 10, y: 13 } },
  { id: "RB", label: "JÁ", team: "attack", position: { x: 14.5, y: 11 } },
  { id: "RW", label: "JSZ", team: "attack", position: { x: 18, y: 7.5 } },
  { id: "PV", label: "BE", team: "attack", position: { x: 10, y: 6.7 } },
  ...[
    { x: 3.5, y: 5 },
    { x: 6, y: 6.5 },
    { x: 8.5, y: 7 },
    { x: 11.5, y: 7 },
    { x: 14, y: 6.5 },
    { x: 16.5, y: 5 },
  ].map((position, i): Actor => ({
    id: `D${i + 1}`,
    label: `${i + 1}`,
    team: "defense",
    position,
  })),
  { id: "GK", label: "K", team: "keeper", position: { x: 10, y: 0.8 } },
];
export function defenseActors(defense: string): Actor[] {
  let actors = structuredClone(defaultActors);
  const place = (id: string, x: number, y: number) => {
    actors.find((a) => a.id === id)!.position = { x, y };
  };
  if (defense === "5:1" || defense === "5+1") {
    place("D1", 3.5, 5.5);
    place("D2", 6.5, 6.8);
    place("D3", 10, defense === "5+1" ? 11.5 : 10.3);
    place("D4", 10, 6.8);
    place("D5", 13.5, 6.8);
    place("D6", 16.5, 5.5);
  }
  if (defense === "3:2:1") {
    place("D1", 4, 6);
    place("D2", 6.5, 9.2);
    place("D3", 10, 11.1);
    place("D4", 10, 6.8);
    place("D5", 13.5, 9.2);
    place("D6", 16, 6);
  }
  if (defense === "4:2") {
    place("D2", 6, 10);
    place("D5", 14, 10);
  }
  if (defense === "Emberfogás") {
    const marked = ["LW", "LB", "CB", "RB", "RW", "PV"];
    marked.forEach((id, i) => {
      const p = actors.find((a) => a.id === id)!.position;
      place(`D${i + 1}`, p.x + 0.8, p.y - 0.7);
    });
  }
  if (defense === "5:0") {
    actors = actors.filter((a) => a.id !== "D6");
    ["D1", "D2", "D3", "D4", "D5"].forEach((id, i) =>
      place(id, 3.5 + i * 3.25, i === 0 || i === 4 ? 5.8 : 6.8),
    );
  }
  if (defense === "4:0") {
    actors = actors.filter((a) => !["D2", "D5"].includes(a.id));
    ["D1", "D3", "D4", "D6"].forEach((id, i) =>
      place(id, 4 + i * 4, i === 0 || i === 3 ? 5.8 : 6.8),
    );
  }
  return actors;
}
