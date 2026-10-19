import { uid, type Play } from "../domain/model";
import { defaultActors } from "./actors";
export function newPlay(): Play {
  return {
    schemaVersion: 1,
    requiresAuth: true,
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
    phases: [
      {
        id: "start",
        title: "1. fázis",
        note: "",
        actions: [],
        next: [],
        duration: 3,
      },
    ],
    coachingPoints: [],
    sources: [],
    updatedAt: new Date().toISOString(),
  };
}
