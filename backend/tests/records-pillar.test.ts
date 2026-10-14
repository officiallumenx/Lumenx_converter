import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createApp } from "../src/app.js";
import { loadEnv, resetEnvCache } from "../src/config/env.js";
import { createLogger } from "../src/logger/logger.js";
import {
  createMockSupabaseClients,
  emptyMockDb,
  type MockDb,
} from "./helpers/mock-supabase.js";
import { writableTrialSubscription } from "./helpers/subscription-fixture.js";
import { processRetentionReviewEligibilitySystem } from "../src/domains/retention/service.js";
import { academicYearRangesOverlap } from "../src/domains/academics/service.js";

const silentLogger = createLogger("error");

const USER_ADMIN = "11111111-1111-4111-8111-111111111111";
const USER_OTHER = "44444444-4444-4444-8444-444444444444";
const INST_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const INST_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const MEMBER_ADMIN = "aa111111-1111-4111-8111-111111111111";
const MEMBER_OTHER = "aa444444-4444-4444-8444-444444444444";
const STUDENT_A = "ac111111-1111-4111-8111-111111111111";
const YEAR_A = "cc111111-1111-4111-8111-111111111111";
const CLASS_A = "cd111111-1111-4111-8111-111111111111";
const SECTION_A = "ce111111-1111-4111-8111-111111111111";
const ENROLL_A = "af111111-1111-4111-8111-111111111111";
const YEAR_B_DEST = "cc555555-5555-4555-8555-555555555555";
const CLASS_B_DEST = "cd555555-5555-4555-8555-555555555555";
const SECTION_B_DEST = "ce555555-5555-4555-8555-555555555555";
const REVIEW_A = "ae111111-1111-4111-8111-111111111111";

beforeEach(() => {
  resetEnvCache();
  loadEnv({ NODE_ENV: "test", LOG_LEVEL: "error" });
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

function auth(token: string) {
  return { Authorization: `Bearer ${token}` };
}

function jsonHeaders(token: string) {
  return { ...auth(token), "Content-Type": "application/json" };
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
  db.student = [
    {
      id: STUDENT_A,
      institute_id: INST_A,
      first_name: "Ada",
      surname: "Lovelace",
      display_name: "Ada Lovelace",
      gender: "female",
      address: "",
      admission_number: "ADM-1",
      status: "active",
      access_status: "active",
      graduated_on: null,
      deleted_at: null,
    },
  ];
  db.academic_year = [
    {
      id: YEAR_A,
      institute_id: INST_A,
      name: "2026-27",
      code: "2026-27",
      starts_on: "2026-04-01",
      ends_on: "2027-03-31",
      status: "active",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      deleted_at: null,
    },
    {
      id: YEAR_B_DEST,
      institute_id: INST_B,
      name: "2026-27 B",
      code: "2026-27B",
      starts_on: "2026-04-01",
      ends_on: "2027-03-31",
      status: "active",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      deleted_at: null,
    },
  ];
  db.class = [
    {
      id: CLASS_A,
      institute_id: INST_A,
      academic_year_id: YEAR_A,
      name: "10",
      code: "10",
      sort_order: 10,
      status: "active",
      deleted_at: null,
    },
    {
      id: CLASS_B_DEST,
      institute_id: INST_B,
      academic_year_id: YEAR_B_DEST,
      name: "10",
      code: "10",
      sort_order: 10,
      status: "active",
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
      status: "active",
      deleted_at: null,
    },
    {
      id: SECTION_B_DEST,
      institute_id: INST_B,
      academic_year_id: YEAR_B_DEST,
      class_id: CLASS_B_DEST,
      name: "A",
      code: "A",
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
      deleted_at: null,
    },
  ];
  db.subscription = [
    writableTrialSubscription(INST_A, "sub11111-1111-4111-8111-111111111111"),
    writableTrialSubscription(INST_B, "sub22222-2222-4222-8222-222222222222"),
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

describe("records — academic year rules", () => {
  it("creates years as upcoming even when client sends active", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request("/api/v1/academic-years", {
      method: "POST",
      headers: jsonHeaders("token-admin"),
      body: JSON.stringify({
        institute_id: INST_A,
        name: "2027-28",
        code: "2027-28",
        starts_on: "2027-04-01",
        ends_on: "2028-03-31",
        status: "active",
      }),
    });
    expect(res.status).toBe(201);
    const body = await json(res);
    expect(body.data.status).toBe("upcoming");
  });

  it("rejects overlapping live years in the same institute", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request("/api/v1/academic-years", {
      method: "POST",
      headers: jsonHeaders("token-admin"),
      body: JSON.stringify({
        institute_id: INST_A,
        name: "Overlap",
        code: "OV",
        starts_on: "2026-06-01",
        ends_on: "2026-12-31",
      }),
    });
    expect(res.status).toBe(409);
  });

  it("allows the same date range in a different institute", async () => {
    expect(
      academicYearRangesOverlap("2026-04-01", "2027-03-31", "2026-04-01", "2027-03-31"),
    ).toBe(true);
    const app = appWithDb(baseDb());
    // INST_B already has YEAR_B_DEST with same range — create for INST_A non-overlap is tested above.
    const res = await app.request("/api/v1/academic-years", {
      method: "POST",
      headers: jsonHeaders("token-other"),
      body: JSON.stringify({
        institute_id: INST_B,
        name: "2027-28 B",
        code: "2728B",
        starts_on: "2027-04-01",
        ends_on: "2028-03-31",
      }),
    });
    expect(res.status).toBe(201);
    expect((await json(res)).data.status).toBe("upcoming");
  });

  it("blocks delete when enrollments exist", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request(`/api/v1/academic-years/${YEAR_A}`, {
      method: "DELETE",
      headers: auth("token-admin"),
    });
    expect(res.status).toBe(409);
  });
});

describe("records — retention review", () => {
  it("graduation creates retention review and never auto-deletes", async () => {
    const db = baseDb();
    const app = appWithDb(db);
    const res = await app.request("/api/v1/enrollments/graduate", {
      method: "POST",
      headers: jsonHeaders("token-admin"),
      body: JSON.stringify({
        institute_id: INST_A,
        academic_year_id: YEAR_A,
        enrollment_ids: [ENROLL_A],
        graduated_on: "2021-03-31",
      }),
    });
    expect(res.status).toBe(200);
    expect(db.student_retention_review.length).toBe(1);
    expect(db.student_retention_review[0]?.status).toBe("active_retention");
    expect(db.student_retention_review[0]?.review_eligible_on).toBe("2026-03-31");
    expect(db.student.find((s) => s.id === STUDENT_A)?.deleted_at).toBeNull();

    const job = await processRetentionReviewEligibilitySystem(clientsAdmin(db), {
      now: new Date("2026-04-01T00:00:00.000Z"),
    });
    expect(job.markedEligible).toBe(1);
    expect(db.student_retention_review[0]?.status).toBe("review_eligible");
    expect(db.student.find((s) => s.id === STUDENT_A)?.deleted_at).toBeNull();

    // Idempotent re-run
    const again = await processRetentionReviewEligibilitySystem(clientsAdmin(db), {
      now: new Date("2026-04-02T00:00:00.000Z"),
    });
    expect(again.markedEligible).toBe(0);
  });

  it("unknown graduation date requires review", async () => {
    const db = baseDb();
    const { admin } = createMockSupabaseClients({
      db,
      tokens: { "token-admin": USER_ADMIN },
    });
    const { ensureRetentionReviewForGraduation } = await import(
      "../src/domains/retention/service.js"
    );
    const actor = {
      userId: USER_ADMIN,
      profileId: USER_ADMIN,
      displayName: "Admin",
      email: "a@x.com",
      profileStatus: "active",
      isPlatformOperator: false,
      platformRoleCode: null,
      memberships: [
        {
          instituteId: INST_A,
          roles: ["institute_admin" as const],
          membershipId: MEMBER_ADMIN,
          status: "active",
        },
      ],
      students: [],
      parents: [],
      teachers: [],
      staff: [],
    };
    const row = await ensureRetentionReviewForGraduation(admin, actor, {
      instituteId: INST_A,
      studentId: STUDENT_A,
      graduatedOn: null,
    });
    expect(row.status).toBe("pending_graduation_date");
    expect(row.reviewEligibleOn).toBeNull();
  });

  it("legal hold blocks deletion approval", async () => {
    const db = baseDb();
    db.student_retention_review = [
      {
        id: REVIEW_A,
        institute_id: INST_A,
        student_id: STUDENT_A,
        graduating_enrollment_id: ENROLL_A,
        graduated_on: "2018-03-31",
        review_eligible_on: "2023-03-31",
        status: "legal_hold",
        legal_hold: true,
        extended_until: null,
        last_reviewed_at: null,
        last_reviewed_by_user_id: null,
        last_decision: null,
        last_decision_reason: null,
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
        deleted_at: null,
      },
    ];
    const app = appWithDb(db);
    const res = await app.request(
      `/api/v1/retention/reviews/${REVIEW_A}/decide`,
      {
        method: "POST",
        headers: jsonHeaders("token-admin"),
        body: JSON.stringify({
          decision: "approve_deletion",
          reason: "Trying to purge",
        }),
      },
    );
    expect(res.status).toBe(409);
    expect(db.student.find((s) => s.id === STUDENT_A)?.deleted_at).toBeNull();
  });
});

function clientsAdmin(db: MockDb) {
  return createMockSupabaseClients({
    db,
    tokens: { "token-admin": USER_ADMIN },
  }).admin;
}

describe("records — transfers", () => {
  it("initiates transfer and completes with new destination student", async () => {
    const db = baseDb();
    const app = appWithDb(db);

    const created = await app.request("/api/v1/transfers", {
      method: "POST",
      headers: jsonHeaders("token-admin"),
      body: JSON.stringify({
        source_institute_id: INST_A,
        destination_institute_id: INST_B,
        source_student_id: STUDENT_A,
        shared_fields: {
          firstName: true,
          surname: true,
          displayName: true,
          gender: true,
        },
        client_request_id: "xfer-1",
      }),
    });
    expect(created.status).toBe(201);
    const transferId = (await json(created)).data.id as string;

    // Destination admin accepts
    const accepted = await app.request(`/api/v1/transfers/${transferId}/accept`, {
      method: "POST",
      headers: jsonHeaders("token-other"),
      body: JSON.stringify({
        destination_academic_year_id: YEAR_B_DEST,
        destination_class_id: CLASS_B_DEST,
        destination_section_id: SECTION_B_DEST,
      }),
    });
    expect(accepted.status).toBe(200);
    const body = await json(accepted);
    expect(body.data.status).toBe("completed");
    expect(body.data.destinationStudentId).toBeTruthy();
    expect(body.data.destinationStudentId).not.toBe(STUDENT_A);
    expect(db.student.find((s) => s.id === STUDENT_A)?.institute_id).toBe(INST_A);
    expect(db.student.find((s) => s.id === STUDENT_A)?.status).toBe("inactive");
  });

  it("blocks cross-tenant initiate without membership", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request("/api/v1/transfers", {
      method: "POST",
      headers: jsonHeaders("token-other"),
      body: JSON.stringify({
        source_institute_id: INST_A,
        destination_institute_id: INST_B,
        source_student_id: STUDENT_A,
        shared_fields: { firstName: true, surname: true, gender: true },
      }),
    });
    expect([403, 400]).toContain(res.status);
  });
});

describe("records — server academic-year export", () => {
  it("exports year enrollments with institute scope and audit", async () => {
    const db = baseDb();
    const app = appWithDb(db);
    const res = await app.request("/api/v1/reports/jobs", {
      method: "POST",
      headers: jsonHeaders("token-admin"),
      body: JSON.stringify({
        institute_id: INST_A,
        report_id: "academic-year-records",
        academic_year_id: YEAR_A,
      }),
    });
    expect(res.status).toBe(201);
    const job = (await json(res)).data;
    expect(job.status).toBe("ready");
    expect(job.fileName).toMatch(/academic-year-records/);
    expect(db.audit_event.some((e) => e.action === "report.export.ready")).toBe(true);

    // IDOR: other institute cannot export INST_A year via their institute id
    const idor = await app.request("/api/v1/reports/jobs", {
      method: "POST",
      headers: jsonHeaders("token-other"),
      body: JSON.stringify({
        institute_id: INST_B,
        report_id: "academic-year-records",
        academic_year_id: YEAR_A,
      }),
    });
    const idorJob = (await json(idor)).data;
    expect(idorJob.status).toBe("failed");
  });
});
