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
const TEACHER_A = "bb111111-1111-4111-8111-111111111111";
const SECTION_A = "cc111111-1111-4111-8111-111111111111";
const SUBJECT_A = "dd111111-1111-4111-8111-111111111111";
const YEAR_A = "ee111111-1111-4111-8111-111111111111";
const CLASS_A = "ff111111-1111-4111-8111-111111111111";
const ASSIGN_A = "ab111111-1111-4111-8111-111111111111";
const STUDENT_A = "ac111111-1111-4111-8111-111111111111";
const ENROLL_A = "ad111111-1111-4111-8111-111111111111";
const EXAM_A = "ae111111-1111-4111-8111-111111111111";

const ENTRY_SUBMITTED = "af222222-2222-4222-8222-222222222222";

beforeEach(() => {
  resetEnvCache();
  vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  vi.spyOn(process.stderr, "write").mockImplementation(() => true);
});

afterEach(() => {
  vi.restoreAllMocks();
});

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
  db.teacher = [
    { id: TEACHER_A, institute_id: INST_A, user_profile_id: USER_TEACHER, display_name: "Teacher", status: "active", deleted_at: null },
  ];
  db.student = [
    { id: STUDENT_A, institute_id: INST_A, user_profile_id: "99999999-9999-4999-8999-999999999999", display_name: "Student", deleted_at: null },
  ];
  db.academic_year = [
    { id: YEAR_A, institute_id: INST_A, deleted_at: null },
  ];
  db.subject = [
    { id: SUBJECT_A, institute_id: INST_A, name: "Maths", code: "MATH", deleted_at: null },
  ];
  db.section = [
    { id: SECTION_A, institute_id: INST_A, academic_year_id: YEAR_A, class_id: CLASS_A, status: "active", deleted_at: null },
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
      id: EXAM_A,
      institute_id: INST_A,
      academic_year_id: YEAR_A,
      name: "UT1",
      header: "UT1",
      start_date: "2026-09-01",
      end_date: "2026-09-05",
      default_starts_at: "09:00:00",
      default_ends_at: "12:00:00",
      total_marks: 50,
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
  db.mark_entry = [
    {
      id: ENTRY_SUBMITTED,
      institute_id: INST_A,
      academic_year_id: YEAR_A,
      class_id: CLASS_A,
      section_id: SECTION_A,
      exam_id: EXAM_A,
      subject_id: SUBJECT_A,
      teacher_id: TEACHER_A,
      max_marks: 50,
      status: "submitted",
      submitted_at: "2026-09-02T00:00:00.000Z",
      published_at: null,
      admin_note: null,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
  ];
  db.mark_score = [
    {
      id: "b0111111-1111-4111-8111-111111111111",
      institute_id: INST_A,
      mark_entry_id: ENTRY_SUBMITTED,
      student_id: STUDENT_A,
      enrollment_id: ENROLL_A,
      marks: 42,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
  ];
  db.institute = [{ id: INST_A, deleted_at: null }, { id: INST_B, deleted_at: null }];
  return db;
}

function buildApp(db: MockDb) {
  const tokens: Record<string, string> = {
    "admin-token": USER_ADMIN,
    "teacher-token": USER_TEACHER,
    "other-token": USER_OTHER,
  };
  const clients = createMockSupabaseClients({ tokens, db });
  const env = loadEnv({ NODE_ENV: "test", LOG_LEVEL: "error" });
  return createApp(env, silentLogger, clients as never);
}

describe("mark-publication", () => {
  it("publish creates a mark_publication row and returns publicationId", async () => {
    const db = baseDb();
    const app = buildApp(db);

    const res = await app.request("/api/v1/marks/entries/" + ENTRY_SUBMITTED + "/publish", {
      method: "POST",
      headers: { Authorization: "Bearer admin-token", "Content-Type": "application/json" },
    });
    expect(res.status).toBe(200);

    const body = await json(res);
    expect(body.data.status).toBe("published");
    expect(body.data.publicationId).toBeTruthy();

    expect(db.mark_publication.length).toBe(1);
    const pub = db.mark_publication[0];
    expect(pub.institute_id).toBe(INST_A);
    expect(pub.mark_entry_id).toBe(ENTRY_SUBMITTED);
    expect(pub.score_count).toBe(1);
    expect(pub.published_by_user_id).toBe(USER_ADMIN);
  });

  it("list publications works after publish", async () => {
    const db = baseDb();
    const app = buildApp(db);

    await app.request("/api/v1/marks/entries/" + ENTRY_SUBMITTED + "/publish", {
      method: "POST",
      headers: { Authorization: "Bearer admin-token", "Content-Type": "application/json" },
    });

    const res = await app.request(
      "/api/v1/marks/publications?institute_id=" + INST_A,
      { headers: { Authorization: "Bearer admin-token" } },
    );
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.data.length).toBe(1);
    expect(body.data[0].markEntryId).toBe(ENTRY_SUBMITTED);
    expect(body.data[0].scoreCount).toBe(1);
  });

  it("get single publication by id", async () => {
    const db = baseDb();
    const app = buildApp(db);

    const pubRes = await app.request("/api/v1/marks/entries/" + ENTRY_SUBMITTED + "/publish", {
      method: "POST",
      headers: { Authorization: "Bearer admin-token", "Content-Type": "application/json" },
    });
    const pubBody = await json(pubRes);
    const pubId = pubBody.data.publicationId;

    const res = await app.request("/api/v1/marks/publications/" + pubId, {
      headers: { Authorization: "Bearer admin-token" },
    });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.data.id).toBe(pubId);
    expect(body.data.examId).toBe(EXAM_A);
  });

  it("401 for unauthenticated user", async () => {
    const db = baseDb();
    const app = buildApp(db);

    const res = await app.request("/api/v1/marks/publications?institute_id=" + INST_A);
    expect(res.status).toBe(401);
  });

  it("list with section_id and exam_id filters", async () => {
    const db = baseDb();
    const app = buildApp(db);

    await app.request("/api/v1/marks/entries/" + ENTRY_SUBMITTED + "/publish", {
      method: "POST",
      headers: { Authorization: "Bearer admin-token", "Content-Type": "application/json" },
    });

    const res = await app.request(
      `/api/v1/marks/publications?institute_id=${INST_A}&section_id=${SECTION_A}&exam_id=${EXAM_A}`,
      { headers: { Authorization: "Bearer admin-token" } },
    );
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.data.length).toBe(1);
  });

  it("returns 404 for non-existent publication", async () => {
    const db = baseDb();
    const app = buildApp(db);

    const res = await app.request(
      "/api/v1/marks/publications/00000000-0000-4000-8000-000000000000",
      { headers: { Authorization: "Bearer admin-token" } },
    );
    expect(res.status).toBe(404);
  });
});
