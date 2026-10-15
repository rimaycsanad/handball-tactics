# Handball Tactics

Magyar nyelvű kézilabda taktikatár, animációs lejátszó és szerkesztő. Egy közös **React + TypeScript PWA** böngészőre, Androidra és iOS/iPadOS-re. Az első verzióhoz nincs szükség backendre, bejelentkezésre vagy Apple Developer-tagságra.

## Indítás

Node.js 22 vagy újabb szükséges.

```sh
npm ci
npm run dev
```

Production build és offline/PWA tesztelés:

```sh
npm run test
npm run build
npm run preview
```

A fejlesztői szerveren a service worker nincs bekapcsolva. Az offline módot a **production preview-n vagy HTTPS-en** ellenőrizd. Az első online betöltéskor az app előkészíti az offline erőforrásokat; ezután az „Offline használatra kész” állapot jelenik meg. Új verzió esetén a felhasználó indítja a frissítést, a szerkesztés mentése után.

## Az első kiadás funkciói

- 60 szemléltető támadó taktika és variáns, keresés, kategória-, védekezés- és korosztályszűrés, kedvencek.
- Fél- és egészpályás SVG-tábla, támadók, védők, kapus és labda.
- Párhuzamos játékosmozgások, időzített passz, labdavezetés, elzárás és lövés.
- Lejátszás, szünet, idővonal, sebességállítás, fázisléptetés, választható folytatások.
- Teljes szerkesztő mobilon is: új taktika vagy mintából saját változat, játékosok és kezdő labdabirtokos, fázisok, műveletek, időzítés, többpontos útvonalak, elágazáscímkék, megjegyzések.
- Automatikus piszkozatmentés, visszavonás/ismétlés, mentett taktika újranyitása.
- JSON-export, teljes saját gyűjtemény exportálása és validált import. Az azonosítóütközéseket új másolat készítésével kezeli, meglévő taktikát nem ír felül.
- Bekapcsolható HTTPS-katalógusfrissítés, helyi gyorsítótárral és hibás frissítés esetén a működő verzió megtartásával.

A minták **saját készítésű szemléltető feldolgozások**, nem hivatalos EHF/IHF figurák vagy szakmailag ellenőrzött, versenyre kész játékrendszerek. A 60 tétel között keresztek, páros kapcsolatok, labdajáratás, befutások, felállásváltások, nyitott védelem elleni megoldások, létszámhelyzetek és átmenetek szerepelnek. Az ellenőrzött forráshivatkozások a kapcsolódó alapelvek tananyagaihoz vezetnek, nem az animációk pontos koordinátáit vagy időzítését igazolják. A korosztályok szerkesztői ajánlások; edzői ellenőrzés szükséges. A hivatkozások a taktika adatlapján is elérhetők.

A beépített katalógus jelenlegi tartalomverziója 2. Az alkalmazás az ennél régebbi helyi katalógus helyett automatikusan az új beépített gyűjteményt mutatja; a saját taktikákat és kedvenceket ez nem módosítja.

## Szerkesztés

1. Válaszd az „Új taktika” vagy „Saját változat készítése” lehetőséget.
2. Az első fázisban a „Kezdőhelyzet” eszközzel húzd a játékosokat a helyükre. Kijelölés után a billentyűzet nyilai is használhatók.
3. Válassz játékost és műveletet; a pályára kattintva/koppintva add meg a végpontot. Passznál a céljátékosra koppints.
4. A művelet kiválasztása után módosíthatod a kezdést, időtartamot és útvonalat. Több útvonalpont formátuma: `x,y; x,y` (méterben, a kapu bal oldalától számítva).
5. Az „Új folytatás” az aktuális fázishoz kapcsol egy új fázist. Több folytatás döntési pontot alkot; címkéik a jobb oldali panelen átírhatók. Végfázis eltávolítható.
6. Ellenőrizd az animációt, majd mentsd a taktikát. A piros ellenőrzési panel jelzi a hibás labdabirtokost, hivatkozást vagy időzítést.

A szerkesztő szemléltető mozgássorokat kezel; nem szimulálja automatikusan a védekezést és nem ellenőrzi a sportági szabályok teljes körét.

## Helyi tárolás

A `FileStore` interfész mögött elsődlegesen Origin Private File System (OPFS) működik, böngészőtámogatás hiányában IndexedDB. A JSON-adatok ugyanazt a verziózott formátumot használják mindkét tárolóban.

| Fájl                  | Tartalom                                     |
| --------------------- | -------------------------------------------- |
| `library.json`        | Saját taktikák, kedvencek, katalógus URL     |
| `library.backup.json` | Az előző sikeres könyvtármentés              |
| `draft.json`          | A szerkesztett, még el nem mentett piszkozat |
| `catalog.json`        | A legutóbb validált központi katalógus       |

Az OPFS-fájlok a webhely privát tárában vannak, nem egy felhasználó által kiválasztott mappában. Az adatokat a böngésző adatainak törlése vagy tárolókezelése eltávolíthatja. A Beállításokban kérhető tartós tárolás, és minden platformon használható a fájlos export/import. Másik böngésző, másik origin vagy egyes rendszereken a telepített PWA saját tárat használhat: első körben nincs automatikus eszközök közötti szinkronizálás.

A sérült helyi könyvtár betöltésekor az app leállítja a normál mentést, és felajánlja az eredeti fájl exportálását. Nem állítja üresre az adatokat. Az előző mentés a tárolóban biztonsági másolatként megmarad; automatikus javítás nincs.

## Későbbi központi frissítés

A felület a `Repository` réteget használja. A katalógus letöltése a `CatalogSource` interfészen keresztül történik; jelenleg `HttpCatalogSource` implementáció van. Így később egy HTTP-adatbázis API-ja kiszolgálhatja ugyanazt a szerződést.

A `public/catalog/catalog.json` egy működő mintavégpont. Az export újragenerálható, megadott tartalomverzióval:

```sh
npm run catalog:export -- 2
```

A várt HTTP-válasz:

```json
{
  "schemaVersion": 1,
  "contentVersion": 2,
  "plays": ["a Play adatmodell szerinti objektumok"]
}
```

A `plays` elemei objektumok legyenek; a fenti karakterlánc a helyüket jelöli. A pontos séma a `src/domain/model.ts` fájlban, működő teljes példa a `public/catalog/catalog.json` fájlban található.

A Beállításokban megadható például `https://<project>.web.app/catalog/catalog.json`. Alapértelmezésként `.env`-ben is megadható a `VITE_CATALOG_URL`. Más domainen a kiszolgálón megfelelő CORS-fejlécek szükségesek. A kliens 15 másodperces időkorlátot és 5 MB-os importkorlátot alkalmaz, a teljes dokumentumot és labdaáramlást ellenőrzi, régebbi tartalomverziót elutasít, és csak a validált dokumentumot tárolja. A saját taktikák külön maradnak.

A jelenlegi frissítés kézi és csak a közös katalógus letöltését végzi. Saját taktikák feltöltése, autentikáció, többeszközös és többfüles szerkesztési konfliktusok kezelése nincs az első kiadásban.

## Firebase Hosting és tesztelői kiadások

A `.firebaserc` alapértelmezett projektje `handball-tactics-6fc42`; a repository nem tartalmaz hitelesítőadatot. Az első kiadásban minden platform PWA: App Distribution és natív Android/iOS projekt nincs. A megbeszélt `eu.rimaycsanad.handballtactics` azonosító egy esetleges későbbi natív Android-kiadáshoz megmarad.

A 2026. október 14-én frissített tesztelői változat: [Handball Tactics preview](https://handball-tactics-6fc42--testers-yzizkfh5.web.app), 60 taktikával és 2-es katalógusverzióval. A `testers` preview csatorna jelenlegi lejárata **2026. október 21.** Új kiadáskor a `firebase:preview` parancs frissíti a csatornát és a lejáratot. Ellenőrizve: mind a 60 adatlap megnyitása, szűrés, forráslinkek, animáció mobilnézetben, a korábbi saját mentések megőrzése PWA-frissítéskor. A kiadott példányon a saját taktika mentése, visszatöltése és offline újraindulás is működik Chromium böngészőben; a 19 automatizált teszt és a production build sikeres. A valódi iOS/Android telepítési próba még szükséges.

Az első feltöltés előtt telepítsd a CLI-t, és lépj be a projekthez hozzáférő Google-fiókkal:

```sh
npm install --save-dev firebase-tools
npx firebase login
```

A kiadási parancsok a `.firebaserc` projektjét használják. A `FIREBASE_PROJECT_ID` környezeti változóval vagy `.env` beállítással ez felülírható. Ezután:

```sh
# 7 napos tesztelői preview link
npm run firebase:preview

# A fő Hosting webhely kiadása
npm run firebase:web
```

A release script buildel, és a megadott projekt Hosting szolgáltatására telepít. A preview csatorna neve `FIREBASE_PREVIEW_CHANNEL`-lel állítható. A link birtoklása önmagában hozzáférést biztosít; a preview nem bejelentkezéshez kötött privát tesztkörnyezet. CI-ben hitelesítéshez Workload Identity vagy a CI titoktárában tárolt service account használható, a kulcsot ne commitold.

Telepítés: iOS/iPadOS-en Safari → Megosztás → Hozzáadás a főképernyőhöz; Androidon Chrome → Alkalmazás telepítése; asztali gépen a böngésző telepítési lehetősége. Távoli eszközökön HTTPS-en tesztelj. Valódi Android/iOS készülékes telepítés és háttérből visszatérés ellenőrzése még szükséges a tesztelői kiadáshoz.

## Ellenőrzések és szerkezet

`npm run test`: az adatmodell, útvonal-interpoláció, párhuzamos műveletek, elágazások, labdabirtoklás, import, mentési hibák és katalógusfrissítés regressziós tesztjei. `npm run build`: TypeScript ellenőrzés, production bundle, manifest és offline service worker.

```text
src/domain/       Verziózott adatmodell, validálás, animációs motor, tesztek
src/data/         Minták, tárolóadapterek, repository, HTTP-forrás, export
src/components/   SVG-pálya és érintéses/billentyűzetes szerkesztés
src/App.tsx       Taktikatár, lejátszó, szerkesztő és beállítások
public/           PWA-ikonok és mintakatalógus
scripts/          Katalógusexport, ikon-generálás, Firebase-kiadás
```
