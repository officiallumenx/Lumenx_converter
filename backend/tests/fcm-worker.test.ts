import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createApp } from "../src/app.js";
import { loadEnv, resetEnvCache } from "../src/config/env.js";
import { createLogger } from "../src/logger/logger.js";
import {
  createMockSupabaseClients,
  emptyMockDb,
  type MockDb,
} from "./helpers/mock-supabase.js";
import { flushPendingFcmDeliveries } from "../src/workers/fcm-worker-runner.js";
import type { Messaging } from "firebase-admin/messaging";

const silentLogger = createLogger("error");

const USER_ADMIN = "11111111-1111-4111-8111-111111111111";
const USER_PARENT = "22222222-2222-4222-8222-222222222222";
const INST_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const MEMBER_ADMIN = "aa111111-1111-4111-8111-111111111111";
const MEMBER_PARENT = "aa222222-2222-4222-8222-222222222222";
const DEVICE_TOKEN_ID = "ff111111-1111-4111-8111-111111111111";

beforeEach(() => {
  resetEnvCache();
  vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  vi.spyOn(process.stderr, "write").mockImplementation(() => true);
});

afterEach(() => {
  vi.restoreAllMocks();
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function json(res: Response): Promise<any> {
  return res.json();
}

function baseDb(): MockDb {
  const db = emptyMockDb();
  db.user_profile = [
    { id: USER_ADMIN, display_name: "Admin", email: "a@x.com", status: "active", deleted_at: null },
    { id: USER_PARENT, display_name: "Parent", email: "p@x.com", status: "active", deleted_at: null },
  ];
  db.membership = [
    { id: MEMBER_ADMIN, user_id: USER_ADMIN, institute_id: INST_A, status: "active", deleted_at: null },
    { id: MEMBER_PARENT, user_id: USER_PARENT, institute_id: INST_A, status: "active", deleted_at: null },
  ];
  db.membership_role = [
    { membership_id: MEMBER_ADMIN, role_code: "institute_admin" },
    { membership_id: MEMBER_PARENT, role_code: "parent" },
  ];
  db.institute = [
    { id: INST_A, code: "A", name: "A", kind: "school", status: "active", deleted_at: null },
  ];
  db.device_token = [
    {
      id: DEVICE_TOKEN_ID,
      user_profile_id: USER_PARENT,
      app: "connect",
      platform: "android",
      token: "fcm-token-parent-1",
      valid: true,
      last_seen_at: "2026-01-01T00:00:00.000Z",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      deleted_at: null,
    },
  ];
  return db;
}

function appWithDb(db: MockDb) {
  const env = loadEnv({ NODE_ENV: "test", LOG_LEVEL: "error" });
  return createApp(
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
}

const jsonHeaders = {
  Authorization: "Bearer token-admin",
  "Content-Type": "application/json",
};

describe("FCM worker — enqueue + flush", () => {
  it("enqueues pending fcm attempts when broadcasting school alert", async () => {
    const db = baseDb();
    const app = appWithDb(db);

    await app.request("/api/v1/school-alerts/broadcast", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        institute_id: INST_A,
        title: "Holiday tomorrow",
        category: "holiday",
        audience: "parents",
      }),
    });

    const pending = db.notification_delivery_attempt.filter(
      (row) => row.channel === "fcm" && row.status === "pending",
    );
    expect(pending.length).toBe(1);
    expect(pending[0]?.device_token_id).toBe(DEVICE_TOKEN_ID);
  });

  it("sends pending attempts via messaging and marks sent", async () => {
    const db = baseDb();
    const app = appWithDb(db);
    const adminClient = createMockSupabaseClients({
      tokens: { "token-admin": USER_ADMIN },
      db,
    }).admin!;

    await app.request("/api/v1/school-alerts/broadcast", {
      method: "POST",
      headers: jsonHeaders,
      body: JSON.stringify({
        institute_id: INST_A,
        title: "Emergency closure",
        severity: "emergency",
        category: "closure",
        audience: "parents",
      }),
    });

    const send = vi.fn().mockResolvedValue("msg-id");
    const messaging = { send } as unknown as Messaging;

    const result = await flushPendingFcmDeliveries({
      admin: adminClient,
      messaging,
      logger: silentLogger,
    });

    expect(result.sent).toBe(1);
    expect(send).toHaveBeenCalledTimes(1);
    const call = send.mock.calls[0]?.[0] as { notification?: { title?: string }; data?: Record<string, string> };
    expect(call.notification?.title).toContain("Important:");
    expect(call.data?.presentation).toBe("alert");

    const sent = db.notification_delivery_attempt.filter(
      (row) => row.channel === "fcm" && row.status === "sent",
    );
    expect(sent.length).toBe(1);
  });
});
