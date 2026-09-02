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
const JOB_OPEN = "c0111111-1111-4111-8111-111111111111";
const JOB_DRAFT = "c0222222-2222-4222-8222-222222222222";
const APP_PARENT = "c0333333-3333-4333-8333-333333333333";
const APP_OTHER = "c0444444-4444-4444-8444-444444444444";
const INQ_PARENT = "c0555555-5555-4555-8555-555555555555";
const TALENT_1 = "c0666666-6666-4666-8666-666666666666";
const SAVED_PARENT = "c0777777-7777-4777-8777-777777777777";
const PROFILE_PARENT = "c0888888-8888-4888-8888-888888888888";

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
  db.career_job = [
    {
      id: JOB_OPEN,
      institute_id: INST_A,
      title: "Math Teacher",
      slug: "math-teacher",
      description: "Teach math",
      category: "academic_faculty",
      employment_type: "full_time",
      work_mode: "onsite",
      location_label: "Campus",
      openings_count: 2,
      status: "open",
      created_by_user_id: USER_ADMIN,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
    {
      id: JOB_DRAFT,
      institute_id: INST_A,
      title: "Hidden Role",
      slug: "hidden-role",
      description: null,
      category: "academic_faculty",
      employment_type: "full_time",
      work_mode: "onsite",
      location_label: null,
      openings_count: 1,
      status: "draft",
      created_by_user_id: USER_ADMIN,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
  ];
  db.candidate_profile = [
    {
      id: PROFILE_PARENT,
      institute_id: INST_A,
      user_profile_id: USER_PARENT,
      display_name: "Parent Candidate",
      headline: "Educator",
      summary: null,
      phone: null,
      email: "p@x.com",
      payload: {},
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
  ];
  db.career_application = [
    {
      id: APP_PARENT,
      institute_id: INST_A,
      job_id: JOB_OPEN,
      candidate_profile_id: PROFILE_PARENT,
      applicant_user_id: USER_PARENT,
      status: "submitted",
      cover_letter: "Hello",
      payload: {},
      decision_note: null,
      converted_teacher_id: null,
      submitted_at: "2026-08-02T00:00:00.000Z",
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-02T00:00:00.000Z",
      deleted_at: null,
    },
    {
      id: APP_OTHER,
      institute_id: INST_B,
      job_id: JOB_OPEN,
      candidate_profile_id: null,
      applicant_user_id: USER_OTHER,
      status: "submitted",
      cover_letter: null,
      payload: {},
      decision_note: null,
      converted_teacher_id: null,
      submitted_at: "2026-08-02T00:00:00.000Z",
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-02T00:00:00.000Z",
      deleted_at: null,
    },
  ];
  db.career_inquiry = [
    {
      id: INQ_PARENT,
      institute_id: INST_A,
      category: "job",
      subject: "Role question",
      body: "Is remote possible?",
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
  db.talent_pool_entry = [
    {
      id: TALENT_1,
      institute_id: INST_A,
      candidate_user_id: USER_PARENT,
      candidate_profile_id: PROFILE_PARENT,
      notes: "Strong candidate",
      status: "active",
      created_by_user_id: USER_ADMIN,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
  ];
  db.user_saved_item = [
    {
      id: SAVED_PARENT,
      institute_id: INST_A,
      user_profile_id: USER_PARENT,
      item_kind: "career_job",
      item_id: JOB_OPEN,
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

describe("careers api", () => {
  it("hides draft jobs from parents and returns 404 on draft mutation probe", async () => {
    const app = appWithDb(baseDb());

    const jobs = await app.request(
      `/api/v1/careers/jobs?institute_id=${INST_A}`,
      { headers: { Authorization: "Bearer token-parent" } },
    );
    expect(jobs.status).toBe(200);
    const ids = (await json(jobs)).data.map((j: { id: string }) => j.id);
    expect(ids).toContain(JOB_OPEN);
    expect(ids).not.toContain(JOB_DRAFT);

    const draftGet = await app.request(`/api/v1/careers/jobs/${JOB_DRAFT}`, {
      headers: { Authorization: "Bearer token-parent" },
    });
    expect(draftGet.status).toBe(404);

    const draftPatch = await app.request(`/api/v1/careers/jobs/${JOB_DRAFT}`, {
      method: "PATCH",
      headers: {
        Authorization: "Bearer token-parent",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ title: "probe" }),
    });
    expect(draftPatch.status).toBe(404);
  });

  it("allows apply only to open jobs; rejects draft job apply", async () => {
    const app = appWithDb(baseDb());

    const created = await app.request("/api/v1/careers/applications", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-parent",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        job_id: JOB_OPEN,
        submit_now: true,
      }),
    });
    expect(created.status).toBe(201);

    const draftApply = await app.request("/api/v1/careers/applications", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-parent",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        job_id: JOB_DRAFT,
        submit_now: true,
      }),
    });
    expect(draftApply.status).toBe(400);
  });

  it("denies teacher job writes with 403; parent write probes on hidden draft are 404", async () => {
    const app = appWithDb(baseDb());

    const teacherCreate = await app.request("/api/v1/careers/jobs", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-teacher",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        title: "No write",
        slug: "no-write",
      }),
    });
    expect(teacherCreate.status).toBe(403);
  });

  it("staff can transition applications; owner cannot short-circuit pipeline (404)", async () => {
    const app = appWithDb(baseDb());

    const staffOk = await app.request(
      `/api/v1/careers/applications/${APP_PARENT}/transition`,
      {
        method: "POST",
        headers: {
          Authorization: "Bearer token-admin",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "under_review" }),
      },
    );
    expect(staffOk.status).toBe(200);
    expect((await json(staffOk)).data.status).toBe("under_review");

    const ownerBad = await app.request(
      `/api/v1/careers/applications/${APP_PARENT}/transition`,
      {
        method: "POST",
        headers: {
          Authorization: "Bearer token-parent",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "shortlisted" }),
      },
    );
    expect(ownerBad.status).toBe(404);
  });

  it("parents see only own applications; cross-tenant get is 404", async () => {
    const app = appWithDb(baseDb());

    const list = await app.request(
      `/api/v1/careers/applications?institute_id=${INST_A}`,
      { headers: { Authorization: "Bearer token-parent" } },
    );
    expect(list.status).toBe(200);
    const ids = (await json(list)).data.map((a: { id: string }) => a.id);
    expect(ids).toEqual([APP_PARENT]);

    const cross = await app.request(`/api/v1/careers/applications/${APP_OTHER}`, {
      headers: { Authorization: "Bearer token-parent" },
    });
    expect(cross.status).toBe(404);
  });

  it("talent pool is staff-only; parent list is 403", async () => {
    const app = appWithDb(baseDb());

    const parentList = await app.request(
      `/api/v1/careers/talent-pool?institute_id=${INST_A}`,
      { headers: { Authorization: "Bearer token-parent" } },
    );
    expect(parentList.status).toBe(403);

    const adminList = await app.request(
      `/api/v1/careers/talent-pool?institute_id=${INST_A}`,
      { headers: { Authorization: "Bearer token-admin" } },
    );
    expect(adminList.status).toBe(200);
    expect((await json(adminList)).data).toHaveLength(1);
  });

  it("saved items are owner-only; teacher cannot delete parent's save", async () => {
    const app = appWithDb(baseDb());

    const own = await app.request(
      `/api/v1/careers/saved?institute_id=${INST_A}`,
      { headers: { Authorization: "Bearer token-parent" } },
    );
    expect(own.status).toBe(200);
    expect((await json(own)).data).toHaveLength(1);

    const teacherDel = await app.request(`/api/v1/careers/saved/${SAVED_PARENT}`, {
      method: "DELETE",
      headers: { Authorization: "Bearer token-teacher" },
    });
    expect(teacherDel.status).toBe(404);
  });

  it("inquiry respond is staff-only (non-staff get 404)", async () => {
    const app = appWithDb(baseDb());

    const parentRespond = await app.request(
      `/api/v1/careers/inquiries/${INQ_PARENT}/respond`,
      {
        method: "POST",
        headers: {
          Authorization: "Bearer token-parent",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "responded",
          response_note: "probe",
        }),
      },
    );
    expect(parentRespond.status).toBe(404);

    const adminRespond = await app.request(
      `/api/v1/careers/inquiries/${INQ_PARENT}/respond`,
      {
        method: "POST",
        headers: {
          Authorization: "Bearer token-admin",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          status: "responded",
          response_note: "We offer hybrid.",
        }),
      },
    );
    expect(adminRespond.status).toBe(200);
  });

  it("parent can patch application payload documents", async () => {
    const app = appWithDb(baseDb());

    const patch = await app.request(`/api/v1/careers/applications/${APP_PARENT}`, {
      method: "PATCH",
      headers: {
        Authorization: "Bearer token-parent",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        payload: {
          documents: [
            {
              id: "doc-resume",
              type: "resume",
              label: "Resume / CV",
              fileName: "resume.pdf",
              assetId: "aa111111-1111-4111-8111-111111111111",
              status: "uploaded",
            },
          ],
        },
      }),
    });
    expect(patch.status).toBe(200);
    const data = (await json(patch)).data as { payload: { documents: unknown[] } };
    expect(data.payload.documents).toHaveLength(1);

    const otherPatch = await app.request(
      `/api/v1/careers/applications/${APP_OTHER}`,
      {
        method: "PATCH",
        headers: {
          Authorization: "Bearer token-parent",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ payload: { documents: [] } }),
      },
    );
    expect(otherPatch.status).toBe(404);
  });

  it("emits careers inbox notification on staff transition", async () => {
    const db = baseDb();
    const app = appWithDb(db);

    const review = await app.request(
      `/api/v1/careers/applications/${APP_PARENT}/transition`,
      {
        method: "POST",
        headers: {
          Authorization: "Bearer token-admin",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ status: "under_review" }),
      },
    );
    expect(review.status).toBe(200);
    expect(db.notification.some((n) => n.category === "careers")).toBe(true);
    expect(
      db.notification_recipient.some((r) => r.user_profile_id === USER_PARENT),
    ).toBe(true);

    const inbox = await app.request("/api/v1/notifications", {
      headers: { Authorization: "Bearer token-parent" },
    });
    expect(inbox.status).toBe(200);
    const rows = (await json(inbox)).data as Array<{
      notification: { category: string };
    }>;
    expect(rows.some((r) => r.notification.category === "careers")).toBe(true);
  });
});
