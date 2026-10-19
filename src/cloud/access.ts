import { z } from "zod";

export const roles = ["user", "editor", "admin"] as const;
export type Role = (typeof roles)[number];
export const roleLabels: Record<Role, string> = {
  user: "Felhasználó",
  editor: "Szerkesztő",
  admin: "Adminisztrátor",
};
export const profileSchema = z.object({
  admitted: z.boolean().default(false),
  uid: z.string().min(1),
  email: z.email(),
  displayName: z.string().max(120),
  role: z.enum(roles),
  status: z.enum(["active", "suspended"]),
});
export type UserProfile = z.infer<typeof profileSchema>;

export function canRead(profile: UserProfile | null, verified: boolean) {
  return (
    !!profile && profile.admitted && profile.status === "active" && verified
  );
}

export function canWrite(
  profile: UserProfile | null,
  verified: boolean,
  fresh: boolean,
) {
  return (
    !!profile &&
    canRead(profile, verified) &&
    fresh &&
    (profile.role === "editor" || profile.role === "admin")
  );
}

export function cloudError(error: unknown): string {
  const code = (error as { code?: string })?.code;
  const messages: Record<string, string> = {
    "auth/invalid-credential": "Az e-mail-cím vagy a jelszó hibás.",
    "auth/email-already-in-use":
      "Ezzel az e-mail-címmel már van fiók. Jelentkezz be, vagy kérj új jelszót.",
    "auth/weak-password": "Legalább 8 karakteres, erősebb jelszót adj meg.",
    "auth/invalid-email": "Érvényes e-mail-címet adj meg.",
    "auth/too-many-requests":
      "Túl sok próbálkozás történt. Próbáld újra később.",
    "auth/network-request-failed":
      "A bejelentkezéshez internetkapcsolat szükséges.",
    "auth/operation-not-allowed":
      "Ez a bejelentkezési mód még nincs engedélyezve a Firebase-projektben.",
    "permission-denied":
      "Ehhez a művelethez nincs jogosultságod. Frissítsd a fiókadataidat.",
    unavailable:
      "A felhő most nem érhető el. A helyi taktikák továbbra is használhatók.",
  };
  return (
    (code && messages[code]) ||
    (error instanceof Error ? error.message : "A művelet nem sikerült.")
  );
}
