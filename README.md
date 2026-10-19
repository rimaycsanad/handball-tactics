# Handball PlayLab

Magyar nyelvű kézilabda taktikatár, animációs lejátszó és szerkesztő. Egy közös **React + TypeScript PWA** böngészőre, Androidra és iOS/iPadOS-re. Firebase Hosting, Firestore és e-mail/jelszavas Authentication integrációval, a Spark csomaghoz igazítva. A helyi használat továbbra is működik Firebase-konfiguráció és bejelentkezés nélkül.

A lejátszás, a taktikaszerkesztés, a védőmozgások és a védekezési döntések részletes használata a [felhasználói útmutatóban](docs/FELHASZNALOI_UTMUTATO.md) található.

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

A katalógus jelenlegi tartalomverziója 5. A teljes taktikai adatállomány a Firestore-ban van; a webes JavaScript-csomag nem tartalmaz taktikákat. Bejelentkezés nélkül induláskor 5 nyilvános taktika érhető el, a többihez adminmeghívás alapján jóváhagyott csapattagság és megerősített e-mail-cím kell. A saját taktikákat és kedvenceket a hozzáférésváltás nem módosítja.

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

| Fájl                  | Tartalom                                                           |
| --------------------- | ------------------------------------------------------------------ |
| `library.json`        | Saját taktikák, kedvencek, katalógus URL                           |
| `library.backup.json` | Az előző sikeres könyvtármentés                                    |
| `draft.json`          | A szerkesztett, még el nem mentett piszkozat                       |
| `catalog-public.json` | A legutóbbi nyilvános katalógus, legfeljebb 5 taktikával           |
| `catalog-{uid}.json`  | A bejelentkezett felhasználó katalógusa; kijelentkezéskor törlődik |

Az OPFS-fájlok a webhely privát tárában vannak, nem egy felhasználó által kiválasztott mappában. Az adatokat a böngésző adatainak törlése vagy tárolókezelése eltávolíthatja. A Beállításokban kérhető tartós tárolás, és minden platformon használható a fájlos export/import. Másik böngésző, másik origin vagy egyes rendszereken a telepített PWA saját tárat használhat: első körben nincs automatikus eszközök közötti szinkronizálás.

A sérült helyi könyvtár betöltésekor az app leállítja a normál mentést, és felajánlja az eredeti fájl exportálását. Nem állítja üresre az adatokat. Az előző mentés a tárolóban biztonsági másolatként megmarad; automatikus javítás nincs.

## Központi katalógus és HTTP-frissítés

A felület a `Repository` réteget használja. A katalógus letöltése a `CatalogSource` interfészen keresztül történik; `FirestoreCatalogSource` és `HttpCatalogSource` implementációval. Firebase-konfiguráció mellett, üres katalógus-URL esetén induláskor és visszacsatlakozáskor a Firestore-ból frissít. Megadott HTTPS-cím esetén a korábbi kézi HTTP-frissítés működik. A teljes katalógust és a labdaáramlást validálja, a korábbi offline másolatot hibás frissítéskor megőrzi.

A `public/catalog/catalog.json` helyi fejlesztési példa, csak az 5 induló nyilvános taktikával. A Hosting buildből szándékosan kimarad; a hozzáférést a Firestore szabályozza. A teljes kezdőkatalógus a gitből és Hostingból kizárt `.firebase/seed-catalog.json` fájlba kerül. Az export újragenerálható, megadott tartalomverzióval:

```sh
npm run catalog:export
```

A várt HTTP-válasz:

```json
{
  "schemaVersion": 1,
  "contentVersion": 4,
  "plays": ["a Play adatmodell szerinti objektumok"]
}
```

A `plays` elemei objektumok legyenek; a fenti karakterlánc a helyüket jelöli. A pontos séma a `src/domain/model.ts` fájlban, működő teljes példa a `public/catalog/catalog.json` fájlban található.

A Beállításokban továbbra is megadható egy saját, HTTPS-en kiszolgált JSON-katalógus. A PlayLab Hostingon nincs statikus katalógusvégpont. Alapértelmezésként `.env`-ben is megadható a `VITE_CATALOG_URL`. Más domainen a kiszolgálón megfelelő CORS-fejlécek szükségesek. A kliens 15 másodperces időkorlátot és 5 MB-os importkorlátot alkalmaz, a teljes dokumentumot és labdaáramlást ellenőrzi, régebbi tartalomverziót elutasít, és csak a validált dokumentumot tárolja. A saját taktikák külön maradnak.

A saját taktikák és kedvencek továbbra is helyben maradnak, bejelentkezés és kijelentkezés sem törli vagy migrálja őket. A közös közzététel külön művelet; a felhasználói saját könyvtár felhőszinkronja nincs bekapcsolva.

## Firebase Spark, bejelentkezés és jogosultságok

Az integráció kizárólag Hostingot, Standard Firestore-t és e-mail/jelszavas Firebase Authenticationt használ. Cloud Functions, Cloud Run, Storage, SMS és fizetős automatikus mentés nincs. Az első Firestore-adatbázis `europe-west3` (Frankfurt) régióban, az ingyenes kerettel és törlésvédelemmel készült. A konfiguráció nem kapcsolja be a számlázást és nem vált Blaze csomagra.

| Szerepkör                     | Hozzáférés                                                                                   |
| ----------------------------- | -------------------------------------------------------------------------------------------- |
| Vendég / nem jóváhagyott fiók | Legfeljebb 5 nyilvános taktika, helyi szerkesztés, mentés, import/export, kedvencek          |
| Jóváhagyott felhasználó       | Teljes katalógus olvasása megerősített e-mail-címmel                                         |
| Szerkesztő                    | Ezek mellett közös taktika létrehozása, módosítása és eltávolítása                           |
| Adminisztrátor                | Ezek mellett a Felhasználók menüben szerepkörök kiosztása és csapathozzáférés felfüggesztése |

Az online írási és adminműveletekhez aktív profil, megerősített e-mail-cím és friss szerveres jogosultság szükséges. A `firestore.rules` szerveroldalon is ellenőrzi a jogosultságokat: a menük elrejtése önmagában nem védelem. Saját magának senki nem adhat jogot, és az admin nem vonhatja vissza a saját adminjogát vagy saját aktív állapotát. A felfüggesztés nem törli a helyi adatokat és nem tiltja a nyilvános katalógus olvasását. A Firebase Auth-fiókok törlése, szolgáltatói letiltása és e-mail-címének módosítása a Firebase konzolban végezhető el; az alkalmazás nem kap Admin SDK-kulcsot.

Az első adminisztrátor `rimaycsanad@gmail.com`; az első belépéshez egyszer használható meghívást kapott. Az első belépésnél a regisztráció, a levélben történő címmegerősítés és a „Már megerősítettem az e-mail-címem” gomb aktiválta a jogosultságot. A meglévő adminfiókkal újraregisztrálás nélkül lehet bejelentkezni. A meghívást a Firestore-tranzakció az adminjog kiosztásával egyszerre fogyasztja el. Másik e-mail-cím és nem megerősített felhasználó nem olvashatja vagy használhatja fel. A későbbi meghívásokat, szerepköröket és csapathozzáférést a Felhasználók menüben lehet kezelni.

A Firestore tárolási struktúrája:

```text
catalog/current                          # Aktuális tartalomverzió és releaseId
catalogReleases/{releaseId}               # Változat metaadatai
catalogReleases/{releaseId}/plays/{id}    # Taktikánként egy dokumentum
users/{uid}                              # Profil, admitted: jóváhagyott tagság, szerepkör, állapot
invitations/{email}                      # Egyszer használható, e-mailhez kötött meghívás és kezdő szerepkör
registrationPermits/{sha256(email)}       # Nyilvánosan csak pontos kulccsal olvasható aktív regisztrációs engedély
```

Közzétételkor előbb a teljes új katalógus töltődik fel, és csak az utolsó tranzakció váltja át az aktuális verziót. A már kiadott változatot a webkliens nem módosíthatja. Párhuzamos szerkesztéskor verzióütközés jelenik meg, és frissíteni kell a katalógust. A régi kiadások megmaradnak; szükség esetén a nem aktuális változatokat jogosult üzemeltető tudja eltávolítani az alkollekciójukkal együtt.

Spark takarékosság: nincs folyamatos katalógusfigyelés. Induláskor és visszacsatlakozáskor egy verziódokumentumot olvasunk; megváltozott verziónál vendégként legfeljebb 5, jóváhagyott csapattagként 60 taktikát töltünk le. A bejelentkezett felhasználó saját jogosultságdokumentumát figyeljük a jogváltozásokhoz. Az adminlista 25-ös lapokban töltődik, a mozgáspontok nincsenek indexelve. A [Firestore ingyenes kerete](https://firebase.google.com/docs/firestore/pricing) napi 50 000 olvasás, 20 000 írás és 1 GiB tárolás; a [Hosting kvótáit](https://firebase.google.com/docs/hosting/usage-quotas-pricing) külön kell figyelni. A meglévő HTTP-katalógus, helyi mentések és offline tartalék továbbra is működnek.

### Meghívásos csapatregisztráció

A **Felhasználók → Csapattag meghívása** felületen az admin e-mail-címet és kezdő szerepkört (felhasználó, szerkesztő vagy adminisztrátor) adhat meg. A függő meghívásokat listázhatja és visszavonhatja. A felület regisztrációs linket másol (`/?register=1`); automatikus meghívólevél nem megy ki. A csapattag a **Meghívást kaptam** felületen regisztrálhat, majd a saját e-mail-címét megerősítve aktiválhatja a meghívást. A név önmagában nem igazol e-mail-tulajdont: a teljes katalógus olvasásához is ellenőrizzük a megerősített címet.

Az e-mail-cím kisbetűs, körülvágott alakját használjuk, a Gmail-aliasokat és pontokat nem vonjuk össze. A publikus regisztrációs ellenőrzés csak egy SHA-256-kulcsú dokumentum `active` jelzőjét olvassa; nem listázhat meghívásokat, e-mail-címeket vagy szerepköröket. Az adminisztrátori meghívás létrehozása és visszavonása, illetve a tagság kiosztása és a meghívás elfogyasztása atomi művelet. A felhasználó nem emelheti a meghívásban kijelölt szerepkört, nem hozhat létre önkényesen jóváhagyott profilt, és a visszavont meghívás utólag sem fogadható el.

**Spark-korlát:** a regisztrációs felület előzetes meghívást követel, a Firestore pedig csak `admitted: true`, aktív, megerősített e-mail-című profilnak engedi a védett adatokat. A Firebase Auth nyilvános regisztrációs API-ján technikailag létrehozható meghívás nélküli Auth-fiók, de ettől nem lesz csapattagsága, felhasználóprofilja vagy védett katalógus-hozzáférése. Az Auth-fiók létrehozását e-mail-lista szerint blokkoló [blocking function](https://firebase.google.com/docs/functions/auth-blocking-events) külön szerveroldali szolgáltatást és Identity Platformot igényelne; ilyen szolgáltatást vagy számlázási csomagváltást nem vezetünk be.

A meglévő fiókok tagságát megőrző, ütközéskor leálló egyszeri migráció:

```sh
npm run firebase:data -- prepare-membership   # helyi mentés és előkészített mezőfrissítések
npm run firebase:data -- migrate-membership   # meglévő profilok admitted-jelölése, régi adminmeghívók megőrzése
```

A felfüggesztés mostantól a teljes védett katalógushoz való hozzáférést is megszünteti, és az alkalmazás a fiók katalóguscache-ét törli. A saját helyi mentések megmaradnak. Offline az utoljára jóváhagyott, megerősített fiók korábban letöltött katalógusa olvasható; íráshoz és adminisztrációhoz mindig friss szerveres jogosultság kell. A már letöltött vagy exportált adatok visszavonása és az offline állapot alatti azonnali tiltás nem garantálható.

### Konfiguráció és helyi tesztelés

A Firebase webalkalmazás nyilvános konfigurációját a `.env.example` `VITE_FIREBASE_*` változói alapján `.env.local`-ban lehet megadni. Ezek nyilvános projektazonosítók; szolgáltatásfiók-kulcsot soha ne írj `VITE_*` változóba. Firebase Hostingon a `/__/firebase/init.json` konfiguráció is támogatott. Beállítás nélkül a helyi app a korábbi működésével indul.

```sh
# 22 integrációs és jogosultsági teszt, kizárólag demo emulátoron (Java 21+)
npm run test:firebase

# Kézi teszteléshez két terminálban:
npm run firebase:emulators
VITE_FIREBASE_EMULATORS=true npm run dev -- --port 5175
```

Az emulátormód mindig a `demo-handball-tactics` projektet használja, az éles `.env.local` azonosítóktól függetlenül. Production buildben az emulátor engedélyezése hibát okoz. Portok: Authentication 9099, Firestore 8085, Emulator UI 4005. A normál 24 tesztet a `npm test` futtatja.

### Üzemeltetési parancsok

```sh
# Tesztelt szabályok, indexek és e-mail/jelszavas belépés telepítése
npm run firebase:backend

# Első, validált katalógusfeltöltés: meglévő katalógust nem ír felül
npm run catalog:export
npm run firebase:data -- seed

# További első adminhoz, csak helyi, jogosult CLI-fiókkal
npm run firebase:data -- invite-admin admin@example.com

# Csak olvasási állapotellenőrzés
npm run firebase:data -- status
```

Az adminisztrációs script a helyi Firebase CLI belépését használja, nem tárol vagy exportál tokent, és nincs benne a webes csomagban. A `status` a számlázási API engedélyezése nélkül `not-available` értéket is adhat; emiatt nem engedélyezünk számlázást vagy új API-t. A Firestore és az alkalmazás beállításait külön is kiírja. A Firebase Node SDK közvetett gRPC-függőségéhez scoped npm override biztosít javított verziót.

## Firebase Hosting és tesztelői kiadások

Az elsődleges publikus cím **https://handball-playlab.firebaseapp.com/**, rövidebb aliasa **https://handball-playlab.web.app/**. A `firebase.json` Hosting-beállítása a `handball-playlab` és a korábbi `handball-tactics-6fc42` webhelyet is frissíti, így a régi címen is ugyanazok a hozzáférési korlátok érvényesek. A normál preview parancs a PlayLab webhelyet célozza. A Firebase-projekt, a Firestore és az Auth-fiókok közösek a korábbi webhellyel; újraregisztrálni nem kell. A régi `https://handball-tactics-6fc42.web.app` cím továbbra is elérhető. A helyi saját taktikák és kedvencek böngészőoriginenként tárolódnak, ezért a régi címről exporttal/importtal vihetők át.

A `.firebaserc` alapértelmezett projektje `handball-tactics-6fc42`; a repository nem tartalmaz hitelesítőadatot. Az első kiadásban minden platform PWA: App Distribution és natív Android/iOS projekt nincs. A megbeszélt `eu.rimaycsanad.handballtactics` azonosító egy esetleges későbbi natív Android-kiadáshoz megmarad.

A 2026. október 16-án kiadott fő webhely: [Handball PlayLab](https://handball-playlab.firebaseapp.com), 60 Firestore-ban tárolt taktikával (5 nyilvános, 55 csapattagsághoz kötött), magyar–angol felülettel és katalógussal, e-mail/jelszavas belépéssel és adminisztrátori felhasználókezeléssel. Ellenőrizve: 24 alkalmazásteszt, 22 Firebase-emulátoros jogosultsági/integrációs teszt, regisztráció és adminmeghívás, jogkiosztás és felfüggesztés, közös közzététel, a helyi mentések megőrzése kijelentkezéskor, valamint az éles PWA offline újraindítása és mentése. Az éles ellenőrzés nem hozott létre tesztfelhasználót és nem küldött e-mailt.

A korábbi [tesztelői cím](https://handball-tactics-6fc42--testers-yzizkfh5.web.app) is a hozzáférést ellenőrző alkalmazást szolgálja ki. A korábban letöltött vagy exportált nyilvános adatokat utólag nem lehet visszavonni. A valódi iOS/Android telepítési próba még szükséges.

### Nyelv és hozzáférés

A fejléc Magyar / English választója azonnal váltja a felületet, a katalógus szövegeit, a pályajelöléseket és az akadálymentes címkéket. A választást a böngésző megjegyzi, és offline is megtartja. A szerkesztő **Angol fordítás** részében a saját és közös taktikákhoz külön szövegek adhatók meg; hiányzó fordítás esetén az eredeti szöveg látszik. A fordítások rövid, stabil kulcsokat használnak, így hosszú leírás sem lépi túl a Firestore mezőnévkorlátját.

Szerkesztői vagy adminjoggal a **Taktika adatai → Bejelentkezés szükséges** jelölővel állítható a hozzáférés. A módosítás közzétételkor lép életbe. A közös katalógusban 1–5 nyilvános taktika lehet; a hatodikat a kliens és a szerveroldali szabályok is elutasítják. Cseréhez előbb tegyél egy nyilvános taktikát csapattagsághoz kötötté, majd a másikat nyilvánossá. A vendég csak az aktuális kiadás engedélyezett dokumentumait kérheti le; korábbi kiadásokhoz sem kap teljes olvasási hozzáférést. A Firebase szabályok ellenőrzik, hogy az engedélyezett dokumentumok valóban nyilvánosnak vannak jelölve. [Firestore lekérdezések és szabályok](https://firebase.google.com/docs/firestore/security/rules-query).

A katalógus gyorsítótára fiókonként különül el. Kijelentkezéskor a védett katalógus törlődik, a saját helyi taktikák megmaradnak. A nyilvános másolat a közös közzétételnél is frissül. Az offline elérhetőség a korábban letöltött másolatot használja; egy már letöltött vagy exportált adat visszavonása utólag nem garantálható.

Meglévő, korábban nyilvános adatbázis egyszeri, verzióütközés ellen védett migrációja:

```sh
npm run catalog:export
npm run firebase:data -- prepare-access  # távoli aktuális adatok, helyi mentés és előkészítés
npm run firebase:data -- migrate-access  # atomi váltás, azóta változott katalógust nem ír felül
```

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

A release script buildel, és a megadott projekt Hosting szolgáltatására telepít. A preview csatorna neve `FIREBASE_PREVIEW_CHANNEL`-lel állítható. A link birtoklása önmagában hozzáférést biztosít; a preview nem csapattagsághoz kötött privát tesztkörnyezet. CI-ben hitelesítéshez Workload Identity vagy a CI titoktárában tárolt service account használható, a kulcsot ne commitold.

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
