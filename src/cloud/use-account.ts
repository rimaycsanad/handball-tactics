import { useEffect, useState } from "react";
import { onIdTokenChanged, type User } from "firebase/auth";
import { doc, onSnapshot } from "firebase/firestore";
import { canRead, cloudError, profileSchema, type UserProfile } from "./access";
import { getCloudServices, type CloudServices } from "./firebase";
import { claimInvitation } from "./users";

const profileKey = (uid: string) => `playlab-membership-${uid}`;
export function useAccount() {
  const [services, setServices] = useState<CloudServices | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [fresh, setFresh] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  useEffect(() => {
    let alive = true,
      stopAuth = () => {},
      stopProfile = () => {},
      previousUid: string | undefined,
      previousEmail: string | undefined;
    void getCloudServices()
      .then((cloud) => {
        if (!alive) return;
        setServices(cloud);
        if (!cloud) {
          setLoading(false);
          return;
        }
        stopAuth = onIdTokenChanged(
          cloud.auth,
          (identity) => {
            stopProfile();
            const changed =
              previousUid !== identity?.uid ||
              previousEmail !== identity?.email?.toLowerCase();
            if (previousUid && changed) {
              try {
                localStorage.removeItem(profileKey(previousUid));
              } catch {
                /* Optional offline cache. */
              }
            }
            previousUid = identity?.uid;
            previousEmail = identity?.email?.toLowerCase();
            setUser(identity);
            if (changed) {
              setProfile(null);
              setConfirmed(false);
            }
            setFresh(false);
            setError("");
            setLoading(false);
            if (!identity?.email) return;
            if (changed)
              try {
                const saved = profileSchema.safeParse(
                  JSON.parse(
                    localStorage.getItem(profileKey(identity.uid)) ?? "null",
                  ),
                );
                if (
                  saved.success &&
                  saved.data.uid === identity.uid &&
                  saved.data.email === identity.email.toLowerCase()
                )
                  setProfile(saved.data);
              } catch {
                /* A failed optional cache must not prevent login. */
              }
            let invitationChecked = false;
            const current = () =>
              alive && cloud.auth.currentUser?.uid === identity.uid;
            stopProfile = onSnapshot(
              doc(cloud.db, "users", identity.uid),
              { includeMetadataChanges: true },
              (snapshot) => {
                if (!current()) return;
                if (snapshot.exists()) {
                  const parsed = profileSchema.safeParse(snapshot.data());
                  if (!parsed.success) {
                    setProfile(null);
                    setFresh(false);
                    setConfirmed(false);
                    setError("A fiók jogosultságadatai hibásak.");
                    return;
                  }
                  setProfile(parsed.data);
                  const confirmed =
                    !snapshot.metadata.fromCache &&
                    !snapshot.metadata.hasPendingWrites;
                  setFresh(confirmed);
                  if (confirmed) {
                    setConfirmed(canRead(parsed.data, identity.emailVerified));
                    try {
                      localStorage.setItem(
                        profileKey(identity.uid),
                        JSON.stringify(parsed.data),
                      );
                    } catch {
                      /* Optional offline cache. */
                    }
                  }
                  if (canRead(parsed.data, identity.emailVerified)) {
                    setError("");
                    return;
                  }
                } else if (!snapshot.metadata.fromCache) {
                  setProfile(null);
                  setFresh(false);
                  setConfirmed(false);
                  try {
                    localStorage.removeItem(profileKey(identity.uid));
                  } catch {
                    /* Optional offline cache. */
                  }
                }
                if (
                  !snapshot.metadata.fromCache &&
                  !snapshot.metadata.hasPendingWrites &&
                  identity.emailVerified &&
                  !invitationChecked
                ) {
                  invitationChecked = true;
                  void claimInvitation(cloud)
                    .then((claimed) => {
                      if (current() && !claimed)
                        setError(
                          "Ehhez a fiókhoz nincs aktív csapathozzáférés. Kérj meghívást az adminisztrátortól.",
                        );
                    })
                    .catch((e) => {
                      if (current()) setError(cloudError(e));
                    });
                }
              },
              (e) => {
                if (current()) {
                  setFresh(false);
                  setProfile(null);
                  setConfirmed(false);
                  setError(cloudError(e));
                }
              },
            );
          },
          (e) => {
            if (alive) {
              setLoading(false);
              setError(cloudError(e));
            }
          },
        );
      })
      .catch((e) => {
        if (alive) {
          setLoading(false);
          setError(cloudError(e));
        }
      });
    return () => {
      alive = false;
      stopAuth();
      stopProfile();
    };
  }, []);
  return { services, user, profile, fresh, confirmed, loading, error };
}
export type Account = ReturnType<typeof useAccount>;
