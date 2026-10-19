import { translationKey } from "../domain/translation-key";
// Seed and migration tooling only. Never import the full translation table from the app.
import translations from "./catalog-english.json";
import type { Play } from "../domain/model";
export function englishFor(play: Play): Record<string, string> {
  const texts = [
    play.title,
    play.description,
    play.category,
    ...play.tags,
    ...play.coachingPoints,
    ...play.sources.map((s) => s.title),
    ...play.phases.flatMap((p) => [
      p.title,
      p.note,
      ...p.next.map((n) => n.label),
    ]),
  ];
  return Object.fromEntries(
    texts
      .filter((text) => text in translations)
      .map((text) => [
        translationKey(text),
        (translations as Record<string, string>)[text],
      ]),
  );
}
