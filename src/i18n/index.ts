import { translationKey } from "../domain/translation-key";
import { useSyncExternalStore } from "react";
import english from "./en.json";
import type { Play } from "../domain/model";

export type Language = "hu" | "en";
const key = "playlab-language";
let language: Language = "hu";
try {
  if (typeof window !== "undefined")
    language = window.localStorage.getItem(key) === "en" ? "en" : "hu";
} catch {
  /* Storage may be unavailable. */
}
const listeners = new Set<() => void>();
const subscribe = (listener: () => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
export function setLanguage(value: Language) {
  language = value;
  try {
    if (typeof window !== "undefined") window.localStorage.setItem(key, value);
  } catch {
    /* Language still works for this session. */
  }
  if (typeof document !== "undefined") {
    document.documentElement.lang = value;
    document.title = `Handball PlayLab · ${value === "hu" ? "Edzői műhely" : "Coaching studio"}`;
  }
  listeners.forEach((listener) => listener());
}
export function useLanguage() {
  const current = useSyncExternalStore(subscribe, () => language);
  return [current, setLanguage] as const;
}
const dictionary = english as Record<string, string>;
const escapePattern = (value: string) =>
  value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const patterns = Object.entries(dictionary)
  .filter(([source]) => /\{\d+\}/.test(source))
  .map(([source, target]) => ({
    regex: new RegExp(
      "^" +
        source
          .split(/\{\d+\}/)
          .map(escapePattern)
          .join("([\\s\\S]*?)") +
        "$",
    ),
    target,
  }));
export function t(
  text: string | TemplateStringsArray,
  ...values: unknown[]
): string {
  const source =
    typeof text === "string"
      ? text
      : text.reduce(
          (result, part, i) => result + (i ? `{${i - 1}}` : "") + part,
          "",
        );
  let translated = source;
  if (language === "en") {
    translated = dictionary[source] ?? source;
    if (translated === source && !values.length) {
      for (const { regex, target } of patterns) {
        const match = source.match(regex);
        if (match) {
          translated = target.replace(
            /\{(\d+)\}/g,
            (_, i) => dictionary[match[Number(i) + 1]] ?? match[Number(i) + 1],
          );
          break;
        }
      }
      if (translated === source) {
        for (const [original, result] of Object.entries(dictionary))
          if (original.length > 20 && !original.includes("{"))
            translated = translated.replaceAll(original, result);
      }
    }
  }
  return values.length
    ? translated.replace(/\{(\d+)\}/g, (_, index) => {
        const value = String(values[Number(index)]);
        return language === "en" ? (dictionary[value] ?? value) : value;
      })
    : translated;
}
export function playText(play: Play, text: string): string {
  return language === "en"
    ? play.english?.[translationKey(text)] || t(text)
    : text;
}
if (typeof document !== "undefined") setLanguage(language);
