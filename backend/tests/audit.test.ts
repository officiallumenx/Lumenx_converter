import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createApp } from "../src/app.js";
import { loadEnv, resetEnvCache } from "../src/config/env.js";
import { createLogger } from "../src/logger/logger.js";
import {
  createMockSupabaseClients,
  emptyMockDb,
  type MockDb,
} from "./helpers/mock-supabase.js";
import {
  recordInstituteAuditForActor,
  recordPlatformAuditForActor,
} from "../src/domains/audit/service.js";
import type { Actor } from "../src/auth/types.js";

const silentLogger = createLogger("error");

const USER_ADMIN = "11111111-1111-4111-8111-111111111111";
const USER_TEACHER = "22222222-2222-4222-8222-222222222222";
const USER_OPS = "33333333-3333-4333-8333-333333333333";
const USER_ANALYST = "55555555-5555-4555-8555-555555555555";
const USER_OTHER = "44444444-4444-4444-8444-444444444444";
const INST_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const INST_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const MEMBER_ADMIN = "aa111111-1111-4111-8111-111111111111";
const MEMBER_TEACHER = "aa222222-2222-4222-8222-222222222222";
const MEMBER_OTHER = "aa444444-4444-4444-8444-444444444444";
const OP_OPS = "c0333333-3333-4333-8333-333333333333";
const OP_ANALYST = "c0555555-5555-4555-8555-555555555555";
const AUDIT_A = "dd111111-1111-4111-8111-111111111111";
const AUDIT_PLATFORM = "dd222222-2222-4222-8222-222222222222";
const AUDIT_B = "dd333333-3333-4333-8333-333333333333";

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
    { id: USER_TEACHER, display_name: "Teacher", email: "t@x.com", status: "active", deleted_at: null },
    { id: USER_OPS, display_name: "Ops", email: "o@x.com", status: "active", deleted_at: null },
    { id: USER_ANALYST, display_name: "Analyst", email: "an@x.com", status: "active", deleted_at: null },
    { id: USER_OTHER, display_name: "Other", email: "x@x.com", status: "active", deleted_at: null },
  ];
  db.membership = [
    { id: MEMBER_ADMIN, user_id: USER_ADMIN, institute_id: INST_A, status: "active", deleted_at: null },
    { id: MEMBER_TEACHER, user_id: USER_TEACHER, institute_id: INST_A, status: "active", deleted_at: null },
    { id: MEMBER_OTHER, user_id: USER_OTHER, institute_id: INST_B, status: "active", deleted_at: null },
  ];
  db.membership_role = [
    { membership_id: MEMBER_ADMIN, role_code: "institute_admin" },
    { membership_id: MEMBER_TEACHER, role_code: "teacher" },
    { membership_id: MEMBER_OTHER, role_code: "institute_admin" },
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
    {
      id: OP_ANALYST,
      user_id: USER_ANALYST,
      role_code: "analyst",
      handle: "analyst",
      display_name: "Analyst",
      status: "active",
      deleted_at: null,
    },
  ];
  db.institute = [
    { id: INST_A, code: "A", name: "A", kind: "school", status: "active", deleted_at: null },
    { id: INST_B, code: "B", name: "B", kind: "school", status: "active", deleted_at: null },
  ];
  db.audit_event = [
    {
      id: AUDIT_A,
      scope: "institute",
      institute_id: INST_A,
      actor_user_id: USER_ADMIN,
      action: "student.updated",
      entity_type: "student",
      entity_id: "s1",
      metadata: { field: "status" },
      created_at: "2026-01-02T00:00:00.000Z",
    },
    {
      id: AUDIT_B,
      scope: "institute",
      institute_id: INST_B,
      actor_user_id: USER_OTHER,
      action: "student.updated",
      entity_type: "student",
      entity_id: "s2",
      metadata: {},
      created_at: "2026-01-03T00:00:00.000Z",
    },
    {
      id: AUDIT_PLATFORM,
      scope: "platform",
      institute_id: null,
      actor_user_id: USER_OPS,
      action: "plan_changed",
      entity_type: "license",
      entity_id: INST_A,
      metadata: { before: "plus", after: "max" },
      created_at: "2026-01-04T00:00:00.000Z",
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
        "token-ops": USER_OPS,
        "token-analyst": USER_ANALYST,
        "token-other": USER_OTHER,
      },
      db,
    }),
  );
}

function clientsFor(db: MockDb) {
  return createMockSupabaseClients({
    tokens: {
      "token-admin": USER_ADMIN,
      "token-ops": USER_OPS,
      "token-analyst": USER_ANALYST,
    },
    db,
  });
}

const adminActor: Actor = {
  userId: USER_ADMIN,
  profileId: USER_ADMIN,
  displayName: "Admin",
  email: "a@x.com",
  profileStatus: "active",
  memberships: [
    {
      membershipId: MEMBER_ADMIN,
      instituteId: INST_A,
      status: "active",
      roles: ["institute_admin"],
    },
  ],
  isPlatformOperator: false,
  platformRoleCode: null,
  teachers: [],
  students: [],
  parents: [],
  staff: [],
};

const opsActor: Actor = {
  userId: USER_OPS,
  profileId: USER_OPS,
  displayName: "Ops",
  email: "o@x.com",
  profileStatus: "active",
  memberships: [],
  isPlatformOperator: true,
  platformRoleCode: "operations",
  teachers: [],
  students: [],
  parents: [],
  staff: [],
};

const analystActor: Actor = {
  ...opsActor,
  userId: USER_ANALYST,
  profileId: USER_ANALYST,
  displayName: "Analyst",
  email: "an@x.com",
  platformRoleCode: "analyst",
};

describe("audit api", () => {
  it("lists institute audit for admin and blocks teacher / cross-tenant", async () => {
    const app = appWithDb(baseDb());

    const ok = await app.request(`/api/v1/audit?institute_id=${INST_A}`, {
      headers: { Authorization: "Bearer token-admin" },
    });
    expect(ok.status).toBe(200);
    const body = await json(ok);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toBe(AUDIT_A);

    const teacher = await app.request(`/api/v1/audit?institute_id=${INST_A}`, {
      headers: { Authorization: "Bearer token-teacher" },
    });
    expect(teacher.status).toBe(403);

    const cross = await app.request(`/api/v1/audit?institute_id=${INST_B}`, {
      headers: { Authorization: "Bearer token-admin" },
    });
    expect(cross.status).toBe(403);
  });

  it("does not expose HTTP append for institute audit", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request("/api/v1/audit", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-admin",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        instituteId: INST_A,
        action: "marks.published",
        entityType: "exam",
        entityId: "exam-1",
      }),
    });
    expect(res.status).toBe(404);
  });

  it("records institute audit from trusted server path", async () => {
    const db = baseDb();
    const clients = clientsFor(db);
    const data = await recordInstituteAuditForActor(
      clients.admin as SupabaseClient,
      adminActor,
      {
        instituteId: INST_A,
        action: "marks.published",
        entityType: "exam",
        entityId: "exam-1",
        metadata: { status: "success" },
      },
    );
    expect(data.actorUserId).toBe(USER_ADMIN);
    expect(data.scope).toBe("institute");
    expect(db.audit_event.some((e) => e.action === "marks.published")).toBe(
      true,
    );
  });

  it("rejects private-chat audit content on trusted append", async () => {
    const db = baseDb();
    const clients = clientsFor(db);
    await expect(
      recordInstituteAuditForActor(clients.admin as SupabaseClient, adminActor, {
        instituteId: INST_A,
        action: "reviewed inbox",
        entityType: "message",
        entityId: "m1",
        metadata: { transcript: "hello" },
      }),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("lists platform audit for operators and blocks institute admin", async () => {
    const app = appWithDb(baseDb());

    const denied = await app.request("/api/nexus/audit", {
      headers: { Authorization: "Bearer token-admin" },
    });
    expect(denied.status).toBe(403);

    const list = await app.request("/api/nexus/audit", {
      headers: { Authorization: "Bearer token-ops" },
    });
    expect(list.status).toBe(200);
    const listed = await json(list);
    expect(listed.data).toHaveLength(1);
    expect(listed.data[0].id).toBe(AUDIT_PLATFORM);
  });

  it("does not expose HTTP append for platform audit", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request("/api/nexus/audit", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-ops",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        action: "module_disabled",
        entityType: "module",
        entityId: "transport",
      }),
    });
    expect(res.status).toBe(404);
  });

  it("records platform audit for ops and denies analyst", async () => {
    const db = baseDb();
    const clients = clientsFor(db);

    const created = await recordPlatformAuditForActor(
      clients.admin as SupabaseClient,
      opsActor,
      {
        action: "module_disabled",
        entityType: "module",
        entityId: "transport",
        metadata: { instituteId: INST_A },
      },
    );
    expect(created.scope).toBe("platform");
    expect(created.instituteId).toBeNull();

    await expect(
      recordPlatformAuditForActor(clients.admin as SupabaseClient, analystActor, {
        action: "module_disabled",
        entityType: "module",
        entityId: "transport",
      }),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("blocks institute admin from reading platform audit by id", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request(`/api/nexus/audit/${AUDIT_PLATFORM}`, {
      headers: { Authorization: "Bearer token-admin" },
    });
    expect(res.status).toBe(403);
  });

  it("allows platform ops to read institute audit", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request(`/api/v1/audit?institute_id=${INST_A}`, {
      headers: { Authorization: "Bearer token-ops" },
    });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.data[0].id).toBe(AUDIT_A);
  });
});
