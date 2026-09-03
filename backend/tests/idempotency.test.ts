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
const USER_PARENT = "55555555-5555-4555-8555-555555555555";
const INST_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const MEMBER_ADMIN = "aa111111-1111-4111-8111-111111111111";
const MEMBER_PARENT = "aa555555-5555-4555-8555-555555555555";

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

describe("Idempotency-Key (Phase 2 Step 9)", () => {
  it("replays the same response for duplicate notify emits", async () => {
    const db = baseDb();
    const app = appWithDb(db);
    const headers = {
      Authorization: "Bearer token-admin",
      "Content-Type": "application/json",
      "Idempotency-Key": "notify-key-abcdef12",
    };
    const body = JSON.stringify({
      institute_id: INST_A,
      category: "system",
      title: "Hello",
      body: "World message for parents",
      audience: "parents",
    });

    const first = await app.request("/api/v1/notifications", {
      method: "POST",
      headers,
      body,
    });
    expect(first.status).toBe(201);
    const firstJson = await json(first);
    expect(db.notification).toHaveLength(1);
    expect(db.api_idempotency_key).toHaveLength(1);
    expect(db.api_idempotency_key[0]?.status).toBe("completed");

    const second = await app.request("/api/v1/notifications", {
      method: "POST",
      headers,
      body,
    });
    expect(second.status).toBe(201);
    const secondJson = await json(second);
    expect(secondJson).toEqual(firstJson);
    expect(db.notification).toHaveLength(1);
  });

  it("maps Idempotency-Key into notification dedupe_key when omitted", async () => {
    const db = baseDb();
    const app = appWithDb(db);
    const res = await app.request("/api/v1/notifications", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-admin",
        "Content-Type": "application/json",
        "Idempotency-Key": "dedupe-from-header1",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        category: "system",
        title: "Dedupe",
        body: "Uses header as dedupe key",
        audience: "parents",
      }),
    });
    expect(res.status).toBe(201);
    expect(db.notification[0]?.dedupe_key).toBe("dedupe-from-header1");
  });
});
