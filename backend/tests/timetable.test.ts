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
const USER_OTHER = "33333333-3333-4333-8333-333333333333";
const INST_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const INST_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const MEMBER_ADMIN = "aa111111-1111-4111-8111-111111111111";
const MEMBER_TEACHER = "aa222222-2222-4222-8222-222222222222";
const MEMBER_OTHER = "aa333333-3333-4333-8333-333333333333";
const TEACHER_A = "bb111111-1111-4111-8111-111111111111";
const TEACHER_B = "bb222222-2222-4222-8222-222222222222";
const SECTION_A = "cc111111-1111-4111-8111-111111111111";
const SECTION_B = "cc222222-2222-4222-8222-222222222222";
const SUBJECT_A = "dd111111-1111-4111-8111-111111111111";
const SUBJECT_B = "dd222222-2222-4222-8222-222222222222";
const YEAR_A = "ee111111-1111-4111-8111-111111111111";
const YEAR_B = "ee222222-2222-4222-8222-222222222222";
const CLASS_A = "ff111111-1111-4111-8111-111111111111";
const CLASS_B = "ff222222-2222-4222-8222-222222222222";
const ASSIGN_A = "ab111111-1111-4111-8111-111111111111";
const ASSIGN_B = "ab222222-2222-4222-8222-222222222222";
const SLOT_A = "ac111111-1111-4111-8111-111111111111";

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
      email: "admin@example.com",
      status: "active",
      deleted_at: null,
    },
    {
      id: USER_TEACHER,
      display_name: "Teacher",
      email: "teacher@example.com",
      status: "active",
      deleted_at: null,
    },
    {
      id: USER_OTHER,
      display_name: "Other",
      email: "other@example.com",
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
      id: MEMBER_TEACHER,
      user_id: USER_TEACHER,
      institute_id: INST_A,
      status: "active",
      deleted_at: null,
    },
    {
      id: MEMBER_OTHER,
      user_id: USER_OTHER,
      institute_id: INST_B,
      status: "active",
      deleted_at: null,
    },
  ];
  db.membership_role = [
    { membership_id: MEMBER_ADMIN, role_code: "institute_admin" },
    { membership_id: MEMBER_TEACHER, role_code: "teacher" },
    { membership_id: MEMBER_OTHER, role_code: "institute_admin" },
  ];
  db.teacher = [
    {
      id: TEACHER_A,
      institute_id: INST_A,
      user_profile_id: USER_TEACHER,
      status: "active",
      deleted_at: null,
    },
    {
      id: TEACHER_B,
      institute_id: INST_B,
      user_profile_id: USER_OTHER,
      status: "active",
      deleted_at: null,
    },
  ];
  db.academic_year = [
    { id: YEAR_A, institute_id: INST_A, deleted_at: null },
    { id: YEAR_B, institute_id: INST_B, deleted_at: null },
  ];
  db.class = [
    {
      id: CLASS_A,
      institute_id: INST_A,
      academic_year_id: YEAR_A,
      deleted_at: null,
    },
    {
      id: CLASS_B,
      institute_id: INST_B,
      academic_year_id: YEAR_B,
      deleted_at: null,
    },
  ];
  db.subject = [
    { id: SUBJECT_A, institute_id: INST_A, deleted_at: null },
    { id: SUBJECT_B, institute_id: INST_A, deleted_at: null },
  ];
  db.section = [
    {
      id: SECTION_A,
      institute_id: INST_A,
      academic_year_id: YEAR_A,
      class_id: CLASS_A,
      deleted_at: null,
    },
    {
      id: SECTION_B,
      institute_id: INST_B,
      academic_year_id: YEAR_B,
      class_id: CLASS_B,
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
      class_id: CLASS_A,
      status: "active",
      deleted_at: null,
    },
    {
      id: ASSIGN_B,
      teacher_id: TEACHER_B,
      institute_id: INST_B,
      section_id: SECTION_B,
      subject_id: SUBJECT_A,
      academic_year_id: YEAR_B,
      class_id: CLASS_B,
      status: "active",
      deleted_at: null,
    },
  ];
  db.timetable_slot = [
    {
      id: SLOT_A,
      institute_id: INST_A,
      academic_year_id: YEAR_A,
      class_id: CLASS_A,
      section_id: SECTION_A,
      teacher_assignment_id: ASSIGN_A,
      day_of_week: 1,
      period_index: 1,
      starts_at: "08:00:00",
      ends_at: "08:45:00",
      room: "101",
      status: "active",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      deleted_at: null,
    },
  ];
  return db;
}

function appWithDb(
  db: MockDb,
  tokens: Record<string, string> = {
    "token-admin": USER_ADMIN,
    "token-teacher": USER_TEACHER,
    "token-other": USER_OTHER,
  },
  nextErrors?: Array<{ code: string; message?: string } | null>,
) {
  const env = loadEnv({ NODE_ENV: "test", LOG_LEVEL: "error" });
  const supabase = createMockSupabaseClients({ tokens, db, nextErrors });
  return createApp(env, silentLogger, supabase);
}

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

describe("timetable — authentication", () => {
  it("returns 401 without JWT", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request(`/api/v1/timetable?institute_id=${INST_A}`);
    expect(res.status).toBe(401);
    const body = await json(res);
    expect(body.error.code).toBe("UNAUTHENTICATED");
  });

  it("returns 401 for invalid JWT", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request(`/api/v1/timetable?institute_id=${INST_A}`, {
      headers: auth("bad-token"),
    });
    expect(res.status).toBe(401);
    expect((await json(res)).error.code).toBe("UNAUTHENTICATED");
  });
});

describe("timetable — tenant isolation", () => {
  it("rejects access to another institute", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request(`/api/v1/timetable?institute_id=${INST_B}`, {
      headers: auth("token-admin"),
    });
    expect(res.status).toBe(403);
    expect((await json(res)).error.code).toBe("FORBIDDEN");
  });

  it("rejects spoofed institute_id on create", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request("/api/v1/timetable", {
      method: "POST",
      headers: { ...auth("token-admin"), "Content-Type": "application/json" },
      body: JSON.stringify({
        institute_id: INST_B,
        academic_year_id: YEAR_B,
        class_id: CLASS_B,
        section_id: SECTION_B,
        teacher_assignment_id: ASSIGN_B,
        day_of_week: 2,
        period_index: 1,
        starts_at: "09:00",
        ends_at: "09:45",
      }),
    });
    expect(res.status).toBe(403);
    expect((await json(res)).error.code).toBe("FORBIDDEN");
  });

  it("rejects cross-institute section reference", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request("/api/v1/timetable", {
      method: "POST",
      headers: { ...auth("token-admin"), "Content-Type": "application/json" },
      body: JSON.stringify({
        institute_id: INST_A,
        academic_year_id: YEAR_A,
        class_id: CLASS_A,
        section_id: SECTION_B,
        teacher_assignment_id: ASSIGN_A,
        day_of_week: 2,
        period_index: 2,
        starts_at: "09:00",
        ends_at: "09:45",
      }),
    });
    expect(res.status).toBe(400);
    expect((await json(res)).error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects cross-institute teacher filter", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request(
      `/api/v1/timetable?institute_id=${INST_A}&teacher_id=${TEACHER_B}`,
      { headers: auth("token-admin") },
    );
    expect(res.status).toBe(400);
    expect((await json(res)).error.code).toBe("VALIDATION_ERROR");
  });
});

describe("timetable — read authorization", () => {
  it("allows institute admin to list permitted slots", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request(`/api/v1/timetable?institute_id=${INST_A}`, {
      headers: auth("token-admin"),
    });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toBe(SLOT_A);
    expect(body.data[0].instituteId).toBe(INST_A);
  });

  it("allows teacher role to read institute slots", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request(`/api/v1/timetable?institute_id=${INST_A}`, {
      headers: auth("token-teacher"),
    });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.data[0].id).toBe(SLOT_A);
  });

  it("returns a single slot by id", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request(`/api/v1/timetable/${SLOT_A}`, {
      headers: auth("token-admin"),
    });
    expect(res.status).toBe(200);
    expect((await json(res)).data.id).toBe(SLOT_A);
  });

  it("lists teacher assignments for slot pickers", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request(
      `/api/v1/timetable/assignments?institute_id=${INST_A}&section_id=${SECTION_A}`,
      { headers: auth("token-admin") },
    );
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toBe(ASSIGN_A);
    expect(body.data[0].sectionId).toBe(SECTION_A);
    expect(body.data[0].teacherId).toBe(TEACHER_A);
  });

  it("allows staff to create a teacher assignment", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request("/api/v1/timetable/assignments", {
      method: "POST",
      headers: { ...auth("token-admin"), "Content-Type": "application/json" },
      body: JSON.stringify({
        institute_id: INST_A,
        academic_year_id: YEAR_A,
        class_id: CLASS_A,
        section_id: SECTION_A,
        subject_id: SUBJECT_B,
        teacher_id: TEACHER_A,
      }),
    });
    expect(res.status).toBe(201);
    const body = await json(res);
    expect(body.data.sectionId).toBe(SECTION_A);
    expect(body.data.subjectId).toBe(SUBJECT_B);
    expect(body.data.teacherId).toBe(TEACHER_A);
  });

  it("forbids teacher from creating assignments", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request("/api/v1/timetable/assignments", {
      method: "POST",
      headers: { ...auth("token-teacher"), "Content-Type": "application/json" },
      body: JSON.stringify({
        institute_id: INST_A,
        academic_year_id: YEAR_A,
        class_id: CLASS_A,
        section_id: SECTION_A,
        subject_id: SUBJECT_B,
        teacher_id: TEACHER_A,
      }),
    });
    expect(res.status).toBe(403);
    expect((await json(res)).error.code).toBe("FORBIDDEN");
  });
});

describe("timetable — write authorization", () => {
  it("forbids teacher from creating slots", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request("/api/v1/timetable", {
      method: "POST",
      headers: { ...auth("token-teacher"), "Content-Type": "application/json" },
      body: JSON.stringify({
        institute_id: INST_A,
        academic_year_id: YEAR_A,
        class_id: CLASS_A,
        section_id: SECTION_A,
        teacher_assignment_id: ASSIGN_A,
        day_of_week: 3,
        period_index: 1,
        starts_at: "10:00",
        ends_at: "10:45",
      }),
    });
    expect(res.status).toBe(403);
    expect((await json(res)).error.code).toBe("FORBIDDEN");
  });

  it("allows staff to create a valid slot", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request("/api/v1/timetable", {
      method: "POST",
      headers: { ...auth("token-admin"), "Content-Type": "application/json" },
      body: JSON.stringify({
        institute_id: INST_A,
        academic_year_id: YEAR_A,
        class_id: CLASS_A,
        section_id: SECTION_A,
        teacher_assignment_id: ASSIGN_A,
        day_of_week: 3,
        period_index: 2,
        starts_at: "10:00",
        ends_at: "10:45",
        room: "Lab-1",
      }),
    });
    expect(res.status).toBe(201);
    const body = await json(res);
    expect(body.data.dayOfWeek).toBe(3);
    expect(body.data.periodIndex).toBe(2);
    expect(body.data.teacherAssignmentId).toBe(ASSIGN_A);
    expect(body.data.status).toBe("active");
  });

  it("allows staff to patch and soft-delete", async () => {
    const db = baseDb();
    const app = appWithDb(db);

    const patch = await app.request(`/api/v1/timetable/${SLOT_A}`, {
      method: "PATCH",
      headers: { ...auth("token-admin"), "Content-Type": "application/json" },
      body: JSON.stringify({ room: "202", status: "inactive" }),
    });
    expect(patch.status).toBe(200);
    expect((await json(patch)).data.room).toBe("202");

    const del = await app.request(`/api/v1/timetable/${SLOT_A}`, {
      method: "DELETE",
      headers: auth("token-admin"),
    });
    expect(del.status).toBe(204);

    const get = await app.request(`/api/v1/timetable/${SLOT_A}`, {
      headers: auth("token-admin"),
    });
    expect(get.status).toBe(404);
  });
});

describe("timetable — validation", () => {
  it("rejects invalid UUID path param", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request("/api/v1/timetable/not-a-uuid", {
      headers: auth("token-admin"),
    });
    expect(res.status).toBe(400);
    expect((await json(res)).error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects invalid day / time / enum", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request("/api/v1/timetable", {
      method: "POST",
      headers: { ...auth("token-admin"), "Content-Type": "application/json" },
      body: JSON.stringify({
        institute_id: INST_A,
        academic_year_id: YEAR_A,
        class_id: CLASS_A,
        section_id: SECTION_A,
        teacher_assignment_id: ASSIGN_A,
        day_of_week: 9,
        period_index: 0,
        starts_at: "25:00",
        ends_at: "08:00",
        status: "published",
      }),
    });
    expect(res.status).toBe(400);
    expect((await json(res)).error.code).toBe("VALIDATION_ERROR");
  });
});

describe("timetable — database error mapping", () => {
  it("maps unique conflict without leaking internals", async () => {
    const db = baseDb();
    const env = loadEnv({ NODE_ENV: "test", LOG_LEVEL: "error" });
    // Auth: 7 builders; create: section + assignment + insert → error on insert.
    const nextErrors: Array<{ code: string; message?: string } | null> = [
      ...Array(9).fill(null),
      {
        code: "23505",
        message:
          "duplicate key value violates unique constraint timetable_slot_section_day_period_active_uidx",
      },
    ];
    const supabase = createMockSupabaseClients({
      tokens: { "token-admin": USER_ADMIN },
      db,
      nextErrors,
    });
    const app = createApp(env, silentLogger, supabase);

    const res = await app.request("/api/v1/timetable", {
      method: "POST",
      headers: { ...auth("token-admin"), "Content-Type": "application/json" },
      body: JSON.stringify({
        institute_id: INST_A,
        academic_year_id: YEAR_A,
        class_id: CLASS_A,
        section_id: SECTION_A,
        teacher_assignment_id: ASSIGN_A,
        day_of_week: 4,
        period_index: 3,
        starts_at: "11:00",
        ends_at: "11:45",
      }),
    });
    expect(res.status).toBe(409);
    const body = await json(res);
    expect(body.error.code).toBe("CONFLICT");
    expect(JSON.stringify(body)).not.toMatch(/duplicate key|timetable_slot_section/i);
  });

  it("maps unexpected DB errors to INTERNAL without leaking message", async () => {
    const db = baseDb();
    const env = loadEnv({ NODE_ENV: "test", LOG_LEVEL: "error" });
    // Auth: 7 builders; list slots is 8th.
    const nextErrors: Array<{ code: string; message?: string } | null> = [
      ...Array(7).fill(null),
      { code: "XX000", message: "secret connection string postgresql://..." },
    ];
    const supabase = createMockSupabaseClients({
      tokens: { "token-admin": USER_ADMIN },
      db,
      nextErrors,
    });
    const app = createApp(env, silentLogger, supabase);
    const res = await app.request(`/api/v1/timetable?institute_id=${INST_A}`, {
      headers: auth("token-admin"),
    });
    expect(res.status).toBe(500);
    const body = await json(res);
    expect(body.error.code).toBe("INTERNAL_ERROR");
    expect(JSON.stringify(body)).not.toMatch(/postgresql:\/\//i);
  });
});

describe("timetable — portal routes", () => {
  it("returns teacher portal timetable for signed-in teacher", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request(
      `/api/v1/timetable/portal/teacher?institute_id=${INST_A}`,
      { headers: auth("token-teacher") },
    );
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.data.periods.length).toBeGreaterThan(0);
    expect(body.data.weekdays.length).toBeGreaterThan(0);
  });
});

describe("timetable — health regression", () => {
  it("keeps health endpoints available", async () => {
    const app = appWithDb(baseDb());
    const health = await app.request("/api/v1/health");
    expect(health.status).toBe(200);
    const ready = await app.request("/api/v1/health/ready");
    expect([200, 503]).toContain(ready.status);
  });
});
