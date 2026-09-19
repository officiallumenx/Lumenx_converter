/**
 * Firebase Admin SDK — FCM + Auth ID-token verification.
 *
 * Architecture (Phase 1 harden / audit source of truth):
 *   Firebase Auth (interactive OTP/email) → verified ID token → map to
 *   existing LumenX user_profile → mint Supabase Auth session → requireAuth.
 *
 * Supabase Auth remains the LumenX session/identity layer (auth.users FK,
 * JWT, RBAC, RLS). Do not remove Supabase Auth from this integration.
 *
 * Server credentials (client email + private key) must NEVER be exposed to
 * frontends or Vite `VITE_*` env. Only non-secret public hints may leave the API.
 *
 * Not used: Firestore, Realtime Database, Firebase Storage for LumenX data.
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
import { getAuth, type Auth, type DecodedIdToken } from "firebase-admin/auth";
import type { Env } from "../config/env.js";
import type { Logger } from "../logger/logger.js";

export type { App } from "firebase-admin/app";
export type { DecodedIdToken } from "firebase-admin/auth";
export { deleteApp } from "firebase-admin/app";
export { getMessaging, type Messaging } from "firebase-admin/messaging";
export { getAuth, type Auth } from "firebase-admin/auth";

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
    if (env.NODE_ENV === "production") {
      throw new Error(
        "Firebase credentials (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY) are required in production.",
      );
    }
    logger.warn({
      msg: "firebase_not_configured",
      hint: "Firebase integration is disabled — set FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, and FIREBASE_PRIVATE_KEY to enable.",
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
 *
 * Enables:
 *   - FCM push via `getFirebaseMessaging`
 *   - Auth ID-token verify via `getFirebaseAuth` / `verifyFirebaseIdToken`
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
      auth: true,
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
    auth: true,
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

export function getFirebaseAuth(app: App | null): Auth | null {
  if (!app) return null;
  try {
    return getAuth(app);
  } catch {
    return null;
  }
}

export type VerifyFirebaseIdTokenOptions = {
  /** When true, rejects revoked tokens (extra Auth API round-trip). Default false. */
  checkRevoked?: boolean;
};

/**
 * Verify a Firebase Auth ID token (Authorization: Bearer &lt;idToken&gt;).
 * Throws the underlying Firebase Auth error on invalid/expired tokens.
 * Never trusts client-supplied uid/email/phone — only Admin-verified claims.
 */
export async function verifyFirebaseIdToken(
  app: App,
  idToken: string,
  opts?: VerifyFirebaseIdTokenOptions,
): Promise<DecodedIdToken> {
  const trimmed = idToken.trim();
  if (!trimmed) {
    throw Object.assign(new Error("Empty Firebase ID token"), {
      code: "auth/argument-error",
    });
  }

  const auth = getFirebaseAuth(app);
  if (!auth) {
    throw new Error("Firebase Auth is unavailable on this Admin app instance");
  }
  return auth.verifyIdToken(trimmed, opts?.checkRevoked === true);
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
