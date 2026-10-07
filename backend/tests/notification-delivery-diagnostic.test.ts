import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createApp } from "../src/app.js";
import { loadEnv, resetEnvCache } from "../src/config/env.js";
import { createLogger } from "../src/logger/logger.js";
import {
  createMockSupabaseClients,
  emptyMockDb,
  type MockDb,
} from "./helpers/mock-supabase.js";

const silentLogger = createLogger("error");
const USER_ADMIN = "11111111-1111-4111-8111-111111111111";
const USER_PARENT = "22222222-2222-4222-8222-222222222222";
const INST_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const MEMBER_ADMIN = "aa111111-1111-4111-8111-111111111111";
const MEMBER_PARENT = "aa222222-2222-4222-8222-222222222222";
const NOTIF = "aa111111-1111-4111-8111-1111111111aa";
const RECIP = "bb111111-1111-4111-8111-1111111111bb";
const TOK = "cc111111-1111-4111-8111-1111111111cc";
const ATTEMPT = "dd111111-1111-4111-8111-1111111111dd";

beforeEach(() => {
  resetEnvCache();
  vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  vi.spyOn(process.stderr, "write").mockImplementation(() => true);
});

afterEach(() => {
  vi.restoreAllMocks();
});

function dbWithDelivery(): MockDb {
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
      id: USER_PARENT,
      display_name: "Parent",
      email: "p@x.com",
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
      id: MEMBER_PARENT,
      user_id: USER_PARENT,
      institute_id: INST_A,
      status: "active",
      deleted_at: null,
    },
  ];
  db.membership_role = [
    { membership_id: MEMBER_ADMIN, role_code: "institute_admin" },
    { membership_id: MEMBER_PARENT, role_code: "parent" },
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
  db.notification = [
    {
      id: NOTIF,
      institute_id: INST_A,
      template_id: null,
      category: "transport",
      priority: "normal",
      title: "Bus",
      body: "Near",
      payload: { targetApps: ["connect"] },
      deep_link: "/transport/live",
      due_at: null,
      dedupe_key: "d1",
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
      user_profile_id: USER_PARENT,
      read_at: null,
      starred_at: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      deleted_at: null,
    },
  ];
  db.device_token = [
    {
      id: TOK,
      user_profile_id: USER_PARENT,
      app: "connect",
      platform: "android",
      token: "secret-fcm-token-value",
      valid: true,
      last_seen_at: "2026-01-01T00:00:00.000Z",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      deleted_at: null,
    },
  ];
  db.notification_delivery_attempt = [
    {
      id: ATTEMPT,
      institute_id: INST_A,
      notification_id: NOTIF,
      notification_recipient_id: RECIP,
      device_token_id: TOK,
      channel: "fcm",
      status: "failed",
      error: "messaging/unavailable",
      attempted_at: "2026-01-01T00:00:00.000Z",
      created_at: "2026-01-01T00:00:00.000Z",
      attempt_count: 2,
      next_attempt_at: null,
      max_attempts: 8,
    },
  ];
  return db;
}

describe("notification delivery diagnostic", () => {
  it("returns masked token fingerprint for staff", async () => {
    const db = dbWithDelivery();
    const env = loadEnv({ NODE_ENV: "test", LOG_LEVEL: "error" });
    const app = createApp(
      env,
      silentLogger,
      createMockSupabaseClients({
        tokens: {
          "token-admin": USER_ADMIN,
          "token-parent": USER_PARENT,
        },
        db,
      }),
    );
    const res = await app.request(
      `/api/v1/notifications/${NOTIF}/delivery?institute_id=${INST_A}`,
      { headers: { Authorization: "Bearer token-admin" } },
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.data.notification.id).toBe(NOTIF);
    expect(body.data.deviceTokens[0].fingerprint).toMatch(/^[a-f0-9]{16}$/);
    expect(JSON.stringify(body)).not.toContain("secret-fcm-token-value");
    expect(body.data.attempts[0].status).toBe("failed");
  });

  it("forbids parents from delivery diagnostic", async () => {
    const db = dbWithDelivery();
    const env = loadEnv({ NODE_ENV: "test", LOG_LEVEL: "error" });
    const app = createApp(
      env,
      silentLogger,
      createMockSupabaseClients({
        tokens: { "token-parent": USER_PARENT },
        db,
      }),
    );
    const res = await app.request(
      `/api/v1/notifications/${NOTIF}/delivery?institute_id=${INST_A}`,
      { headers: { Authorization: "Bearer token-parent" } },
    );
    expect(res.status).toBe(403);
  });
});
