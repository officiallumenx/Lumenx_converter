import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createApp } from "../src/app.js";
import { loadEnv, resetEnvCache } from "../src/config/env.js";
import { createLogger } from "../src/logger/logger.js";
import {
  assertInstituteAccess,
  assertInstituteRoles,
  assertPlatformOperator,
  requireTeacherIdentity,
} from "../src/authorization/index.js";
import { assertTeacherAssigned } from "../src/authorization/teacher.js";
import { AppError } from "../src/errors/app-error.js";
import type { Actor } from "../src/auth/types.js";
import { validateQuery, validateParams } from "../src/validation/validate.js";
import { z } from "zod";
import {
  createMockSupabaseClients,
  emptyMockDb,
  type MockDb,
} from "./helpers/mock-supabase.js";

const silentLogger = createLogger("error");

const USER_A = "11111111-1111-1111-1111-111111111111";
const USER_B = "22222222-2222-2222-2222-222222222222";
const INST_A = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";
const INST_B = "bbbbbbbb-bbbb-bbbb-bbbb-bbbbbbbbbbbb";
const MEMBER_A = "m1111111-1111-1111-1111-111111111111";
const TEACHER_A = "t1111111-1111-1111-1111-111111111111";
const SECTION_A = "s1111111-1111-1111-1111-111111111111";
const SUBJECT_A = "u1111111-1111-1111-1111-111111111111";
const YEAR_A = "y1111111-1111-1111-1111-111111111111";
const ASSIGN_A = "a1111111-1111-1111-1111-111111111111";

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
      id: USER_A,
      display_name: "Alice",
      email: "alice@example.com",
      status: "active",
      deleted_at: null,
    },
    {
      id: USER_B,
      display_name: "Bob",
      email: "bob@example.com",
      status: "active",
      deleted_at: null,
    },
  ];
  db.membership = [
    {
      id: MEMBER_A,
      user_id: USER_A,
      institute_id: INST_A,
      status: "active",
      deleted_at: null,
    },
  ];
  db.membership_role = [
    { membership_id: MEMBER_A, role_code: "teacher" },
  ];
  db.teacher = [
    {
      id: TEACHER_A,
      institute_id: INST_A,
      user_profile_id: USER_A,
      status: "active",
      deleted_at: null,
    },
  ];
  db.teacher_assignment = [
    {
      id: ASSIGN_A,
      teacher_id: TEACHER_A,
      institute_id: INST_A,
      section_id: SECTION_A,
      subject_id: SUBJECT_A,
      academic_year_id: YEAR_A,
      status: "active",
      deleted_at: null,
    },
  ];
  return db;
}

function appWithDb(db: MockDb, tokens: Record<string, string> = { "token-a": USER_A, "token-b": USER_B }) {
  const env = loadEnv({ NODE_ENV: "test", LOG_LEVEL: "error" });
  const supabase = createMockSupabaseClients({ tokens, db });
  return createApp(env, silentLogger, supabase);
}

describe("GET /api/v1/me — auth failures", () => {
  it("returns 401 without Authorization", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request("/api/v1/me");
    expect(res.status).toBe(401);
    const body = await json(res);
    expect(body.error.code).toBe("UNAUTHENTICATED");
    expect(body.error.requestId).toBeTruthy();
  });

  it("returns 401 for malformed Bearer token", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request("/api/v1/me", {
      headers: { Authorization: "Token abc" },
    });
    expect(res.status).toBe(401);
    const body = await json(res);
    expect(body.error.code).toBe("UNAUTHENTICATED");
  });

  it("returns 401 for invalid token", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request("/api/v1/me", {
      headers: { Authorization: "Bearer not-a-real-token" },
    });
    expect(res.status).toBe(401);
    const body = await json(res);
    expect(body.error.code).toBe("UNAUTHENTICATED");
  });
});

describe("GET /api/v1/me — authenticated actor", () => {
  it("returns the caller's own actor context", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request("/api/v1/me", {
      headers: { Authorization: "Bearer token-a" },
    });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.data.user.id).toBe(USER_A);
    expect(body.data.profile.id).toBe(USER_A);
    expect(body.data.profile.displayName).toBe("Alice");
    expect(body.data.institutes).toEqual([
      {
        instituteId: INST_A,
        membershipId: MEMBER_A,
        status: "active",
        roles: ["teacher"],
      },
    ]);
    expect(body.data.platformOperator.active).toBe(false);
    expect(body.data.identities.teachers[0].teacherId).toBe(TEACHER_A);
    expect(body.data).not.toHaveProperty("service_role");
    expect(JSON.stringify(body)).not.toMatch(/service.role|Bearer token-a/i);
  });

  it("does not expose another user's memberships on /me", async () => {
    const app = appWithDb(baseDb());
    const resA = await app.request("/api/v1/me", {
      headers: { Authorization: "Bearer token-a" },
    });
    const resB = await app.request("/api/v1/me", {
      headers: { Authorization: "Bearer token-b" },
    });
    const a = await json(resA);
    const b = await json(resB);
    expect(a.data.user.id).toBe(USER_A);
    expect(b.data.user.id).toBe(USER_B);
    expect(b.data.institutes).toEqual([]);
    expect(a.data.institutes[0].instituteId).toBe(INST_A);
  });

  it("includes platform operator status when active", async () => {
    const db = baseDb();
    db.platform_operator = [
      {
        user_id: USER_A,
        role_code: "platform_admin",
        status: "active",
        deleted_at: null,
      },
    ];
    const app = appWithDb(db);
    const res = await app.request("/api/v1/me", {
      headers: { Authorization: "Bearer token-a" },
    });
    const body = await json(res);
    expect(body.data.platformOperator).toEqual({
      active: true,
      roleCode: "platform_admin",
    });
  });
});

describe("tenant / role authorization helpers", () => {
  const memberActor: Actor = {
    userId: USER_A,
    profileId: USER_A,
    displayName: "Alice",
    email: "alice@example.com",
    profileStatus: "active",
    memberships: [
      {
        membershipId: MEMBER_A,
        instituteId: INST_A,
        status: "active",
        roles: ["teacher"],
      },
    ],
    isPlatformOperator: false,
    platformRoleCode: null,
    teachers: [
      { teacherId: TEACHER_A, instituteId: INST_A, status: "active" },
    ],
    students: [],
    parents: [],
    staff: [],
  };

  it("rejects unrelated institute for ordinary member", () => {
    expect(() => assertInstituteAccess(memberActor, INST_B)).toThrow(AppError);
    try {
      assertInstituteAccess(memberActor, INST_B);
    } catch (e) {
      expect(e).toBeInstanceOf(AppError);
      expect((e as AppError).status).toBe(403);
      expect((e as AppError).code).toBe("FORBIDDEN");
    }
  });

  it("allows authorized institute membership", () => {
    const m = assertInstituteAccess(memberActor, INST_A);
    expect(m?.instituteId).toBe(INST_A);
  });

  it("allows platform operator to target any institute", () => {
    const op: Actor = { ...memberActor, isPlatformOperator: true, memberships: [] };
    expect(() => assertInstituteAccess(op, INST_B)).not.toThrow();
    assertPlatformOperator(op);
  });

  it("enforces institute role guard", () => {
    expect(() =>
      assertInstituteRoles(memberActor, INST_A, ["institute_admin"]),
    ).toThrow(AppError);
    expect(() =>
      assertInstituteRoles(memberActor, INST_A, ["teacher"]),
    ).not.toThrow();
  });

  it("resolves teacher identity for institute", () => {
    const t = requireTeacherIdentity(memberActor, INST_A);
    expect(t.teacherId).toBe(TEACHER_A);
  });
});

describe("assertTeacherAssigned", () => {
  it("passes for an active assignment", async () => {
    const clients = createMockSupabaseClients({
      tokens: {},
      db: baseDb(),
    });
    const result = await assertTeacherAssigned(clients.admin, {
      teacherId: TEACHER_A,
      instituteId: INST_A,
      sectionId: SECTION_A,
      subjectId: SUBJECT_A,
      academicYearId: YEAR_A,
    });
    expect(result.assignmentId).toBe(ASSIGN_A);
  });

  it("forbids missing assignment", async () => {
    const clients = createMockSupabaseClients({
      tokens: {},
      db: baseDb(),
    });
    await expect(
      assertTeacherAssigned(clients.admin, {
        teacherId: TEACHER_A,
        instituteId: INST_A,
        sectionId: SECTION_A,
        subjectId: "00000000-0000-0000-0000-000000000099",
      }),
    ).rejects.toMatchObject({ status: 403, code: "FORBIDDEN" });
  });
});

describe("validation helpers", () => {
  it("validateQuery and validateParams reuse AppError envelope shape", () => {
    const schema = z.object({ id: z.string().uuid() });
    expect(() => validateQuery(schema, { id: "bad" })).toThrow(AppError);
    expect(() => validateParams(schema, { id: "bad" })).toThrow(AppError);
  });
});

describe("health regression with foundation mounted", () => {
  it("keeps /api/v1/health and ready working", async () => {
    const app = appWithDb(baseDb());
    const health = await app.request("/api/v1/health");
    expect(health.status).toBe(200);

    const ready = await app.request("/api/v1/health/ready");
    // mock clients present but Auth health probe uses real fetch — may be degraded
    expect([200, 503]).toContain(ready.status);
    const body = await json(ready);
    expect(body.checks.supabase).toBeDefined();
  });
});
