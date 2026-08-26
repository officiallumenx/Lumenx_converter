import { initializeApp, cert, deleteApp, type App } from "firebase-admin/app";
import type { Env } from "../config/env.js";
import type { Logger } from "../logger/logger.js";

export type { App } from "firebase-admin/app";
export { deleteApp } from "firebase-admin/app";

/**
 * Validate that all required Firebase env vars are present.
 * Returns typed config or `null` when credentials are absent.
 * Throws in production if credentials are missing.
 */
function resolveFirebaseConfig(
  env: Env,
  logger: Logger,
): {
  projectId: string;
  clientEmail: string;
  privateKey: string;
} | null {
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
    privateKey: FIREBASE_PRIVATE_KEY.replace(/\\n/g, "\n"),
  };
}

/**
 * Initialize the Firebase Admin SDK.
 *
 * Returns `null` when credentials are absent in non-production environments,
 * allowing the backend to start without Firebase during local development.
 *
 * Usage (future phases):
 *   - FCM push notifications via `getMessaging(app)`
 *   - Firebase Auth token verification via `getAuth(app)`
 */
export function initFirebaseAdmin(
  env: Env,
  logger: Logger,
): App | null {
  const config = resolveFirebaseConfig(env, logger);
  if (!config) return null;

  const app = initializeApp({
    credential: cert({
      projectId: config.projectId,
      clientEmail: config.clientEmail,
      privateKey: config.privateKey,
    }),
  });

  logger.info({ msg: "firebase_initialized", projectId: config.projectId });

  return app;
}
