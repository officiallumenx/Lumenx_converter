/**
 * Firebase Admin SDK — FCM (Cloud Messaging) only.
 *
 * Production identity: Supabase Auth JWT → requireAuth.
 * Production OTP SMS: OTP_SMS_PROVIDER (StartMessaging / Twilio / webhook).
 *
 * Server credentials (client email + private key) must NEVER be exposed to
 * frontends or Vite `VITE_*` env. Only non-secret public hints may leave the API.
 *
 * Not used: Firebase Auth, Firestore, Realtime Database, Firebase Storage.
 */

import {
  initializeApp,
  getApps,
  getApp,
  cert,
  deleteApp,
  type App,
} from "firebase-admin/app";
import { getMessaging, type Messaging } from "firebase-admin/messaging";
import type { Env } from "../config/env.js";
import type { Logger } from "../logger/logger.js";

export type { App } from "firebase-admin/app";
export { deleteApp } from "firebase-admin/app";
export { getMessaging, type Messaging } from "firebase-admin/messaging";

/** Named Admin app — process singleton; avoids duplicate default-app init. */
export const LUMENX_FIREBASE_ADMIN_APP_NAME = "lumenx";

export type FirebaseAdminConfig = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
};

function normalizePrivateKey(raw: string): string {
  let key = raw.trim();
  if (
    (key.startsWith('"') && key.endsWith('"')) ||
    (key.startsWith("'") && key.endsWith("'"))
  ) {
    key = key.slice(1, -1);
  }
  return key.replace(/\\n/g, "\n");
}

/**
 * Validate that all required Firebase *server* env vars are present.
 * Returns typed config or `null` when credentials are absent.
 * Throws in production if credentials are missing.
 */
export function resolveFirebaseConfig(
  env: Env,
  logger: Logger,
): FirebaseAdminConfig | null {
  const { FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY } =
    env;

  const hasAll =
    FIREBASE_PROJECT_ID && FIREBASE_CLIENT_EMAIL && FIREBASE_PRIVATE_KEY;

  if (!hasAll) {
    if (env.NODE_ENV === "production" && env.FCM_WORKER_ENABLED !== false) {
      throw new Error(
        "Firebase credentials (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY) are required in production when FCM is enabled.",
      );
    }
    logger.warn({
      msg: "firebase_not_configured",
      hint: "Firebase FCM is disabled — set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY to enable push. Auth/OTP use Supabase + OTP_SMS_PROVIDER.",
    });
    return null;
  }

  return {
    projectId: FIREBASE_PROJECT_ID,
    clientEmail: FIREBASE_CLIENT_EMAIL,
    privateKey: normalizePrivateKey(FIREBASE_PRIVATE_KEY),
  };
}

/**
 * Initialize the Firebase Admin SDK (single named process app).
 * Enables FCM push via `getFirebaseMessaging`.
 *
 * Returns `null` when credentials are absent in non-production.
 * Reuses an existing named app if already initialized (safe singleton).
 */
export function initFirebaseAdmin(env: Env, logger: Logger): App | null {
  const config = resolveFirebaseConfig(env, logger);
  if (!config) return null;

  const already = getApps().find((a) => a.name === LUMENX_FIREBASE_ADMIN_APP_NAME);
  if (already) {
    logger.info({
      msg: "firebase_reused",
      projectId: config.projectId,
      messaging: true,
    });
    return already;
  }

  const app = initializeApp(
    {
      credential: cert({
        projectId: config.projectId,
        clientEmail: config.clientEmail,
        privateKey: config.privateKey,
      }),
    },
    LUMENX_FIREBASE_ADMIN_APP_NAME,
  );

  logger.info({
    msg: "firebase_initialized",
    projectId: config.projectId,
    messaging: true,
  });

  return app;
}

/** Test helper — tear down the named Admin app between suites. */
export async function resetFirebaseAdminForTests(): Promise<void> {
  const existing = getApps().find((a) => a.name === LUMENX_FIREBASE_ADMIN_APP_NAME);
  if (existing) {
    await deleteApp(existing);
  }
}

export function getFirebaseMessaging(app: App | null): Messaging | null {
  if (!app) return null;
  try {
    return getMessaging(app);
  } catch {
    return null;
  }
}

/**
 * Non-secret values safe to return to frontends / mobile clients.
 * Never includes client email or private key.
 */
export type FirebasePublicClientHints = {
  projectId: string | null;
  /** GA4 / Firebase Analytics measurement id (public). */
  analyticsMeasurementId: string | null;
  /** Hint for clients: Crashlytics is a client SDK concern. */
  crashlyticsEnabled: boolean;
};

export function getFirebasePublicClientHints(env: Env): FirebasePublicClientHints {
  return {
    projectId: env.FIREBASE_PROJECT_ID ?? null,
    analyticsMeasurementId: env.FIREBASE_ANALYTICS_MEASUREMENT_ID ?? null,
    crashlyticsEnabled: env.FIREBASE_CRASHLYTICS_ENABLED === true,
  };
}

/** Resolve named lumenx Admin app if present (no init). */
export function getLumenXFirebaseAdminApp(): App | null {
  try {
    return getApps().some((a) => a.name === LUMENX_FIREBASE_ADMIN_APP_NAME)
      ? getApp(LUMENX_FIREBASE_ADMIN_APP_NAME)
      : null;
  } catch {
    return null;
  }
}
