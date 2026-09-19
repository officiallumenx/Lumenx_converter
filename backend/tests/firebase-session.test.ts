/**
 * Phase 3 — Firebase → LumenX session exchange + client auth helpers.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { DecodedIdToken } from "firebase-admin/auth";
import { createApp } from "../src/app.js";
import { loadEnv, resetEnvCache } from "../src/config/env.js";
import { createLogger } from "../src/logger/logger.js";
import * as firebaseIntegration from "../src/integrations/firebase.js";
import {
  createLumenXSessionFromFirebaseIdentity,
} from "../src/domains/firebase-identity/session.js";
import { firebaseIdentityFromDecodedToken } from "../src/auth/firebase-identity.js";
import {
  createMockSupabaseClients,
  emptyMockDb,
  type MockDb,
} from "./helpers/mock-supabase.js";

const INST_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const USER_A = "11111111-1111-4111-8111-111111111111";
const MEM_A = "mmmmmmmm-mmmm-4mmm-8mmm-mmmmmmmmmmmm";
const FB_UID = "firebase-uid-session-a";

const silentLogger = createLogger("error");

beforeEach(() => {
  resetEnvCache();
  vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  vi.spyOn(process.stderr, "write").mockImplementation(() => true);
});

afterEach(() => {
  vi.restoreAllMocks();
});

function decoded(
  overrides: Partial<DecodedIdToken> & { uid: string },
): DecodedIdToken {
  return {
    aud: "test-project",
    auth_time: 1_700_000_000,
    exp: 1_700_003_600,
    iat: 1_700_000_000,
    iss: "https://securetoken.google.com/test-project",
    sub: overrides.uid,
    firebase: { identities: {}, sign_in_provider: "custom" },
    ...overrides,
  } as DecodedIdToken;
}

function baseDb(): MockDb {
  const db = emptyMockDb();
  db.institute = [
    {
      id: INST_A,
      code: "SCHOOL-A",
      name: "School A",
      kind: "school",
      status: "active",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      deleted_at: null,
    },
  ];
  db.user_profile = [
    {
      id: USER_A,
      display_name: "Alice",
      email: "alice@school-a.edu",
      phone: "9876500001",
      avatar_url: null,
      status: "active",
      firebase_uid: FB_UID,
      firebase_linked_at: "2026-09-01T00:00:00Z",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      deleted_at: null,
    },
  ];
  db.membership = [
    {
      id: MEM_A,
      user_id: USER_A,
      institute_id: INST_A,
      status: "active",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      deleted_at: null,
    },
  ];
  db.membership_role = [
    {
      membership_id: MEM_A,
      role_code: "institute_admin",
      created_at: "2026-01-01T00:00:00Z",
    },
  ];
  return db;
}

describe("createLumenXSessionFromFirebaseIdentity", () => {
  it("maps Firebase UID and mints Supabase session tokens", async () => {
    const db = baseDb();
    const tokens: Record<string, string> = {};
    const clients = createMockSupabaseClients({
      tokens,
      db,
      authUsersByEmail: { "alice@school-a.edu": { id: USER_A } },
    });

    const result = await createLumenXSessionFromFirebaseIdentity(
      clients.admin,
      firebaseIdentityFromDecodedToken(decoded({ uid: FB_UID })),
    );

    expect(result.accessToken).toBe(`access-${USER_A}`);
    expect(result.refreshToken).toBe(`refresh-${USER_A}`);
    expect(result.mapping.userProfileId).toBe(USER_A);
    expect(result.actor.memberships[0]?.roles).toContain("institute_admin");
  });

  it("rejects unknown Firebase user (no mapping)", async () => {
    const db = baseDb();
    const clients = createMockSupabaseClients({
      tokens: {},
      db,
      authUsersByEmail: { "alice@school-a.edu": { id: USER_A } },
    });

    await expect(
      createLumenXSessionFromFirebaseIdentity(
        clients.admin,
        firebaseIdentityFromDecodedToken(decoded({ uid: "unknown-fb" })),
      ),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});

describe("POST /api/v1/auth/firebase/session", () => {
  it("verifies Firebase token, maps user, returns session", async () => {
    const db = baseDb();
    const tokens: Record<string, string> = {};
    const env = loadEnv({ NODE_ENV: "test", LOG_LEVEL: "error" });
    const fakeApp = { name: "test" } as never;

    vi.spyOn(firebaseIntegration, "verifyFirebaseIdToken").mockResolvedValue(
      decoded({ uid: FB_UID, email: "alice@school-a.edu", email_verified: true }),
    );

    const app = createApp(
      env,
      silentLogger,
      createMockSupabaseClients({
        tokens,
        db,
        authUsersByEmail: { "alice@school-a.edu": { id: USER_A } },
      }),
      fakeApp,
    );

    const res = await app.request("/api/v1/auth/firebase/session", {
      method: "POST",
      headers: {
        Authorization: "Bearer firebase-id-token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ institute_id: INST_A }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: { access_token: string; refresh_token: string; mapping: { user_profile_id: string } };
    };
    expect(body.data.access_token).toBe(`access-${USER_A}`);
    expect(body.data.mapping.user_profile_id).toBe(USER_A);
  });

  it("rejects expired Firebase token", async () => {
    const env = loadEnv({ NODE_ENV: "test", LOG_LEVEL: "error" });
    const fakeApp = { name: "test" } as never;
    const err = Object.assign(new Error("Firebase ID token has expired."), {
      code: "auth/id-token-expired",
    });
    vi.spyOn(firebaseIntegration, "verifyFirebaseIdToken").mockRejectedValue(err);

    const app = createApp(
      env,
      silentLogger,
      createMockSupabaseClients({ tokens: {}, db: baseDb() }),
      fakeApp,
    );

    const res = await app.request("/api/v1/auth/firebase/session", {
      method: "POST",
      headers: { Authorization: "Bearer expired-token" },
    });
    expect(res.status).toBe(401);
  });

  it("rejects invalid Firebase token", async () => {
    const env = loadEnv({ NODE_ENV: "test", LOG_LEVEL: "error" });
    const fakeApp = { name: "test" } as never;
    const err = Object.assign(new Error("invalid"), {
      code: "auth/invalid-id-token",
    });
    vi.spyOn(firebaseIntegration, "verifyFirebaseIdToken").mockRejectedValue(err);

    const app = createApp(
      env,
      silentLogger,
      createMockSupabaseClients({ tokens: {}, db: baseDb() }),
      fakeApp,
    );

    const res = await app.request("/api/v1/auth/firebase/session", {
      method: "POST",
      headers: { Authorization: "Bearer bad-token" },
    });
    expect(res.status).toBe(401);
  });

  it("ignores client-supplied firebase_uid in body (token UID wins)", async () => {
    const db = baseDb();
    const tokens: Record<string, string> = {};
    const env = loadEnv({ NODE_ENV: "test", LOG_LEVEL: "error" });
    const fakeApp = { name: "test" } as never;

    vi.spyOn(firebaseIntegration, "verifyFirebaseIdToken").mockResolvedValue(
      decoded({ uid: FB_UID, email: "alice@school-a.edu", email_verified: true }),
    );

    const app = createApp(
      env,
      silentLogger,
      createMockSupabaseClients({
        tokens,
        db,
        authUsersByEmail: { "alice@school-a.edu": { id: USER_A } },
      }),
      fakeApp,
    );

    const res = await app.request("/api/v1/auth/firebase/session", {
      method: "POST",
      headers: {
        Authorization: "Bearer firebase-id-token",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        firebase_uid: "attacker-spoofed-uid",
        email: "attacker@evil.test",
        phone: "+910000000000",
        institute_id: INST_A,
      }),
    });

    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: { mapping: { user_profile_id: string; firebase_uid: string } };
    };
    expect(body.data.mapping.user_profile_id).toBe(USER_A);
    expect(body.data.mapping.firebase_uid).toBe(FB_UID);
  });
});
