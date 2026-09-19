/**
 * Firebase Auth web client init — public config only.
 */

import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import { getAuth, type Auth } from "firebase/auth";
import {
  assertFirebaseWebConfig,
  resolveFirebaseWebConfig,
  type FirebaseWebClientConfig,
  type FirebaseWebConfigSource,
} from "./config";

let cachedApp: FirebaseApp | null = null;

export function getFirebaseApp(
  source?: FirebaseWebConfigSource,
): FirebaseApp | null {
  const config = resolveFirebaseWebConfig(source);
  if (!config) return null;
  return ensureFirebaseApp(config);
}

export function requireFirebaseApp(source?: FirebaseWebConfigSource): FirebaseApp {
  return ensureFirebaseApp(assertFirebaseWebConfig(source));
}

function ensureFirebaseApp(config: FirebaseWebClientConfig): FirebaseApp {
  if (cachedApp) return cachedApp;
  const existing = getApps();
  cachedApp =
    existing.length > 0
      ? getApp()
      : initializeApp({
          apiKey: config.apiKey,
          authDomain: config.authDomain,
          projectId: config.projectId,
          appId: config.appId,
          messagingSenderId: config.messagingSenderId,
          measurementId: config.measurementId,
          storageBucket: config.storageBucket,
        });
  return cachedApp;
}

export function getFirebaseAuth(source?: FirebaseWebConfigSource): Auth | null {
  const app = getFirebaseApp(source);
  return app ? getAuth(app) : null;
}

export function requireFirebaseAuth(source?: FirebaseWebConfigSource): Auth {
  return getAuth(requireFirebaseApp(source));
}

/** Test helper — clear singleton between unit tests. */
export function resetFirebaseAppForTests(): void {
  cachedApp = null;
}
