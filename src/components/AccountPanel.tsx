import { t } from "../i18n";
import { useState, type FormEvent } from "react";
import {
  createUserWithEmailAndPassword,
  getIdToken,
  reload,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithEmailAndPassword,
  signOut,
} from "firebase/auth";
import { LogIn, UserRound } from "lucide-react";
import { canRead, cloudError, roleLabels } from "../cloud/access";
import { requireRegistrationPermit } from "../cloud/invitations";
import type { Account } from "../cloud/use-account";

export function AccountPanel({
  account,
  online,
}: {
  account: Account;
  online: boolean;
}) {
  const [mode, setMode] = useState<"login" | "register" | "reset">(
    new URLSearchParams(location.search).get("register") === "1"
      ? "register"
      : "login",
  );
  const [email, setEmail] = useState(""),
    [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false),
    [message, setMessage] = useState(""),
    [error, setError] = useState("");
  const { services, user, profile } = account;
  const member = canRead(profile, !!user?.emailVerified);
  async function perform(action: () => Promise<unknown>, success: string) {
    if (services) services.auth.languageCode = document.documentElement.lang;
    setBusy(true);
    setMessage("");
    setError("");
    try {
      await action();
      setPassword("");
      setMessage(success);
    } catch (e) {
      setError(cloudError(e));
    } finally {
      setBusy(false);
    }
  }
  function submit(e: FormEvent) {
    e.preventDefault();
    if (!services) return;
    void perform(
      async () => {
        if (mode === "reset")
          await sendPasswordResetEmail(services.auth, email.trim());
        else if (mode === "register") {
          const approvedEmail = await requireRegistrationPermit(
            services,
            email,
          );
          const result = await createUserWithEmailAndPassword(
            services.auth,
            approvedEmail,
            password,
          );
          await sendEmailVerification(result.user);
        } else
          await signInWithEmailAndPassword(
            services.auth,
            email.trim(),
            password,
          );
      },
      mode === "reset"
        ? "Ha ehhez a címhez tartozik fiók, elküldtük a jelszó-visszaállítás lépéseit."
        : mode === "register"
          ? "A fiók elkészült. Erősítsd meg az e-mail-címed a kapott levélben, majd frissítsd a hozzáférésed."
          : "Sikeres bejelentkezés.",
    );
  }
  const refresh = () =>
    perform(async () => {
      if (!user) return;
      await reload(user);
      await getIdToken(user, true);
    }, "A fiókadatokat frissítettük.");
  return (
    <section className="settings-card account-card">
      <UserRound size={25} />
      <h2>{t("Fiók és jogosultságok")}</h2>
      {account.loading ? (
        <p>{t("Fiók betöltése…")}</p>
      ) : !services ? (
        <p>
          {t(
            "A helyi használathoz nem szükséges bejelentkezni. A felhőkapcsolat ezen a példányon még nincs beállítva.",
          )}
        </p>
      ) : user ? (
        <>
          <p>
            <strong>{user.email}</strong>
          </p>
          {member && profile ? (
            <>
              <p>{t(roleLabels[profile.role])}</p>
              <p>
                {profile.role === "user"
                  ? t(
                      "A közös taktikákat olvashatod. Írási jogosultságot adminisztrátor adhat.",
                    )
                  : t(
                      "A közös taktikatárat is szerkesztheted. A saját mentéseid ezen az eszközön maradnak.",
                    )}
              </p>
            </>
          ) : (
            <p>
              {t(
                "A teljes taktikatárhoz adminisztrátori meghívás és megerősített e-mail-cím szükséges. A nyilvános taktikák és a helyi szerkesztő továbbra is használhatók.",
              )}
            </p>
          )}
          {profile?.status === "suspended" && (
            <p role="alert">
              {t(
                "A csapathozzáférésed fel van függesztve. Keresd a csapat adminisztrátorát. A saját helyi taktikáid megmaradnak.",
              )}
            </p>
          )}
          {!user.emailVerified && (
            <>
              <p>
                {t(
                  "A meghívás elfogadásához erősítsd meg az e-mail-címed a kapott levélben.",
                )}
              </p>
              <button
                className="button"
                disabled={busy || !online}
                onClick={() =>
                  void perform(
                    () => sendEmailVerification(user),
                    "A megerősítő levelet elküldtük.",
                  )
                }
              >
                {t("Megerősítő levél újraküldése")}
              </button>
              <button
                className="button"
                disabled={busy || !online}
                onClick={() => void refresh()}
              >
                {t("Már megerősítettem az e-mail-címem")}
              </button>
            </>
          )}
          {user.emailVerified && !member && (
            <button
              className="button"
              disabled={busy || !online}
              onClick={() => void refresh()}
            >
              {t("Hozzáférés ellenőrzése")}
            </button>
          )}
          <button
            className="button"
            disabled={busy}
            onClick={() =>
              void perform(
                () => signOut(services.auth),
                "Kijelentkeztél. A helyi mentéseid megmaradtak.",
              )
            }
          >
            {t("Kijelentkezés")}
          </button>
        </>
      ) : (
        <>
          <p>
            {t(
              "Ez a csapat zárt taktikatára. Új fiókot csak az adminisztrátor által előzetesen engedélyezett e-mail-címmel hozhatsz létre.",
            )}
          </p>
          {mode === "register" && (
            <p className="notice-banner">
              {t(
                "Meghívásos regisztráció: azt az e-mail-címet add meg, amelyet az adminisztrátor felvett. A címet a regisztráció után meg kell erősítened.",
              )}
            </p>
          )}
          <form onSubmit={submit} className="account-form">
            <label className="field">
              <span>{t("E-mail-cím")}</span>
              <input
                type="email"
                autoComplete="email"
                required
                maxLength={254}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </label>
            {mode !== "reset" && (
              <label className="field">
                <span>{t("Jelszó")}</span>
                <input
                  type="password"
                  required
                  minLength={mode === "register" ? 8 : 1}
                  autoComplete={
                    mode === "register" ? "new-password" : "current-password"
                  }
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                />
              </label>
            )}
            <button className="button primary" disabled={busy || !online}>
              <LogIn size={17} />
              {busy
                ? t("Folyamatban…")
                : mode === "register"
                  ? t("Regisztráció meghívással")
                  : mode === "reset"
                    ? t("Új jelszó kérése")
                    : t("Bejelentkezés")}
            </button>
          </form>
          <div className="account-links">
            {mode !== "login" && (
              <button
                className="text-button"
                onClick={() => {
                  setMode("login");
                  setError("");
                  setMessage("");
                }}
              >
                {t("Vissza a bejelentkezéshez")}
              </button>
            )}
            {mode === "login" && (
              <>
                <button
                  className="text-button"
                  onClick={() => {
                    setMode("register");
                    setError("");
                    setMessage("");
                  }}
                >
                  {t("Meghívást kaptam")}
                </button>
                <button
                  className="text-button"
                  onClick={() => {
                    setMode("reset");
                    setError("");
                    setMessage("");
                  }}
                >
                  {t("Elfelejtett jelszó")}
                </button>
              </>
            )}
          </div>
        </>
      )}
      {!online && services && (
        <p>{t("Az online fiókműveletekhez internetkapcsolat szükséges.")}</p>
      )}
      {message && <p role="status">{t(message)}</p>}
      {(error || account.error) && (
        <p className="form-error" role="alert">
          {t(error || account.error)}
        </p>
      )}
    </section>
  );
}
