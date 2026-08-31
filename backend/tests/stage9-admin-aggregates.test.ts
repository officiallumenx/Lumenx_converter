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
const TEACHER_A = "t0111111-1111-4111-8111-111111111111";

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
  db.institute = [
    { id: INST_A, code: "A", name: "A", kind: "school", status: "active", deleted_at: null },
    { id: INST_B, code: "B", name: "B", kind: "school", status: "active", deleted_at: null },
  ];
  db.teacher = [
    {
      id: TEACHER_A,
      institute_id: INST_A,
      user_profile_id: null,
      legacy_code: null,
      employee_id: "E1",
      display_name: "Priya Iyer",
      phone: null,
      email: null,
      department: "Biology",
      qualification: null,
      date_of_birth: null,
      joined_on: null,
      teaching_scope: "subject_teacher",
      portal_access_level: "faculty_grading",
      status: "active",
      subjects: null,
      assigned_section_labels: null,
      source_career_application_id: null,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
  ];
  db.subscription = [
    {
      id: "s0111111-1111-4111-8111-111111111111",
      institute_id: INST_A,
      lifecycle_status: "active",
      assigned_rate_inr: 100,
      active_student_count: 250,
      trial_start_at: null,
      trial_end_at: null,
      grace_ends_at: null,
      current_period_id: null,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
  ];
  db.license = [
    {
      id: "l0111111-1111-4111-8111-111111111111",
      institute_id: INST_A,
      plan: "plus",
      cadence: "yearly",
      starts_on: "2026-01-01",
      reminder_days: [30, 14, 7],
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
  ];
  db.module_entitlement = [
    {
      id: "e0111111-1111-4111-8111-111111111111",
      institute_id: INST_A,
      license_id: "l0111111-1111-4111-8111-111111111111",
      scope: "admin_module",
      portal_id: null,
      target_id: "analytics",
      enabled: true,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
    {
      id: "e0222222-2222-4222-8222-222222222222",
      institute_id: INST_A,
      license_id: "l0111111-1111-4111-8111-111111111111",
      scope: "admin_module",
      portal_id: null,
      target_id: "fees",
      enabled: false,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
  ];
  return db;
}

function testApp(db: MockDb = baseDb()) {
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

function authHeaders(userId: "admin" | "other" = "admin") {
  return {
    Authorization: userId === "admin" ? "Bearer token-admin" : "Bearer token-other",
  };
}

describe("stage 9 admin aggregates", () => {
  it("GET /analytics returns institute summary", async () => {
    const app = testApp();
    const res = await app.request(`/api/v1/analytics?institute_id=${INST_A}`, {
      headers: authHeaders(),
    });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.data.instituteId).toBe(INST_A);
    expect(body.data.teachers).toBe(1);
    expect(typeof body.data.students).toBe("number");
    expect(typeof body.data.openComplaints).toBe("number");
  });

  it("rejects analytics for foreign institute", async () => {
    const app = testApp();
    const res = await app.request(`/api/v1/analytics?institute_id=${INST_B}`, {
      headers: authHeaders(),
    });
    expect(res.status).toBe(403);
  });

  it("GET /analytics/series returns institute-scoped chart series", async () => {
    const app = testApp();
    const res = await app.request(
      `/api/v1/analytics/series?institute_id=${INST_A}&range=term`,
      { headers: authHeaders() },
    );
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.data.instituteId).toBe(INST_A);
    expect(body.data.range).toBe("term");
    expect(Array.isArray(body.data.enrollmentMonthly)).toBe(true);
    expect(body.data.enrollmentMonthly.length).toBe(4);
    expect(Array.isArray(body.data.attendanceMonthly)).toBe(true);
    expect(Array.isArray(body.data.feePaymentsMonthly)).toBe(true);
    expect(Array.isArray(body.data.subjectAverages)).toBe(true);
    expect(Array.isArray(body.data.studentStatus)).toBe(true);
  });

  it("rejects analytics series for foreign institute", async () => {
    const app = testApp();
    const res = await app.request(
      `/api/v1/analytics/series?institute_id=${INST_B}&range=year`,
      { headers: authHeaders() },
    );
    expect(res.status).toBe(403);
  });

  it("lists report catalog and creates a job", async () => {
    const app = testApp();
    const catalog = await app.request(
      `/api/v1/reports/catalog?institute_id=${INST_A}`,
      { headers: authHeaders() },
    );
    expect(catalog.status).toBe(200);
    const catalogBody = await json(catalog);
    expect(catalogBody.data.length).toBeGreaterThan(0);

    const created = await app.request("/api/v1/reports/jobs", {
      method: "POST",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({
        institute_id: INST_A,
        report_id: "students",
      }),
    });
    expect(created.status).toBe(201);
    const job = (await json(created)).data;
    expect(job.status).toBe("ready");
    expect(job.downloadUrl).toBe(`/api/v1/reports/jobs/${job.id}/download`);

    const jobs = await app.request(
      `/api/v1/reports/jobs?institute_id=${INST_A}`,
      { headers: authHeaders() },
    );
    expect(jobs.status).toBe(200);
    expect((await json(jobs)).data).toHaveLength(1);
  });

  it("lists teacher performance with operational OPI ratings", async () => {
    const db = baseDb();
    db.staff_attendance = [
      {
        id: "sa111111-1111-4111-8111-111111111111",
        institute_id: INST_A,
        teacher_id: TEACHER_A,
        attendance_date: "2026-08-20",
        status: "present",
        check_in: null,
        check_out: null,
        note: null,
        day_status: "submitted",
        marked_by_user_id: USER_ADMIN,
        submitted_at: "2026-08-20T00:00:00.000Z",
        submitted_by_user_id: USER_ADMIN,
        created_at: "2026-08-20T00:00:00.000Z",
        updated_at: "2026-08-20T00:00:00.000Z",
        deleted_at: null,
      },
    ];
    db.mark_entry = [
      {
        id: "me111111-1111-4111-8111-111111111111",
        institute_id: INST_A,
        academic_year_id: "ay111111-1111-4111-8111-111111111111",
        class_id: "cl111111-1111-4111-8111-111111111111",
        section_id: "se111111-1111-4111-8111-111111111111",
        exam_id: "ex111111-1111-4111-8111-111111111111",
        subject_id: "su111111-1111-4111-8111-111111111111",
        teacher_id: TEACHER_A,
        max_marks: 100,
        status: "published",
        submitted_at: "2026-08-10T00:00:00.000Z",
        published_at: "2026-08-10T00:00:00.000Z",
        admin_note: null,
        created_at: "2026-08-10T00:00:00.000Z",
        updated_at: "2026-08-10T00:00:00.000Z",
        deleted_at: null,
      },
    ];
    const app = testApp(db);
    const res = await app.request(
      `/api/v1/teacher-performance?institute_id=${INST_A}`,
      { headers: authHeaders() },
    );
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.data.teachers).toHaveLength(1);
    expect(body.data.teachers[0].teacherId).toBe(TEACHER_A);
    expect(body.data.teachers[0].rating).toBeGreaterThan(0);
    expect(body.data.teachers[0].ratingSource).toBe("operational");
    expect(body.data.teachers[0].rank).toBe(1);
    expect(body.data.summary.facultyCount).toBe(1);
    expect(body.data.summary.ratedCount).toBe(1);
  });

  it("manages alert rules and evaluate stub", async () => {
    const app = testApp();
    const listEmpty = await app.request(
      `/api/v1/alert-rules?institute_id=${INST_A}`,
      { headers: authHeaders() },
    );
    expect(listEmpty.status).toBe(200);
    expect((await json(listEmpty)).data).toHaveLength(0);

    const created = await app.request("/api/v1/alert-rules", {
      method: "POST",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({
        institute_id: INST_A,
        name: "Custom SLA",
        icon_key: "complaint",
        priority: "P0",
      }),
    });
    expect(created.status).toBe(201);
    const rule = (await json(created)).data;

    const list = await app.request(
      `/api/v1/alert-rules?institute_id=${INST_A}`,
      { headers: authHeaders() },
    );
    expect(list.status).toBe(200);
    expect((await json(list)).data.length).toBeGreaterThan(0);

    const patched = await app.request(`/api/v1/alert-rules/${rule.id}`, {
      method: "PATCH",
      headers: { ...authHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify({ active: false }),
    });
    expect(patched.status).toBe(200);
    expect((await json(patched)).data.active).toBe(false);

    const evalRes = await app.request(
      `/api/v1/alert-rules/evaluate?institute_id=${INST_A}`,
      { method: "POST", headers: authHeaders() },
    );
    expect(evalRes.status).toBe(200);
    expect(Array.isArray((await json(evalRes)).data.fired)).toBe(true);
  });

  it("GET /subscriptions/current returns plan and modules", async () => {
    const app = testApp();
    const res = await app.request(
      `/api/v1/subscriptions/current?institute_id=${INST_A}`,
      { headers: authHeaders() },
    );
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.data.plan).toBe("plus");
    expect(body.data.status).toBe("active");
    expect(body.data.studentLimit).toBe(250);
    expect(body.data.modules.analytics).toBe(true);
    expect(body.data.modules.fees).toBe(false);
  });
});
