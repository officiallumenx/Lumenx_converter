import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createApp } from "../src/app.js";
import { loadEnv, resetEnvCache } from "../src/config/env.js";
import { createLogger } from "../src/logger/logger.js";
import {
  createMockSupabaseClients,
  emptyMockDb,
  type MockDb,
} from "./helpers/mock-supabase.js";
import { resolveTargetApps } from "../src/domains/notifications/resolve-target-apps.js";
import { enqueueFcmDeliveryAttempts } from "../src/domains/notifications/fcm-enqueue.js";

const silentLogger = createLogger("error");

const USER = "22222222-2222-4222-8222-222222222222";
const USER_ADMIN = "11111111-1111-4111-8111-111111111111";
const INST_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const MEMBER = "aa222222-2222-4222-8222-222222222222";
const MEMBER_ADMIN = "aa111111-1111-4111-8111-111111111111";
const TOK_CONNECT = "ff111111-1111-4111-8111-111111111111";
const TOK_TRANSPORT = "ff222222-2222-4222-8222-222222222222";
const TOK_ADMIN = "ff333333-3333-4333-8333-333333333333";
const NOTIF = "nn111111-1111-4111-8111-111111111111";
const RECIP = "rr111111-1111-4111-8111-111111111111";

beforeEach(() => {
  resetEnvCache();
  vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  vi.spyOn(process.stderr, "write").mockImplementation(() => true);
});

afterEach(() => {
  vi.restoreAllMocks();
});

function multiAppDb(): MockDb {
  const db = emptyMockDb();
  db.user_profile = [
    {
      id: USER,
      display_name: "Parent",
      email: "p@x.com",
      status: "active",
      deleted_at: null,
    },
    {
      id: USER_ADMIN,
      display_name: "Admin",
      email: "a@x.com",
      status: "active",
      deleted_at: null,
    },
  ];
  db.membership = [
    {
      id: MEMBER,
      user_id: USER,
      institute_id: INST_A,
      status: "active",
      deleted_at: null,
    },
    {
      id: MEMBER_ADMIN,
      user_id: USER_ADMIN,
      institute_id: INST_A,
      status: "active",
      deleted_at: null,
    },
  ];
  db.membership_role = [
    { membership_id: MEMBER, role_code: "parent" },
    { membership_id: MEMBER_ADMIN, role_code: "institute_admin" },
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
      id: TOK_CONNECT,
      user_profile_id: USER,
      app: "connect",
      platform: "android",
      token: "tok-connect",
      valid: true,
      last_seen_at: "2026-01-01T00:00:00.000Z",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      deleted_at: null,
    },
    {
      id: TOK_TRANSPORT,
      user_profile_id: USER,
      app: "transport",
      platform: "android",
      token: "tok-transport",
      valid: true,
      last_seen_at: "2026-01-01T00:00:00.000Z",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      deleted_at: null,
    },
    {
      id: TOK_ADMIN,
      user_profile_id: USER,
      app: "admin",
      platform: "android",
      token: "tok-admin",
      valid: true,
      last_seen_at: "2026-01-01T00:00:00.000Z",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      deleted_at: null,
    },
  ];
  db.notification = [
    {
      id: NOTIF,
      institute_id: INST_A,
      template_id: null,
      category: "transport",
      priority: "normal",
      title: "t",
      body: "b",
      payload: { targetApps: ["connect"] },
      deep_link: "/transport",
      due_at: null,
      dedupe_key: null,
      created_by_user_profile_id: USER_ADMIN,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      deleted_at: null,
    },
  ];
  db.notification_recipient = [
    {
      id: RECIP,
      institute_id: INST_A,
      notification_id: NOTIF,
      user_profile_id: USER,
      read_at: null,
      starred_at: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      deleted_at: null,
    },
  ];
  return db;
}

describe("resolveTargetApps", () => {
  it("uses explicit apps", () => {
    expect(resolveTargetApps("transport", ["admin", "connect"])).toEqual([
      "admin",
      "connect",
    ]);
  });

  it("defaults by category", () => {
    expect(resolveTargetApps("admissions")).toEqual(["admissions"]);
    expect(resolveTargetApps("careers")).toEqual(["careers"]);
    expect(resolveTargetApps("homework")).toEqual(["connect"]);
    expect(resolveTargetApps("system")).toEqual(["connect", "admin"]);
  });
});

describe("enqueueFcmDeliveryAttempts — app filter", () => {
  it("targets only connect tokens when targetApps=[connect]", async () => {
    const db = multiAppDb();
    const clients = createMockSupabaseClients({
      tokens: { "token-admin": USER_ADMIN },
      db,
    });
    const n = await enqueueFcmDeliveryAttempts(clients.admin!, {
      instituteId: INST_A,
      notificationId: NOTIF,
      recipients: db.notification_recipient as never,
      targetApps: ["connect"],
      category: "transport",
    });
    expect(n).toBe(1);
    const fcm = db.notification_delivery_attempt.filter(
      (r) => r.channel === "fcm",
    );
    expect(fcm).toHaveLength(1);
    expect(fcm[0]?.device_token_id).toBe(TOK_CONNECT);
  });

  it("targets only transport tokens when targetApps=[transport]", async () => {
    const db = multiAppDb();
    const clients = createMockSupabaseClients({
      tokens: { "token-admin": USER_ADMIN },
      db,
    });
    await enqueueFcmDeliveryAttempts(clients.admin!, {
      instituteId: INST_A,
      notificationId: NOTIF,
      recipients: db.notification_recipient as never,
      targetApps: ["transport"],
      category: "transport",
    });
    const fcm = db.notification_delivery_attempt.filter(
      (r) => r.channel === "fcm",
    );
    expect(fcm).toHaveLength(1);
    expect(fcm[0]?.device_token_id).toBe(TOK_TRANSPORT);
  });

  it("targets connect+admin when both requested", async () => {
    const db = multiAppDb();
    const clients = createMockSupabaseClients({
      tokens: { "token-admin": USER_ADMIN },
      db,
    });
    await enqueueFcmDeliveryAttempts(clients.admin!, {
      instituteId: INST_A,
      notificationId: NOTIF,
      recipients: db.notification_recipient as never,
      targetApps: ["connect", "admin"],
      category: "transport",
    });
    const ids = db.notification_delivery_attempt
      .filter((r) => r.channel === "fcm")
      .map((r) => r.device_token_id)
      .sort();
    expect(ids).toEqual([TOK_CONNECT, TOK_ADMIN].sort());
  });
});

describe("HTTP emit persists targetApps on payload", () => {
  it("stores targetApps on notification payload", async () => {
    const db = multiAppDb();
    const env = loadEnv({ NODE_ENV: "test", LOG_LEVEL: "error" });
    const app = createApp(
      env,
      silentLogger,
      createMockSupabaseClients({
        tokens: { "token-admin": USER_ADMIN },
        db,
      }),
    );
    const res = await app.request("/api/v1/notifications", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-admin",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        category: "announcements",
        title: "Hello",
        body: "World",
        recipient_user_ids: [USER],
      }),
    });
    expect(res.status).toBe(201);
    const row = db.notification[db.notification.length - 1];
    expect(row?.payload).toMatchObject({ targetApps: ["connect"] });
  });
});
