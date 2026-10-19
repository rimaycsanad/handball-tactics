import { InvitationsPanel } from "./InvitationsPanel";
import { t } from "../i18n";
import { useEffect, useState } from "react";
import {
  collection,
  doc,
  getDocsFromServer,
  limit,
  orderBy,
  query,
  serverTimestamp,
  startAfter,
  updateDoc,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import {
  cloudError,
  profileSchema,
  roleLabels,
  roles,
  type Role,
  type UserProfile,
} from "../cloud/access";
import type { CloudServices } from "../cloud/firebase";

export function UserManagement({
  cloud,
  online,
}: {
  cloud: CloudServices;
  online: boolean;
}) {
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [cursor, setCursor] = useState<QueryDocumentSnapshot>();
  const [hasMore, setHasMore] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function load(append = false) {
    setBusy(true);
    setError("");
    try {
      const constraints = [
        orderBy("email"),
        ...(append && cursor ? [startAfter(cursor)] : []),
        limit(25),
      ];
      const result = await getDocsFromServer(
        query(collection(cloud.db, "users"), ...constraints),
      );
      const page = result.docs.map((d) => profileSchema.parse(d.data()));
      setUsers((current) => (append ? [...current, ...page] : page));
      setCursor(result.docs.at(-1));
      setHasMore(result.size === 25);
    } catch (e) {
      setError(cloudError(e));
    } finally {
      setBusy(false);
    }
  }
  useEffect(() => {
    if (online) void load();
  }, [cloud, online]);
  return (
    <>
      <section className="page-intro">
        <div>
          <span className="eyebrow">{t("ADMINISZTRÁCIÓ")}</span>
          <h1>{t("Felhasználók.")}</h1>
          <p>
            {t(
              "Meghívhatod a csapattagokat, és kezelheted a regisztrált felhasználók szerepkörét és csapathozzáférését.",
            )}
          </p>
        </div>
      </section>
      <InvitationsPanel cloud={cloud} online={online} />
      <section className="settings-card users-card">
        <div className="users-toolbar">
          <h2>{t("Regisztrált felhasználók")}</h2>
          <button
            className="button"
            disabled={busy || !online}
            onClick={() => void load()}
          >
            {t("Lista frissítése")}
          </button>
        </div>
        <p>
          {t(
            "Csak előzetesen meghívott és megerősített e-mail-című csapattag kap hozzáférést. A felhasználó olvashat, a szerkesztő közzétehet, az adminisztrátor meghívásokat és jogosultságokat is kezelhet.",
          )}
        </p>
        {error && (
          <p role="alert" className="form-error">
            {t(error)}
          </p>
        )}
        {!online && (
          <p>{t("Felhasználókezeléshez internetkapcsolat szükséges.")}</p>
        )}
        <div className="users-list">
          {users.map((user) => (
            <UserRow
              key={user.uid}
              profile={user}
              cloud={cloud}
              online={online}
              onSaved={(updated) =>
                setUsers((current) =>
                  current.map((u) => (u.uid === updated.uid ? updated : u)),
                )
              }
            />
          ))}
        </div>
        {!users.length && !busy && !error && (
          <p>{t("Még nincs regisztrált felhasználó.")}</p>
        )}
        {busy && <p role="status">{t("Felhasználók betöltése…")}</p>}
        {hasMore && (
          <button
            className="button"
            disabled={busy || !online}
            onClick={() => void load(true)}
          >
            {t("További felhasználók")}
          </button>
        )}
        <p className="small-text muted">
          {t(
            "A felfüggesztés a védett taktikák olvasását és a közös szerkesztést is letiltja. A nyilvános taktikák és a saját helyi mentések elérhetők maradnak.",
          )}
        </p>
      </section>
    </>
  );
}

function UserRow({
  profile,
  cloud,
  online,
  onSaved,
}: {
  profile: UserProfile;
  cloud: CloudServices;
  online: boolean;
  onSaved: (profile: UserProfile) => void;
}) {
  const [role, setRole] = useState<Role>(profile.role);
  const [status, setStatus] = useState(profile.status);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const self = profile.uid === cloud.auth.currentUser?.uid;
  useEffect(() => {
    setRole(profile.role);
    setStatus(profile.status);
  }, [profile]);
  async function save() {
    setBusy(true);
    setMessage("");
    try {
      await updateDoc(doc(cloud.db, "users", profile.uid), {
        role,
        status,
        updatedAt: serverTimestamp(),
      });
      onSaved({ ...profile, role, status });
      setMessage("Jogosultságok mentve.");
    } catch (e) {
      setMessage(cloudError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <article className="user-row">
      <div className="user-identity">
        <strong>{profile.email}</strong>
        <span>
          {profile.displayName}
          {self ? t(" · Saját fiók") : ""}
        </span>
      </div>
      <label className="field">
        <span>
          {t("Szerepkör ·")}
          {profile.email}
        </span>
        <select
          aria-label={t`${profile.email} szerepköre`}
          value={role}
          onChange={(e) => setRole(e.target.value as Role)}
          disabled={self || busy || !online}
        >
          {roles.map((r) => (
            <option key={r} value={r}>
              {t(roleLabels[r])}
            </option>
          ))}
        </select>
      </label>
      <label className="field">
        <span>
          {t("Hozzáférés ·")}
          {profile.email}
        </span>
        <select
          aria-label={t`${profile.email} hozzáférése`}
          value={status}
          onChange={(e) => setStatus(e.target.value as UserProfile["status"])}
          disabled={self || busy || !online}
        >
          <option value="active">{t("Aktív")}</option>
          <option value="suspended">{t("Felfüggesztve")}</option>
        </select>
      </label>
      <button
        className="button"
        disabled={
          self ||
          busy ||
          !online ||
          (role === profile.role && status === profile.status)
        }
        onClick={() => void save()}
      >
        {busy ? t("Mentés…") : t("Jogosultság mentése")}
      </button>
      {message && <p role="status">{t(message)}</p>}
    </article>
  );
}
