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

const USER_OPS = "33333333-3333-4333-8333-333333333333";
const USER_ADMIN = "11111111-1111-4111-8111-111111111111";
const INST_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const INST_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const ITEM_A = "a0111111-1111-4111-8111-111111111111";
const ITEM_B = "a0222222-2222-4222-8222-222222222222";
const OP_OPS = "c0333333-3333-4333-8333-333333333333";

beforeEach(() => {
  resetEnvCache();
  vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  vi.spyOn(process.stderr, "write").mockImplementation(() => true);
});

afterEach(() => {
  vi.restoreAllMocks();
});

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

function baseDb(): MockDb {
  const db = emptyMockDb();
  db.user_profile = [
    { id: USER_OPS, display_name: "Ops", email: "ops@x.com", status: "active", deleted_at: null },
    { id: USER_ADMIN, display_name: "Admin", email: "a@x.com", status: "active", deleted_at: null },
  ];
  db.platform_operator = [
    {
      id: OP_OPS,
      user_id: USER_OPS,
      role_code: "operations",
      handle: "ops",
      display_name: "Ops",
      status: "active",
      deleted_at: null,
    },
  ];
  db.institute = [
    { id: INST_A, code: "A", name: "Institute A", kind: "school", status: "active", deleted_at: null },
    { id: INST_B, code: "B", name: "Institute B", kind: "school", status: "active", deleted_at: null },
  ];
  db.recycle_item = [
    {
      id: ITEM_A,
      institute_id: INST_A,
      entity_kind: "student",
      entity_id: "s0111111-1111-4111-8111-111111111111",
      module: "Students",
      title: "Ada",
      subtitle: null,
      snapshot: null,
      status: "in_bin",
      deleted_by_user_id: USER_ADMIN,
      deleted_at: daysAgoIso(5),
      restored_by_user_id: null,
      restored_at: null,
      purged_by_user_id: null,
      purged_at: null,
      created_at: daysAgoIso(5),
      updated_at: daysAgoIso(5),
    },
    {
      id: ITEM_B,
      institute_id: INST_B,
      entity_kind: "teacher",
      entity_id: "t0111111-1111-4111-8111-111111111111",
      module: "Teachers",
      title: "Priya",
      subtitle: null,
      snapshot: null,
      status: "in_bin",
      deleted_by_user_id: USER_ADMIN,
      deleted_at: daysAgoIso(3),
      restored_by_user_id: null,
      restored_at: null,
      purged_by_user_id: null,
      purged_at: null,
      created_at: daysAgoIso(3),
      updated_at: daysAgoIso(3),
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
        "token-ops": USER_OPS,
        "token-admin": USER_ADMIN,
      },
      db,
    }),
  );
}

describe("nexus recycle oversight", () => {
  it("platform operator lists all in-bin items across institutes", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request("/api/nexus/recycle/items", {
      headers: { Authorization: "Bearer token-ops" },
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    const ids = body.data.map((row: { id: string }) => row.id);
    expect(ids).toContain(ITEM_A);
    expect(ids).toContain(ITEM_B);
  });

  it("filters platform recycle list by institute_id", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request(
      `/api/nexus/recycle/items?institute_id=${INST_A}`,
      { headers: { Authorization: "Bearer token-ops" } },
    );
    expect(res.status).toBe(200);
    const ids = (await res.json()).data.map((row: { id: string }) => row.id);
    expect(ids).toEqual([ITEM_A]);
  });

  it("rejects institute admin on nexus recycle route", async () => {
    const db = baseDb();
    db.membership = [
      { id: "aa111111-1111-4111-8111-111111111111", user_id: USER_ADMIN, institute_id: INST_A, status: "active", deleted_at: null },
    ];
    db.membership_role = [
      { membership_id: "aa111111-1111-4111-8111-111111111111", role_code: "institute_admin" },
    ];
    const app = appWithDb(db);
    const res = await app.request("/api/nexus/recycle/items", {
      headers: { Authorization: "Bearer token-admin" },
    });
    expect(res.status).toBe(403);
  });
});
