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
const USER_OTHER = "44444444-4444-4444-8444-444444444444";
const INST_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const INST_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const MEMBER_ADMIN = "aa111111-1111-4111-8111-111111111111";
const MEMBER_OTHER = "aa444444-4444-4444-8444-444444444444";
const YEAR_A = "cc111111-1111-4111-8111-111111111111";
const CLASS_A = "cd111111-1111-4111-8111-111111111111";
const SECTION_A = "ce111111-1111-4111-8111-111111111111";
const STUDENT_A = "ac111111-1111-4111-8111-111111111111";
const STUDENT_B = "ac222222-2222-4222-8222-222222222222";
const ENROLL_A = "e1111111-1111-4111-8111-111111111111";
const ENROLL_B_OTHER_INST = "e2222222-2222-4222-8222-222222222222";
const YEAR_B = "cc222222-2222-4222-8222-222222222222";
const CLASS_B = "cd222222-2222-4222-8222-222222222222";
const SECTION_B = "ce222222-2222-4222-8222-222222222222";

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
    { id: USER_OTHER, display_name: "Other", email: "o@x.com", status: "active", deleted_at: null },
  ];
  db.membership = [
    { id: MEMBER_ADMIN, user_id: USER_ADMIN, institute_id: INST_A, status: "active", deleted_at: null },
    { id: MEMBER_OTHER, user_id: USER_OTHER, institute_id: INST_B, status: "active", deleted_at: null },
  ];
  db.membership_role = [
    { membership_id: MEMBER_ADMIN, role_code: "institute_admin" },
    { membership_id: MEMBER_OTHER, role_code: "institute_admin" },
  ];
  db.academic_year = [
    {
      id: YEAR_A,
      institute_id: INST_A,
      name: "2026",
      code: "Y26",
      starts_on: "2026-04-01",
      ends_on: "2027-03-31",
      status: "active",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      deleted_at: null,
    },
    {
      id: YEAR_B,
      institute_id: INST_B,
      name: "2026B",
      code: "Y26B",
      starts_on: "2026-04-01",
      ends_on: "2027-03-31",
      status: "active",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      deleted_at: null,
    },
  ];
  db.class = [
    {
      id: CLASS_A,
      institute_id: INST_A,
      academic_year_id: YEAR_A,
      name: "Grade 10",
      code: "G10",
      sort_order: 1,
      status: "active",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      deleted_at: null,
    },
    {
      id: CLASS_B,
      institute_id: INST_B,
      academic_year_id: YEAR_B,
      name: "Grade 10",
      code: "G10",
      sort_order: 1,
      status: "active",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      deleted_at: null,
    },
  ];
  db.section = [
    {
      id: SECTION_A,
      institute_id: INST_A,
      academic_year_id: YEAR_A,
      class_id: CLASS_A,
      name: "A",
      code: "A",
      capacity: 40,
      room: null,
      sort_order: 1,
      status: "active",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      deleted_at: null,
    },
    {
      id: SECTION_B,
      institute_id: INST_B,
      academic_year_id: YEAR_B,
      class_id: CLASS_B,
      name: "A",
      code: "A",
      capacity: 40,
      room: null,
      sort_order: 1,
      status: "active",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      deleted_at: null,
    },
  ];
  db.student = [
    {
      id: STUDENT_A,
      institute_id: INST_A,
      first_name: "Ada",
      surname: "Lovelace",
      display_name: "Ada Lovelace",
      status: "active",
      deleted_at: null,
    },
    {
      id: STUDENT_B,
      institute_id: INST_B,
      first_name: "Other",
      surname: "Student",
      display_name: "Other Student",
      status: "active",
      deleted_at: null,
    },
  ];
  db.enrollment = [
    {
      id: ENROLL_A,
      institute_id: INST_A,
      academic_year_id: YEAR_A,
      student_id: STUDENT_A,
      class_id: CLASS_A,
      section_id: SECTION_A,
      roll_no: "1",
      status: "active",
      enrolled_on: "2026-04-01",
      withdrawn_on: null,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      deleted_at: null,
    },
    {
      id: ENROLL_B_OTHER_INST,
      institute_id: INST_B,
      academic_year_id: YEAR_B,
      student_id: STUDENT_B,
      class_id: CLASS_B,
      section_id: SECTION_B,
      roll_no: "1",
      status: "active",
      enrolled_on: "2026-04-01",
      withdrawn_on: null,
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
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
        "token-other": USER_OTHER,
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

describe("enrollments API", () => {
  it("lists enrollments for institute section", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request(
      `/api/v1/enrollments?institute_id=${INST_A}&section_id=${SECTION_A}`,
      { headers: auth("token-admin") },
    );
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toBe(ENROLL_A);
    expect(body.data[0].studentName).toBe("Ada Lovelace");
  });

  it("rejects invalid institute UUID", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request(
      `/api/v1/enrollments?institute_id=not-a-uuid&section_id=${SECTION_A}`,
      { headers: auth("token-admin") },
    );
    expect(res.status).toBe(400);
  });

  it("isolates institutes — INST_A admin cannot list INST_B enrollments", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request(
      `/api/v1/enrollments?institute_id=${INST_B}&section_id=${SECTION_B}`,
      { headers: auth("token-admin") },
    );
    expect(res.status).toBe(403);
  });

  it("forbids get of other institute enrollment", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request(`/api/v1/enrollments/${ENROLL_B_OTHER_INST}`, {
      headers: auth("token-admin"),
    });
    expect(res.status).toBe(403);
  });

  it("creates enrollment in institute", async () => {
    const db = baseDb();
    db.enrollment = [];
    const app = appWithDb(db);
    const res = await app.request("/api/v1/enrollments", {
      method: "POST",
      headers: jsonHeaders("token-admin"),
      body: JSON.stringify({
        institute_id: INST_A,
        academic_year_id: YEAR_A,
        student_id: STUDENT_A,
        class_id: CLASS_A,
        section_id: SECTION_A,
        roll_no: "12",
        enrolled_on: "2026-04-15",
      }),
    });
    expect(res.status).toBe(201);
    const body = await json(res);
    expect(body.data.studentId).toBe(STUDENT_A);
    expect(body.data.rollNo).toBe("12");
    expect(body.data.status).toBe("active");
  });

  it("rejects create with cross-institute student", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request("/api/v1/enrollments", {
      method: "POST",
      headers: jsonHeaders("token-admin"),
      body: JSON.stringify({
        institute_id: INST_A,
        academic_year_id: YEAR_A,
        student_id: STUDENT_B,
        class_id: CLASS_A,
        section_id: SECTION_A,
        roll_no: "99",
        enrolled_on: "2026-04-15",
      }),
    });
    expect(res.status).toBe(400);
  });

  it("requires auth", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request(
      `/api/v1/enrollments?institute_id=${INST_A}`,
    );
    expect(res.status).toBe(401);
  });

  it("updates enrollment roll number and status", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request(`/api/v1/enrollments/${ENROLL_A}`, {
      method: "PATCH",
      headers: jsonHeaders("token-admin"),
      body: JSON.stringify({
        roll_no: "8",
        status: "transferred",
      }),
    });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.data.rollNo).toBe("8");
    expect(body.data.status).toBe("transferred");
    expect(body.data.withdrawnOn).toBeTruthy();
  });

  it("forbids patch of other institute enrollment", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request(`/api/v1/enrollments/${ENROLL_B_OTHER_INST}`, {
      method: "PATCH",
      headers: jsonHeaders("token-admin"),
      body: JSON.stringify({ roll_no: "99" }),
    });
    expect(res.status).toBe(403);
  });
});
