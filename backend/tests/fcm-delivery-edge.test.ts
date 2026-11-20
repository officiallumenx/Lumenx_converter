/**
 * Focused FCM delivery edge cases (mocked Firebase — not proof of device receipt).
 */
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createApp } from "../src/app.js";
import { loadEnv, resetEnvCache } from "../src/config/env.js";
import { createLogger } from "../src/logger/logger.js";
import {
  createMockSupabaseClients,
  emptyMockDb,
  type MockDb,
} from "./helpers/mock-supabase.js";
import { ensureWritableTrials } from "./helpers/subscription-fixture.js";
import { flushPendingFcmDeliveries } from "../src/workers/fcm-worker-runner.js";
import { resolveFirebaseConfig } from "../src/integrations/firebase.js";
import { shouldStartFcmWorker } from "../src/integrations/fcm-worker-gate.js";
import {
  resolveTargetApps,
  targetAppsForTransportAudience,
} from "../src/domains/notifications/resolve-target-apps.js";
import type { Messaging } from "firebase-admin/messaging";
import type { Env } from "../src/config/env.js";

const silentLogger = createLogger("error");

const USER_ADMIN = "11111111-1111-4111-8111-111111111111";
const USER_A = "22222222-2222-4222-8222-222222222222";
const USER_B = "33333333-3333-4333-8333-333333333333";
const INST_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const MEMBER_ADMIN = "aa111111-1111-4111-8111-111111111111";
const MEMBER_A = "aa222222-2222-4222-8222-222222222222";
const MEMBER_B = "aa333333-3333-4333-8333-333333333333";
const TOK_A = "ff111111-1111-4111-8111-111111111111";
const TOK_B = "ff222222-2222-4222-8222-222222222222";

beforeEach(() => {
  resetEnvCache();
  vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  vi.spyOn(process.stderr, "write").mockImplementation(() => true);
});

afterEach(() => {
  vi.restoreAllMocks();
});

function twoParentDb(): MockDb {
  const db = emptyMockDb();
  db.user_profile = [
    {
      id: USER_ADMIN,
      display_name: "Admin",
      email: "a@x.com",
      status: "active",
      deleted_at: null,
    },
    {
      id: USER_A,
      display_name: "Parent A",
      email: "pa@x.com",
      status: "active",
      deleted_at: null,
    },
    {
      id: USER_B,
      display_name: "Parent B",
      email: "pb@x.com",
      status: "active",
      deleted_at: null,
    },
  ];
  db.membership = [
    {
      id: MEMBER_ADMIN,
      user_id: USER_ADMIN,
      institute_id: INST_A,
      status: "active",
      deleted_at: null,
    },
    {
      id: MEMBER_A,
      user_id: USER_A,
      institute_id: INST_A,
      status: "active",
      deleted_at: null,
    },
    {
      id: MEMBER_B,
      user_id: USER_B,
      institute_id: INST_A,
      status: "active",
      deleted_at: null,
    },
  ];
  db.membership_role = [
    { membership_id: MEMBER_ADMIN, role_code: "institute_admin" },
    { membership_id: MEMBER_A, role_code: "parent" },
    { membership_id: MEMBER_B, role_code: "parent" },
  ];
  db.institute = [
    {
      id: INST_A,
      code: "A",
      name: "A",
      kind: "school",
      status: "active",
      deleted_at: null,
    },
  ];
  db.device_token = [
    {
      id: TOK_A,
      user_profile_id: USER_A,
      app: "connect",
      platform: "android",
      token: "fcm-token-a",
      valid: true,
      last_seen_at: "2026-01-01T00:00:00.000Z",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      deleted_at: null,
    },
    {
      id: TOK_B,
      user_profile_id: USER_B,
      app: "connect",
      platform: "android",
      token: "fcm-token-b",
      valid: true,
      last_seen_at: "2026-01-01T00:00:00.000Z",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      deleted_at: null,
    },
  ];
  ensureWritableTrials(db, [INST_A]);
  return db;
}

describe("FCM credentials / worker gate (no secrets)", () => {
  it("missing Firebase credentials resolve to null in non-production (no false configured)", () => {
    const env = loadEnv({
      NODE_ENV: "development",
      LOG_LEVEL: "error",
      FCM_WORKER_ENABLED: "false",
    });
    const cfg = resolveFirebaseConfig(env, silentLogger);
    expect(cfg).toBeNull();
  });

  it("staging-like gate stays off when FCM_WORKER_ENABLED=false", () => {
    const gate = shouldStartFcmWorker({
      NODE_ENV: "development",
      FCM_WORKER_ENABLED: false,
      FCM_ALLOW_PROD_OUTBOX: false,
      SUPABASE_URL: "https://yveadybpntziyryxsrsu.supabase.co",
    } as Env);
    expect(gate.start).toBe(false);
    expect(gate.reason).toMatch(/FCM_WORKER_ENABLED=false/);
  });

  it("health/ready reports FCM not messaging-ready when worker is intentionally disabled", async () => {
    const env = loadEnv({
      NODE_ENV: "test",
      LOG_LEVEL: "error",
      FCM_WORKER_ENABLED: "false",
    });
    const app = createApp(env, silentLogger, null);
    const res = await app.request("/api/v1/health/ready");
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      status: string;
      checks: {
        fcm: {
          workerEnabled: boolean;
          firebaseConfigured: boolean;
          workerRunning: boolean;
          messagingReady: boolean;
        };
      };
    };
    expect(body.checks.fcm.workerEnabled).toBe(false);
    expect(body.checks.fcm.messagingReady).toBe(false);
    expect(body.checks.fcm.workerRunning).toBe(false);
    // Intentionally disabled push must not fail readiness solely for FCM.
    expect(body.status === "ready" || body.status === "degraded").toBe(true);
  });

  it("hosted staging URL remains gated until FCM_ALLOW_PROD_OUTBOX is explicitly true", () => {
    const blocked = shouldStartFcmWorker({
      NODE_ENV: "development",
      FCM_WORKER_ENABLED: true,
      FCM_ALLOW_PROD_OUTBOX: false,
      SUPABASE_URL: "https://yveadybpntziyryxsrsu.supabase.co",
    } as Env);
    expect(blocked.start).toBe(false);
    expect(blocked.reason).toMatch(/refused/i);

    const allowed = shouldStartFcmWorker({
      NODE_ENV: "development",
      FCM_WORKER_ENABLED: true,
      FCM_ALLOW_PROD_OUTBOX: true,
      SUPABASE_URL: "https://yveadybpntziyryxsrsu.supabase.co",
    } as Env);
    expect(allowed.start).toBe(true);
  });
});

describe("Transport audience → target apps", () => {
  it("maps parent/student to connect and driver to transport", () => {
    expect(targetAppsForTransportAudience("parent")).toEqual(["connect"]);
    expect(targetAppsForTransportAudience("student")).toEqual(["connect"]);
    expect(targetAppsForTransportAudience("driver")).toEqual(["transport"]);
    expect(targetAppsForTransportAudience("admin")).toEqual(["admin"]);
  });

  it("transport category without explicit apps defaults to connect only", () => {
    expect(resolveTargetApps("transport")).toEqual(["connect"]);
  });
});

describe("FCM worker edge delivery", () => {
  it("null messaging is a no-op (does not mark attempts sent)", async () => {
    const db = twoParentDb();
    const env = loadEnv({ NODE_ENV: "test", LOG_LEVEL: "error" });
    const app = createApp(
      env,
      silentLogger,
      createMockSupabaseClients({
        tokens: { "token-admin": USER_ADMIN },
        db,
      }),
    );
    await app.request("/api/v1/notifications", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-admin",
        "Content-Type": "application/json",
        "Idempotency-Key": "fcm-null-messaging-1",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        category: "announcements",
        title: "Hello",
        body: "World",
        recipient_user_ids: [USER_A],
      }),
    });

    const adminClient = createMockSupabaseClients({
      tokens: { "token-admin": USER_ADMIN },
      db,
    }).admin!;

    const result = await flushPendingFcmDeliveries({
      admin: adminClient,
      messaging: null,
      logger: silentLogger,
    });
    expect(result.processed).toBe(0);
    expect(result.sent).toBe(0);
    const pending = db.notification_delivery_attempt.filter(
      (r) => r.channel === "fcm" && r.status === "pending",
    );
    expect(pending.length).toBeGreaterThanOrEqual(1);
  });

  it("permanent invalid token soft-invalidates and fails that attempt only", async () => {
    const db = twoParentDb();
    const env = loadEnv({ NODE_ENV: "test", LOG_LEVEL: "error" });
    const app = createApp(
      env,
      silentLogger,
      createMockSupabaseClients({
        tokens: { "token-admin": USER_ADMIN },
        db,
      }),
    );
    await app.request("/api/v1/notifications", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-admin",
        "Content-Type": "application/json",
        "Idempotency-Key": "fcm-perm-fail-1",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        category: "announcements",
        title: "Hello",
        body: "World",
        recipient_user_ids: [USER_A, USER_B],
      }),
    });

    const send = vi.fn().mockImplementation(async (msg: { token: string }) => {
      if (msg.token === "fcm-token-a") {
        throw Object.assign(new Error("not registered"), {
          code: "messaging/registration-token-not-registered",
        });
      }
      return "msg-ok-b";
    });
    const messaging = { send } as unknown as Messaging;
    const adminClient = createMockSupabaseClients({
      tokens: { "token-admin": USER_ADMIN },
      db,
    }).admin!;

    const result = await flushPendingFcmDeliveries({
      admin: adminClient,
      messaging,
      logger: silentLogger,
    });

    expect(result.failed).toBe(1);
    expect(result.sent).toBe(1);
    expect(send).toHaveBeenCalledTimes(2);

    const tokA = db.device_token.find((t) => t.id === TOK_A);
    expect(tokA?.valid).toBe(false);
    const tokB = db.device_token.find((t) => t.id === TOK_B);
    expect(tokB?.valid).toBe(true);

    const statuses = db.notification_delivery_attempt
      .filter((r) => r.channel === "fcm")
      .map((r) => r.status)
      .sort();
    expect(statuses).toEqual(["failed", "sent"]);
  });
});
