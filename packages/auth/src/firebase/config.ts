/**
 * Public Firebase web client configuration (never includes Admin private key).
 */

export type FirebaseWebClientConfig = {
  apiKey: string;
  authDomain: string;
  projectId: string;
  appId: string;
  messagingSenderId?: string;
  measurementId?: string;
  storageBucket?: string;
};

export type FirebaseWebConfigSource = {
  apiKey?: string;
  authDomain?: string;
  projectId?: string;
  appId?: string;
  messagingSenderId?: string;
  measurementId?: string;
  storageBucket?: string;
};

/** Read public Vite env (or injected map). Returns null when incomplete. */
export function resolveFirebaseWebConfig(
  source: FirebaseWebConfigSource = readViteFirebaseEnv(),
): FirebaseWebClientConfig | null {
  const apiKey = source.apiKey?.trim() ?? "";
  const authDomain = source.authDomain?.trim() ?? "";
  const projectId = source.projectId?.trim() ?? "";
  const appId = source.appId?.trim() ?? "";

  if (!apiKey || !authDomain || !projectId || !appId) {
    return null;
  }

  return {
    apiKey,
    authDomain,
    projectId,
    appId,
    messagingSenderId: source.messagingSenderId?.trim() || undefined,
    measurementId: source.measurementId?.trim() || undefined,
    storageBucket: source.storageBucket?.trim() || undefined,
  };
}

export function assertFirebaseWebConfig(
  source?: FirebaseWebConfigSource,
): FirebaseWebClientConfig {
  const config = resolveFirebaseWebConfig(source);
  if (!config) {
    throw new Error(
      "Firebase web client is not configured. Set VITE_FIREBASE_API_KEY, VITE_FIREBASE_AUTH_DOMAIN, VITE_FIREBASE_PROJECT_ID, and VITE_FIREBASE_APP_ID. Never put FIREBASE_PRIVATE_KEY in frontend env.",
    );
  }
  return config;
}

function readViteFirebaseEnv(): FirebaseWebConfigSource {
  const env =
    typeof import.meta !== "undefined"
      ? (import.meta as ImportMeta & { env?: Record<string, string | undefined> }).env
      : undefined;
  if (!env) return {};
  return {
    apiKey: env.VITE_FIREBASE_API_KEY,
    authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: env.VITE_FIREBASE_PROJECT_ID,
    appId: env.VITE_FIREBASE_APP_ID,
    messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    measurementId: env.VITE_FIREBASE_MEASUREMENT_ID,
    storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  };
}
