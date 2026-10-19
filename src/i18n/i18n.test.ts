import { translationKey } from "../domain/translation-key";
import { afterEach, describe, expect, it } from "vitest";
import { setLanguage, t, playText } from "./index";
import { builtInPlays } from "../data/seeds";
afterEach(() => setLanguage("hu"));
describe("magyar és angol nyelv", () => {
  it("váltja a felületet és a dinamikus üzeneteket", () => {
    expect(t("Bejelentkezés")).toBe("Bejelentkezés");
    setLanguage("en");
    expect(t("Bejelentkezés")).toBe("Sign in");
    expect(t`Teszt megnyitása`).toBe("Open Teszt");
    expect(t("A taktikatár frissült (60 taktika).")).toBe(
      "Library updated (60 tactics).",
    );
    expect(t("Az e-mail-cím vagy a jelszó hibás.")).toBe(
      "The email address or password is incorrect.",
    );
  });
  it("fordítja a katalógus tartalmát; az egyéni szöveg és az adatmodell stabil marad", () => {
    const play = builtInPlays[3];
    setLanguage("en");
    expect(playText(play, play.title)).toBe("Double cross");
    expect(playText(play, "Csapatom új figurája")).toBe("Csapatom új figurája");
    expect(play.difficulty).toBe("Haladó");
    expect(
      playText(
        { ...play, english: { [translationKey(play.title)]: "" } },
        play.title,
      ),
    ).toBe(play.title);
    setLanguage("hu");
    expect(playText(play, play.title)).toBe("Kettős kereszt");
  });
});
