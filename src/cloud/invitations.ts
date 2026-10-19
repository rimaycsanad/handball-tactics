import { z } from "zod";
import {
  doc,
  getDocFromServer,
  getDocsFromServer,
  collection,
  query,
  where,
  limit,
  runTransaction,
  serverTimestamp,
} from "firebase/firestore";
import { roles, type Role } from "./access";
import type { CloudServices } from "./firebase";

export function invitationEmail(value: string) {
  const parsed = z.email().max(254).safeParse(value.trim().toLowerCase());
  if (!parsed.success) throw new Error("Érvényes e-mail-címet adj meg.");
  return parsed.data;
}
export async function registrationKey(email: string) {
  const bytes = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(invitationEmail(email)),
  );
  return Array.from(new Uint8Array(bytes), (b) =>
    b.toString(16).padStart(2, "0"),
  ).join("");
}
export const invitationSchema = z.object({
  role: z.enum(roles),
  registrationKey: z
    .string()
    .regex(/^[a-f0-9]{64}$/)
    .optional(),
});
export async function requireRegistrationPermit(
  cloud: CloudServices,
  value: string,
) {
  const email = invitationEmail(value);
  const permit = await getDocFromServer(
    doc(cloud.db, "registrationPermits", await registrationKey(email)),
  );
  if (!permit.exists() || permit.data().active !== true)
    throw new Error(
      "Ezzel az e-mail-címmel nincs aktív meghívás. Kérd meg a csapat adminisztrátorát, hogy vegye fel a címedet.",
    );
  return email;
}
export async function createInvitation(
  cloud: CloudServices,
  value: string,
  role: Role = "user",
) {
  const email = invitationEmail(value),
    key = await registrationKey(email);
  const identity = cloud.auth.currentUser;
  if (!identity?.emailVerified)
    throw new Error("A meghíváshoz adminisztrátori hozzáférés szükséges.");
  z.enum(roles).parse(role);
  const existing = await getDocsFromServer(
    query(collection(cloud.db, "users"), where("email", "==", email), limit(1)),
  );
  if (existing.docs.some((entry) => entry.data().admitted === true))
    throw new Error(
      "Ez a felhasználó már a csapathoz tartozik. A meglévő fiók jogosultságait módosítsd.",
    );
  const invite = doc(cloud.db, "invitations", email);
  await runTransaction(cloud.db, async (tx) => {
    if ((await tx.get(invite)).exists())
      throw new Error("Ehhez az e-mail-címhez már van függő meghívás.");
    tx.set(invite, {
      role,
      registrationKey: key,
      createdBy: identity.uid,
      createdAt: serverTimestamp(),
    });
    tx.set(doc(cloud.db, "registrationPermits", key), { active: true });
  });
}
export async function revokeInvitation(cloud: CloudServices, value: string) {
  const email = invitationEmail(value),
    ref = doc(cloud.db, "invitations", email);
  await runTransaction(cloud.db, async (tx) => {
    const invitation = await tx.get(ref);
    if (!invitation.exists()) return;
    const { registrationKey: key } = invitationSchema.parse(invitation.data());
    tx.delete(ref);
    if (key) tx.delete(doc(cloud.db, "registrationPermits", key));
  });
}
