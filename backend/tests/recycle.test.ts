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
const USER_TEACHER = "22222222-2222-4222-8222-222222222222";
const USER_PARENT = "55555555-5555-4555-8555-555555555555";
const USER_OTHER = "44444444-4444-4444-8444-444444444444";
const INST_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const INST_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const MEMBER_ADMIN = "aa111111-1111-4111-8111-111111111111";
const MEMBER_TEACHER = "aa222222-2222-4222-8222-222222222222";
const MEMBER_PARENT = "aa555555-5555-4555-8555-555555555555";
const MEMBER_OTHER = "aa444444-4444-4444-8444-444444444444";
const STUDENT_A = "ac111111-1111-4111-8111-111111111111";
const ENTITY_B = "ac222222-2222-4222-8222-222222222222";
const ITEM_ACTIVE = "a0111111-1111-4111-8111-111111111111";
const ITEM_CROSS = "a0222222-2222-4222-8222-222222222222";
const ITEM_PURGE = "a0333333-3333-4333-8333-333333333333";
const ITEM_EXPIRED = "a0444444-4444-4444-8444-444444444444";

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

function daysAgoIso(days: number): string {
  const d = new Date();
  d.setUTCDate(d.getUTCDate() - days);
  return d.toISOString();
}

function baseDb(): MockDb {
  const db = emptyMockDb();
  db.user_profile = [
    { id: USER_ADMIN, display_name: "Admin", email: "a@x.com", status: "active", deleted_at: null },
    { id: USER_TEACHER, display_name: "Teacher", email: "t@x.com", status: "active", deleted_at: null },
    { id: USER_PARENT, display_name: "Parent", email: "p@x.com", status: "active", deleted_at: null },
    { id: USER_OTHER, display_name: "Other", email: "o@x.com", status: "active", deleted_at: null },
  ];
  db.membership = [
    { id: MEMBER_ADMIN, user_id: USER_ADMIN, institute_id: INST_A, status: "active", deleted_at: null },
    { id: MEMBER_TEACHER, user_id: USER_TEACHER, institute_id: INST_A, status: "active", deleted_at: null },
    { id: MEMBER_PARENT, user_id: USER_PARENT, institute_id: INST_A, status: "active", deleted_at: null },
    { id: MEMBER_OTHER, user_id: USER_OTHER, institute_id: INST_B, status: "active", deleted_at: null },
  ];
  db.membership_role = [
    { membership_id: MEMBER_ADMIN, role_code: "institute_admin" },
    { membership_id: MEMBER_TEACHER, role_code: "teacher" },
    { membership_id: MEMBER_PARENT, role_code: "parent" },
    { membership_id: MEMBER_OTHER, role_code: "institute_admin" },
  ];
  db.institute = [
    { id: INST_A, code: "A", name: "A", kind: "school", status: "active", deleted_at: null },
    { id: INST_B, code: "B", name: "B", kind: "school", status: "active", deleted_at: null },
  ];
  db.student = [
    {
      id: STUDENT_A,
      institute_id: INST_A,
      display_name: "Soft Deleted Student",
      status: "active",
      deleted_at: "2026-08-01T00:00:00.000Z",
    },
  ];
  db.recycle_item = [
    {
      id: ITEM_ACTIVE,
      institute_id: INST_A,
      entity_kind: "student",
      entity_id: STUDENT_A,
      module: "Students",
      title: "Soft Deleted Student",
      subtitle: null,
      snapshot: null,
      status: "in_bin",
      deleted_by_user_id: USER_ADMIN,
      deleted_at: daysAgoIso(10),
      restored_by_user_id: null,
      restored_at: null,
      purged_by_user_id: null,
      purged_at: null,
      created_at: daysAgoIso(10),
      updated_at: daysAgoIso(10),
    },
    {
      id: ITEM_CROSS,
      institute_id: INST_B,
      entity_kind: "other",
      entity_id: ENTITY_B,
      module: "Other",
      title: "Other institute item",
      subtitle: null,
      snapshot: null,
      status: "in_bin",
      deleted_by_user_id: USER_OTHER,
      deleted_at: daysAgoIso(5),
      restored_by_user_id: null,
      restored_at: null,
      purged_by_user_id: null,
      purged_at: null,
      created_at: daysAgoIso(5),
      updated_at: daysAgoIso(5),
    },
    {
      id: ITEM_PURGE,
      institute_id: INST_A,
      entity_kind: "other",
      entity_id: "ac333333-3333-4333-8333-333333333333",
      module: "Other",
      title: "Purge candidate",
      subtitle: null,
      snapshot: null,
      status: "in_bin",
      deleted_by_user_id: USER_ADMIN,
      deleted_at: daysAgoIso(2),
      restored_by_user_id: null,
      restored_at: null,
      purged_by_user_id: null,
      purged_at: null,
      created_at: daysAgoIso(2),
      updated_at: daysAgoIso(2),
    },
    {
      id: ITEM_EXPIRED,
      institute_id: INST_A,
      entity_kind: "other",
      entity_id: "ac444444-4444-4444-8444-444444444444",
      module: "Other",
      title: "Expired item",
      subtitle: null,
      snapshot: null,
      status: "in_bin",
      deleted_by_user_id: USER_ADMIN,
      deleted_at: daysAgoIso(100),
      restored_by_user_id: null,
      restored_at: null,
      purged_by_user_id: null,
      purged_at: null,
      created_at: daysAgoIso(100),
      updated_at: daysAgoIso(100),
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
        "token-teacher": USER_TEACHER,
        "token-parent": USER_PARENT,
        "token-other": USER_OTHER,
      },
      db,
    }),
  );
}

describe("recycle api", () => {
  it("parent list → 403; admin lists in_bin items", async () => {
    const app = appWithDb(baseDb());

    const denied = await app.request(
      `/api/v1/recycle/items?institute_id=${INST_A}`,
      { headers: { Authorization: "Bearer token-parent" } },
    );
    expect(denied.status).toBe(403);

    const res = await app.request(
      `/api/v1/recycle/items?institute_id=${INST_A}`,
      { headers: { Authorization: "Bearer token-admin" } },
    );
    expect(res.status).toBe(200);
    const ids = (await json(res)).data.map((r: { id: string }) => r.id);
    expect(ids).toContain(ITEM_ACTIVE);
    expect(ids).toContain(ITEM_PURGE);
    expect(ids).not.toContain(ITEM_EXPIRED);
    expect(ids).not.toContain(ITEM_CROSS);
  });

  it("parent get → 404", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request(`/api/v1/recycle/items/${ITEM_ACTIVE}`, {
      headers: { Authorization: "Bearer token-parent" },
    });
    expect(res.status).toBe(404);
  });

  it("teacher can list but create → 403", async () => {
    const app = appWithDb(baseDb());

    const list = await app.request(
      `/api/v1/recycle/items?institute_id=${INST_A}`,
      { headers: { Authorization: "Bearer token-teacher" } },
    );
    expect(list.status).toBe(200);

    const create = await app.request("/api/v1/recycle/items", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-teacher",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        entity_kind: "other",
        entity_id: "ac555555-5555-4555-8555-555555555555",
        module: "Other",
        title: "Teacher attempt",
      }),
    });
    expect(create.status).toBe(403);
  });

  it("admin create → 201; duplicate entity in_bin → 409", async () => {
    const app = appWithDb(baseDb());
    const entityId = "ac666666-6666-4666-8666-666666666666";

    const created = await app.request("/api/v1/recycle/items", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-admin",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        entity_kind: "other",
        entity_id: entityId,
        module: "Other",
        title: "New bin item",
        subtitle: "note",
      }),
    });
    expect(created.status).toBe(201);
    const body = await json(created);
    expect(body.data.status).toBe("in_bin");
    expect(body.data.entityId).toBe(entityId);
    expect(body.data.deletedByUserId).toBe(USER_ADMIN);

    const dup = await app.request("/api/v1/recycle/items", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-admin",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        entity_kind: "other",
        entity_id: entityId,
        module: "Other",
        title: "Duplicate",
      }),
    });
    expect(dup.status).toBe(409);
  });

  it("restore clears student.deleted_at when entity_kind=student", async () => {
    const db = baseDb();
    const app = appWithDb(db);

    expect(db.student[0].deleted_at).toBe("2026-08-01T00:00:00.000Z");

    const res = await app.request(
      `/api/v1/recycle/items/${ITEM_ACTIVE}/restore`,
      {
        method: "POST",
        headers: { Authorization: "Bearer token-admin" },
      },
    );
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.data.status).toBe("restored");
    expect(body.data.restoredByUserId).toBe(USER_ADMIN);
    expect(db.student[0].deleted_at).toBeNull();
  });

  it("cross-tenant get → 404", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request(`/api/v1/recycle/items/${ITEM_CROSS}`, {
      headers: { Authorization: "Bearer token-admin" },
    });
    expect(res.status).toBe(404);
  });

  it("purge then restore → 409", async () => {
    const app = appWithDb(baseDb());

    const purged = await app.request(
      `/api/v1/recycle/items/${ITEM_PURGE}/purge`,
      {
        method: "POST",
        headers: { Authorization: "Bearer token-admin" },
      },
    );
    expect(purged.status).toBe(200);
    expect((await json(purged)).data.status).toBe("purged");

    const restore = await app.request(
      `/api/v1/recycle/items/${ITEM_PURGE}/restore`,
      {
        method: "POST",
        headers: { Authorization: "Bearer token-admin" },
      },
    );
    expect(restore.status).toBe(409);
  });

  it("expired item not in list; get → 404; restore → 409", async () => {
    const app = appWithDb(baseDb());

    const list = await app.request(
      `/api/v1/recycle/items?institute_id=${INST_A}`,
      { headers: { Authorization: "Bearer token-admin" } },
    );
    const ids = (await json(list)).data.map((r: { id: string }) => r.id);
    expect(ids).not.toContain(ITEM_EXPIRED);

    const get = await app.request(`/api/v1/recycle/items/${ITEM_EXPIRED}`, {
      headers: { Authorization: "Bearer token-admin" },
    });
    expect(get.status).toBe(404);

    const restore = await app.request(
      `/api/v1/recycle/items/${ITEM_EXPIRED}/restore`,
      {
        method: "POST",
        headers: { Authorization: "Bearer token-admin" },
      },
    );
    expect(restore.status).toBe(409);
  });
});
