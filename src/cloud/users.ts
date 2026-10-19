import { doc, runTransaction, serverTimestamp } from "firebase/firestore";
import type { CloudServices } from "./firebase";
import { invitationEmail, invitationSchema } from "./invitations";

// Only the verified owner can consume an administrator's invitation. Membership,
// role and removal of the registration permit become effective in one transaction.
export async function claimInvitation(cloud: CloudServices): Promise<boolean> {
  const user = cloud.auth.currentUser;
  if (!user?.emailVerified || !user.email) return false;
  const email = invitationEmail(user.email);
  const inviteRef = doc(cloud.db, "invitations", email),
    profileRef = doc(cloud.db, "users", user.uid);
  return runTransaction(cloud.db, async (tx) => {
    const invitation = await tx.get(inviteRef);
    if (!invitation.exists()) return false;
    const profile = await tx.get(profileRef);
    if (
      profile.exists() &&
      (profile.data()?.role !== "user" || profile.data()?.status !== "active")
    )
      return false;
    const { role, registrationKey } = invitationSchema.parse(invitation.data());
    if (profile.exists())
      tx.update(profileRef, {
        role,
        admitted: true,
        updatedAt: serverTimestamp(),
      });
    else
      tx.set(profileRef, {
        uid: user.uid,
        email,
        displayName: (user.displayName || email.split("@")[0]).slice(0, 120),
        role,
        admitted: true,
        status: "active",
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    tx.delete(inviteRef);
    if (registrationKey)
      tx.delete(doc(cloud.db, "registrationPermits", registrationKey));
    return true;
  });
}
