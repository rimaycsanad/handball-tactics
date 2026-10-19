import { translationKey } from "./domain/translation-key";
import { t, playText, useLanguage } from "./i18n";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useRegisterSW } from "virtual:pwa-register/react";
import {
  Activity,
  ArrowDownToLine,
  ArrowRight,
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  Copy,
  Download,
  FolderOpen,
  Heart,
  Maximize2,
  Menu,
  MousePointer2,
  Pause,
  Play as PlayIcon,
  Plus,
  Redo2,
  RotateCcw,
  Save,
  Search,
  Settings2,
  Shield,
  Trash2,
  Undo2,
  UserRound,
  UsersRound,
  Upload,
  Wifi,
  WifiOff,
  X,
} from "lucide-react";
import { Court } from "./components/Court";
import {
  actionKinds,
  actionLabels,
  copyPlay,
  playSchema,
  uid,
  validatePlay,
  type Action,
  type ActionKind,
  type Play,
  type Point,
} from "./domain/model";
import { phaseBase, sceneAt, validateBallFlow } from "./domain/engine";
import { newPlay } from "./data/new-play";
import { emptySelection, selectCatalog } from "./data/catalog-selection";
import { createFileStore } from "./data/storage";
import {
  HttpCatalogSource,
  Repository,
  importPlays,
  type Catalog,
  type Library,
} from "./data/repository";
import { exportJson } from "./data/export";
import { AccountPanel } from "./components/AccountPanel";
import { UserManagement } from "./components/UserManagement";
import { useAccount } from "./cloud/use-account";
import { canRead, canWrite, cloudError } from "./cloud/access";
import {
  FirestoreCatalogSource,
  publishCatalog,
  replaceCatalogPlay,
} from "./cloud/catalog";

type View = "library" | "own" | "editor" | "settings" | "account" | "users";
type Editor = {
  play: Play;
  undo: Play[];
  redo: Play[];
  saved: string;
  shared?: boolean;
};
type InstallEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: string }>;
};
let repositoryPromise: Promise<Repository> | undefined;
const errorText = (e: unknown) =>
  e instanceof Error ? e.message : "A művelet nem sikerült.";
const unique = (values: string[]) => [...new Set(values)];
function findRoute(
  play: Play,
  target: string,
  id = play.entryPhaseId,
  visited = new Set<string>(),
): string[] | null {
  if (id === target) return [id];
  if (visited.has(id)) return null;
  visited.add(id);
  for (const next of play.phases.find((p) => p.id === id)?.next ?? []) {
    const rest = findRoute(play, target, next.phaseId, visited);
    if (rest) return [id, ...rest];
  }
  return null;
}
function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}

export function App() {
  const [language, changeLanguage] = useLanguage();
  function newLocalPlay() {
    const play = newPlay();
    if (language === "en") {
      play.title = t(play.title);
      play.category = t(play.category);
      play.phases[0].title = t(play.phases[0].title);
    }
    return play;
  }
  const account = useAccount();
  const [repo, setRepo] = useState<Repository>();
  const [library, setLibrary] = useState<Library>();
  const [catalog, setCatalog] = useState<Catalog | null>(null);
  const [draft, setDraft] = useState<Play | null>(null);
  const [draftOwner, setDraftOwner] = useState<string>();
  const [fatal, setFatal] = useState("");
  const [view, setView] = useState<View>(
    new URLSearchParams(location.search).get("register") === "1"
      ? "account"
      : "library",
  );
  const [selectedDocument, setSelected] = useState<Play>(emptySelection);
  const [editor, setEditor] = useState<Editor | null>(null);
  const [tool, setTool] = useState<"place" | ActionKind>("place");
  const [selectedActor, setSelectedActor] = useState("CB");
  const [selectedAction, setSelectedAction] = useState("");
  const [route, setRoute] = useState<string[]>([selectedDocument.entryPhaseId]);
  const [index, setIndex] = useState(0);
  const [time, setTime] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [speed, setSpeed] = useState(1);
  const [showPaths, setShowPaths] = useState(true);
  const [showDefense, setShowDefense] = useState(true);
  const [query, setQuery] = useState("");
  const [defense, setDefense] = useState("");
  const [age, setAge] = useState("");
  const [category, setCategory] = useState("");
  const [favoritesOnly, setFavoritesOnly] = useState(false);
  const [busy, setBusy] = useState(false);
  const [draftStatus, setDraftStatus] = useState("");
  const [message, setMessage] = useState<{
    text: string;
    error: boolean;
  } | null>(null);
  const [confirm, setConfirm] = useState<{
    title: string;
    body: string;
    action: () => void;
  } | null>(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [focusCourt, setFocusCourt] = useState(false);
  const [online, setOnline] = useState(navigator.onLine);
  const [install, setInstall] = useState<InstallEvent | null>(null);
  const [offlineCached, setOfflineCached] = useState(false);
  const [catalogUrl, setCatalogUrl] = useState("");
  const [updating, setUpdating] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [cloudStatus, setCloudStatus] = useState("");
  const uploadRef = useRef<HTMLInputElement>(null);
  const boardRef = useRef<HTMLDivElement>(null);
  const dirty = !!editor && JSON.stringify(editor.play) !== editor.saved;
  const dirtyRef = useRef(dirty);
  dirtyRef.current = dirty;
  const {
    offlineReady: [serviceWorkerReady],
    needRefresh: [needRefresh],
    updateServiceWorker,
  } = useRegisterSW({
    onRegisterError: () =>
      setMessage({
        text: "Az offline előkészítés nem sikerült. Próbáld újra online.",
        error: true,
      }),
  });
  const offlineReady = serviceWorkerReady || offlineCached;
  const notice = (text: string, error = false) => setMessage({ text, error });
  const teamMember =
    canRead(account.profile, !!account.user?.emailVerified) &&
    (account.confirmed || !online);
  const audience = teamMember ? account.user!.uid : "public";
  const audienceRef = useRef(audience);
  audienceRef.current = audience;
  const activeCatalog = selectCatalog(
    catalog,
    teamMember ? account.user?.uid : undefined,
  );
  const allCatalog = activeCatalog.plays;
  const selected =
    view === "library"
      ? (allCatalog.find((p) => p.id === selectedDocument.id) ??
        allCatalog[0] ??
        emptySelection)
      : selectedDocument;
  const lastAudience = useRef("public");
  const writer =
    online &&
    canWrite(account.profile, !!account.user?.emailVerified, account.fresh);
  const administrator = writer && account.profile?.role === "admin";
  const play = view === "editor" && editor ? editor.play : selected;
  const phase =
    play.phases.find((p) => p.id === route[index]) ??
    play.phases.find((p) => p.id === play.entryPhaseId)!;
  const base = phaseBase(play, route, index);
  const scene = sceneAt(play, phase.id, time, base);
  const structure = editor ? playSchema.safeParse(editor.play) : null;
  const problems = editor
    ? structure?.success
      ? validateBallFlow(editor.play)
      : (structure?.error.issues.map((i) => i.message) ?? [])
    : [];

  useEffect(() => {
    let live = true;
    repositoryPromise ??= createFileStore().then((s) => new Repository(s));
    repositoryPromise
      .then(async (r) => {
        if (live) setRepo(r);
        const [l, c, d] = await Promise.all([
          r.load(),
          r.loadCatalog("public"),
          r.loadDraft(),
        ]);
        if (live) {
          setLibrary(l);
          setCatalog(c);
          setSelected(selectCatalog(c).plays[0] ?? emptySelection);
          setDraft(d);
          setCatalogUrl(l.catalogUrl);
        }
      })
      .catch((e) => {
        if (live) setFatal(errorText(e));
      });
    return () => {
      live = false;
    };
  }, []);
  useEffect(() => {
    if (!repo || account.loading) return;
    const previousAudience = lastAudience.current;
    lastAudience.current = audience;
    if (previousAudience !== "public" && previousAudience !== audience) {
      void repo.clearCatalog(previousAudience);
      void repo.saveDraft(null, previousAudience);
      if (editor?.shared || draftOwner === previousAudience) {
        setEditor(null);
        setDraft(null);
        setDraftOwner(undefined);
        void repo.loadDraft().then(setDraft);
        setView("library");
      }
    }
    void repo.discardLegacyCatalog();
    let live = true;
    const cloud = account.services;
    setCloudStatus("Központi taktikatár ellenőrzése…");
    void repo
      .loadCatalog(audience)
      .then(async (cached) => {
        if (!live) return;
        const current = selectCatalog(
          cached,
          teamMember ? account.user?.uid : undefined,
        );
        if (audience !== "public") {
          const localDraft = await repo.loadDraft();
          const sharedDraft = await repo.loadDraft(audience);
          if (live && !localDraft && sharedDraft) {
            setDraft(sharedDraft);
            setDraftOwner(audience);
          }
        }
        setCatalog(current);
        if (!online) return;
        const source = library?.catalogUrl
          ? new HttpCatalogSource(library.catalogUrl)
          : cloud
            ? new FirestoreCatalogSource(cloud, current, audience)
            : import.meta.env.DEV
              ? new HttpCatalogSource(
                  new URL("/catalog/catalog.json", location.href).href,
                )
              : null;
        if (!source) return;
        const result = await source.fetch();
        const fetched =
          source instanceof HttpCatalogSource
            ? {
                ...result,
                audience,
                plays:
                  audience === "public"
                    ? result.plays.filter((p) => !p.requiresAuth).slice(0, 5)
                    : result.plays,
              }
            : result;
        if (!live) return;
        const updated = await repo.updateCatalog(
          { fetch: async () => fetched },
          current.contentVersion,
        );
        if (!live) return;
        setCatalog(updated);
        setSelected(
          (currentPlay) =>
            updated.plays.find((p) => p.id === currentPlay.id) ?? currentPlay,
        );
        setCloudStatus("A központi taktikatár naprakész.");
      })
      .catch((e) => {
        if (live) setCloudStatus(cloudError(e));
      });
    return () => {
      live = false;
    };
  }, [
    repo,
    account.services,
    account.loading,
    audience,
    online,
    library?.catalogUrl,
  ]);
  useEffect(() => {
    const on = () => setOnline(navigator.onLine);
    const ready = (e: Event) => {
      e.preventDefault();
      setInstall(e as InstallEvent);
    };
    window.addEventListener("online", on);
    window.addEventListener("offline", on);
    window.addEventListener("beforeinstallprompt", ready);
    return () => {
      window.removeEventListener("online", on);
      window.removeEventListener("offline", on);
      window.removeEventListener("beforeinstallprompt", ready);
    };
  }, []);
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      void navigator.serviceWorker.ready.then(() => setOfflineCached(true));
    }
  }, []);
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (dirtyRef.current) {
        e.preventDefault();
        e.returnValue = "";
      }
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);
  useEffect(() => {
    if (!message) return;
    const t = setTimeout(() => setMessage(null), message.error ? 12000 : 5000);
    return () => clearTimeout(t);
  }, [message]);
  useEffect(() => {
    if (!editor || !repo) return;
    if (!dirty) {
      setDraftStatus("Taktika mentve");
      void repo
        .saveDraft(null, editor.shared ? audience : undefined)
        .then(() => setDraft(null))
        .catch((e) => notice(errorText(e), true));
      return;
    }
    setDraftStatus("Mentés…");
    const timer = setTimeout(() => {
      repo
        .saveDraft(editor.play, editor.shared ? audience : undefined)
        .then(() => {
          setDraftStatus("Piszkozat mentve");
          setDraft(editor.play);
          setDraftOwner(editor.shared ? audience : undefined);
        })
        .catch((e) => {
          setDraftStatus("A mentés sikertelen");
          notice(errorText(e), true);
        });
    }, 500);
    return () => clearTimeout(timer);
  }, [editor?.play, repo, dirty, audience, editor?.shared]);
  useEffect(() => {
    setRoute([play.entryPhaseId]);
    setIndex(0);
    setTime(0);
    setPlaying(false);
    setSelectedActor(play.ballOwnerId);
    setSelectedAction("");
  }, [play.id]);
  useEffect(() => {
    if (!playing) return;
    let frame: number;
    let previous = performance.now();
    let t = time;
    const tick = (now: number) => {
      t = Math.min(
        phase.duration,
        t + Math.min((now - previous) / 1000, 0.1) * speed,
      );
      previous = now;
      setTime(t);
      if (t >= phase.duration) {
        const next =
          route[index + 1] ??
          (phase.next.length === 1 ? phase.next[0].phaseId : undefined);
        if (next) {
          setRoute([...route.slice(0, index + 1), next]);
          setIndex(index + 1);
          setTime(0);
        } else setPlaying(false);
        return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [playing, phase.id, speed, play.id]);

  async function persist(next: Library) {
    if (!repo) return;
    setBusy(true);
    try {
      await repo.save(next);
      setLibrary(next);
    } finally {
      setBusy(false);
    }
  }
  function edit(change: (p: Play) => void) {
    setPlaying(false);
    setTime(0);
    setEditor((current) => {
      if (!current) return current;
      const next = structuredClone(current.play);
      change(next);
      return {
        ...current,
        play: next,
        undo: [...current.undo.slice(-49), current.play],
        redo: [],
      };
    });
  }
  function openEditor(p: Play, alreadyOwned = false, newDocument = false) {
    const action = () => {
      const editable =
        alreadyOwned || newDocument ? structuredClone(p) : copyPlay(p);
      if (!alreadyOwned && !newDocument && language === "en")
        editable.title = `${playText(p, p.title).slice(0, 108)} · personal`;
      setEditor({
        play: editable,
        shared:
          alreadyOwned &&
          !library?.plays.some((owned) => owned.id === p.id) &&
          allCatalog.some((item) => item.id === p.id),
        undo: [],
        redo: [],
        saved: alreadyOwned ? JSON.stringify(editable) : "",
      });
      setView("editor");
      setRoute([editable.entryPhaseId]);
      setIndex(0);
      setTime(0);
      setFocusCourt(false);
      setMenuOpen(false);
      setTool("place");
    };
    if (dirty && editor?.play.id !== p.id)
      setConfirm({
        title: "Másik taktika szerkesztése?",
        body: "A jelenlegi piszkozatot felváltja a megnyitott taktika. Előbb mentsd el, ha meg szeretnéd tartani.",
        action,
      });
    else action();
  }
  function navigate(v: View) {
    setMenuOpen(false);
    setFocusCourt(false);
    setPlaying(false);
    if (v === "library" || v === "own") {
      setQuery("");
      setAge("");
      setDefense("");
      setCategory("");
      setFavoritesOnly(false);
      setSelected(
        v === "library"
          ? (allCatalog[0] ?? emptySelection)
          : (library?.plays[0] ?? allCatalog[0] ?? emptySelection),
      );
    }
    if (v === "editor" && !editor) openEditor(newLocalPlay(), false, true);
    else setView(v);
  }
  async function saveEditor() {
    if (!editor || !library) return;
    try {
      const p = validatePlay(editor.play);
      const errors = validateBallFlow(p);
      if (errors.length) throw new Error(errors.join(" "));
      const saved = {
        ...p,
        revision: (library.plays.find((s) => s.id === p.id)?.revision ?? 0) + 1,
        updatedAt: new Date().toISOString(),
      };
      await persist({
        ...library,
        plays: [...library.plays.filter((s) => s.id !== saved.id), saved],
      });
      setEditor((current) =>
        current
          ? { ...current, play: saved, saved: JSON.stringify(saved) }
          : current,
      );
      setSelected(saved);
      notice("A taktika elmentve ezen az eszközön.");
    } catch (e) {
      notice(errorText(e), true);
    }
  }
  async function favorite(id: string) {
    if (!library || busy) return;
    try {
      await persist({
        ...library,
        favorites: library.favorites.includes(id)
          ? library.favorites.filter((f) => f !== id)
          : [...library.favorites, id],
      });
    } catch (e) {
      notice(errorText(e), true);
    }
  }
  async function importFile(file: File) {
    if (!library || !repo) return;
    try {
      if (file.size > 5_000_000)
        throw new Error("Legfeljebb 5 MB-os JSON importálható.");
      const incoming = importPlays(await file.text());
      const ids = new Set([...allCatalog, ...library.plays].map((p) => p.id));
      const added = incoming.map((p) => {
        const next = ids.has(p.id)
          ? { ...p, id: uid(), title: `${p.title.slice(0, 108)} · importált` }
          : p;
        ids.add(next.id);
        return next;
      });
      await persist({ ...library, plays: [...library.plays, ...added] });
      setView("own");
      setSelected(added[0]);
      notice(
        `${added.length} taktika importálva. A meglévő változatok megmaradtak.`,
      );
    } catch (e) {
      notice(errorText(e), true);
    }
  }
  const doExport = async (name: string, value: unknown) => {
    try {
      await exportJson(name, value);
      notice("Az export elkészült.");
    } catch (e) {
      if ((e as Error).name !== "AbortError") notice(errorText(e), true);
    }
  };
  function choosePhase(id: string) {
    const path = findRoute(play, id);
    if (path) {
      setRoute(path);
      setIndex(path.length - 1);
      setTime(0);
      setPlaying(false);
      setSelectedAction("");
    }
  }
  function advance(id?: string) {
    const next = id ?? route[index + 1] ?? phase.next[0]?.phaseId;
    if (next) {
      setRoute([...route.slice(0, index + 1), next]);
      setIndex(index + 1);
      setTime(0);
      setPlaying(false);
    }
  }
  function addAction(point: Point, targetId?: string) {
    if (!editor || tool === "place") return;
    const ballAction = ["pass", "dribble", "shot"].includes(tool);
    if (phase.actions.length >= 100) {
      notice("Egy fázisban legfeljebb 100 művelet lehet.", true);
      return;
    }
    const prior = phase.actions.filter(
      (a) =>
        (ballAction && ["pass", "dribble", "shot"].includes(a.kind)) ||
        (["run", "dribble", "screen"].includes(tool) &&
          a.actorId === selectedActor &&
          ["run", "dribble", "screen"].includes(a.kind)),
    );
    const start = prior.length
      ? Math.max(...prior.map((a) => a.start + a.duration)) + 0.2
      : 0;
    const duration = tool === "pass" || tool === "shot" ? 0.6 : 1.5;
    if (start + duration > 60) {
      notice("A fázis legfeljebb 60 másodperces lehet.", true);
      return;
    }
    if (
      ballAction &&
      sceneAt(play, phase.id, start, base).ballOwnerId !== selectedActor
    ) {
      notice("Válaszd ki azt a játékost, akinél ekkor a labda van.", true);
      return;
    }
    if (tool === "pass" && !targetId) {
      notice("Passzhoz kattints vagy koppints a céljátékosra.");
      return;
    }
    const id = uid();
    const a: Action = {
      id,
      kind: tool,
      actorId: selectedActor,
      path: [point],
      start: Math.round(start * 10) / 10,
      duration,
      ...(targetId ? { targetId } : {}),
    };
    edit((p) => {
      const ph = p.phases.find((s) => s.id === phase.id)!;
      ph.actions.push(a);
      ph.duration = Math.max(ph.duration, a.start + a.duration + 0.5);
    });
    setSelectedAction(id);
  }
  function addPhase() {
    const id = uid();
    edit((p) => {
      const current = p.phases.find((s) => s.id === phase.id)!;
      current.next.push({
        label: current.next.length ? "Új lehetőség" : "Folytatás",
        phaseId: id,
      });
      p.phases.push({
        id,
        title: `${p.phases.length + 1}. fázis`,
        duration: 3,
        note: "",
        actions: [],
        next: [],
      });
    });
    setRoute([...route.slice(0, index + 1), id]);
    setIndex(index + 1);
    setSelectedAction("");
  }
  async function updateCatalog() {
    if (!repo || !library) return;
    setUpdating(true);
    try {
      const source = catalogUrl.trim()
        ? new HttpCatalogSource(catalogUrl.trim())
        : account.services
          ? new FirestoreCatalogSource(
              account.services,
              activeCatalog,
              audience,
            )
          : null;
      if (!source)
        throw new Error(
          "Adj meg katalóguscímet, vagy állítsd be a Firebase-kapcsolatot.",
        );
      const fetched = await source.fetch();
      if (audienceRef.current !== audience) return;
      const visible = catalogUrl.trim()
        ? {
            ...fetched,
            audience,
            plays:
              audience === "public"
                ? fetched.plays.filter((p) => !p.requiresAuth).slice(0, 5)
                : fetched.plays,
          }
        : fetched;
      if (!visible.plays.length)
        throw new Error("A katalógusban nincs nyilvános taktika.");
      const result = await repo.updateCatalog(
        { fetch: async () => visible },
        activeCatalog.contentVersion,
      );
      setCatalog(result);
      await persist({ ...library, catalogUrl: catalogUrl.trim() });
      const replacement = result.plays.find((p) => p.id === selected.id);
      if (replacement) setSelected(replacement);
      notice(`A taktikatár frissült (${result.plays.length} taktika).`);
      setCloudStatus("A központi taktikatár naprakész.");
    } catch (e) {
      notice(errorText(e), true);
    } finally {
      setUpdating(false);
    }
  }
  function requestPublication(value: Play, remove = false) {
    if (!writer || publishing || !account.services || !repo) return;
    if (activeCatalog.audience !== audience || !activeCatalog.cloud) {
      notice("A közzététel előtt töltsd le a teljes közös taktikatárat.", true);
      return;
    }
    if (library?.catalogUrl) {
      notice(
        "A közzététel előtt válts a Firebase taktikatárra a Beállításokban: töröld a katalógus HTTPS-címét, majd frissíts.",
        true,
      );
      return;
    }
    setConfirm({
      title: remove
        ? "Taktika eltávolítása a közös tárból?"
        : "Taktika közzététele?",
      body: remove
        ? `„${value.title}” kikerül a közös taktikatárból. A helyi saját mentések megmaradnak.`
        : `„${value.title}” ${value.requiresAuth ? "bejelentkezés után" : "bejelentkezés nélkül is"} elérhető lesz a közös taktikatárban.${allCatalog.some((p) => p.id === value.id) ? " A korábbi közös változatot felváltja." : ""}`,
      action: () => {
        void (async () => {
          setPublishing(true);
          setMessage(null);
          try {
            const plays = remove
              ? allCatalog.filter((p) => p.id !== value.id)
              : replaceCatalogPlay(activeCatalog, value);
            const result = await publishCatalog(
              account.services!,
              activeCatalog,
              plays,
            );
            setCatalog(result);
            if (remove && selected.id === value.id)
              setSelected(result.plays[0]);
            else if (selected.id === value.id)
              setSelected(result.plays.find((p) => p.id === value.id)!);
            try {
              await repo.updateCatalog(
                { fetch: async () => result },
                result.contentVersion,
              );
              notice(
                remove
                  ? "A taktika kikerült a közös tárból."
                  : "A taktika megjelent a közös tárban.",
              );
            } catch {
              notice(
                "A közzététel sikeres, de az offline másolat mentése nem sikerült. Frissítsd a taktikatárat, ha újra van hely a helyi tárolón.",
                true,
              );
            }
          } catch (e) {
            notice(cloudError(e), true);
          } finally {
            setPublishing(false);
          }
        })();
      },
    });
  }
  async function installApp() {
    if (install) {
      await install.prompt();
      await install.userChoice;
      setInstall(null);
    } else {
      notice(
        "Telepítés: iPhone/iPad → Safari, Megosztás, Hozzáadás a főképernyőhöz. Android → böngészőmenü, Alkalmazás telepítése.",
      );
    }
  }

  if (fatal)
    return (
      <main className="startup">
        <BookOpen size={40} />
        <h1>{t("A helyi adatok nem tölthetők be")}</h1>
        <p>{t(fatal)}</p>
        <p>{t("A fájlokat megőriztük. Exportáld őket a javítás előtt.")}</p>
        <button
          className="button primary"
          onClick={async () => {
            try {
              const raw = await repo?.recoveryFile();
              if (raw) await doExport("handball-recovery.json", raw);
              else setFatal("Nem található exportálható könyvtárfájl.");
            } catch (e) {
              setFatal(errorText(e));
            }
          }}
        >
          {t("Helyi fájl exportálása")}
        </button>
        <button className="button" onClick={() => location.reload()}>
          {t("Újrapróbálás")}
        </button>
      </main>
    );
  if (!library)
    return (
      <main className="startup">
        <BookOpen size={40} />
        <h1>{t("Edzői műhely")}</h1>
        <p>{t("Taktikatár megnyitása…")}</p>
      </main>
    );
  const items = view === "own" ? library.plays : allCatalog;
  const filtered = items.filter(
    (p) =>
      (!query ||
        `${playText(p, p.title)} ${p.description} ${p.tags.join(" ")}`
          .toLocaleLowerCase(language)
          .includes(query.toLocaleLowerCase("hu"))) &&
      (!defense || p.defense === defense) &&
      (!age || p.ageGroup === age) &&
      (!category || p.category === category) &&
      (!favoritesOnly || library.favorites.includes(p.id)),
  );
  const owned =
    view === "own" && library.plays.some((p) => p.id === selected.id);
  return (
    <div className={`app-shell ${focusCourt ? "focus-court" : ""}`}>
      <input
        ref={uploadRef}
        type="file"
        accept=".json,application/json"
        className="visually-hidden"
        aria-label={t("Taktika JSON importálása")}
        onChange={(e) => {
          const f = e.target.files?.[0];
          e.target.value = "";
          if (f) void importFile(f);
        }}
      />
      {menuOpen && (
        <button
          className="sidebar-scrim"
          aria-label={t("Menü bezárása")}
          onClick={() => setMenuOpen(false)}
        />
      )}
      <aside className={`sidebar ${menuOpen ? "open" : ""}`}>
        <a
          className="brand"
          href="#"
          onClick={(e) => {
            e.preventDefault();
            navigate("library");
          }}
        >
          <span className="brand-symbol">
            <Activity size={24} />
          </span>
          <span>
            {t("HANDBALL")}
            <strong>
              {t("PLAYLAB")}
              <span className="brand-dot">.</span>
            </strong>
          </span>
        </a>
        <div className="sidebar-label">{t("EDZŐI MŰHELY")}</div>
        <nav aria-label={t("Főmenü")}>
          {(
            [
              {
                id: "library",
                label: t("Taktikatár"),
                icon: BookOpen,
                count: allCatalog.length,
              },
              {
                id: "own",
                label: t("Saját taktikák"),
                icon: FolderOpen,
                count: library.plays.length,
              },
              { id: "editor", label: t("Szerkesztő"), icon: MousePointer2 },
              { id: "settings", label: t("Beállítások"), icon: Settings2 },
              { id: "account", label: t("Fiók"), icon: UserRound },
            ] as const
          ).map((n) => (
            <button
              key={n.id}
              className={`nav-item ${view === n.id ? "active" : ""}`}
              onClick={() => navigate(n.id)}
            >
              <n.icon size={19} />
              <span>{t(n.label)}</span>
              {"count" in n && <span className="nav-count">{n.count}</span>}
            </button>
          ))}
          {administrator && (
            <button
              className={`nav-item ${view === "users" ? "active" : ""}`}
              onClick={() => navigate("users")}
            >
              <UsersRound size={19} />
              <span>{t("Felhasználók")}</span>
            </button>
          )}
        </nav>
        <div className="sidebar-tip">
          <span className="tip-icon">
            <CircleHelp size={19} />
          </span>
          <h3>{t("A jó játék döntésekkel kezdődik.")}</h3>
          <p>
            {t(
              "Válassz egy figurát, figyeld a védelmet, és próbáld ki a folytatásokat.",
            )}
          </p>
          <button
            onClick={() => {
              setView("library");
              setSelected(allCatalog[0] ?? emptySelection);
              setRoute([(allCatalog[0] ?? emptySelection).entryPhaseId]);
              setIndex(0);
              setTime(0);
            }}
          >
            {t("Nézd meg a mintát")}
            <ArrowRight size={15} />
          </button>
        </div>
        <div className="sidebar-bottom">
          <button className="install-link" onClick={() => void installApp()}>
            <Download size={17} />
            {t("App telepítése")}
          </button>
          <div className="local-status">
            <span className={`status-dot ${offlineReady ? "ready" : ""}`} />
            <span>
              {offlineReady
                ? t("Offline használatra kész")
                : online
                  ? t("Helyi mentés bekapcsolva")
                  : t("Internet nélkül")}
            </span>
          </div>
          <small>{t("HANDBALL PLAYLAB · 0.1")}</small>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div className="topbar-left">
            <button
              className="icon-button mobile-menu"
              aria-label={t("Menü megnyitása")}
              onClick={() => setMenuOpen(true)}
            >
              <Menu size={21} />
            </button>
            <span>{t("Edzői műhely")}</span>
            <ChevronRight size={14} />
            <strong>
              {view === "library"
                ? t("Taktikatár")
                : view === "own"
                  ? t("Saját taktikák")
                  : view === "editor"
                    ? t("Szerkesztő")
                    : view === "account"
                      ? t("Fiók")
                      : view === "users"
                        ? t("Felhasználók")
                        : t("Beállítások")}
            </strong>
          </div>
          <div className="topbar-actions">
            <select
              className="language-selector"
              aria-label="Nyelv / Language"
              value={language}
              onChange={(e) => changeLanguage(e.target.value as "hu" | "en")}
            >
              <option value="hu">Magyar</option>
              <option value="en">English</option>
            </select>
            <span className="connection" title={online ? "Online" : "Offline"}>
              {online ? <Wifi size={15} /> : <WifiOff size={15} />}
              <span>{online ? "Online" : "Offline"}</span>
            </span>
            <button
              className="button primary"
              onClick={() => openEditor(newLocalPlay(), false, true)}
            >
              <Plus size={17} />
              <span>{t("Új taktika")}</span>
            </button>
          </div>
        </header>
        <main className="main-content">
          {view === "account" && (
            <>
              <section className="page-intro">
                <div>
                  <span className="eyebrow">{t("KÖZÖS MŰHELY")}</span>
                  <h1>{t("A fiókod.")}</h1>
                  <p>
                    {t("Bejelentkezés és hozzáférés a közös taktikatárhoz.")}
                  </p>
                </div>
              </section>
              <div className="settings-grid">
                <AccountPanel account={account} online={online} />
              </div>
            </>
          )}
          {view === "users" &&
            (administrator && account.services ? (
              <UserManagement cloud={account.services} online={online} />
            ) : (
              <section className="settings-card">
                <h2>{t("Adminisztrátori hozzáférés szükséges")}</h2>
                <p>
                  {t(
                    "Ehhez az oldalhoz megerősített e-mail-cím, aktív adminisztrátori jogosultság és internetkapcsolat kell.",
                  )}
                </p>
                <button className="button" onClick={() => navigate("account")}>
                  {t("Fiók megnyitása")}
                </button>
              </section>
            ))}
          {needRefresh && (
            <div className="notice-banner">
              <span>{t("Új alkalmazásverzió érhető el.")}</span>
              <button
                className="button small"
                disabled={dirty}
                onClick={() => void updateServiceWorker(true)}
              >
                {dirty ? t("Előbb mentsd a taktikát") : t("Frissítés")}
              </button>
            </div>
          )}
          {draft &&
            (!draftOwner || draftOwner === audience) &&
            !editor &&
            (view === "library" || view === "own") && (
              <div className="notice-banner">
                <span>
                  {t("Mentett piszkozat:")}{" "}
                  <strong>{draft.title || t("Névtelen taktika")}</strong>
                </span>
                <div>
                  <button
                    className="button small"
                    onClick={() => {
                      setEditor({
                        play: draft,
                        undo: [],
                        redo: [],
                        saved: "",
                        shared: !!draftOwner,
                      });
                      setView("editor");
                    }}
                  >
                    {t("Folytatás")}
                  </button>
                  <button
                    className="icon-button"
                    aria-label={t("Piszkozat elvetése")}
                    onClick={() =>
                      setConfirm({
                        title: "Piszkozat elvetése?",
                        body: "Az el nem mentett szerkesztés törlődik.",
                        action: () => {
                          void repo!
                            .saveDraft(null, draftOwner)
                            .then(() => {
                              setDraft(null);
                              setDraftOwner(undefined);
                            })
                            .catch((e) => notice(errorText(e), true));
                        },
                      })
                    }
                  >
                    <X size={17} />
                  </button>
                </div>
              </div>
            )}
          {view === "library" && !teamMember && (
            <div className="notice-banner public-catalog-notice">
              <span>{t`Nyilvánosan ${allCatalog.length} taktika érhető el. A teljes csapatkatalógushoz meghívás és megerősített e-mail-cím szükséges.`}</span>
              <button
                className="button small"
                onClick={() => navigate("account")}
              >
                {t("Bejelentkezés")}
              </button>
            </div>
          )}
          {(view === "library" || view === "own") && (
            <>
              <section className="page-intro">
                <div>
                  <span className="eyebrow">
                    {view === "library"
                      ? t("A JÁTÉK MÖGÖTTI GONDOLAT")
                      : t("A TE JÁTÉKOD")}
                  </span>
                  <h1>
                    {view === "library" ? (
                      <>
                        {t("Minden jó támadás")}
                        <br />
                        <span>{t("egy ötlettel kezdődik.")}</span>
                      </>
                    ) : (
                      t("Saját taktikák.")
                    )}
                  </h1>
                  <p>
                    {view === "library"
                      ? t(
                          "Taktikai építőkockák, mozgássorok és döntési helyzetek.",
                        )
                      : t(
                          "A csapatodhoz alakított figurák, ezen az eszközön elmentve.",
                        )}
                  </p>
                </div>
                <div className="intro-note">
                  <span className="note-number">
                    {String(items.length).padStart(2, "0")}
                  </span>
                  <span>
                    {view === "library" ? t("szemléltető") : t("saját")}
                    <br />
                    {t("taktika")}
                  </span>
                </div>
              </section>
              <div className="catalog-toolbar">
                <div className="search-field">
                  <Search size={18} />
                  <input
                    aria-label={t("Taktikák keresése")}
                    placeholder={t("Keress taktikát, mozgást…")}
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                  />
                  {query && (
                    <button
                      className="icon-button"
                      aria-label={t("Keresés törlése")}
                      onClick={() => setQuery("")}
                    >
                      <X size={15} />
                    </button>
                  )}
                </div>
                <select
                  aria-label={t("Védekezés szűrése")}
                  value={defense}
                  onChange={(e) => setDefense(e.target.value)}
                >
                  <option value="">{t("Minden védekezés")}</option>
                  {unique(items.map((p) => p.defense)).map((d) => (
                    <option key={d} value={d}>
                      {t(d)}
                    </option>
                  ))}
                </select>
                <select
                  aria-label={t("Korosztály szűrése")}
                  value={age}
                  onChange={(e) => setAge(e.target.value)}
                >
                  <option value="">{t("Minden korosztály")}</option>
                  {unique(items.map((p) => p.ageGroup)).map((d) => (
                    <option key={d} value={d}>
                      {t(d)}
                    </option>
                  ))}
                </select>
                <button
                  className={`icon-button filter-heart ${favoritesOnly ? "chosen" : ""}`}
                  aria-label={t("Csak kedvencek")}
                  aria-pressed={favoritesOnly}
                  onClick={() => setFavoritesOnly(!favoritesOnly)}
                >
                  <Heart size={18} />
                </button>
                <button
                  className="button"
                  disabled={busy}
                  onClick={() => uploadRef.current?.click()}
                >
                  <Upload size={16} />
                  <span>{t("Import")}</span>
                </button>
              </div>
              <div className="catalog-workspace">
                <section className="catalog-list" aria-label={t("Taktikák")}>
                  <div className="list-heading">
                    <span>
                      {filtered.length} {t("taktika")}
                    </span>
                    <select
                      aria-label={t("Kategória szűrése")}
                      value={category}
                      onChange={(e) => setCategory(e.target.value)}
                    >
                      <option value="">{t("Minden kategória")}</option>
                      {unique(items.map((p) => p.category)).map((d) => (
                        <option key={d} value={d}>
                          {t(d)}
                        </option>
                      ))}
                    </select>
                  </div>
                  {filtered.map((p, i) => (
                    <article
                      className={`play-card ${selected.id === p.id ? "selected" : ""}`}
                      key={p.id}
                    >
                      <button
                        className="card-select"
                        onClick={() => {
                          setSelected(p);
                          setPlaying(false);
                          setTime(0);
                          setRoute([p.entryPhaseId]);
                          setIndex(0);
                          if (matchMedia("(max-width: 950px)").matches)
                            requestAnimationFrame(() =>
                              document
                                .querySelector(".play-detail")
                                ?.scrollIntoView({
                                  behavior: "smooth",
                                  block: "start",
                                }),
                            );
                        }}
                        aria-label={t`${playText(p, p.title)} megnyitása`}
                      >
                        <div className="card-top">
                          <span className="card-index">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <span className="category-label">
                            {playText(p, p.category)}
                          </span>
                          <span
                            className={`difficulty difficulty-${p.difficulty === "Kezdő" ? "easy" : p.difficulty === "Haladó" ? "hard" : "medium"}`}
                            title={t(p.difficulty)}
                          >
                            <i />
                            <i />
                            <i />
                          </span>
                        </div>
                        <h3>{playText(p, p.title)}</h3>
                        <div className="card-bottom">
                          <span>
                            {t(p.defense)} {t("ellen")}
                          </span>
                          <span>{t(p.ageGroup)}</span>
                          <span>
                            {p.phases.length} {t("fázis")}
                          </span>
                          <ChevronRight size={16} />
                        </div>
                      </button>
                      <button
                        className="card-favorite icon-button"
                        aria-label={t`${playText(p, p.title)} ${library.favorites.includes(p.id) ? "eltávolítása a kedvencekből" : "kedvencekhez adása"}`}
                        aria-pressed={library.favorites.includes(p.id)}
                        disabled={busy}
                        onClick={() => void favorite(p.id)}
                      >
                        <Heart
                          size={16}
                          fill={
                            library.favorites.includes(p.id)
                              ? "currentColor"
                              : "none"
                          }
                        />
                      </button>
                    </article>
                  ))}
                  {!filtered.length && (
                    <div className="empty-state">
                      <FolderOpen size={34} />
                      <h3>
                        {items.length
                          ? t("Nincs találat")
                          : view === "library"
                            ? t("Taktikatár megnyitása…")
                            : t("Az első saját figurád helye")}
                      </h3>
                      <p>
                        {items.length
                          ? t("Próbálj más keresést vagy töröld a szűrőket.")
                          : view === "library"
                            ? t(cloudStatus || "Taktikatár megnyitása…")
                            : t(
                                "Indulj egy mintából, vagy készíts új taktikát.",
                              )}
                      </p>
                      <button
                        className="button"
                        onClick={() =>
                          items.length
                            ? (setQuery(""),
                              setDefense(""),
                              setAge(""),
                              setCategory(""),
                              setFavoritesOnly(false))
                            : openEditor(newLocalPlay(), false, true)
                        }
                      >
                        {items.length ? t("Szűrők törlése") : t("Új taktika")}
                      </button>
                    </div>
                  )}
                </section>
                {items.length > 0 && (
                  <section className="play-detail">
                    <div className="detail-header">
                      <div>
                        <span className="eyebrow">
                          {owned ? t("SAJÁT TAKTIKA") : t("TAKTIKAI MINTA")}
                        </span>
                        <h2>{playText(selected, selected.title)}</h2>
                      </div>
                      <button
                        className="icon-button"
                        title={t("JSON exportálása")}
                        aria-label={t("Kiválasztott taktika exportálása")}
                        onClick={() =>
                          void doExport("handball-tactic.json", selected)
                        }
                      >
                        <ArrowDownToLine size={19} />
                      </button>
                    </div>
                    <div className="detail-tags">
                      <span>
                        {t(selected.defense)} {t("ellen")}
                      </span>
                      <span>{t(selected.ageGroup)}</span>
                      <span>{t(selected.difficulty)}</span>
                      <span>{selected.formation}</span>
                    </div>
                    {renderBoard(false)}
                    <div className="detail-description">
                      <p>{playText(selected, selected.description)}</p>
                      <div className="coaching">
                        <span className="eyebrow">{t("EDZŐI SZEMPONTOK")}</span>
                        {selected.coachingPoints.map((p, i) => (
                          <p key={i}>
                            <Check size={14} />
                            {playText(selected, p)}
                          </p>
                        ))}
                      </div>
                      {!owned && (
                        <p className="sample-note">
                          {t(
                            "Szemléltető minta. A csapat és a korosztály igényei szerint, edzői ellenőrzéssel használd.",
                          )}
                        </p>
                      )}
                      {selected.sources.some((s) =>
                        /^https?:\/\//i.test(s.url),
                      ) && (
                        <div className="teaching-sources">
                          <span className="eyebrow">
                            {t("KAPCSOLÓDÓ TANANYAGOK")}
                          </span>
                          <p>
                            {t(
                              "Az animáció saját szemléltető feldolgozás; a hivatkozások a kapcsolódó taktikai alapelvekhez vezetnek.",
                            )}
                          </p>
                          {selected.sources
                            .filter((s) => /^https?:\/\//i.test(s.url))
                            .map((s) => (
                              <a
                                key={s.url}
                                href={s.url}
                                target="_blank"
                                rel="noopener noreferrer"
                              >
                                {playText(selected, s.title)}
                                <ArrowRight size={13} />
                              </a>
                            ))}
                        </div>
                      )}
                      <div className="detail-buttons">
                        {writer && !owned && (
                          <>
                            <button
                              className="button"
                              disabled={publishing}
                              onClick={() => openEditor(selected, true)}
                            >
                              <MousePointer2 size={17} />
                              {t("Közös taktika szerkesztése")}
                            </button>
                            <button
                              className="button danger-text"
                              disabled={publishing || allCatalog.length <= 1}
                              onClick={() => requestPublication(selected, true)}
                            >
                              {t("Eltávolítás a közös tárból")}
                            </button>
                          </>
                        )}
                        {writer && owned && (
                          <button
                            className="button"
                            disabled={publishing}
                            onClick={() => requestPublication(selected)}
                          >
                            {publishing
                              ? t("Közzététel…")
                              : t("Közzététel a közös tárban")}
                          </button>
                        )}
                        <button
                          className="button primary"
                          onClick={() => openEditor(selected, owned)}
                        >
                          {owned ? (
                            <MousePointer2 size={17} />
                          ) : (
                            <Copy size={17} />
                          )}
                          <span>
                            {owned
                              ? t("Taktika szerkesztése")
                              : t("Saját változat készítése")}
                          </span>
                        </button>
                        {owned && (
                          <button
                            className="button danger-text"
                            disabled={busy}
                            onClick={() =>
                              setConfirm({
                                title: "Taktika törlése?",
                                body: `„${playText(selected, selected.title)}” törlődik erről az eszközről. Az exportált fájlok megmaradnak.`,
                                action: () => {
                                  void persist({
                                    ...library,
                                    plays: library.plays.filter(
                                      (p) => p.id !== selected.id,
                                    ),
                                    favorites: library.favorites.filter(
                                      (id) => id !== selected.id,
                                    ),
                                  })
                                    .then(() => {
                                      setSelected(
                                        allCatalog[0] ?? emptySelection,
                                      );
                                      if (editor?.play.id === selected.id) {
                                        setEditor(null);
                                        void repo!.saveDraft(null);
                                        setDraft(null);
                                      }
                                      notice("A taktika törölve.");
                                    })
                                    .catch((e) => notice(errorText(e), true));
                                },
                              })
                            }
                          >
                            <Trash2 size={17} />
                            {t("Törlés")}
                          </button>
                        )}
                      </div>
                    </div>
                  </section>
                )}
              </div>
            </>
          )}
          {view === "editor" && editor && (
            <>
              <section className="editor-heading">
                <div>
                  <span className="eyebrow">{t("SAJÁT TAKTIKA")}</span>
                  <input
                    className="title-input"
                    aria-label={t("Taktika neve")}
                    value={editor.play.title}
                    maxLength={120}
                    onChange={(e) =>
                      edit((p) => {
                        p.title = e.target.value;
                      })
                    }
                  />
                  <p>
                    <span className="status-dot ready" />
                    {t(draftStatus || "Helyi piszkozat")}
                    {dirty ? t(" · nem mentett változtatások") : ""}
                  </p>
                </div>
                <div className="editor-heading-actions">
                  {writer && (
                    <button
                      className="button"
                      disabled={busy || publishing || !!problems.length}
                      onClick={() => requestPublication(editor.play)}
                    >
                      <Upload size={17} />
                      {publishing
                        ? t("Közzététel…")
                        : t("Közzététel a közös tárban")}
                    </button>
                  )}
                  <button
                    className="icon-button"
                    aria-label={t("Visszavonás")}
                    disabled={!editor.undo.length}
                    onClick={() => {
                      const prev = editor.undo.at(-1)!;
                      setEditor({
                        ...editor,
                        play: prev,
                        undo: editor.undo.slice(0, -1),
                        redo: [editor.play, ...editor.redo],
                      });
                      setPlaying(false);
                      setTime(0);
                      setRoute([prev.entryPhaseId]);
                      setIndex(0);
                    }}
                  >
                    <Undo2 size={20} />
                  </button>
                  <button
                    className="icon-button"
                    aria-label={t("Ismétlés")}
                    disabled={!editor.redo.length}
                    onClick={() => {
                      const next = editor.redo[0];
                      setEditor({
                        ...editor,
                        play: next,
                        undo: [...editor.undo, editor.play],
                        redo: editor.redo.slice(1),
                      });
                      setRoute([next.entryPhaseId]);
                      setIndex(0);
                    }}
                  >
                    <Redo2 size={20} />
                  </button>
                  <button
                    className="button primary"
                    disabled={busy || !!problems.length}
                    onClick={() => void saveEditor()}
                  >
                    <Save size={17} />
                    {busy ? t("Mentés…") : t("Taktika mentése")}
                  </button>
                </div>
              </section>
              <div className="editor-workspace">
                <section className="editor-canvas">
                  <div className="drawing-toolbar">
                    <button
                      className={`tool-button ${tool === "place" ? "active" : ""}`}
                      onClick={() => setTool("place")}
                    >
                      <MousePointer2 size={17} />
                      {index === 0 ? t("Kezdőhelyzet") : t("Kijelölés")}
                    </button>
                    {actionKinds.map((k) => (
                      <button
                        key={k}
                        className={`tool-button ${tool === k ? "active" : ""}`}
                        onClick={() => {
                          setTool(k);
                          setPlaying(false);
                          setTime(0);
                        }}
                      >
                        {t(actionLabels[k])}
                      </button>
                    ))}
                  </div>
                  <div className="editor-hint">
                    <CircleHelp size={15} />
                    {tool === "place"
                      ? index === 0
                        ? t(
                            "Húzd a játékosokat a kezdőhelyükre. Billentyűzettel: kijelölés után a nyilakkal.",
                          )
                        : t(
                            "Válassz játékost, majd mozgástípust a folytatás szerkesztéséhez.",
                          )
                      : tool === "pass"
                        ? t(
                            "Válaszd a labdás játékost, majd koppints a passz céljátékosára.",
                          )
                        : t(
                            "Válaszd a játékost, majd koppints a mozgás vagy lövés végpontjára a pályán.",
                          )}
                  </div>
                  {renderBoard(true)}
                  <div className="editor-phase-list">
                    <span className="eyebrow">
                      {t("FÁZISOK ÉS LEHETŐSÉGEK")}
                    </span>
                    <div>
                      {editor.play.phases.map((p, i) => (
                        <button
                          className={`phase-chip ${phase.id === p.id ? "active" : ""}`}
                          key={p.id}
                          onClick={() => choosePhase(p.id)}
                        >
                          <span>{i + 1}</span>
                          {playText(play, p.title)}
                        </button>
                      ))}
                      <button
                        className="button small"
                        disabled={
                          phase.next.length >= 8 ||
                          editor.play.phases.length >= 100
                        }
                        onClick={addPhase}
                      >
                        <Plus size={15} />
                        {t("Új folytatás")}
                      </button>
                    </div>
                  </div>
                </section>
                <aside className="inspector">
                  <details>
                    <summary>{t("Angol fordítás")}</summary>
                    <div className="inspector-fields">
                      <p className="small-text muted">
                        {t(
                          "Az eredeti szövegek mellett itt adhatod meg az angol változatot. A hiányzó fordításnál az eredeti szöveg jelenik meg.",
                        )}
                      </p>
                      {unique([
                        editor.play.title,
                        editor.play.description,
                        editor.play.category,
                        ...editor.play.tags,
                        ...editor.play.coachingPoints,
                        ...editor.play.phases.flatMap((ph) => [
                          ph.title,
                          ph.note,
                          ...ph.next.map((n) => n.label),
                        ]),
                      ])
                        .filter(Boolean)
                        .map((text) => (
                          <Field key={text} label={text}>
                            <textarea
                              aria-label={`${t("Angol fordítás")}: ${text}`}
                              rows={2}
                              maxLength={3000}
                              value={
                                editor.play.english?.[translationKey(text)] ??
                                ""
                              }
                              onChange={(e) =>
                                edit((p) => {
                                  p.english = {
                                    ...p.english,
                                    [translationKey(text)]: e.target.value,
                                  };
                                })
                              }
                            />
                          </Field>
                        ))}
                    </div>
                  </details>
                  <details open>
                    <summary>{t("Taktika adatai")}</summary>
                    <div className="inspector-fields">
                      {writer && (
                        <div className="catalog-access-field">
                          <label className="check-field">
                            <input
                              type="checkbox"
                              checked={editor.play.requiresAuth}
                              onChange={(e) =>
                                edit((p) => {
                                  p.requiresAuth = e.target.checked;
                                })
                              }
                            />
                            {t("Bejelentkezés szükséges")}
                          </label>
                          <p className="small-text muted">
                            {t(
                              "A közös tárban legfeljebb 5 taktika lehet nyilvános. A beállítás közzétételkor lép életbe.",
                            )}
                          </p>
                          <p className="small-text">
                            {t("Nyilvános taktikák:")}{" "}
                            {allCatalog.filter((p) => !p.requiresAuth).length} /
                            5
                          </p>
                        </div>
                      )}
                      <Field label={t("Leírás")}>
                        <textarea
                          value={editor.play.description}
                          maxLength={3000}
                          rows={2}
                          onChange={(e) =>
                            edit((p) => {
                              p.description = e.target.value;
                            })
                          }
                        />
                      </Field>
                      <div className="field-grid">
                        <Field label={t("Védekezés")}>
                          <select
                            value={editor.play.defense}
                            onChange={(e) =>
                              edit((p) => {
                                p.defense = e.target.value;
                              })
                            }
                          >
                            {[
                              "6:0",
                              "5:1",
                              "3:2:1",
                              "5:0",
                              "Emberfogás",
                              "Vegyes",
                              "Rendezetlen",
                            ].map((d) => (
                              <option key={d} value={d}>
                                {t(d)}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <Field label={t("Korosztály")}>
                          <select
                            value={editor.play.ageGroup}
                            onChange={(e) =>
                              edit((p) => {
                                p.ageGroup = e.target.value;
                              })
                            }
                          >
                            {["U10", "U12", "U14", "U16", "U18", "Felnőtt"].map(
                              (d) => (
                                <option key={d} value={d}>
                                  {t(d)}
                                </option>
                              ),
                            )}
                          </select>
                        </Field>
                        <Field label={t("Nehézség")}>
                          <select
                            value={editor.play.difficulty}
                            onChange={(e) =>
                              edit((p) => {
                                p.difficulty = e.target
                                  .value as Play["difficulty"];
                              })
                            }
                          >
                            {["Kezdő", "Középhaladó", "Haladó"].map((d) => (
                              <option key={d} value={d}>
                                {t(d)}
                              </option>
                            ))}
                          </select>
                        </Field>
                        <Field label={t("Kategória")}>
                          <select
                            value={editor.play.category}
                            onChange={(e) =>
                              edit((p) => {
                                p.category = e.target.value;
                              })
                            }
                          >
                            {unique([
                              "Saját taktika",
                              ...allCatalog.map((p) => p.category),
                              editor.play.category,
                            ]).map((d) => (
                              <option key={d} value={d}>
                                {t(d)}
                              </option>
                            ))}
                          </select>
                        </Field>
                      </div>
                      <div className="field-grid">
                        <Field label={t("Pálya")}>
                          <select
                            value={editor.play.court}
                            onChange={(e) =>
                              edit((p) => {
                                p.court = e.target.value as Play["court"];
                                if (p.court === "half") {
                                  p.actors.forEach(
                                    (a) =>
                                      (a.position.y = Math.min(
                                        a.position.y,
                                        19.7,
                                      )),
                                  );
                                  p.phases.forEach((ph) =>
                                    ph.actions.forEach((a) =>
                                      a.path.forEach(
                                        (pt) => (pt.y = Math.min(pt.y, 19.7)),
                                      ),
                                    ),
                                  );
                                }
                              })
                            }
                          >
                            <option value="half">{t("Félpálya")}</option>
                            <option value="full">{t("Egész pálya")}</option>
                          </select>
                        </Field>
                        <Field label={t("Felállás")}>
                          <input
                            value={editor.play.formation}
                            maxLength={40}
                            onChange={(e) =>
                              edit((p) => {
                                p.formation = e.target.value;
                              })
                            }
                          />
                        </Field>
                      </div>
                      <Field label={t("Kezdő labdabirtokos")}>
                        <select
                          value={editor.play.ballOwnerId}
                          onChange={(e) =>
                            edit((p) => {
                              p.ballOwnerId = e.target.value;
                            })
                          }
                        >
                          {editor.play.actors.map((a) => (
                            <option key={a.id} value={a.id}>
                              {t(a.label)} ({a.id})
                            </option>
                          ))}
                        </select>
                      </Field>
                    </div>
                  </details>
                  <details open>
                    <summary>{t("Játékosok")}</summary>
                    <div className="inspector-fields">
                      <div className="roster">
                        {editor.play.actors.map((a) => (
                          <button
                            className={`roster-token ${a.team} ${a.id === selectedActor ? "active" : ""}`}
                            key={a.id}
                            onClick={() => setSelectedActor(a.id)}
                          >
                            {t(a.label)}
                          </button>
                        ))}
                      </div>
                      <div className="field-grid">
                        <Field label={t("Kijelölt jelölése")}>
                          <input
                            aria-label={t("Játékos jelölése")}
                            value={
                              editor.play.actors.find(
                                (a) => a.id === selectedActor,
                              )?.label ?? ""
                            }
                            maxLength={12}
                            onChange={(e) =>
                              edit((p) => {
                                const a = p.actors.find(
                                  (a) => a.id === selectedActor,
                                );
                                if (a)
                                  a.label = e.target.value || a.id.slice(0, 12);
                              })
                            }
                          />
                        </Field>
                        <Field label={t("Új játékos")}>
                          <select
                            disabled={editor.play.actors.length >= 30}
                            value=""
                            onChange={(e) => {
                              if (!e.target.value) return;
                              const id = uid();
                              edit((p) =>
                                p.actors.push({
                                  id,
                                  label:
                                    e.target.value === "attack"
                                      ? "T"
                                      : e.target.value === "defense"
                                        ? "V"
                                        : "K",
                                  team: e.target.value as
                                    "attack" | "defense" | "keeper",
                                  position: { x: 10, y: 15 },
                                }),
                              );
                              setSelectedActor(id);
                            }}
                          >
                            <option value="">{t("Hozzáadás…")}</option>
                            <option value="attack">{t("Támadó")}</option>
                            <option value="defense">{t("Védő")}</option>
                            <option value="keeper">{t("Kapus")}</option>
                          </select>
                        </Field>
                      </div>
                      <button
                        className="text-button danger-text"
                        disabled={editor.play.actors.length <= 1}
                        onClick={() => {
                          const next = editor.play.actors.find(
                            (a) => a.id !== selectedActor,
                          )!;
                          edit((p) => {
                            p.actors = p.actors.filter(
                              (a) => a.id !== selectedActor,
                            );
                            p.phases.forEach(
                              (ph) =>
                                (ph.actions = ph.actions.filter(
                                  (a) =>
                                    a.actorId !== selectedActor &&
                                    a.targetId !== selectedActor,
                                )),
                            );
                            if (p.ballOwnerId === selectedActor)
                              p.ballOwnerId = next.id;
                          });
                          setSelectedActor(next.id);
                        }}
                      >
                        {t("Kijelölt játékos eltávolítása")}
                      </button>
                    </div>
                  </details>
                  <details open>
                    <summary>{t("Aktuális fázis")}</summary>
                    <div className="inspector-fields">
                      <Field label={t("Fázis neve")}>
                        <input
                          value={phase.title}
                          maxLength={120}
                          onChange={(e) =>
                            edit((p) => {
                              p.phases.find((ph) => ph.id === phase.id)!.title =
                                e.target.value || "Fázis";
                            })
                          }
                        />
                      </Field>
                      <Field label={t("Időtartam (másodperc)")}>
                        <input
                          type="number"
                          min=".5"
                          max="60"
                          step=".5"
                          value={phase.duration}
                          onChange={(e) =>
                            edit((p) => {
                              p.phases.find(
                                (ph) => ph.id === phase.id,
                              )!.duration = Number(e.target.value) || 0.5;
                            })
                          }
                        />
                      </Field>
                      <Field label={t("Mit figyeljen a játékos?")}>
                        <textarea
                          value={phase.note}
                          rows={2}
                          maxLength={2000}
                          onChange={(e) =>
                            edit((p) => {
                              p.phases.find((ph) => ph.id === phase.id)!.note =
                                e.target.value;
                            })
                          }
                        />
                      </Field>
                      <span className="eyebrow">
                        {t("MŰVELETEK ·")}
                        {phase.actions.length}
                      </span>
                      {phase.actions.map((a) => (
                        <div
                          className={`action-row ${selectedAction === a.id ? "active" : ""}`}
                          key={a.id}
                        >
                          <button
                            className="action-select"
                            onClick={() => {
                              setSelectedAction(a.id);
                              setSelectedActor(a.actorId);
                            }}
                          >
                            <span>{t(actionLabels[a.kind])}</span>
                            <small>
                              {t(
                                editor.play.actors.find(
                                  (ac) => ac.id === a.actorId,
                                )?.label ?? "",
                              )}
                              {a.targetId
                                ? ` → ${t(editor.play.actors.find((ac) => ac.id === a.targetId)?.label ?? "")}`
                                : ""}
                            </small>
                          </button>
                          <button
                            className="icon-button"
                            aria-label={t`${t(actionLabels[a.kind])} törlése`}
                            onClick={() =>
                              edit((p) => {
                                p.phases.find(
                                  (ph) => ph.id === phase.id,
                                )!.actions = p.phases
                                  .find((ph) => ph.id === phase.id)!
                                  .actions.filter((ac) => ac.id !== a.id);
                              })
                            }
                          >
                            <X size={15} />
                          </button>
                          {selectedAction === a.id && (
                            <div className="action-timing">
                              <Field label={t("Kezdés (s)")}>
                                <input
                                  type="number"
                                  min="0"
                                  max="59"
                                  step=".1"
                                  value={a.start}
                                  onChange={(e) =>
                                    edit((p) => {
                                      p.phases
                                        .find((ph) => ph.id === phase.id)!
                                        .actions.find(
                                          (ac) => ac.id === a.id,
                                        )!.start = Number(e.target.value) || 0;
                                    })
                                  }
                                />
                              </Field>
                              <Field label={t("Hossz (s)")}>
                                <input
                                  type="number"
                                  min=".1"
                                  max="60"
                                  step=".1"
                                  value={a.duration}
                                  onChange={(e) =>
                                    edit((p) => {
                                      p.phases
                                        .find((ph) => ph.id === phase.id)!
                                        .actions.find(
                                          (ac) => ac.id === a.id,
                                        )!.duration =
                                        Number(e.target.value) || 0.1;
                                    })
                                  }
                                />
                              </Field>
                              <Field label={t("Útvonal (x,y; x,y)")}>
                                <input
                                  defaultValue={a.path
                                    .map((pt) => `${pt.x},${pt.y}`)
                                    .join("; ")}
                                  key={a.id}
                                  onBlur={(e) => {
                                    const pts = e.target.value
                                      .split(";")
                                      .map((s) =>
                                        s.trim().split(",").map(Number),
                                      );
                                    if (
                                      pts.length > 20 ||
                                      pts.some(
                                        (v) =>
                                          v.length !== 2 ||
                                          v.some((n) => !Number.isFinite(n)) ||
                                          v[0] < 0 ||
                                          v[0] > 20 ||
                                          v[1] < 0 ||
                                          v[1] >
                                            (play.court === "half" ? 20 : 40),
                                      )
                                    ) {
                                      notice(
                                        "Az útvonal pontjai legyenek a pályán belül: x,y; x,y.",
                                        true,
                                      );
                                      e.target.value = a.path
                                        .map((pt) => `${pt.x},${pt.y}`)
                                        .join("; ");
                                      return;
                                    }
                                    edit((p) => {
                                      p.phases
                                        .find((ph) => ph.id === phase.id)!
                                        .actions.find(
                                          (ac) => ac.id === a.id,
                                        )!.path = pts.map(([x, y]) => ({
                                        x,
                                        y,
                                      }));
                                    });
                                  }}
                                />
                              </Field>
                            </div>
                          )}
                        </div>
                      ))}
                      {!phase.actions.length && (
                        <p className="muted small-text">
                          {t(
                            "A fenti eszközökkel adj mozgást vagy passzt a pályához.",
                          )}
                        </p>
                      )}
                      {!!phase.next.length && (
                        <>
                          <span className="eyebrow">{t("FOLYTATÁSOK")}</span>
                          {phase.next.map((n, i) => (
                            <Field
                              label={
                                editor.play.phases.find(
                                  (ph) => ph.id === n.phaseId,
                                )?.title ?? t("Folytatás")
                              }
                              key={n.phaseId}
                            >
                              <input
                                value={n.label}
                                maxLength={120}
                                onChange={(e) =>
                                  edit((p) => {
                                    p.phases.find(
                                      (ph) => ph.id === phase.id,
                                    )!.next[i].label =
                                      e.target.value || "Folytatás";
                                  })
                                }
                              />
                            </Field>
                          ))}
                        </>
                      )}
                      {phase.id !== play.entryPhaseId &&
                        phase.next.length === 0 && (
                          <button
                            className="text-button danger-text"
                            onClick={() => {
                              edit((p) => {
                                p.phases = p.phases.filter(
                                  (ph) => ph.id !== phase.id,
                                );
                                p.phases.forEach(
                                  (ph) =>
                                    (ph.next = ph.next.filter(
                                      (n) => n.phaseId !== phase.id,
                                    )),
                                );
                              });
                              setRoute([play.entryPhaseId]);
                              setIndex(0);
                            }}
                          >
                            {t("Fázis eltávolítása")}
                          </button>
                        )}
                    </div>
                  </details>
                  <details>
                    <summary>{t("Edzői szempontok")}</summary>
                    <div className="inspector-fields">
                      <Field label={t("Soronként egy szempont")}>
                        <textarea
                          rows={4}
                          value={editor.play.coachingPoints.join("\n")}
                          onChange={(e) =>
                            edit((p) => {
                              p.coachingPoints = e.target.value.split("\n");
                            })
                          }
                        />
                      </Field>
                    </div>
                  </details>
                  {!!problems.length && (
                    <div className="validation-box" role="status">
                      <strong>{t("Mentés előtt javítsd:")}</strong>
                      {unique(problems).map((e, i) => (
                        <p key={i}>{t(e)}</p>
                      ))}
                    </div>
                  )}
                  <button
                    className="button"
                    onClick={() =>
                      void doExport("handball-draft.json", editor.play)
                    }
                  >
                    <Download size={16} />
                    {t("Piszkozat exportálása")}
                  </button>
                  <button
                    className="text-button danger-text"
                    onClick={() =>
                      setConfirm({
                        title: "Szerkesztés bezárása?",
                        body: "A mentett taktika megmarad. Az aktuális piszkozatot elvetjük.",
                        action: () => {
                          setEditor(null);
                          setView("own");
                          void repo!
                            .saveDraft(
                              null,
                              editor.shared ? audience : undefined,
                            )
                            .then(() => {
                              setDraft(null);
                              setDraftOwner(undefined);
                            })
                            .catch((e) => notice(errorText(e), true));
                        },
                      })
                    }
                  >
                    {t("Piszkozat elvetése")}
                  </button>
                </aside>
              </div>
            </>
          )}
          {view === "settings" && (
            <>
              <section className="page-intro">
                <div>
                  <span className="eyebrow">{t("MINDIG KÉZNÉL")}</span>
                  <h1>{t("A te műhelyed.")}</h1>
                  <p>
                    {t(
                      "Telepítés, biztonsági mentés és a taktikatár frissítése.",
                    )}
                  </p>
                </div>
              </section>
              <div className="settings-grid">
                <section className="settings-card">
                  <Download size={25} />
                  <h2>{t("Telepítsd az alkalmazást")}</h2>
                  <p>
                    {t("A kezdőképernyőről gyorsan elérheted, edzésen is.")}
                  </p>
                  <ol>
                    <li>
                      <strong>{t("iPhone és iPad:")}</strong>
                      {t("Safari → Megosztás → Hozzáadás a főképernyőhöz.")}
                    </li>
                    <li>
                      <strong>{t("Android:")}</strong>
                      {t(
                        "Chrome → Menü → Alkalmazás telepítése / Hozzáadás a kezdőképernyőhöz.",
                      )}
                    </li>
                    <li>
                      <strong>{t("Asztali gép:")}</strong>
                      {t("a böngésző címsorában válaszd a telepítést.")}
                    </li>
                  </ol>
                  <button
                    className="button primary"
                    onClick={() => void installApp()}
                  >
                    <Download size={17} />
                    {t("Telepítés")}
                  </button>
                  <div className="settings-status">
                    <span
                      className={`status-dot ${offlineReady ? "ready" : ""}`}
                    />
                    {offlineReady
                      ? t("A jelenlegi verzió offline is elérhető.")
                      : t(
                          "Az offline használat az első online betöltés után készül elő.",
                        )}
                  </div>
                </section>
                <section className="settings-card">
                  <Shield size={25} />
                  <h2>{t("Helyi mentés")}</h2>
                  <p>
                    {t(
                      "A saját taktikák ezen az eszközön maradnak. A böngésző adatainak törlése a helyi mentéseket is törölheti, ezért időnként exportáld őket.",
                    )}
                  </p>
                  <div className="settings-status">
                    {library.plays.length}
                    {t("saját taktika ·")} {library.favorites.length}
                    {t("kedvenc")}
                  </div>
                  <button
                    className="button"
                    onClick={() =>
                      void doExport("handball-backup.json", {
                        schemaVersion: 1,
                        plays: library.plays,
                      })
                    }
                    disabled={!library.plays.length}
                  >
                    <Download size={17} />
                    {t("Összes saját taktika exportálása")}
                  </button>
                  <button
                    className="button"
                    disabled={busy}
                    onClick={() => uploadRef.current?.click()}
                  >
                    <Upload size={17} />
                    {t("Taktikák importálása")}
                  </button>
                  <button
                    className="text-button"
                    onClick={() =>
                      void navigator.storage
                        ?.persist?.()
                        .then((ok) =>
                          notice(
                            ok
                              ? "A böngésző engedélyezte a tartós tárolást."
                              : "A tartós tárolás nem engedélyezhető. A fájlos biztonsági mentés továbbra is használható.",
                          ),
                        )
                        .catch((e) => notice(errorText(e), true))
                    }
                  >
                    {t("Tartós helyi tárolás kérése")}
                  </button>
                </section>
                <section className="settings-card">
                  <Wifi size={25} />
                  <h2>{t("Központi taktikatár")}</h2>
                  <p>
                    {account.services
                      ? t(
                          "A Firebase taktikatár induláskor és visszacsatlakozáskor frissül. Másik katalógushoz adj meg HTTPS-címet.",
                        )
                      : t("Opcionális HTTP-frissítés.")}{" "}
                    {t(
                      "A saját változatok megmaradnak, a letöltött katalógus offline is elérhető.",
                    )}
                  </p>
                  <Field label={t("Másik katalógus HTTPS-címe (opcionális)")}>
                    <input
                      type="url"
                      placeholder={t("https://…/catalog/catalog.json")}
                      value={catalogUrl}
                      onChange={(e) => setCatalogUrl(e.target.value)}
                    />
                  </Field>
                  <p className="small-text muted">
                    {t("Tartalomverzió:")}
                    {activeCatalog.contentVersion} ·{" "}
                    {activeCatalog === catalog
                      ? t("Letöltött katalógus")
                      : t("Beépített mintatár")}
                  </p>
                  <button
                    className="button primary"
                    disabled={
                      (!catalogUrl.trim() && !account.services) ||
                      updating ||
                      busy ||
                      publishing ||
                      !online
                    }
                    onClick={() => void updateCatalog()}
                  >
                    <Download size={17} />
                    {updating
                      ? t("Ellenőrzés és frissítés…")
                      : t("Taktikatár frissítése")}
                  </button>
                  {cloudStatus && <p role="status">{t(cloudStatus)}</p>}
                </section>
              </div>
            </>
          )}
        </main>
        <footer className="footer">
          <span>{t("Gondolkodj játékban.")}</span>
          <span>{t("HANDBALL PLAYLAB")}</span>
        </footer>
      </div>
      {message && (
        <div
          className={`toast ${message.error ? "error" : ""}`}
          role={message.error ? "alert" : "status"}
        >
          <span>{t(message.text)}</span>
          <button
            className="icon-button"
            aria-label={t("Értesítés bezárása")}
            onClick={() => setMessage(null)}
          >
            <X size={17} />
          </button>
        </div>
      )}
      {confirm && (
        <div className="modal-backdrop">
          <section
            className="modal"
            role="dialog"
            aria-modal="true"
            aria-labelledby="confirmation-title"
            onKeyDown={(e) => {
              if (e.key === "Escape") setConfirm(null);
              if (e.key === "Tab") {
                const buttons = Array.from(
                  e.currentTarget.querySelectorAll<HTMLButtonElement>("button"),
                );
                const first = buttons[0],
                  last = buttons.at(-1);
                if (e.shiftKey && document.activeElement === first) {
                  e.preventDefault();
                  last?.focus();
                } else if (!e.shiftKey && document.activeElement === last) {
                  e.preventDefault();
                  first?.focus();
                }
              }
            }}
          >
            <h2 id="confirmation-title">{t(confirm.title)}</h2>
            <p>{t(confirm.body)}</p>
            <div>
              <button
                className="button"
                autoFocus
                onClick={() => setConfirm(null)}
              >
                {t("Mégse")}
              </button>
              <button
                className="button primary"
                onClick={() => {
                  confirm.action();
                  setConfirm(null);
                }}
              >
                {t("Megerősítés")}
              </button>
            </div>
          </section>
        </div>
      )}
    </div>
  );

  function renderBoard(editing: boolean) {
    return (
      <div className="board-panel" ref={boardRef}>
        <div className="board-top">
          <span>
            <span className="board-indicator" />
            {editing ? t("SZERKESZTŐ") : t("TAKTIKAI TÁBLA")}
          </span>
          <div>
            <button
              className={`icon-button ${showDefense ? "chosen" : ""}`}
              aria-label={t("Védők megjelenítése")}
              aria-pressed={showDefense}
              onClick={() => setShowDefense(!showDefense)}
            >
              <Shield size={17} />
            </button>
            <button
              className={`icon-button ${showPaths ? "chosen" : ""}`}
              aria-label={t("Útvonalak megjelenítése")}
              aria-pressed={showPaths}
              onClick={() => setShowPaths(!showPaths)}
            >
              <Activity size={17} />
            </button>
            <button
              className="icon-button"
              aria-label={focusCourt ? t("Normál nézet") : t("Pálya nagyítása")}
              onClick={() => setFocusCourt(!focusCourt)}
            >
              {focusCourt ? <X size={18} /> : <Maximize2 size={17} />}
            </button>
          </div>
        </div>
        <div
          className={`court-wrap ${play.court === "full" ? "full-court" : ""}`}
        >
          <Court
            play={play}
            scene={scene}
            actions={phase.actions}
            showPaths={showPaths}
            showDefense={showDefense}
            editing={editing}
            movable={editing && tool === "place" && index === 0 && !playing}
            selectedActor={editing ? selectedActor : undefined}
            selectedAction={selectedAction}
            onActor={(id) => {
              if (tool === "pass" && selectedActor !== id) {
                const target = play.actors.find((a) => a.id === id)!;
                if (target.team === "defense") {
                  notice("Passzt a saját csapat játékosának adj.", true);
                  return;
                }
                addAction(scene.positions[id], id);
              } else setSelectedActor(id);
            }}
            onPoint={(pt) => addAction(pt)}
            onMove={(id, pt) =>
              edit((p) => {
                p.actors.find((a) => a.id === id)!.position = pt;
              })
            }
          />
          <div className="court-legend">
            <span>
              <i className="attack-dot" />
              {t("Támadó")}
            </span>
            <span>
              <i className="defense-dot" />
              {t("Védő")}
            </span>
            <span>
              <i className="ball-dot" />
              {t("Labda")}
            </span>
          </div>
        </div>
        <div className="playback">
          <div className="phase-caption">
            <span>{String(index + 1).padStart(2, "0")}</span>
            <div>
              <strong>{playText(play, phase.title)}</strong>
              <small>
                {playing
                  ? t("Lejátszás folyamatban")
                  : time >= phase.duration
                    ? t("Fázis vége")
                    : t("Mozgássor és időzítés")}
              </small>
            </div>
            <span className="time-label">
              {time.toFixed(1)} / {phase.duration.toFixed(1)}
              {t("s")}
            </span>
          </div>
          <input
            className="timeline"
            aria-label={t("Lejátszás időpontja")}
            type="range"
            min="0"
            max={phase.duration}
            step=".01"
            value={time}
            onChange={(e) => {
              setPlaying(false);
              setTime(Number(e.target.value));
            }}
          />
          <div className="playback-buttons">
            <div>
              <button
                className="icon-button"
                aria-label={t("Lejátszás újrakezdése")}
                onClick={() => {
                  setPlaying(false);
                  setTime(0);
                  setRoute([play.entryPhaseId]);
                  setIndex(0);
                }}
              >
                <RotateCcw size={17} />
              </button>
              <button
                className="icon-button"
                aria-label={t("Előző fázis")}
                disabled={index === 0}
                onClick={() => {
                  setIndex(index - 1);
                  setTime(0);
                  setPlaying(false);
                }}
              >
                <ChevronLeft size={21} />
              </button>
              <button
                className="play-button"
                aria-label={playing ? t("Szünet") : t("Lejátszás")}
                onClick={() => {
                  if (time >= phase.duration) setTime(0);
                  setPlaying(!playing);
                }}
              >
                {playing ? (
                  <Pause size={19} fill="currentColor" />
                ) : (
                  <PlayIcon size={19} fill="currentColor" />
                )}
              </button>
              <button
                className="icon-button"
                aria-label={t("Következő fázis")}
                disabled={!route[index + 1] && phase.next.length !== 1}
                onClick={() => advance()}
              >
                <ChevronRight size={21} />
              </button>
            </div>
            <select
              aria-label={t("Lejátszási sebesség")}
              value={speed}
              onChange={(e) => {
                setPlaying(false);
                setSpeed(Number(e.target.value));
              }}
            >
              <option value=".5">0.5×</option>
              <option value="1">1×</option>
              <option value="1.5">1.5×</option>
              <option value="2">2×</option>
            </select>
          </div>
        </div>
        {!!phase.next.length && phase.next.length > 1 && (
          <div className="decisions">
            <span className="eyebrow">{t("HOGYAN REAGÁL A VÉDELEM?")}</span>
            <div>
              {phase.next.map((n) => (
                <button
                  className="button small"
                  key={n.phaseId}
                  onClick={() => advance(n.phaseId)}
                >
                  {playText(play, n.label)}
                  <ArrowRight size={14} />
                </button>
              ))}
            </div>
          </div>
        )}
        {phase.note && (
          <div className="phase-note">
            <CircleHelp size={16} />
            <p>{playText(play, phase.note)}</p>
          </div>
        )}
      </div>
    );
  }
}
