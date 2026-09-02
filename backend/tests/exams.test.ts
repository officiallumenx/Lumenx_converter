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
const USER_STUDENT = "33333333-3333-4333-8333-333333333333";
const USER_OTHER = "44444444-4444-4444-8444-444444444444";
const USER_PARENT = "55555555-5555-4555-8555-555555555555";
const INST_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const INST_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const MEMBER_ADMIN = "aa111111-1111-4111-8111-111111111111";
const MEMBER_TEACHER = "aa222222-2222-4222-8222-222222222222";
const MEMBER_STUDENT = "aa333333-3333-4333-8333-333333333333";
const MEMBER_OTHER = "aa444444-4444-4444-8444-444444444444";
const MEMBER_PARENT = "aa555555-5555-4555-8555-555555555555";
const TEACHER_A = "bb111111-1111-4111-8111-111111111111";
const PARENT_A = "ba111111-1111-4111-8111-111111111111";
const SECTION_A = "cc111111-1111-4111-8111-111111111111";
const SECTION_B = "cc222222-2222-4222-8222-222222222222";
const SECTION_A2 = "cc333333-3333-4333-8333-333333333333";
const SUBJECT_A = "dd111111-1111-4111-8111-111111111111";
const SUBJECT_B = "dd222222-2222-4222-8222-222222222222";
const YEAR_A = "ee111111-1111-4111-8111-111111111111";
const YEAR_B = "ee222222-2222-4222-8222-222222222222";
const CLASS_A = "ff111111-1111-4111-8111-111111111111";
const CLASS_B = "ff222222-2222-4222-8222-222222222222";
const CLASS_A2 = "ff333333-3333-4333-8333-333333333333";
const STUDENT_A = "ac111111-1111-4111-8111-111111111111";
const STUDENT_B = "ac222222-2222-4222-8222-222222222222";
const ENROLL_A = "ad111111-1111-4111-8111-111111111111";
const EXAM_DRAFT = "af111111-1111-4111-8111-111111111111";
const EXAM_PUBLISHED = "af222222-2222-4222-8222-222222222222";
const EXAM_OTHER = "af333333-3333-4333-8333-333333333333";
const EXAM_SECTION = "af444444-4444-4444-8444-444444444444";

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
      id: USER_STUDENT,
      display_name: "Student",
      email: "student@example.com",
      status: "active",
      deleted_at: null,
    },
    {
      id: USER_OTHER,
      display_name: "OtherAdmin",
      email: "other@example.com",
      status: "active",
      deleted_at: null,
    },
    {
      id: USER_PARENT,
      display_name: "Parent",
      email: "parent@example.com",
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
      id: MEMBER_STUDENT,
      user_id: USER_STUDENT,
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
    {
      id: MEMBER_PARENT,
      user_id: USER_PARENT,
      institute_id: INST_A,
      status: "active",
      deleted_at: null,
    },
  ];
  db.membership_role = [
    { membership_id: MEMBER_ADMIN, role_code: "institute_admin" },
    { membership_id: MEMBER_TEACHER, role_code: "teacher" },
    { membership_id: MEMBER_STUDENT, role_code: "student" },
    { membership_id: MEMBER_OTHER, role_code: "institute_admin" },
    { membership_id: MEMBER_PARENT, role_code: "parent" },
  ];
  db.teacher = [
    {
      id: TEACHER_A,
      institute_id: INST_A,
      user_profile_id: USER_TEACHER,
      status: "active",
      deleted_at: null,
    },
  ];
  db.parent = [
    {
      id: PARENT_A,
      institute_id: INST_A,
      user_profile_id: USER_PARENT,
      deleted_at: null,
    },
  ];
  db.guardian_link = [
    {
      id: "bc111111-1111-4111-8111-111111111111",
      institute_id: INST_A,
      student_id: STUDENT_A,
      parent_id: PARENT_A,
      relationship: "father",
      status: "active",
      deleted_at: null,
    },
  ];
  db.student = [
    {
      id: STUDENT_A,
      institute_id: INST_A,
      user_profile_id: USER_STUDENT,
      status: "active",
      deleted_at: null,
    },
    {
      id: STUDENT_B,
      institute_id: INST_A,
      user_profile_id: null,
      status: "active",
      deleted_at: null,
    },
  ];
  db.academic_year = [
    { id: YEAR_A, institute_id: INST_A, deleted_at: null },
    { id: YEAR_B, institute_id: INST_B, deleted_at: null },
  ];
  db.subject = [
    { id: SUBJECT_A, institute_id: INST_A, deleted_at: null },
    { id: SUBJECT_B, institute_id: INST_B, deleted_at: null },
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
      id: SECTION_A2,
      institute_id: INST_A,
      academic_year_id: YEAR_A,
      class_id: CLASS_A2,
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
  db.exam = [
    {
      id: EXAM_DRAFT,
      institute_id: INST_A,
      academic_year_id: YEAR_A,
      name: "Unit Test Draft",
      header: "UT Draft",
      start_date: "2026-09-01",
      end_date: "2026-09-05",
      default_starts_at: "09:00:00",
      default_ends_at: "12:00:00",
      total_marks: 50,
      internal_marks: null,
      external_marks: null,
      audience_scope: "year",
      schedule_status: "draft",
      lifecycle_status: "open",
      schedule_published_at: null,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
    {
      id: EXAM_PUBLISHED,
      institute_id: INST_A,
      academic_year_id: YEAR_A,
      name: "Mid Term",
      header: "Mid",
      start_date: "2026-10-01",
      end_date: "2026-10-10",
      default_starts_at: "09:00:00",
      default_ends_at: "12:00:00",
      total_marks: 80,
      internal_marks: 20,
      external_marks: 60,
      audience_scope: "year",
      schedule_status: "published",
      lifecycle_status: "open",
      schedule_published_at: "2026-09-15T00:00:00.000Z",
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
    {
      id: EXAM_SECTION,
      institute_id: INST_A,
      academic_year_id: YEAR_A,
      name: "Section Only",
      header: "Sec",
      start_date: "2026-11-01",
      end_date: "2026-11-02",
      default_starts_at: "09:00:00",
      default_ends_at: "11:00:00",
      total_marks: 40,
      internal_marks: null,
      external_marks: null,
      audience_scope: "section",
      schedule_status: "published",
      lifecycle_status: "open",
      schedule_published_at: "2026-10-20T00:00:00.000Z",
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
    {
      id: EXAM_OTHER,
      institute_id: INST_B,
      academic_year_id: YEAR_B,
      name: "Other Inst Exam",
      header: "Other",
      start_date: "2026-09-01",
      end_date: "2026-09-02",
      default_starts_at: "09:00:00",
      default_ends_at: "12:00:00",
      total_marks: 100,
      internal_marks: null,
      external_marks: null,
      audience_scope: "year",
      schedule_status: "published",
      lifecycle_status: "open",
      schedule_published_at: "2026-08-01T00:00:00.000Z",
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
  ];
  db.exam_target_section = [
    {
      id: "b0111111-1111-4111-8111-111111111111",
      institute_id: INST_A,
      academic_year_id: YEAR_A,
      class_id: CLASS_A2,
      exam_id: EXAM_SECTION,
      section_id: SECTION_A2,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
  ];
  db.exam_subject_schedule = [
    {
      id: "b0222222-2222-4222-8222-222222222222",
      institute_id: INST_A,
      exam_id: EXAM_PUBLISHED,
      subject_id: SUBJECT_A,
      paper_date: "2026-10-02",
      starts_at: "09:00:00",
      ends_at: "12:00:00",
      room: "Hall 1",
      invigilator_teacher_id: TEACHER_A,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
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
    "token-student": USER_STUDENT,
    "token-other": USER_OTHER,
    "token-parent": USER_PARENT,
  },
) {
  const env = loadEnv({ NODE_ENV: "test", LOG_LEVEL: "error" });
  return createApp(env, silentLogger, createMockSupabaseClients({ tokens, db }));
}

const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

const validCreateBody = {
  institute_id: INST_A,
  academic_year_id: YEAR_A,
  name: "Final Exam",
  header: "Term Final",
  start_date: "2026-12-01",
  end_date: "2026-12-10",
  default_starts_at: "09:00",
  default_ends_at: "12:00",
  total_marks: 100,
  internal_marks: 20,
  external_marks: 80,
  audience_scope: "year",
  subject_schedules: [
    {
      subject_id: SUBJECT_A,
      paper_date: "2026-12-02",
      starts_at: "09:00",
      ends_at: "12:00",
      room: "A1",
      invigilator_teacher_id: TEACHER_A,
    },
  ],
};

describe("exams — authentication", () => {
  it("returns 401 without JWT", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request(`/api/v1/exams?institute_id=${INST_A}`);
    expect(res.status).toBe(401);
  });

  it("returns 401 for invalid JWT", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request(`/api/v1/exams?institute_id=${INST_A}`, {
      headers: auth("bad"),
    });
    expect(res.status).toBe(401);
  });
});

describe("exams — tenant isolation", () => {
  it("rejects listing another institute", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request(`/api/v1/exams?institute_id=${INST_B}`, {
      headers: auth("token-admin"),
    });
    expect(res.status).toBe(403);
  });

  it("rejects create with spoofed institute_id", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request("/api/v1/exams", {
      method: "POST",
      headers: { ...auth("token-admin"), "Content-Type": "application/json" },
      body: JSON.stringify({
        ...validCreateBody,
        institute_id: INST_B,
        academic_year_id: YEAR_B,
      }),
    });
    expect(res.status).toBe(403);
  });

  it("blocks GET of foreign institute exam", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request(`/api/v1/exams/${EXAM_OTHER}`, {
      headers: auth("token-admin"),
    });
    expect(res.status).toBe(403);
  });

  it("rejects cross-institute academic year on create", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request("/api/v1/exams", {
      method: "POST",
      headers: { ...auth("token-admin"), "Content-Type": "application/json" },
      body: JSON.stringify({
        ...validCreateBody,
        academic_year_id: YEAR_B,
      }),
    });
    expect(res.status).toBe(400);
  });

  it("rejects cross-institute subject on create", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request("/api/v1/exams", {
      method: "POST",
      headers: { ...auth("token-admin"), "Content-Type": "application/json" },
      body: JSON.stringify({
        ...validCreateBody,
        subject_schedules: [
          {
            subject_id: SUBJECT_B,
            paper_date: "2026-12-02",
            starts_at: "09:00",
            ends_at: "12:00",
          },
        ],
      }),
    });
    expect(res.status).toBe(400);
  });
});

describe("exams — authorization", () => {
  it("allows admin to list and get exams", async () => {
    const app = appWithDb(baseDb());
    const list = await app.request(`/api/v1/exams?institute_id=${INST_A}`, {
      headers: auth("token-admin"),
    });
    expect(list.status).toBe(200);
    expect((await json(list)).data.length).toBeGreaterThanOrEqual(3);

    const get = await app.request(`/api/v1/exams/${EXAM_PUBLISHED}`, {
      headers: auth("token-admin"),
    });
    expect(get.status).toBe(200);
    const body = await json(get);
    expect(body.data.id).toBe(EXAM_PUBLISHED);
    expect(body.data.subjectSchedules).toHaveLength(1);
  });

  it("allows teacher to read but not create", async () => {
    const app = appWithDb(baseDb());
    const list = await app.request(`/api/v1/exams?institute_id=${INST_A}`, {
      headers: auth("token-teacher"),
    });
    expect(list.status).toBe(200);

    const create = await app.request("/api/v1/exams", {
      method: "POST",
      headers: { ...auth("token-teacher"), "Content-Type": "application/json" },
      body: JSON.stringify(validCreateBody),
    });
    expect(create.status).toBe(403);
  });

  it("allows learner to read published year-scope exam only", async () => {
    const app = appWithDb(baseDb());
    const published = await app.request(`/api/v1/exams/${EXAM_PUBLISHED}`, {
      headers: auth("token-student"),
    });
    expect(published.status).toBe(200);

    const draft = await app.request(`/api/v1/exams/${EXAM_DRAFT}`, {
      headers: auth("token-student"),
    });
    expect(draft.status).toBe(403);

    const otherSection = await app.request(`/api/v1/exams/${EXAM_SECTION}`, {
      headers: auth("token-student"),
    });
    expect(otherSection.status).toBe(403);
  });

  it("allows parent to read linked child's published exams", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request(`/api/v1/exams/${EXAM_PUBLISHED}`, {
      headers: auth("token-parent"),
    });
    expect(res.status).toBe(200);
  });

  it("filters learner list to published in-audience exams", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request(`/api/v1/exams?institute_id=${INST_A}`, {
      headers: auth("token-student"),
    });
    expect(res.status).toBe(200);
    const ids = (await json(res)).data.map((e: { id: string }) => e.id);
    expect(ids).toContain(EXAM_PUBLISHED);
    expect(ids).not.toContain(EXAM_DRAFT);
    expect(ids).not.toContain(EXAM_SECTION);
  });

  it("lets institute driver read published exams only", async () => {
    const db = baseDb();
    const USER_DRIVER = "66666666-6666-4666-8666-666666666666";
    const MEMBER_DRIVER = "aa666666-6666-4666-8666-666666666666";
    db.user_profile.push({
      id: USER_DRIVER,
      display_name: "Driver",
      email: "d@x.com",
      status: "active",
      deleted_at: null,
    });
    db.membership.push({
      id: MEMBER_DRIVER,
      user_id: USER_DRIVER,
      institute_id: INST_A,
      status: "active",
      deleted_at: null,
    });
    db.membership_role.push({ membership_id: MEMBER_DRIVER, role_code: "driver" });

    const env = loadEnv({ NODE_ENV: "test", LOG_LEVEL: "error" });
    const app = createApp(
      env,
      silentLogger,
      createMockSupabaseClients({
        tokens: {
          "token-admin": USER_ADMIN,
          "token-teacher": USER_TEACHER,
          "token-student": USER_STUDENT,
          "token-other": USER_OTHER,
          "token-parent": USER_PARENT,
          "token-driver": USER_DRIVER,
        },
        db,
      }),
    );

    const list = await app.request(`/api/v1/exams?institute_id=${INST_A}`, {
      headers: auth("token-driver"),
    });
    expect(list.status).toBe(200);
    const ids = (await json(list)).data.map((e: { id: string }) => e.id);
    expect(ids).toContain(EXAM_PUBLISHED);
    expect(ids).toContain(EXAM_SECTION);
    expect(ids).not.toContain(EXAM_DRAFT);

    const draft = await app.request(`/api/v1/exams/${EXAM_DRAFT}`, {
      headers: auth("token-driver"),
    });
    expect(draft.status).toBe(403);
  });
});

describe("exams — create / patch / delete / lifecycle", () => {
  it("creates draft open exam with UUID id", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request("/api/v1/exams", {
      method: "POST",
      headers: { ...auth("token-admin"), "Content-Type": "application/json" },
      body: JSON.stringify(validCreateBody),
    });
    expect(res.status).toBe(201);
    const body = await json(res);
    expect(body.data.scheduleStatus).toBe("draft");
    expect(body.data.lifecycleStatus).toBe("open");
    expect(body.data.id).toMatch(
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i,
    );
    expect(body.data.subjectSchedules).toHaveLength(1);
  });

  it("creates section-scoped exam with targets", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request("/api/v1/exams", {
      method: "POST",
      headers: { ...auth("token-admin"), "Content-Type": "application/json" },
      body: JSON.stringify({
        ...validCreateBody,
        audience_scope: "section",
        target_sections: [{ section_id: SECTION_A, class_id: CLASS_A }],
        subject_schedules: [],
      }),
    });
    expect(res.status).toBe(201);
    expect((await json(res)).data.targetSections).toHaveLength(1);
  });

  it("rejects year-scope with targets and section-scope without", async () => {
    const app = appWithDb(baseDb());
    const withTargets = await app.request("/api/v1/exams", {
      method: "POST",
      headers: { ...auth("token-admin"), "Content-Type": "application/json" },
      body: JSON.stringify({
        ...validCreateBody,
        audience_scope: "year",
        target_sections: [{ section_id: SECTION_A, class_id: CLASS_A }],
      }),
    });
    expect(withTargets.status).toBe(400);

    const without = await app.request("/api/v1/exams", {
      method: "POST",
      headers: { ...auth("token-admin"), "Content-Type": "application/json" },
      body: JSON.stringify({
        ...validCreateBody,
        audience_scope: "section",
        target_sections: [],
      }),
    });
    expect(without.status).toBe(400);
  });

  it("publishes via patch and filters list by schedule_status", async () => {
    const app = appWithDb(baseDb());
    const publish = await app.request(`/api/v1/exams/${EXAM_DRAFT}`, {
      method: "PATCH",
      headers: { ...auth("token-admin"), "Content-Type": "application/json" },
      body: JSON.stringify({ schedule_status: "published" }),
    });
    expect(publish.status).toBe(200);
    const body = await json(publish);
    expect(body.data.scheduleStatus).toBe("published");
    expect(body.data.schedulePublishedAt).toBeTruthy();

    const filtered = await app.request(
      `/api/v1/exams?institute_id=${INST_A}&schedule_status=draft`,
      { headers: auth("token-admin") },
    );
    expect(filtered.status).toBe(200);
    const ids = (await json(filtered)).data.map((e: { id: string }) => e.id);
    expect(ids).not.toContain(EXAM_DRAFT);
  });

  it("emits notifications when exam schedule is published", async () => {
    const db = baseDb();
    db.notification = [];
    db.notification_recipient = [];
    const app = appWithDb(db);

    const publish = await app.request(`/api/v1/exams/${EXAM_DRAFT}`, {
      method: "PATCH",
      headers: { ...auth("token-admin"), "Content-Type": "application/json" },
      body: JSON.stringify({ schedule_status: "published" }),
    });
    expect(publish.status).toBe(200);

    expect(db.notification.length).toBeGreaterThan(0);
    expect(db.notification.some((n) => n.category === "exams")).toBe(true);
    expect(
      db.notification.some((n) =>
        String(n.title).includes("Unit Test Draft"),
      ),
    ).toBe(true);
    expect(
      db.notification_recipient.some(
        (r) => r.user_profile_id === USER_TEACHER,
      ),
    ).toBe(true);
    expect(
      db.notification_recipient.some(
        (r) => r.user_profile_id === USER_STUDENT,
      ),
    ).toBe(true);
  });

  it("blocks patch after close; allows soft delete", async () => {
    const app = appWithDb(baseDb());
    const close = await app.request(`/api/v1/exams/${EXAM_DRAFT}`, {
      method: "PATCH",
      headers: { ...auth("token-admin"), "Content-Type": "application/json" },
      body: JSON.stringify({ lifecycle_status: "closed" }),
    });
    expect(close.status).toBe(200);

    const patch = await app.request(`/api/v1/exams/${EXAM_DRAFT}`, {
      method: "PATCH",
      headers: { ...auth("token-admin"), "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Nope" }),
    });
    expect(patch.status).toBe(409);

    const del = await app.request(`/api/v1/exams/${EXAM_DRAFT}`, {
      method: "DELETE",
      headers: auth("token-admin"),
    });
    expect(del.status).toBe(200);

    const get = await app.request(`/api/v1/exams/${EXAM_DRAFT}`, {
      headers: auth("token-admin"),
    });
    expect(get.status).toBe(404);
  });

  it("PATCH/DELETE authorize from existing exam institute", async () => {
    const app = appWithDb(baseDb());
    const patch = await app.request(`/api/v1/exams/${EXAM_OTHER}`, {
      method: "PATCH",
      headers: { ...auth("token-admin"), "Content-Type": "application/json" },
      body: JSON.stringify({ name: "Hijack" }),
    });
    expect(patch.status).toBe(403);

    const del = await app.request(`/api/v1/exams/${EXAM_OTHER}`, {
      method: "DELETE",
      headers: auth("token-admin"),
    });
    expect(del.status).toBe(403);
  });
});

describe("exams — UUID / legacy ID integrity", () => {
  it("rejects legacy EX-* path params", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request("/api/v1/exams/EX-MID", {
      headers: auth("token-admin"),
    });
    expect(res.status).toBe(400);
  });

  it("rejects legacy ex-* path params", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request("/api/v1/exams/ex-ut1", {
      headers: auth("token-admin"),
    });
    expect(res.status).toBe(400);
  });
});
