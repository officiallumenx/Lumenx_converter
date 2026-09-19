/**
 * Phase 1 — Firebase Auth foundation tests (init, verify, identity, middleware).
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { loadEnv, resetEnvCache, type Env } from "../src/config/env.js";
import { createLogger, type Logger } from "../src/logger/logger.js";
import {
  initFirebaseAdmin,
  resolveFirebaseConfig,
  getFirebasePublicClientHints,
  getFirebaseMessaging,
  getFirebaseAuth,
  resetFirebaseAdminForTests,
  verifyFirebaseIdToken,
} from "../src/integrations/firebase.js";
import * as firebaseIntegration from "../src/integrations/firebase.js";
import { firebaseIdentityFromDecodedToken } from "../src/auth/firebase-identity.js";
import { createApp } from "../src/app.js";
import type { App } from "firebase-admin/app";
import type { DecodedIdToken } from "firebase-admin/auth";

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

function decodedToken(
  overrides: Partial<DecodedIdToken> & { uid: string },
): DecodedIdToken {
  return {
    aud: "test-project",
    auth_time: 1_700_000_000,
    exp: 1_700_003_600,
    iat: 1_700_000_000,
    iss: "https://securetoken.google.com/test-project",
    sub: overrides.uid,
    firebase: {
      identities: {},
      sign_in_provider: "custom",
    },
    ...overrides,
  } as DecodedIdToken;
}

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

  it("initFirebaseAdmin throws in production when missing configuration", () => {
    expect(() =>
      initFirebaseAdmin(makeEnv({ NODE_ENV: "production" }), silentLogger),
    ).toThrow(/Firebase credentials.*required in production/);
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

  it("getFirebaseAuth returns null when Admin app is null", () => {
    expect(getFirebaseAuth(null)).toBeNull();
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
});

describe("Firebase UID / claim extraction", () => {
  it("extracts uid, verified email, and phone", () => {
    const identity = firebaseIdentityFromDecodedToken(
      decodedToken({
        uid: "firebase-uid-1",
        email: "User@Example.COM",
        email_verified: true,
        phone_number: "+919876543210",
        name: "Lokesh",
      }),
    );
    expect(identity.uid).toBe("firebase-uid-1");
    expect(identity.email).toBe("user@example.com");
    expect(identity.emailVerified).toBe(true);
    expect(identity.phoneNumber).toBe("+919876543210");
    expect(identity.name).toBe("Lokesh");
  });

  it("handles missing email/phone safely", () => {
    const identity = firebaseIdentityFromDecodedToken(
      decodedToken({ uid: "uid-only" }),
    );
    expect(identity.uid).toBe("uid-only");
    expect(identity.email).toBeNull();
    expect(identity.emailVerified).toBe(false);
    expect(identity.phoneNumber).toBeNull();
  });
});

describe("Firebase ID token verification + middleware", () => {
  const mockFirebaseApp = { name: "[DEFAULT]" } as App;

  it("whoami returns 500 when Firebase is not configured", async () => {
    const app = createApp(makeEnv(), silentLogger, null, null);
    const res = await app.request("/api/v1/auth/firebase/whoami", {
      headers: { Authorization: "Bearer fake.token" },
    });
    expect(res.status).toBe(500);
  });

  it("whoami returns 401 when Authorization is missing", async () => {
    const app = createApp(makeEnv(), silentLogger, null, mockFirebaseApp);
    const res = await app.request("/api/v1/auth/firebase/whoami");
    expect(res.status).toBe(401);
  });

  it("whoami accepts a valid Firebase ID token", async () => {
    vi.spyOn(firebaseIntegration, "verifyFirebaseIdToken").mockResolvedValue(
      decodedToken({
        uid: "uid-valid",
        email: "ok@lumenx.test",
        email_verified: true,
        phone_number: "+911234567890",
      }),
    );

    const app = createApp(makeEnv(), silentLogger, null, mockFirebaseApp);
    const res = await app.request("/api/v1/auth/firebase/whoami", {
      headers: { Authorization: "Bearer valid.firebase.token" },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: { uid: string; email: string; email_verified: boolean; phone_number: string };
    };
    expect(body.data.uid).toBe("uid-valid");
    expect(body.data.email).toBe("ok@lumenx.test");
    expect(body.data.email_verified).toBe(true);
    expect(body.data.phone_number).toBe("+911234567890");
  });

  it("whoami rejects an invalid Firebase ID token", async () => {
    vi.spyOn(firebaseIntegration, "verifyFirebaseIdToken").mockRejectedValue(
      Object.assign(new Error("Decoding Firebase ID token failed"), {
        code: "auth/argument-error",
      }),
    );

    const app = createApp(makeEnv(), silentLogger, null, mockFirebaseApp);
    const res = await app.request("/api/v1/auth/firebase/whoami", {
      headers: { Authorization: "Bearer invalid.token" },
    });
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: { message: string } };
    expect(body.error.message).toMatch(/Invalid Firebase ID token/i);
  });

  it("whoami rejects an expired Firebase ID token", async () => {
    vi.spyOn(firebaseIntegration, "verifyFirebaseIdToken").mockRejectedValue(
      Object.assign(new Error("Firebase ID token has expired"), {
        code: "auth/id-token-expired",
      }),
    );

    const app = createApp(makeEnv(), silentLogger, null, mockFirebaseApp);
    const res = await app.request("/api/v1/auth/firebase/whoami", {
      headers: { Authorization: "Bearer expired.token" },
    });
    expect(res.status).toBe(401);
    const body = (await res.json()) as { error: { message: string } };
    expect(body.error.message).toMatch(/expired/i);
  });

  it("verifyFirebaseIdToken rejects empty token before Admin call", async () => {
    await expect(
      verifyFirebaseIdToken(mockFirebaseApp, "   "),
    ).rejects.toMatchObject({ code: "auth/argument-error" });
  });

  it("whoami ignores client body firebase_uid (Bearer claims only)", async () => {
    vi.spyOn(firebaseIntegration, "verifyFirebaseIdToken").mockResolvedValue(
      decodedToken({ uid: "from-verified-token" }),
    );

    const app = createApp(makeEnv(), silentLogger, null, mockFirebaseApp);
    const res = await app.request("/api/v1/auth/firebase/whoami", {
      method: "GET",
      headers: {
        Authorization: "Bearer valid.firebase.token",
        "Content-Type": "application/json",
      },
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { uid: string } };
    expect(body.data.uid).toBe("from-verified-token");
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
    const res = await app.request("/api/v1/auth/firebase/public-config");
    expect(res.status).toBe(200);
    const text = await res.text();
    expect(text).toContain("pub-project");
    expect(text).toContain("G-PUBLIC");
    expect(text).not.toContain("PRIVATE_KEY");
    expect(text).not.toContain("CLIENT_EMAIL");
  });
});
