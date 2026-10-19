import { initializeApp, type FirebaseOptions } from "firebase/app";
import { connectAuthEmulator, getAuth, type Auth } from "firebase/auth";
import {
  connectFirestoreEmulator,
  getFirestore,
  type Firestore,
} from "firebase/firestore";

export type CloudServices = { auth: Auth; db: Firestore; projectId: string };
let services: Promise<CloudServices | null> | undefined;

export function getCloudServices(): Promise<CloudServices | null> {
  return (services ??= initialize());
}

async function initialize(): Promise<CloudServices | null> {
  const env = import.meta.env;
  const emulated = env.VITE_FIREBASE_EMULATORS === "true";
  if (emulated && !env.DEV)
    throw new Error("Az emulátor csak helyi fejlesztésben használható.");
  let config: FirebaseOptions | undefined;
  if (emulated) {
    config = {
      apiKey: "demo-key",
      projectId: "demo-handball-tactics",
      authDomain: "localhost",
    };
  } else if (
    env.VITE_FIREBASE_API_KEY &&
    env.VITE_FIREBASE_PROJECT_ID &&
    env.VITE_FIREBASE_APP_ID
  ) {
    config = {
      apiKey: env.VITE_FIREBASE_API_KEY,
      projectId: env.VITE_FIREBASE_PROJECT_ID,
      appId: env.VITE_FIREBASE_APP_ID,
      authDomain:
        env.VITE_FIREBASE_AUTH_DOMAIN ||
        `${env.VITE_FIREBASE_PROJECT_ID}.firebaseapp.com`,
    };
  } else if (/\.(web\.app|firebaseapp\.com)$/.test(location.hostname)) {
    const response = await fetch("/__/firebase/init.json", {
      signal: AbortSignal.timeout(10000),
    });
    if (!response.ok)
      throw new Error("A Firebase webalkalmazás beállítása nem tölthető be.");
    config = await response.json();
  }
  if (!config?.projectId || !config.apiKey) return null;
  const app = initializeApp(config);
  const auth = getAuth(app);
  const db = getFirestore(app);
  if (emulated) {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", {
      disableWarnings: true,
    });
    connectFirestoreEmulator(db, "127.0.0.1", 8085);
  }
  return { auth, db, projectId: config.projectId };
}
