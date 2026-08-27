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
const USER_OPS = "77777777-7777-4777-8777-777777777777";
const USER_NEW = "88888888-8888-4888-8888-888888888888";
const USER_OTHER = "44444444-4444-4444-8444-444444444444";
const INST_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const INST_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const MEMBER_ADMIN = "aa111111-1111-4111-8111-111111111111";
const MEMBER_TEACHER = "aa222222-2222-4222-8222-222222222222";
const MEMBER_OTHER = "aa444444-4444-4444-8444-444444444444";

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
    {
      id: USER_ADMIN,
      display_name: "Admin",
      email: "a@x.com",
      phone: null,
      avatar_url: null,
      status: "active",
      deleted_at: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    },
    {
      id: USER_TEACHER,
      display_name: "Teacher",
      email: "t@x.com",
      phone: null,
      avatar_url: null,
      status: "active",
      deleted_at: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    },
    {
      id: USER_OPS,
      display_name: "Ops",
      email: "ops@x.com",
      phone: null,
      avatar_url: null,
      status: "active",
      deleted_at: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    },
    {
      id: USER_NEW,
      display_name: "New User",
      email: "n@x.com",
      phone: null,
      avatar_url: null,
      status: "active",
      deleted_at: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    },
    {
      id: USER_OTHER,
      display_name: "Other Admin",
      email: "o@x.com",
      phone: null,
      avatar_url: null,
      status: "active",
      deleted_at: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    },
  ];
  db.platform_operator = [
    {
      id: "po111111-1111-4111-8111-111111111111",
      user_id: USER_OPS,
      role_code: "operations",
      status: "active",
      deleted_at: null,
    },
  ];
  db.institute = [
    {
      id: INST_A,
      code: "LX-A",
      name: "Alpha School",
      kind: "school",
      status: "active",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      deleted_at: null,
    },
    {
      id: INST_B,
      code: "LX-B",
      name: "Beta School",
      kind: "school",
      status: "active",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      deleted_at: null,
    },
  ];
  db.institute_settings = [
    {
      institute_id: INST_A,
      timezone: "Asia/Kolkata",
      locale: "en-IN",
      settings: {},
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    },
    {
      institute_id: INST_B,
      timezone: "Asia/Kolkata",
      locale: "en-IN",
      settings: {},
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    },
  ];
  db.membership = [
    {
      id: MEMBER_ADMIN,
      user_id: USER_ADMIN,
      institute_id: INST_A,
      status: "active",
      deleted_at: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    },
    {
      id: MEMBER_TEACHER,
      user_id: USER_TEACHER,
      institute_id: INST_A,
      status: "active",
      deleted_at: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    },
    {
      id: MEMBER_OTHER,
      user_id: USER_OTHER,
      institute_id: INST_B,
      status: "active",
      deleted_at: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    },
  ];
  db.membership_role = [
    { membership_id: MEMBER_ADMIN, role_code: "institute_admin", created_at: "2026-01-01T00:00:00.000Z" },
    { membership_id: MEMBER_TEACHER, role_code: "teacher", created_at: "2026-01-01T00:00:00.000Z" },
    { membership_id: MEMBER_OTHER, role_code: "institute_admin", created_at: "2026-01-01T00:00:00.000Z" },
  ];
  db.role = [
    { code: "institute_admin", label: "Institute Admin", description: null, is_assignable: true },
    { code: "teacher", label: "Teacher", description: null, is_assignable: true },
    { code: "student", label: "Student", description: null, is_assignable: true },
    { code: "principal", label: "Principal", description: null, is_assignable: true },
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
        "token-ops": USER_OPS,
        "token-other": USER_OTHER,
        "token-new": USER_NEW,
      },
      db,
    }),
  );
}

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });
const jsonHeaders = (token: string) => ({
  ...auth(token),
  "Content-Type": "application/json",
});

describe("identity — institutes", () => {
  it("lists member institutes; platform creates; members cannot create", async () => {
    const app = appWithDb(baseDb());

    const list = await app.request("/api/v1/institutes", { headers: auth("token-admin") });
    expect(list.status).toBe(200);
    const ids = ((await json(list)).data as Array<{ id: string }>).map((r) => r.id);
    expect(ids).toEqual([INST_A]);

    expect(
      (
        await app.request("/api/v1/institutes", {
          method: "POST",
          headers: jsonHeaders("token-admin"),
          body: JSON.stringify({ code: "LX-C", name: "Gamma", kind: "school" }),
        })
      ).status,
    ).toBe(403);

    const created = await app.request("/api/v1/institutes", {
      method: "POST",
      headers: jsonHeaders("token-ops"),
      body: JSON.stringify({ code: "LX-C", name: "Gamma", kind: "school" }),
    });
    expect(created.status).toBe(201);
    const createdBody = await json(created);
    expect(createdBody.data.code).toBe("LX-C");

    expect(
      (await app.request(`/api/v1/institutes/${INST_B}`, { headers: auth("token-admin") })).status,
    ).toBe(403);
  });
});

describe("identity — profiles", () => {
  it("allows self get/patch; blocks other profiles", async () => {
    const app = appWithDb(baseDb());

    const me = await app.request(`/api/v1/profiles/${USER_ADMIN}`, {
      headers: auth("token-admin"),
    });
    expect(me.status).toBe(200);
    expect((await json(me)).data.displayName).toBe("Admin");

    expect(
      (await app.request(`/api/v1/profiles/${USER_TEACHER}`, { headers: auth("token-admin") }))
        .status,
    ).toBe(403);

    const patched = await app.request(`/api/v1/profiles/${USER_ADMIN}`, {
      method: "PATCH",
      headers: jsonHeaders("token-admin"),
      body: JSON.stringify({ display_name: "Admin Two", phone: "9000000000" }),
    });
    expect(patched.status).toBe(200);
    const body = await json(patched);
    expect(body.data.displayName).toBe("Admin Two");
    expect(body.data.phone).toBe("9000000000");
  });
});

describe("identity — memberships RBAC", () => {
  it("admins manage memberships; teachers cannot list institute directory", async () => {
    const app = appWithDb(baseDb());

    expect(
      (
        await app.request(`/api/v1/memberships?institute_id=${INST_A}`, {
          headers: auth("token-teacher"),
        })
      ).status,
    ).toBe(403);

    const listed = await app.request(`/api/v1/memberships?institute_id=${INST_A}`, {
      headers: auth("token-admin"),
    });
    expect(listed.status).toBe(200);
    expect(((await json(listed)).data as unknown[]).length).toBe(2);

    const created = await app.request("/api/v1/memberships", {
      method: "POST",
      headers: jsonHeaders("token-admin"),
      body: JSON.stringify({
        institute_id: INST_A,
        user_id: USER_NEW,
        roles: ["teacher"],
      }),
    });
    expect(created.status).toBe(201);
    const createdBody = await json(created);
    expect(createdBody.data.roles).toEqual(["teacher"]);
    expect(createdBody.data.userId).toBe(USER_NEW);

    expect(
      (
        await app.request("/api/v1/memberships", {
          method: "POST",
          headers: jsonHeaders("token-admin"),
          body: JSON.stringify({
            institute_id: INST_B,
            user_id: USER_NEW,
            roles: ["teacher"],
          }),
        })
      ).status,
    ).toBe(403);

    const own = await app.request(`/api/v1/memberships/${MEMBER_TEACHER}`, {
      headers: auth("token-teacher"),
    });
    expect(own.status).toBe(200);

    expect(
      (
        await app.request(`/api/v1/memberships/${MEMBER_TEACHER}`, {
          method: "DELETE",
          headers: auth("token-admin"),
        })
      ).status,
    ).toBe(200);
    expect(
      (await app.request(`/api/v1/memberships/${MEMBER_TEACHER}`, { headers: auth("token-admin") }))
        .status,
    ).toBe(404);
  });
});

describe("identity — institute delete decommissions tenant", () => {
  it("cascades membership soft-delete and blocks further access", async () => {
    const app = appWithDb(baseDb());

    expect(
      (
        await app.request(`/api/v1/institutes/${INST_A}`, {
          method: "DELETE",
          headers: auth("token-ops"),
        })
      ).status,
    ).toBe(200);

    expect(
      (await app.request(`/api/v1/institutes/${INST_A}`, { headers: auth("token-ops") }))
        .status,
    ).toBe(404);

    expect(
      (
        await app.request(`/api/v1/memberships?institute_id=${INST_A}`, {
          headers: auth("token-admin"),
        })
      ).status,
    ).toBe(403);

    expect(
      (
        await app.request(`/api/v1/institutes/${INST_A}/settings`, {
          headers: auth("token-admin"),
        })
      ).status,
    ).toBe(404);

    const list = await app.request("/api/v1/institutes", { headers: auth("token-admin") });
    expect(list.status).toBe(200);
    expect(((await json(list)).data as unknown[]).length).toBe(0);
  });
});

describe("identity — roles catalog and validation", () => {
  it("rejects unknown roles and legacy path ids", async () => {
    const app = appWithDb(baseDb());

    const roles = await app.request("/api/v1/roles", { headers: auth("token-admin") });
    expect(roles.status).toBe(200);
    expect(((await json(roles)).data as unknown[]).length).toBeGreaterThan(0);

    expect(
      (
        await app.request("/api/v1/memberships", {
          method: "POST",
          headers: jsonHeaders("token-admin"),
          body: JSON.stringify({
            institute_id: INST_A,
            user_id: USER_NEW,
            roles: ["not_a_real_role"],
          }),
        })
      ).status,
    ).toBe(400);

    expect(
      (await app.request("/api/v1/institutes/LX-A", { headers: auth("token-admin") })).status,
    ).toBe(400);
  });
});
