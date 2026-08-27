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
const PROG_PUB = "ae111111-1111-4111-8111-111111111111";
const PROG_DRAFT = "ae222222-2222-4222-8222-222222222222";
const OPEN_OPEN = "af111111-1111-4111-8111-111111111111";
const OPEN_DRAFT = "af222222-2222-4222-8222-222222222222";
const APP_PARENT = "b0111111-1111-4111-8111-111111111111";
const APP_OTHER = "b0222222-2222-4222-8222-222222222222";
const INQ_PARENT = "b0333333-3333-4333-8333-333333333333";

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
  db.admission_program = [
    {
      id: PROG_PUB,
      institute_id: INST_A,
      name: "Primary",
      slug: "primary",
      description: null,
      duration: null,
      eligibility: null,
      age_criteria: null,
      seats_available: 40,
      grades: ["1", "2"],
      academic_year_label: "2026-27",
      application_deadline: null,
      status: "published",
      created_by_user_id: USER_ADMIN,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
    {
      id: PROG_DRAFT,
      institute_id: INST_A,
      name: "Draft program",
      slug: "draft-program",
      description: null,
      duration: null,
      eligibility: null,
      age_criteria: null,
      seats_available: 10,
      grades: [],
      academic_year_label: null,
      application_deadline: null,
      status: "draft",
      created_by_user_id: USER_ADMIN,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
  ];
  db.admission_opening = [
    {
      id: OPEN_OPEN,
      institute_id: INST_A,
      program_id: PROG_PUB,
      name: "2026 Intake",
      slug: "2026-intake",
      description: null,
      seats_available: 40,
      academic_year_label: "2026-27",
      application_deadline: null,
      status: "open",
      created_by_user_id: USER_ADMIN,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
    {
      id: OPEN_DRAFT,
      institute_id: INST_A,
      program_id: PROG_PUB,
      name: "Hidden intake",
      slug: "hidden-intake",
      description: null,
      seats_available: 5,
      academic_year_label: null,
      application_deadline: null,
      status: "draft",
      created_by_user_id: USER_ADMIN,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
  ];
  db.admission_application = [
    {
      id: APP_PARENT,
      institute_id: INST_A,
      opening_id: OPEN_OPEN,
      program_id: PROG_PUB,
      applicant_user_id: USER_PARENT,
      student_display_name: "Kid A",
      status: "submitted",
      payload: {},
      decision_note: null,
      converted_student_id: null,
      submitted_at: "2026-08-02T00:00:00.000Z",
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-02T00:00:00.000Z",
      deleted_at: null,
    },
    {
      id: APP_OTHER,
      institute_id: INST_B,
      opening_id: OPEN_OPEN,
      program_id: PROG_PUB,
      applicant_user_id: USER_OTHER,
      student_display_name: "Other kid",
      status: "submitted",
      payload: {},
      decision_note: null,
      converted_student_id: null,
      submitted_at: "2026-08-02T00:00:00.000Z",
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-02T00:00:00.000Z",
      deleted_at: null,
    },
  ];
  db.admission_inquiry = [
    {
      id: INQ_PARENT,
      institute_id: INST_A,
      category: "fees",
      subject: "Fee question",
      body: "What is the annual fee for grade 1?",
      contact_name: "Parent",
      contact_email: "p@x.com",
      contact_phone: null,
      status: "open",
      response_note: null,
      requested_by_user_id: USER_PARENT,
      responded_by_user_id: null,
      responded_at: null,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
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
        "token-parent": USER_PARENT,
        "token-other": USER_OTHER,
      },
      db,
    }),
  );
}

describe("admissions api", () => {
  it("hides draft programs/openings from parents", async () => {
    const app = appWithDb(baseDb());

    const programs = await app.request(
      `/api/v1/admissions/programs?institute_id=${INST_A}`,
      { headers: { Authorization: "Bearer token-parent" } },
    );
    expect(programs.status).toBe(200);
    const progIds = (await json(programs)).data.map((p: { id: string }) => p.id);
    expect(progIds).toContain(PROG_PUB);
    expect(progIds).not.toContain(PROG_DRAFT);

    const openings = await app.request(
      `/api/v1/admissions/openings?institute_id=${INST_A}`,
      { headers: { Authorization: "Bearer token-parent" } },
    );
    expect(openings.status).toBe(200);
    const openIds = (await json(openings)).data.map((o: { id: string }) => o.id);
    expect(openIds).toContain(OPEN_OPEN);
    expect(openIds).not.toContain(OPEN_DRAFT);

    const draftPatch = await app.request(
      `/api/v1/admissions/programs/${PROG_DRAFT}`,
      {
        method: "PATCH",
        headers: {
          Authorization: "Bearer token-parent",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: "probe" }),
      },
    );
    expect(draftPatch.status).toBe(404);
  });

  it("parent applies to open intake; teacher cannot create programs", async () => {
    const db = baseDb();
    db.admission_application = [];
    const app = appWithDb(db);

    const created = await app.request("/api/v1/admissions/applications", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-parent",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        opening_id: OPEN_OPEN,
        student_display_name: "New Kid",
        submit_now: true,
      }),
    });
    expect(created.status).toBe(201);
    expect((await json(created)).data.status).toBe("submitted");

    const draftOpening = await app.request("/api/v1/admissions/applications", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-parent",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        opening_id: OPEN_DRAFT,
        student_display_name: "Should fail",
      }),
    });
    expect(draftOpening.status).toBe(409);

    const teacherProg = await app.request("/api/v1/admissions/programs", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-teacher",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        name: "Should fail",
        slug: "fail",
      }),
    });
    expect(teacherProg.status).toBe(403);
  });

  it("staff reviews application; parent cannot approve", async () => {
    const app = appWithDb(baseDb());

    const parentApprove = await app.request(
      `/api/v1/admissions/applications/${APP_PARENT}/transition`,
      {
        method: "POST",
        headers: {
          Authorization: "Bearer token-parent",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "approved" }),
      },
    );
    expect(parentApprove.status).toBe(404);

    const review = await app.request(
      `/api/v1/admissions/applications/${APP_PARENT}/transition`,
      {
        method: "POST",
        headers: {
          Authorization: "Bearer token-admin",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "review" }),
      },
    );
    expect(review.status).toBe(200);
    expect((await json(review)).data.status).toBe("review");
  });

  it("scopes applications and uses 404 for cross-tenant get", async () => {
    const app = appWithDb(baseDb());

    const parentList = await app.request(
      `/api/v1/admissions/applications?institute_id=${INST_A}`,
      { headers: { Authorization: "Bearer token-parent" } },
    );
    expect(parentList.status).toBe(200);
    expect((await json(parentList)).data).toHaveLength(1);

    const cross = await app.request(
      `/api/v1/admissions/applications/${APP_OTHER}`,
      { headers: { Authorization: "Bearer token-admin" } },
    );
    expect(cross.status).toBe(404);
  });

  it("parent creates inquiry; teacher cannot respond; admin can", async () => {
    const app = appWithDb(baseDb());

    const teacherRespond = await app.request(
      `/api/v1/admissions/inquiries/${INQ_PARENT}/respond`,
      {
        method: "POST",
        headers: {
          Authorization: "Bearer token-teacher",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "responded",
          response_note: "Nope",
        }),
      },
    );
    expect(teacherRespond.status).toBe(404);

    const adminRespond = await app.request(
      `/api/v1/admissions/inquiries/${INQ_PARENT}/respond`,
      {
        method: "POST",
        headers: {
          Authorization: "Bearer token-admin",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "responded",
          response_note: "Fees are published on the portal.",
        }),
      },
    );
    expect(adminRespond.status).toBe(200);
    expect((await json(adminRespond)).data.status).toBe("responded");
  });
});
