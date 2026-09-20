/**
 * Firebase Admin / FCM foundation tests (init, messaging, public-config).
 * Auth ID-token bridge was removed in Phase 4.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { loadEnv, resetEnvCache, type Env } from "../src/config/env.js";
import { createLogger, type Logger } from "../src/logger/logger.js";
import {
  initFirebaseAdmin,
  resolveFirebaseConfig,
  getFirebasePublicClientHints,
  getFirebaseMessaging,
  resetFirebaseAdminForTests,
} from "../src/integrations/firebase.js";
import { createApp } from "../src/app.js";

let silentLogger: Logger;

beforeEach(async () => {
  resetEnvCache();
  await resetFirebaseAdminForTests();
  silentLogger = createLogger("error");
  vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  vi.spyOn(process.stderr, "write").mockImplementation(() => true);
});

afterEach(async () => {
  vi.restoreAllMocks();
  await resetFirebaseAdminForTests();
});

function makeEnv(overrides: Record<string, string | undefined> = {}): Env {
  return loadEnv({ NODE_ENV: "test", LOG_LEVEL: "error", ...overrides });
}

const FIREBASE_CREDS = {
  FIREBASE_PROJECT_ID: "test-project",
  FIREBASE_CLIENT_EMAIL: "test@test-project.iam.gserviceaccount.com",
  FIREBASE_PRIVATE_KEY:
    "-----BEGIN RSA PRIVATE KEY-----\\nMIIBogIBAAJBALR\\n-----END RSA PRIVATE KEY-----\\n",
};

describe("Firebase initialization", () => {
  it("resolveFirebaseConfig returns null when credentials are missing", () => {
    const env = makeEnv();
    expect(resolveFirebaseConfig(env, silentLogger)).toBeNull();
  });

  it("resolveFirebaseConfig returns null when only project id is set", () => {
    const env = makeEnv({ FIREBASE_PROJECT_ID: "only-project" });
    expect(resolveFirebaseConfig(env, silentLogger)).toBeNull();
  });

  it("initFirebaseAdmin returns null when not configured (non-production)", () => {
    expect(initFirebaseAdmin(makeEnv(), silentLogger)).toBeNull();
  });

  it("initFirebaseAdmin throws in production when missing configuration and FCM is enabled", () => {
    expect(() =>
      initFirebaseAdmin(makeEnv({ NODE_ENV: "production" }), silentLogger),
    ).toThrow(/Firebase credentials.*required in production/);
  });

  it("initFirebaseAdmin returns null in production when FCM worker is disabled", () => {
    expect(
      initFirebaseAdmin(
        makeEnv({ NODE_ENV: "production", FCM_WORKER_ENABLED: "false" }),
        silentLogger,
      ),
    ).toBeNull();
  });

  it("initFirebaseAdmin rejects invalid private key material", () => {
    expect(() => initFirebaseAdmin(makeEnv(FIREBASE_CREDS), silentLogger)).toThrow(
      /Failed to parse private key/,
    );
  });

  it("resolveFirebaseConfig strips surrounding quotes from private key", () => {
    const env = makeEnv({
      FIREBASE_PROJECT_ID: "quoted-project",
      FIREBASE_CLIENT_EMAIL: "svc@quoted-project.iam.gserviceaccount.com",
      FIREBASE_PRIVATE_KEY: '"-----BEGIN RSA PRIVATE KEY-----\\nABC\\n-----END RSA PRIVATE KEY-----\\n"',
    });
    const cfg = resolveFirebaseConfig(env, silentLogger);
    expect(cfg?.privateKey.startsWith("-----BEGIN")).toBe(true);
    expect(cfg?.privateKey.includes('"')).toBe(false);
  });
});

describe("FCM initialization", () => {
  it("getFirebaseMessaging returns null when Admin app is null", () => {
    expect(getFirebaseMessaging(null)).toBeNull();
  });
});

describe("Firebase public client hints (no secrets)", () => {
  it("never includes client email or private key", () => {
    const env = makeEnv({
      ...FIREBASE_CREDS,
      FIREBASE_ANALYTICS_MEASUREMENT_ID: "G-TEST123",
      FIREBASE_CRASHLYTICS_ENABLED: "true",
    });
    const hints = getFirebasePublicClientHints(env);
    expect(hints.projectId).toBe("test-project");
    expect(hints.analyticsMeasurementId).toBe("G-TEST123");
    expect(hints.crashlyticsEnabled).toBe(true);
    expect(JSON.stringify(hints)).not.toContain("PRIVATE");
    expect(JSON.stringify(hints)).not.toContain("iam.gserviceaccount");
  });

  it("public-config never leaks server credentials", async () => {
    const app = createApp(
      makeEnv({
        FIREBASE_PROJECT_ID: "pub-project",
        FIREBASE_ANALYTICS_MEASUREMENT_ID: "G-PUBLIC",
      }),
      silentLogger,
      null,
      null,
    );
    const res = await app.request("/api/v1/firebase/public-config");
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("pub-project");
    expect(text).toContain("G-PUBLIC");
    expect(text).not.toContain("PRIVATE_KEY");
    expect(text).not.toContain("CLIENT_EMAIL");
  });
});
