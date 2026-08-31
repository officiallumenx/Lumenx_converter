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
const USER_OTHER = "44444444-4444-4444-8444-444444444444";
const INST_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const INST_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const MEMBER_ADMIN = "aa111111-1111-4111-8111-111111111111";
const MEMBER_TEACHER = "aa222222-2222-4222-8222-222222222222";
const MEMBER_OTHER = "aa444444-4444-4444-8444-444444444444";
const STUDENT_A = "s0111111-1111-4111-8111-111111111111";

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
    { id: USER_OTHER, display_name: "Other", email: "o@x.com", status: "active", deleted_at: null },
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
  db.institute = [
    { id: INST_A, code: "A", name: "A", kind: "school", status: "active", deleted_at: null },
    { id: INST_B, code: "B", name: "B", kind: "school", status: "active", deleted_at: null },
  ];
  db.student = [
    {
      id: STUDENT_A,
      institute_id: INST_A,
      display_name: "Ada",
      admission_number: "A-1",
      class_label: "10",
      section_label: "A",
      status: "active",
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
        "token-teacher": USER_TEACHER,
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

describe("reports — durable jobs and download", () => {
  it("creates ready job, persists across app instances, downloads CSV", async () => {
    const db = baseDb();
    const app1 = appWithDb(db);

    const created = await app1.request("/api/v1/reports/jobs", {
      method: "POST",
      headers: jsonHeaders("token-admin"),
      body: JSON.stringify({ institute_id: INST_A, report_id: "students" }),
    });
    expect(created.status).toBe(201);
    const job = (await json(created)).data;
    expect(job.status).toBe("ready");
    expect(job.downloadUrl).toContain(`/api/v1/reports/jobs/${job.id}/download`);
    expect(db.report_job).toHaveLength(1);
    expect(db.report_job[0].content_text).toContain("Ada");

    const app2 = appWithDb(db);
    const listed = await app2.request(
      `/api/v1/reports/jobs?institute_id=${INST_A}`,
      { headers: auth("token-admin") },
    );
    expect((await json(listed)).data).toHaveLength(1);

    const dl = await app2.request(`/api/v1/reports/jobs/${job.id}/download`, {
      headers: auth("token-admin"),
    });
    expect(dl.status).toBe(200);
    expect(dl.headers.get("Content-Type")).toContain("text/csv");
    const text = await dl.text();
    expect(text).toContain("Ada");
    expect(text).toContain("admission_number");
  });

  it("generates attendance, fees, and marks CSV isolated to the institute", async () => {
    const db = baseDb();
    const year = "c0111111-1111-4111-8111-111111111111";
    const classA = "c0211111-1111-4111-8111-111111111111";
    const sectionA = "c0311111-1111-4111-8111-111111111111";
    const enrollA = "e0111111-1111-4111-8111-111111111111";
    const registerA = "r0111111-1111-4111-8111-111111111111";
    const registerB = "r0222222-2222-4222-8222-222222222222";
    const studentB = "s0222222-2222-4222-8222-222222222222";
    const planA = "p0111111-1111-4111-8111-111111111111";
    const planB = "p0222222-2222-4222-8222-222222222222";
    const examA = "x0111111-1111-4111-8111-111111111111";
    const subjectA = "u0111111-1111-4111-8111-111111111111";
    const teacherA = "t0111111-1111-4111-8111-111111111111";
    const entryA = "m0111111-1111-4111-8111-111111111111";
    const entryB = "m0222222-2222-4222-8222-222222222222";

    db.student.push({
      id: studentB,
      institute_id: INST_B,
      display_name: "EveOther",
      admission_number: "B-1",
      status: "active",
      deleted_at: null,
    });
    db.attendance_register = [
      {
        id: registerA,
        institute_id: INST_A,
        academic_year_id: year,
        class_id: classA,
        section_id: sectionA,
        attendance_date: "2026-08-01",
        slot_label: "Day",
        status: "submitted",
        deleted_at: null,
      },
      {
        id: registerB,
        institute_id: INST_B,
        academic_year_id: year,
        class_id: classA,
        section_id: sectionA,
        attendance_date: "2026-08-01",
        slot_label: "Day",
        status: "submitted",
        deleted_at: null,
      },
    ];
    db.attendance_mark = [
      {
        id: "k0111111-1111-4111-8111-111111111111",
        institute_id: INST_A,
        register_id: registerA,
        student_id: STUDENT_A,
        enrollment_id: enrollA,
        status: "present",
        deleted_at: null,
      },
      {
        id: "k0222222-2222-4222-8222-222222222222",
        institute_id: INST_B,
        register_id: registerB,
        student_id: studentB,
        enrollment_id: "e0222222-2222-4222-8222-222222222222",
        status: "absent",
        deleted_at: null,
      },
    ];
    db.fee_plan = [
      { id: planA, institute_id: INST_A, academic_year_id: year, deleted_at: null },
      { id: planB, institute_id: INST_B, academic_year_id: year, deleted_at: null },
    ];
    db.student_fee = [
      {
        id: "f0111111-1111-4111-8111-111111111111",
        institute_id: INST_A,
        fee_plan_id: planA,
        student_id: STUDENT_A,
        billed_amount: 1000,
        paid_amount: 400,
        status: "partial",
        deleted_at: null,
      },
      {
        id: "f0222222-2222-4222-8222-222222222222",
        institute_id: INST_B,
        fee_plan_id: planB,
        student_id: studentB,
        billed_amount: 9999,
        paid_amount: 0,
        status: "due",
        deleted_at: null,
      },
    ];
    db.fee_payment = [
      {
        id: "y0111111-1111-4111-8111-111111111111",
        institute_id: INST_A,
        fee_plan_id: planA,
        student_fee_id: "f0111111-1111-4111-8111-111111111111",
        student_id: STUDENT_A,
        amount: 400,
        method: "cash",
        receipt_no: "R-A-1",
        paid_on: "2026-08-02",
        deleted_at: null,
      },
      {
        id: "y0222222-2222-4222-8222-222222222222",
        institute_id: INST_B,
        fee_plan_id: planB,
        student_fee_id: "f0222222-2222-4222-8222-222222222222",
        student_id: studentB,
        amount: 50,
        method: "cash",
        receipt_no: "R-B-SECRET",
        paid_on: "2026-08-02",
        deleted_at: null,
      },
    ];
    db.exam = [
      {
        id: examA,
        institute_id: INST_A,
        academic_year_id: year,
        name: "Term 1",
        deleted_at: null,
      },
    ];
    db.mark_entry = [
      {
        id: entryA,
        institute_id: INST_A,
        academic_year_id: year,
        class_id: classA,
        section_id: sectionA,
        exam_id: examA,
        subject_id: subjectA,
        teacher_id: teacherA,
        max_marks: 100,
        status: "published",
        deleted_at: null,
      },
      {
        id: entryB,
        institute_id: INST_B,
        academic_year_id: year,
        class_id: classA,
        section_id: sectionA,
        exam_id: examA,
        subject_id: subjectA,
        teacher_id: teacherA,
        max_marks: 100,
        status: "published",
        deleted_at: null,
      },
    ];
    db.mark_score = [
      {
        id: "z0111111-1111-4111-8111-111111111111",
        institute_id: INST_A,
        mark_entry_id: entryA,
        student_id: STUDENT_A,
        enrollment_id: enrollA,
        marks: 88,
        deleted_at: null,
      },
      {
        id: "z0222222-2222-4222-8222-222222222222",
        institute_id: INST_B,
        mark_entry_id: entryB,
        student_id: studentB,
        enrollment_id: "e0222222-2222-4222-8222-222222222222",
        marks: 1,
        deleted_at: null,
      },
    ];

    const app = appWithDb(db);
    const headers = jsonHeaders("token-admin");

    async function csvFor(reportId: string): Promise<string> {
      const created = await app.request("/api/v1/reports/jobs", {
        method: "POST",
        headers,
        body: JSON.stringify({ institute_id: INST_A, report_id: reportId }),
      });
      expect(created.status).toBe(201);
      const job = (await json(created)).data;
      expect(job.status).toBe("ready");
      const dl = await app.request(`/api/v1/reports/jobs/${job.id}/download`, {
        headers: auth("token-admin"),
      });
      expect(dl.status).toBe(200);
      return dl.text();
    }

    const attendanceCsv = await csvFor("attendance");
    expect(attendanceCsv).toContain("mark_status");
    expect(attendanceCsv).toContain(STUDENT_A);
    expect(attendanceCsv).not.toContain(studentB);

    const feesCsv = await csvFor("fees");
    expect(feesCsv).toContain("R-A-1");
    expect(feesCsv).toContain("partial");
    expect(feesCsv).not.toContain("R-B-SECRET");
    expect(feesCsv).not.toContain(studentB);

    const marksCsv = await csvFor("marks");
    expect(marksCsv).toContain("Term 1");
    expect(marksCsv).toContain("88");
    expect(marksCsv).not.toContain(studentB);
  });

  it("generates transport, careers, documents, and attendance-daily CSV", async () => {
    const db = baseDb();
    const routeId = "r0111111-1111-4111-8111-111111111111";
    const jobId = "j0111111-1111-4111-8111-111111111111";
    db.route = [
      {
        id: routeId,
        institute_id: INST_A,
        name: "Route 7",
        vehicle_id: null,
        driver_id: null,
        status: "active",
        config_status: "ready",
        locked_at: null,
        locked_by_user_id: null,
        setup_finished_at: null,
        created_at: "2026-08-01T00:00:00.000Z",
        updated_at: "2026-08-01T00:00:00.000Z",
        deleted_at: null,
      },
    ];
    db.transport_enrollment = [
      {
        id: "te111111-1111-4111-8111-111111111111",
        institute_id: INST_A,
        student_id: STUDENT_A,
        route_id: routeId,
        pickup_stop_id: "s0111111-1111-4111-8111-111111111111",
        drop_stop_id: "s0222222-2222-4222-8222-222222222222",
        status: "active",
        created_at: "2026-08-01T00:00:00.000Z",
        updated_at: "2026-08-01T00:00:00.000Z",
        deleted_at: null,
      },
    ];
    db.career_job = [
      {
        id: jobId,
        institute_id: INST_A,
        title: "Math Teacher",
        slug: "math-teacher",
        description: null,
        category: "teaching",
        employment_type: "full_time",
        work_mode: "on_site",
        location_label: "Campus",
        openings_count: 1,
        status: "open",
        created_by_user_id: USER_ADMIN,
        created_at: "2026-08-01T00:00:00.000Z",
        updated_at: "2026-08-01T00:00:00.000Z",
        deleted_at: null,
      },
    ];
    db.career_application = [
      {
        id: "ca111111-1111-4111-8111-111111111111",
        institute_id: INST_A,
        job_id: jobId,
        candidate_profile_id: null,
        applicant_user_id: USER_TEACHER,
        status: "submitted",
        cover_letter: null,
        payload: {},
        decision_note: null,
        converted_teacher_id: null,
        submitted_at: "2026-08-10T00:00:00.000Z",
        created_at: "2026-08-10T00:00:00.000Z",
        updated_at: "2026-08-10T00:00:00.000Z",
        deleted_at: null,
      },
    ];
    db.generated_document = [
      {
        id: "gd111111-1111-4111-8111-111111111111",
        institute_id: INST_A,
        template_id: "tp111111-1111-4111-8111-111111111111",
        type: "certificate",
        title: "Bonafide",
        student_id: STUDENT_A,
        teacher_id: null,
        recipient_name: "Ada",
        recipient_ref: null,
        status: "ready",
        workflow_state: "verified",
        certificate_number: "C-001",
        portal_student: true,
        portal_parent: false,
        portal_teacher: false,
        rejection_reason: null,
        payload: {},
        asset_path: null,
        generated_by_user_id: USER_ADMIN,
        published_at: null,
        created_at: "2026-08-05T00:00:00.000Z",
        updated_at: "2026-08-05T00:00:00.000Z",
        deleted_at: null,
      },
    ];
    db.attendance_register = [
      {
        id: "rg111111-1111-4111-8111-111111111111",
        institute_id: INST_A,
        academic_year_id: "ay111111-1111-4111-8111-111111111111",
        class_id: "cl111111-1111-4111-8111-111111111111",
        section_id: "se111111-1111-4111-8111-111111111111",
        attendance_date: "2026-08-20",
        slot_label: "Day",
        status: "submitted",
        marked_by_teacher_id: "t0111111-1111-4111-8111-111111111111",
        submitted_at: "2026-08-20T00:00:00.000Z",
        deleted_at: null,
      },
    ];
    db.attendance_mark = [
      {
        id: "mk111111-1111-4111-8111-111111111111",
        institute_id: INST_A,
        register_id: "rg111111-1111-4111-8111-111111111111",
        student_id: STUDENT_A,
        enrollment_id: "en111111-1111-4111-8111-111111111111",
        status: "present",
        deleted_at: null,
      },
    ];

    const app = appWithDb(db);
    const headers = jsonHeaders("token-admin");

    async function csvFor(reportId: string): Promise<string> {
      const created = await app.request("/api/v1/reports/jobs", {
        method: "POST",
        headers,
        body: JSON.stringify({ institute_id: INST_A, report_id: reportId }),
      });
      expect(created.status).toBe(201);
      const job = (await json(created)).data;
      expect(job.status).toBe("ready");
      const dl = await app.request(`/api/v1/reports/jobs/${job.id}/download`, {
        headers: auth("token-admin"),
      });
      return dl.text();
    }

    expect(await csvFor("transport")).toContain("Route 7");
    expect(await csvFor("careers")).toContain("Math Teacher");
    expect(await csvFor("documents")).toContain("Bonafide");
    expect(await csvFor("attendance-daily")).toContain("attendance_pct");
  });

  it("rejects unknown catalog ids and isolates institutes; validates ids", async () => {
    const db = baseDb();
    const app = appWithDb(db);

    const unknown = await app.request("/api/v1/reports/jobs", {
      method: "POST",
      headers: jsonHeaders("token-admin"),
      body: JSON.stringify({ institute_id: INST_A, report_id: "not-in-catalog" }),
    });
    expect(unknown.status).toBe(400);

    const ready = await app.request("/api/v1/reports/jobs", {
      method: "POST",
      headers: jsonHeaders("token-admin"),
      body: JSON.stringify({ institute_id: INST_A, report_id: "students" }),
    });
    const jobId = (await json(ready)).data.id as string;

    expect(
      (
        await app.request(`/api/v1/reports/jobs/${jobId}/download`, {
          headers: auth("token-other"),
        })
      ).status,
    ).toBe(403);

    expect(
      (
        await app.request("/api/v1/reports/jobs", {
          method: "POST",
          headers: jsonHeaders("token-teacher"),
          body: JSON.stringify({ institute_id: INST_A, report_id: "students" }),
        })
      ).status,
    ).toBe(403);

    expect(
      (
        await app.request(`/api/v1/reports/jobs/not-a-uuid/download`, {
          headers: auth("token-admin"),
        })
      ).status,
    ).toBe(400);

    expect(
      (
        await app.request(
          `/api/v1/reports/jobs/99999999-9999-4999-8999-999999999999/download`,
          { headers: auth("token-admin") },
        )
      ).status,
    ).toBe(404);

    expect(
      (
        await app.request(`/api/v1/reports/jobs?institute_id=${INST_B}`, {
          headers: auth("token-admin"),
        })
      ).status,
    ).toBe(403);
  });
});
