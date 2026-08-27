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
const USER_TEACHER2 = "33333333-3333-4333-8333-333333333333";
const USER_PARENT = "55555555-5555-4555-8555-555555555555";
const USER_STAFF = "66666666-6666-4666-8666-666666666666";
const USER_OTHER = "44444444-4444-4444-8444-444444444444";
const INST_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const INST_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const MEMBER_ADMIN = "aa111111-1111-4111-8111-111111111111";
const MEMBER_TEACHER = "aa222222-2222-4222-8222-222222222222";
const MEMBER_TEACHER2 = "aa333333-3333-4333-8333-333333333333";
const MEMBER_PARENT = "aa555555-5555-4555-8555-555555555555";
const MEMBER_STAFF = "aa666666-6666-4666-8666-666666666666";
const MEMBER_OTHER = "aa444444-4444-4444-8444-444444444444";
const TEACHER_A = "bb111111-1111-4111-8111-111111111111";
const TEACHER_B = "bb222222-2222-4222-8222-222222222222";
const PARENT_A = "ba111111-1111-4111-8111-111111111111";
const STUDENT_A = "ac111111-1111-4111-8111-111111111111";
const STUDENT_B = "ac222222-2222-4222-8222-222222222222";
const YEAR_A = "ee111111-1111-4111-8111-111111111111";
const CLASS_A = "ff111111-1111-4111-8111-111111111111";
const SECTION_A = "cc111111-1111-4111-8111-111111111111";
const SECTION_B = "cc222222-2222-4222-8222-222222222222";
const ENROLL_A = "ad111111-1111-4111-8111-111111111111";
const ASSIGN_A = "af111111-1111-4111-8111-111111111111";
const CMP_PENDING = "ae111111-1111-4111-8111-111111111111";
const CMP_DRAFT = "ae222222-2222-4222-8222-222222222222";
const CMP_OTHER = "ae333333-3333-4333-8333-333333333333";
const CMP_CLASS = "ae444444-4444-4444-8444-444444444444";

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
    { id: USER_TEACHER2, display_name: "Teacher2", email: "t2@x.com", status: "active", deleted_at: null },
    { id: USER_PARENT, display_name: "Parent", email: "p@x.com", status: "active", deleted_at: null },
    { id: USER_STAFF, display_name: "Staff", email: "s@x.com", status: "active", deleted_at: null },
    { id: USER_OTHER, display_name: "Other", email: "o@x.com", status: "active", deleted_at: null },
  ];
  db.membership = [
    { id: MEMBER_ADMIN, user_id: USER_ADMIN, institute_id: INST_A, status: "active", deleted_at: null },
    { id: MEMBER_TEACHER, user_id: USER_TEACHER, institute_id: INST_A, status: "active", deleted_at: null },
    { id: MEMBER_TEACHER2, user_id: USER_TEACHER2, institute_id: INST_A, status: "active", deleted_at: null },
    { id: MEMBER_PARENT, user_id: USER_PARENT, institute_id: INST_A, status: "active", deleted_at: null },
    { id: MEMBER_STAFF, user_id: USER_STAFF, institute_id: INST_A, status: "active", deleted_at: null },
    { id: MEMBER_OTHER, user_id: USER_OTHER, institute_id: INST_B, status: "active", deleted_at: null },
  ];
  db.membership_role = [
    { membership_id: MEMBER_ADMIN, role_code: "institute_admin" },
    { membership_id: MEMBER_TEACHER, role_code: "teacher" },
    { membership_id: MEMBER_TEACHER2, role_code: "teacher" },
    { membership_id: MEMBER_PARENT, role_code: "parent" },
    { membership_id: MEMBER_STAFF, role_code: "accountant" },
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
      user_profile_id: USER_TEACHER,
      status: "active",
      deleted_at: null,
    },
    {
      id: TEACHER_B,
      institute_id: INST_A,
      user_profile_id: USER_TEACHER2,
      status: "active",
      deleted_at: null,
    },
  ];
  db.student = [
    { id: STUDENT_A, institute_id: INST_A, deleted_at: null },
    { id: STUDENT_B, institute_id: INST_A, deleted_at: null },
  ];
  db.parent = [
    { id: PARENT_A, institute_id: INST_A, user_profile_id: USER_PARENT, deleted_at: null },
  ];
  db.guardian_link = [
    {
      parent_id: PARENT_A,
      student_id: STUDENT_A,
      institute_id: INST_A,
      status: "active",
      deleted_at: null,
    },
  ];
  db.academic_year = [
    { id: YEAR_A, institute_id: INST_A, status: "active", deleted_at: null },
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
      institute_id: INST_A,
      academic_year_id: YEAR_A,
      class_id: CLASS_A,
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
      status: "active",
      deleted_at: null,
    },
  ];
  db.teacher_assignment = [
    {
      id: ASSIGN_A,
      institute_id: INST_A,
      teacher_id: TEACHER_A,
      section_id: SECTION_A,
      status: "active",
      deleted_at: null,
    },
  ];
  db.complaint = [
    {
      id: CMP_PENDING,
      institute_id: INST_A,
      title: "Bus delay issue",
      body: "The morning bus has been late three times this week.",
      category: "Infrastructure",
      priority: "high",
      status: "pending",
      destination: "principal_admin",
      requested_by_user_id: USER_PARENT,
      student_id: STUDENT_A,
      teacher_id: null,
      response_note: null,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
    {
      id: CMP_DRAFT,
      institute_id: INST_A,
      title: "Draft teacher note",
      body: "Not ready to submit this complaint yet.",
      category: "Administrative",
      priority: "medium",
      status: "draft",
      destination: null,
      requested_by_user_id: USER_TEACHER,
      student_id: null,
      teacher_id: TEACHER_A,
      response_note: null,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
    {
      id: CMP_CLASS,
      institute_id: INST_A,
      title: "Classroom seating",
      body: "Please review seating near the window for my child.",
      category: "Academic",
      priority: "medium",
      status: "pending",
      destination: "class_teacher",
      requested_by_user_id: USER_PARENT,
      student_id: STUDENT_A,
      teacher_id: null,
      response_note: null,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
    {
      id: CMP_OTHER,
      institute_id: INST_B,
      title: "Other institute",
      body: "Should not be visible across tenants at all.",
      category: "General",
      priority: "low",
      status: "pending",
      destination: "principal_admin",
      requested_by_user_id: USER_OTHER,
      student_id: null,
      teacher_id: null,
      response_note: null,
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
        "token-teacher2": USER_TEACHER2,
        "token-parent": USER_PARENT,
        "token-staff": USER_STAFF,
        "token-other": USER_OTHER,
      },
      db,
    }),
  );
}

describe("complaints api", () => {
  it("lists for staff and scopes parent to own cases", async () => {
    const app = appWithDb(baseDb());

    const staff = await app.request(
      `/api/v1/complaints?institute_id=${INST_A}`,
      { headers: { Authorization: "Bearer token-admin" } },
    );
    expect(staff.status).toBe(200);
    expect((await json(staff)).data).toHaveLength(3);

    const parent = await app.request(
      `/api/v1/complaints?institute_id=${INST_A}`,
      { headers: { Authorization: "Bearer token-parent" } },
    );
    expect(parent.status).toBe(200);
    const parentBody = await json(parent);
    expect(parentBody.data).toHaveLength(2);
    expect(parentBody.data.map((c: { id: string }) => c.id).sort()).toEqual(
      [CMP_PENDING, CMP_CLASS].sort(),
    );

    const cross = await app.request(
      `/api/v1/complaints?institute_id=${INST_B}`,
      { headers: { Authorization: "Bearer token-admin" } },
    );
    expect(cross.status).toBe(403);
  });

  it("hides drafts from non-triage staff readers", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request(
      `/api/v1/complaints?institute_id=${INST_A}`,
      { headers: { Authorization: "Bearer token-staff" } },
    );
    expect(res.status).toBe(200);
    const ids = (await json(res)).data.map((c: { id: string }) => c.id);
    expect(ids).toContain(CMP_PENDING);
    expect(ids).toContain(CMP_CLASS);
    expect(ids).not.toContain(CMP_DRAFT);
  });

  it("scopes class_teacher queue to assigned teachers only", async () => {
    const app = appWithDb(baseDb());

    const covered = await app.request(`/api/v1/complaints/${CMP_CLASS}`, {
      headers: { Authorization: "Bearer token-teacher" },
    });
    expect(covered.status).toBe(200);

    const uncovered = await app.request(`/api/v1/complaints/${CMP_CLASS}`, {
      headers: { Authorization: "Bearer token-teacher2" },
    });
    expect(uncovered.status).toBe(403);

    const principalCase = await app.request(`/api/v1/complaints/${CMP_PENDING}`, {
      headers: { Authorization: "Bearer token-teacher" },
    });
    expect(principalCase.status).toBe(403);
  });

  it("parent creates complaint for linked student", async () => {
    const db = baseDb();
    db.complaint = [];
    const app = appWithDb(db);

    const res = await app.request("/api/v1/complaints", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-parent",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        title: "Classroom concern",
        body: "Need to discuss seating arrangement for my child.",
        category: "Academic",
        destination: "class_teacher",
        student_id: STUDENT_A,
        priority: "medium",
      }),
    });
    expect(res.status).toBe(201);
    const body = await json(res);
    expect(body.data.status).toBe("pending");
    expect(body.data.studentId).toBe(STUDENT_A);
  });

  it("blocks parent create for unlinked student", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request("/api/v1/complaints", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-parent",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        title: "Wrong child",
        body: "Trying to file for an unlinked student here.",
        category: "Academic",
        destination: "principal_admin",
        student_id: STUDENT_B,
      }),
    });
    expect(res.status).toBe(403);
  });

  it("admin transitions pending to review then resolved", async () => {
    const app = appWithDb(baseDb());

    const review = await app.request(
      `/api/v1/complaints/${CMP_PENDING}/transition`,
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

    const resolved = await app.request(
      `/api/v1/complaints/${CMP_PENDING}/transition`,
      {
        method: "POST",
        headers: {
          Authorization: "Bearer token-admin",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "resolved",
          response_note: "Issue addressed with transport.",
        }),
      },
    );
    expect(resolved.status).toBe(200);
    expect((await json(resolved)).data.status).toBe("resolved");
  });

  it("assigned teacher may review/forward but not resolve class queue", async () => {
    const app = appWithDb(baseDb());

    const review = await app.request(
      `/api/v1/complaints/${CMP_CLASS}/transition`,
      {
        method: "POST",
        headers: {
          Authorization: "Bearer token-teacher",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "review" }),
      },
    );
    expect(review.status).toBe(200);

    const resolve = await app.request(
      `/api/v1/complaints/${CMP_CLASS}/transition`,
      {
        method: "POST",
        headers: {
          Authorization: "Bearer token-teacher",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "resolved" }),
      },
    );
    expect(resolve.status).toBe(403);

    const otherTeacher = await app.request(
      `/api/v1/complaints/${CMP_CLASS}/transition`,
      {
        method: "POST",
        headers: {
          Authorization: "Bearer token-teacher2",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "review" }),
      },
    );
    expect(otherTeacher.status).toBe(403);
  });

  it("teacher submits draft and parent cannot transition", async () => {
    const app = appWithDb(baseDb());

    const submit = await app.request(
      `/api/v1/complaints/${CMP_DRAFT}/transition`,
      {
        method: "POST",
        headers: {
          Authorization: "Bearer token-teacher",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "pending" }),
      },
    );
    // draft has null destination — should fail validation
    expect(submit.status).toBe(400);

    const withDest = await app.request(`/api/v1/complaints/${CMP_DRAFT}`, {
      method: "PATCH",
      headers: {
        Authorization: "Bearer token-teacher",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ destination: "principal_admin" }),
    });
    expect(withDest.status).toBe(200);

    const submit2 = await app.request(
      `/api/v1/complaints/${CMP_DRAFT}/transition`,
      {
        method: "POST",
        headers: {
          Authorization: "Bearer token-teacher",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "pending" }),
      },
    );
    expect(submit2.status).toBe(200);
    expect((await json(submit2)).data.status).toBe("pending");

    const parentTransition = await app.request(
      `/api/v1/complaints/${CMP_PENDING}/transition`,
      {
        method: "POST",
        headers: {
          Authorization: "Bearer token-parent",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "resolved" }),
      },
    );
    expect(parentTransition.status).toBe(403);
  });

  it("soft-deletes draft only", async () => {
    const app = appWithDb(baseDb());

    const pendingDelete = await app.request(
      `/api/v1/complaints/${CMP_PENDING}`,
      {
        method: "DELETE",
        headers: { Authorization: "Bearer token-parent" },
      },
    );
    expect(pendingDelete.status).toBe(403);

    const draftDelete = await app.request(`/api/v1/complaints/${CMP_DRAFT}`, {
      method: "DELETE",
      headers: { Authorization: "Bearer token-teacher" },
    });
    expect(draftDelete.status).toBe(204);
  });

  it("blocks cross-tenant get by id", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request(`/api/v1/complaints/${CMP_OTHER}`, {
      headers: { Authorization: "Bearer token-admin" },
    });
    expect(res.status).toBe(403);
  });
});
