# Handball PlayLab felhasználói útmutató

A Handball PlayLab kézilabda-taktikák bemutatására, animált lejátszására és szerkesztésére használható. Egy figurán belül megadhatod a támadók és a védők mozgását, a passzok és lövések időzítését, valamint külön folytatásokat készíthetsz a védelem eltérő reakcióira.

Az alkalmazás címe: [Handball PlayLab](https://handball-playlab.firebaseapp.com/).

Az útmutató a magyar felület elnevezéseit használja. Telefonon a menüt a bal felső menügombbal nyithatod meg; a szerkesztő beállításaihoz szükség lehet lefelé görgetésre. A „kattintás” érintőképernyőn koppintást jelent.

## Gyors kezdés

1. Nyisd meg a **Taktikatár** menüt, és válassz egy taktikát.
2. A pálya alatti háromszög alakú **Lejátszás** gombbal indítsd az animációt.
3. Döntési pontnál válassz a **Hogyan reagál a védelem?** alatti folytatások közül, majd indítsd el a következő fázist.
4. Módosításhoz válaszd a **Saját változat készítése** gombot. Üres figurához a fejlécben kattints az **Új taktika** gombra.
5. Szerkesztés után kattints a **Taktika mentése** gombra. Ez a saját taktikát ezen az eszközön tárolja. Szerkesztői vagy adminisztrátori joggal külön közzéteheted a közös tárban is.

## Belépés és jogosultságok

Bejelentkezés nélkül legfeljebb öt nyilvános taktika látható. A helyi szerkesztés, a saját taktikák mentése, valamint az import és az export vendégként is használható.

A teljes csapatkatalógushoz adminisztrátori meghívás, megerősített e-mail-cím és aktív csapathozzáférés szükséges.

| Szerepkör      | Elérhető funkciók                                                             |
| -------------- | ----------------------------------------------------------------------------- |
| Vendég         | Nyilvános taktikák, helyi szerkesztés és mentés, kedvencek, import és export. |
| Felhasználó    | A fentieken túl a teljes csapatkatalógus megtekintése.                        |
| Szerkesztő     | Közös taktikák közzététele, módosítása és eltávolítása is.                    |
| Adminisztrátor | Meghívások, szerepkörök és csapathozzáférések kezelése is.                    |

### Regisztráció meghívással

1. Kérd meg a csapat adminisztrátorát, hogy vegye fel az e-mail-címedet.
2. Nyisd meg a kapott regisztrációs linket, vagy a **Fiók** menüben válaszd a **Meghívást kaptam** lehetőséget.
3. Add meg a meghívott e-mail-címet és a választott jelszót, majd kattints a **Regisztráció meghívással** gombra.
4. Nyisd meg a regisztráció után küldött megerősítő levelet, és erősítsd meg a címedet.
5. Térj vissza az alkalmazásba, és kattints a **Már megerősítettem az e-mail-címem** gombra.

A következő alkalommal a **Fiók → Bejelentkezés** felületen léphetsz be. Elfelejtett jelszó esetén ugyanitt találod az **Elfelejtett jelszó** lehetőséget. A meghíváshoz pontosan azt a címet használd, amelyet az admin felvett; egy másik e-mail-alias külön címnek számít.

## Taktikák keresése és kiválasztása

A **Taktikatár** a közös katalógust, a **Saját taktikák** az adott böngészőben elmentett saját figuráidat mutatja.

A keresővel és a szűrőkkel szűkítheted a listát:

- Írj egy nevet vagy kifejezést a **Keress taktikát, mozgást…** mezőbe.
- Szűrj védekezésre, például 6:0 vagy 5:1 elleni játékra.
- Válassz korosztályt vagy kategóriát.
- A taktika kártyáján lévő szívvel jelöld kedvencnek. A szűrők melletti szívgomb csak a kedvenceket mutatja.

A kiválasztott taktika adatlapján megjelenik a pálya, a leírás és az edzői szempontok. A kapcsolódó tananyagok hivatkozásai külön megnyithatók.

## Animációk lejátszása

Egy taktika **fázisokból** áll. Egy fázison belül több játékos egyszerre is mozoghat; a következő fázis az előző véghelyzetéből folytatódik. A pálya alatti név és időjelzés mindig az aktuális fázishoz tartozik.

| Vezérlő             | Működés                                                                            |
| ------------------- | ---------------------------------------------------------------------------------- |
| Lejátszás és Szünet | Elindítja vagy megállítja az animációt.                                            |
| Körbeforduló nyíl   | Visszaállítja a teljes taktikát az első fázis elejére.                             |
| Balra mutató nyíl   | Visszalép az előző bejárt fázisra.                                                 |
| Jobbra mutató nyíl  | A következő fázisra lép, ha egyértelmű vagy korábban már kiválasztott a folytatás. |
| Idővonal            | Az aktuális fázison belül egy adott pillanatra ugrik, és megállítja a lejátszást.  |
| Sebességválasztó    | 0,5×, 1×, 1,5× vagy 2× sebességet állít be. Váltás után indítsd újra a lejátszást. |

Ha egy fázisnak egyetlen folytatása van, a lejátszás automatikusan továbblép rá. Több lehetséges folytatásnál az első végigjátszás során megáll: a **Hogyan reagál a védelem?** gombjai közül választhatsz. A választás a következő fázis elejére léptet; innen a **Lejátszás** gombbal folytathatod. Korábban már bejárt útvonalon az app követheti az előzőleg kiválasztott ágat, ezért másik változat kipróbálásához válaszd ki annak gombját.

A pálya felső ikonjai a következőket vezérlik:

- **Pajzs:** a védők megjelenítése vagy elrejtése.
- **Útvonal ikon:** a mozgásvonalak megjelenítése vagy elrejtése.
- **Nagyítás ikon:** a pályára összpontosító nagyított nézet; a bezáró ikonnal visszatérhetsz.

A védők elrejtése csak a megjelenítést változtatja meg. A mozgásuk továbbra is része a taktikának.

## Új taktika létrehozása

### Indulás üres figurából vagy meglévő mintából

Új figurához kattints a fejléc **Új taktika** gombjára. Az app alapfelállást és egy üres első fázist készít.

Meglévő figurából indulva válaszd a **Saját változat készítése** gombot. Így önálló másolatot szerkesztesz, amelynek mentése a közös eredetit nem módosítja. Korábban elmentett saját figurát a **Saját taktikák → Taktika szerkesztése** gombbal nyithatsz meg.

### A taktika adatainak megadása

A szerkesztő tetején írd át a taktika nevét. A **Taktika adatai** panelen megadhatod a leírást, a védekezés típusát, a korosztályt, a nehézséget, a kategóriát, a pályaméretet, a felállást és a kezdő labdabirtokost.

A **Védekezés** és a **Felállás** mező a figura leírására és besorolására szolgál. Átírásuk nem rendezi át automatikusan a játékosokat: a kezdőhelyzetet neked kell beállítanod.

### Játékosok és kezdőhelyzet

1. Válaszd ki az első fázist a pálya alatti **Fázisok és lehetőségek** résznél.
2. A pálya felett válaszd a **Kezdőhelyzet** eszközt.
3. Húzd a támadókat, védőket és a kapust a megfelelő helyre. Billentyűzettel, a pályán fókuszba helyezett játékost a nyilakkal is mozgathatod.
4. A **Játékosok** panelen kiválaszthatod és átnevezheted a jelöléseket. Az **Új játékos → Hozzáadás…** választóval támadót, védőt vagy kapust adhatsz hozzá.
5. A **Taktika adatai → Kezdő labdabirtokos** mezőben válaszd ki, kinél induljon a labda.

A játékosokat csak az első fázisban, a **Kezdőhelyzet** eszközzel lehet áthúzni. A későbbi fázisokban mozgásokat adj meg; ezek az előző fázis véghelyzetéből indulnak.

A **Kijelölt játékos eltávolítása** a játékoshoz kapcsolódó műveleteket és a neki címzett passzokat is eltávolítja. Törlés után ellenőrizd újra a labda útját.

## Mozgások és labdás műveletek szerkesztése

Egy animált mozdulat az alkalmazásban **művelet**. Minden művelet egy játékoshoz és egy fázishoz tartozik, saját kezdési idővel és hosszal.

### Művelet hozzáadása

1. Válaszd ki a szerkesztendő fázist.
2. A **Játékosok** panelen válaszd ki a játékost. A pályán is kijelölheted; passz készítésekor a panel használata egyértelműbb.
3. A pálya feletti eszköztáron válassz műveletet.
4. Kattints a pályán a végpontra. **Passz** esetén a fogadó játékosra kattints.
5. Az **Aktuális fázis → Műveletek** listában válaszd ki az új műveletet, és ellenőrizd az időzítését.

| Művelet      | Mire használható                                                                             |
| ------------ | -------------------------------------------------------------------------------------------- |
| Futás        | Labda nélküli helyváltoztatás, például befutás, védő kilépése, visszazárás vagy oldalazás.   |
| Labdavezetés | A labdát birtokló játékos helyváltoztatása.                                                  |
| Passz        | A labda átadása a kiválasztott fogadó játékosnak.                                            |
| Elzárás      | Elzáró helyre mozgás szemléltetése. Az ütközést és a feltartóztatást nem számítja ki az app. |
| Lövés        | A labda eljuttatása a pályán megadott célpontra, például a kapuhoz.                          |

Passzt, labdavezetést vagy lövést azzal a játékossal indíts, akinél a művelet kezdetén a labda van. Passz után a fogadó válik labdabirtokossá; a következő labdás műveletet ennek megfelelően készítsd el.

### Időzítés és párhuzamos mozgás

A kijelölt műveletnél a **Kezdés (s)** az aktuális fázis elejétől számított idő, a **Hossz (s)** pedig a művelet időtartama. Például 0,5 másodperces kezdés és 1,2 másodperces hossz esetén a művelet a fázis 0,5–1,7 másodperce között történik.

Különböző játékosoknak azonos vagy egymást átfedő időszakot is megadhatsz. Így a védő a támadó mozgásával egyszerre vagy kis késéssel reagálhat. Ugyanannak a játékosnak a helyváltoztatásai időben kövessék egymást; a labdás műveleteket is rendezd egymás után.

Az új műveletek kapnak kezdési időt és időtartamot, de ezeket mindig ellenőrizd. A fázis **Időtartam (másodperc)** értéke érjen el legalább az utolsó művelet végéig. Ha egy későbbi módosítással hosszabbítasz egy mozgáson, szükség lehet a fázis hosszabbítására is.

### Többpontos útvonal

A művelet **Útvonal (x,y; x,y)** mezőjében több egymás utáni ponttal kerülő vagy megtört mozgást is megadhatsz. Például:

```text
8.5,8; 9,9; 10,9.5
```

A koordináták méterben értendők. Az `x` balról jobbra 0–20 között, az `y` a felső alapvonaltól lefelé félpályán 0–20, egész pályán 0–40 között lehet. A két koordinátát vessző, az útvonalpontokat pontosvessző választja el; tizedes értékhez pontot használj.

A játékos aktuális helye a mozgás kezdete, ezért a mezőbe az ezután érintendő pontokat add meg. A módosítás a mező elhagyásakor érvényesül. Egy művelethez legfeljebb 20 útvonalpont adható meg.

## Védők mozgásának animálása

A védőknek ugyanúgy adhatsz **Futás** műveletet, mint a támadóknak. Az app a megadott mozgásokat játssza le; a védelem reakcióit az edzőnek kell megterveznie.

### Példa egy védő kilépésére és visszazárására

1. Nyisd meg szerkesztésre a taktikát, és válaszd ki a megfelelő fázist.
2. Kapcsold be a védők megjelenítését a pajzs ikonnal.
3. A **Játékosok** panelen válassz egy védőt, például a 3-as jelölésűt.
4. Válaszd a **Futás** eszközt, majd kattints arra a pontra, ahová a védőnek ki kell lépnie.
5. A műveletnél állíts be például **Kezdés: 0,4 s**, **Hossz: 0,8 s** értékeket. Így a védő 0,4 másodperccel a fázis kezdete után indul, és 1,2 másodpercnél ér a kilépés helyére.
6. Ugyanennek a védőnek adj második **Futás** műveletet a visszazárás helyére. Állítsd például **1,4 s** kezdésre és **0,8 s** hosszra.
7. A szomszédos védőknek is adj mozgást, ha be kell segíteniük vagy el kell tolódniuk. Időzítsd ezeket a kilépéssel párhuzamosan.
8. Ellenőrizd, hogy a fázis legalább 2,2 másodperc hosszú, majd játszd le 0,5× sebességgel.

A megadott időértékek szerkesztési példák; igazítsd őket a támadás ritmusához. Ha a védő maradjon egy ideig a kilépés helyén, a visszazárás kezdését tedd későbbre. Külön művelet nélkül a játékos a legutóbb elért helyén marad.

## Védekezési döntések és választható folytatások

Egy védő mozgása és egy döntési lehetőség két külön szerkesztési feladat. A mozgás az adott változat animációja. A döntési lehetőség több, ugyanabból a helyzetből induló folytatást kínál, például „A védő kilép” vagy „A védő bent marad”.

A döntést az alkalmazásban az **Új folytatás** gombbal készítheted el. Nincs külön „Védekezési döntés hozzáadása” gomb.

### Példa két védekezési reakcióra

1. Készíts egy közös előkészítő fázist, például **Labdajáratás és előkészítés** néven. Az ebben lévő mozgásokat mindkét változat előtt lejátssza az app.
2. Ennél a fázisnál kattints az **Új folytatás** gombra. Az app létrehozza és rögtön ki is választja az új fázist.
3. Az új fázist nevezd el például **Kilépő védő mögé befutás** néven. Add hozzá a kilépő védő, a befutó támadó és a többi érintett játékos mozgását, valamint a szükséges passzokat.
4. A **Fázisok és lehetőségek** listában válaszd vissza az eredeti **Labdajáratás és előkészítés** fázist.
5. Innen ismét kattints az **Új folytatás** gombra. Ez lesz a második, az elsővel párhuzamos lehetőség.
6. Ezt nevezd el például **Bent maradó védő elleni lövés** néven, és készítsd el a másik támadómegoldást, valamint az ehhez tartozó védőmozgásokat.
7. Térj vissza a közös előkészítő fázisra. Az **Aktuális fázis → Folytatások** résznél írd át az ágak címkéit **A védő kilép** és **A védő bent marad** szövegre.
8. Játszd le az előkészítést, majd a **Hogyan reagál a védelem?** gombjaival próbáld ki külön-külön mindkét ágat.

**A második lehetőség létrehozása előtt mindig válaszd vissza a közös kiinduló fázist.** Ha az első folytatásból nyomsz újra az **Új folytatás** gombra, egymást követő fázisokat készítesz, nem két alternatívát.

Mindkét ág ugyanabból, a közös előkészítés végén kialakult helyzetből indul. Ezért az eltérő védekezési reakciókat a külön folytatásokba tedd. A két ág műveleteit külön kell megadni; egy új folytatás kezdetben üres.

Az ág **címkéje** a választógombon megjelenő védekezési reakció, a célfázis **neve** pedig a lejátszott mozgássor megnevezése. Ezeket külön szerkesztheted. Egyetlen folytatás esetén az app folyamatos mozgássorként kezeli a fázisokat; a döntési gombok legalább két folytatásnál jelennek meg.

### További fázisok és magyarázatok

Bármelyik ágat továbbépítheted az **Új folytatás** gombbal. Az **Aktuális fázis → Mit figyeljen a játékos?** mezőben rövid magyarázatot írhatsz; ez lejátszáskor megjelenik a pálya alatt. Az egész figurára vonatkozó tanítási pontokat az **Edzői szempontok** panelen, soronként egy szempontként add meg.

A **Fázis eltávolítása** olyan fázisnál jelenik meg, amely nem a kezdőfázis és nincs további folytatása. Hosszabb ág bontásakor a végétől haladj visszafelé. Egy taktikában legfeljebb 100 fázis, egy fázisban 100 művelet és 8 folytatás lehet.

## Ellenőrzés és mentés

Mentés előtt játszd végig az összes ágat. Ellenőrizd a támadók és védők mozgását, a passzok sorrendjét, valamint azt, hogy a lövés előtt a megfelelő játékosnál van-e a labda.

Hiba esetén a szerkesztő **Mentés előtt javítsd:** panelje megmutatja a problémákat. Ilyen lehet a hibás labdabirtokos, egy időzítési ütközés vagy a fázis végén túlnyúló művelet. A **Taktika mentése** gomb az ellenőrzési hibák javítása után használható.

A felső **Visszavonás** és **Ismétlés** ikonokkal visszaléphetsz a szerkesztési módosításokban, illetve újra alkalmazhatod őket.

| Művelet                     | Mi történik?                                                                                                              |
| --------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Automatikus piszkozatmentés | Szerkesztés közben megőrzi a folyamatban lévő munkát ezen az eszközön. Újranyitáskor a felajánlott piszkozat folytatható. |
| Taktika mentése             | A figurát elmenti a saját helyi gyűjteménybe.                                                                             |
| Közzététel a közös tárban   | Szerkesztői vagy adminjoggal megosztja a figurát a közös katalógusban. Internetkapcsolat szükséges.                       |
| Piszkozat exportálása       | Külön JSON-fájlba exportálja a szerkesztett állapotot.                                                                    |
| Piszkozat elvetése          | Megerősítés után bezárja a szerkesztést és eldobja az aktuális piszkozatot. A már mentett taktika megmarad.               |

Az automatikus piszkozatmentés mellett is használd a **Taktika mentése** gombot, ha elkészültél. Az exportált piszkozat visszaimportálásához az adatainak meg kell felelniük az import ellenőrzéseinek.

## Közös taktikák közzététele

Ez a funkció aktív szerkesztői vagy adminisztrátori szerepkörrel, megerősített e-mail-címmel és internetkapcsolattal érhető el.

1. Készítsd el és ellenőrizd a taktikát.
2. A **Taktika adatai** panelen állítsd be a **Bejelentkezés szükséges** jelölőt.
3. Kattints a **Közzététel a közös tárban** gombra, majd ellenőrizd és erősítsd meg a közzétételt.

Bekapcsolt jelölővel a taktika a jóváhagyott, bejelentkezett csapattagoknak érhető el. Kikapcsolt jelölővel vendégként is látható. Ez a hozzáférési beállítás a közös tárban a közzététellel lép életbe.

A közös katalógusban 1–5 nyilvános taktika lehet. Ha már öt nyilvános figura van, először egy másikat tegyél bejelentkezéshez kötötté és tedd közzé; ezután lehet új nyilvános figurát kijelölni.

Meglévő közös taktika módosításához a katalógusban a **Közös taktika szerkesztése** lehetőséget válaszd. Az így megnyitott figura közzététele felváltja a korábbi közös változatot. A **Saját változat készítése** ezzel szemben új, önálló figurát hoz létre.

Az **Eltávolítás a közös tárból** a közös katalógusból veszi ki a taktikát; a korábban elmentett saját másolatokat nem törli. Ha közben másik szerkesztő is módosította a katalógust, frissítsd a tárat, majd ellenőrizd a változásokat az újabb közzététel előtt.

## Magyar és angol nyelv

A fejléc **Magyar / English** választója váltja a felület és a rendelkezésre álló taktikaszövegek nyelvét. Az app megjegyzi a választást.

Saját vagy közös taktika szerkesztésekor az **Angol fordítás** panelen megadhatod a cím, leírás, fázisnevek, megjegyzések, döntési címkék és edzői szempontok angol megfelelőit. Hiányzó fordítás esetén az eredeti szöveg jelenik meg. Ha később átírsz egy eredeti szöveget, az új szöveghez is ellenőrizd és add meg az angol változatot.

## Export és import

Egy kiválasztott taktika mentéséhez az adatlap fejlécében kattints az export ikonra. Az összes saját figurádhoz válaszd a **Beállítások → Összes saját taktika exportálása** gombot. Az export eredménye JSON-fájl.

Másik eszközre költözéshez:

1. Exportáld a kívánt figurákat a régi eszközön.
2. Juttasd el a fájlt az új eszközre.
3. Az új eszközön válaszd a **Taktikák importálása** gombot a Beállításokban, vagy az **Import** gombot a taktikalistánál.
4. Válaszd ki a JSON-fájlt. A figurák a **Saját taktikák** közé kerülnek.

Az import nem írja felül a már meglévő taktikákat: azonosítóütközés esetén külön másolat készül. Legfeljebb 5 MB-os fájl importálható. A teljes saját gyűjtemény exportja a taktikákat tartalmazza; a kedvenceket és a fiókadatokat nem viszi át.

## Offline használat és telepítés

Edzés előtt nyisd meg az alkalmazást internetkapcsolattal, jelentkezz be, ha a teljes tárra szükséged van, és várd meg a katalógus betöltését. Az **Offline használatra kész** jelzés az alkalmazás offline előkészítését mutatja; a kívánt taktikákat is nyisd meg és ellenőrizd, mielőtt megszünteted a kapcsolatot.

A katalógus helyi másolatból is olvasható. Online induláskor és visszacsatlakozáskor az app ellenőrzi a központi verziót; változatlan tartalom esetén a korábbi másolatot használja. Kézi ellenőrzéshez válaszd a **Beállítások → Központi taktikatár → Taktikatár frissítése** gombot. A szokásos használathoz a másik katalógus HTTPS-címét hagyd üresen.

Offline a korábban letöltött taktikákat lejátszhatod, és saját figurákat szerkeszthetsz, menthetsz. A bejelentkezéshez, közzétételhez és felhasználókezeléshez internet kell. Kijelentkezéskor a védett katalógus helyi másolata törlődik; a saját mentéseid megmaradnak.

A saját taktikák az adott webhelyhez és böngészőhöz tartoznak. Másik készüléken vagy másik webcímen nem jelennek meg automatikusan. A böngésző adatainak törlése eltávolíthatja őket, ezért rendszeresen exportálj. A **Beállítások → Tartós helyi tárolás kérése** segítheti a megőrzést, de az exportot nem helyettesíti.

Telepítéshez használd az **App telepítése** lehetőséget vagy a Beállítások telepítési útmutatóját. Ha új alkalmazásverziót jelez a felület, előbb mentsd a szerkesztett taktikát, majd válaszd a **Frissítés** gombot.

## Csapattagok kezelése adminisztrátorként

A **Felhasználók** menü aktív adminisztrátori jogosultsággal és internetkapcsolattal érhető el.

Új csapattag felvételéhez:

1. A **Csapattag meghívása** résznél add meg a meghívott e-mail-címét.
2. Válassz **Kezdő szerepkör** értéket. Ha csak a teljes katalógus olvasását szeretnéd engedélyezni, a felhasználó szerepkör elegendő.
3. Kattints a **Meghívás létrehozása** gombra.
4. A **Regisztrációs link másolása** gombbal másold ki a címet, és juttasd el a meghívottnak. Az app nem küld automatikus meghívólevelet; az e-mail-cím megerősítéséhez szükséges levél a regisztráció után megy ki.

A még fel nem használt meghívásokat a **Függő meghívások** résznél vonhatod vissza. Már regisztrált csapattag szerepkörét vagy **Aktív / Felfüggesztve** hozzáférését a **Regisztrált felhasználók** listájában módosíthatod, majd a **Jogosultság mentése** gombbal érvényesítheted.

A felfüggesztés a védett csapatkatalógushoz való hozzáférést vonja vissza; nem törli a felhasználó saját helyi taktikáit. A korábban exportált adatokat nem lehet visszavonni, és egy offline eszköz a kapcsolódásig nem értesül a tiltásról. A saját adminjogodat és saját aktív állapotodat ezen a felületen nem vonhatod vissza.

## Gyakori kérdések

### Miért csak öt taktikát látok

Vendégként ez az elérhető nyilvános kínálat. A teljes katalógushoz lépj be a meghívott címmel, erősítsd meg az e-mail-címedet, és ellenőrizd, hogy aktív csapathozzáférésed van-e.

### Miért nem mozog a védő

Kapcsold be a védők megjelenítését. Ellenőrizd, hogy a megfelelő fázisban a megfelelő védőhöz adtál-e Futás műveletet, és annak kezdése beleesik-e a fázis idejébe. A védők a megadott mozgásukat követik, önálló reakciót nem terveznek.

### Miért nem jelennek meg a védekezési döntések

Az aktuális fázishoz legalább két folytatásnak kell tartoznia. Ha egy hosszú sorozat készült, valószínűleg a második ág hozzáadása előtt nem választottad vissza a közös kiinduló fázist.

### Miért nem tudok menteni

Nézd meg a **Mentés előtt javítsd:** panelt. Ellenőrizd a műveletek időzítését, a fázis hosszát és a labdabirtoklás sorrendjét. A piszkozat exportjával külön fájlban is megőrizheted a folyamatban lévő munkát.

### Miért nem látja a csapat a mentett figurámat

A **Taktika mentése** a saját helyi gyűjteménybe ment. A közös megjelenéshez szerkesztő vagy adminisztrátor tegye közzé a figurát a **Közzététel a közös tárban** gombbal.

### Miért nem látom másik eszközön a saját taktikáimat

A saját gyűjteménynek nincs automatikus eszközök közötti szinkronizálása. Használj exportot és importot, vagy megfelelő jogosultsággal tedd közzé a csapatnak szánt figurákat a közös tárban.
