import { useEffect, useState, type FormEvent } from "react";
import {
  collection,
  documentId,
  getDocsFromServer,
  limit,
  orderBy,
  query,
  startAfter,
  type QueryDocumentSnapshot,
} from "firebase/firestore";
import { t } from "../i18n";
import { cloudError, roles, roleLabels, type Role } from "../cloud/access";
import {
  createInvitation,
  invitationSchema,
  revokeInvitation,
} from "../cloud/invitations";
import type { CloudServices } from "../cloud/firebase";

type Invitation = { email: string; role: Role };
export function InvitationsPanel({
  cloud,
  online,
}: {
  cloud: CloudServices;
  online: boolean;
}) {
  const [email, setEmail] = useState(""),
    [role, setRole] = useState<Role>("user");
  const [entries, setEntries] = useState<Invitation[]>([]),
    [cursor, setCursor] = useState<QueryDocumentSnapshot>();
  const [hasMore, setHasMore] = useState(false),
    [loading, setLoading] = useState(false),
    [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(""),
    [error, setError] = useState("");
  async function load(append = false) {
    setLoading(true);
    try {
      const result = await getDocsFromServer(
        query(
          collection(cloud.db, "invitations"),
          orderBy(documentId()),
          ...(append && cursor ? [startAfter(cursor)] : []),
          limit(25),
        ),
      );
      const rows = result.docs.map((d) => ({
        email: d.id,
        role: invitationSchema.parse(d.data()).role,
      }));
      setEntries((current) => (append ? [...current, ...rows] : rows));
      setCursor(result.docs.at(-1));
      setHasMore(result.size === 25);
    } catch (e) {
      setError(cloudError(e));
    } finally {
      setLoading(false);
    }
  }
  useEffect(() => {
    if (online) void load();
  }, [cloud, online]);
  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await createInvitation(cloud, email, role);
      setEmail("");
      setMessage(
        "A meghívás elkészült. A csapattag ezzel az e-mail-címmel regisztrálhat.",
      );
      await load();
    } catch (e) {
      setError(cloudError(e));
    } finally {
      setBusy(false);
    }
  }
  async function revoke(value: string) {
    setBusy(true);
    setError("");
    setMessage("");
    try {
      await revokeInvitation(cloud, value);
      setMessage("A meghívást visszavontuk.");
      await load();
    } catch (e) {
      setError(cloudError(e));
    } finally {
      setBusy(false);
    }
  }
  return (
    <section className="settings-card invitation-card">
      <h2>{t("Csapattag meghívása")}</h2>
      <p>
        {t(
          "Vedd fel a csapattag e-mail-címét és kezdő szerepkörét. A hozzáférés a cím megerősítése után aktiválódik.",
        )}
      </p>
      <form className="invitation-form" onSubmit={submit}>
        <label className="field">
          <span>{t("Meghívott e-mail-címe")}</span>
          <input
            type="email"
            required
            maxLength={254}
            autoComplete="off"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            disabled={busy || !online}
          />
        </label>
        <label className="field">
          <span>{t("Kezdő szerepkör")}</span>
          <select
            aria-label={t("Kezdő szerepkör")}
            value={role}
            onChange={(e) => setRole(e.target.value as Role)}
            disabled={busy || !online}
          >
            {roles.map((value) => (
              <option key={value} value={value}>
                {t(roleLabels[value])}
              </option>
            ))}
          </select>
        </label>
        <button className="button primary" disabled={busy || !online}>
          {busy ? t("Mentés…") : t("Meghívás létrehozása")}
        </button>
      </form>
      <p className="small-text muted">
        {t(
          "Ez nem küld e-mailt. Add át a regisztrációs linket a csapattagnak; belépni csak az engedélyezett cím megerősítésével tud.",
        )}
      </p>
      <button
        className="button"
        onClick={() =>
          void navigator.clipboard
            .writeText(`${location.origin}/?register=1`)
            .then(() =>
              setMessage("A regisztrációs linket a vágólapra másoltuk."),
            )
            .catch(() =>
              setError(
                `${t("A link nem másolható. A regisztrációs cím:")} ${location.origin}/?register=1`,
              ),
            )
        }
      >
        {t("Regisztrációs link másolása")}
      </button>
      {message && <p role="status">{t(message)}</p>}
      {error && (
        <p role="alert" className="form-error">
          {t(error)}
        </p>
      )}
      <div className="users-toolbar">
        <h3>{t("Függő meghívások")}</h3>
        <button
          className="button"
          disabled={loading || busy || !online}
          onClick={() => void load()}
        >
          {t("Meghívások frissítése")}
        </button>
      </div>
      <div className="users-list">
        {entries.map((invitation) => (
          <article className="invitation-row" key={invitation.email}>
            <div>
              <strong>{invitation.email}</strong>
              <span>{t(roleLabels[invitation.role])}</span>
            </div>
            <button
              className="button danger-text"
              aria-label={t`Meghívás visszavonása: ${invitation.email}`}
              disabled={busy || !online}
              onClick={() => void revoke(invitation.email)}
            >
              {t("Meghívás visszavonása")}
            </button>
          </article>
        ))}
      </div>
      {!entries.length && !loading && <p>{t("Nincs függő meghívás.")}</p>}
      {loading && <p role="status">{t("Meghívások betöltése…")}</p>}
      {hasMore && (
        <button
          className="button"
          disabled={loading || busy || !online}
          onClick={() => void load(true)}
        >
          {t("További meghívások")}
        </button>
      )}
    </section>
  );
}
