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
const USER_STUDENT = "44444444-4444-4444-8444-444444444444";
const INST_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const INST_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const MEMBER_ADMIN = "aa111111-1111-4111-8111-111111111111";
const MEMBER_TEACHER = "aa222222-2222-4222-8222-222222222222";
const MEMBER_OTHER = "aa333333-3333-4333-8333-333333333333";
const MEMBER_STUDENT = "aa444444-4444-4444-8444-444444444444";
const TEACHER_A = "bb111111-1111-4111-8111-111111111111";
const SECTION_A = "cc111111-1111-4111-8111-111111111111";
const YEAR_A = "ee111111-1111-4111-8111-111111111111";
const CLASS_A = "ff111111-1111-4111-8111-111111111111";
const ASSIGN_A = "ab111111-1111-4111-8111-111111111111";
const SUBJECT_A = "dd111111-1111-4111-8111-111111111111";
const SLOT_A = "ac111111-1111-4111-8111-111111111111";
const SLOT_B = "ac222222-2222-4222-8222-222222222222";
const STUDENT_A = "ad111111-1111-4111-8111-111111111111";
const ENROLL_A = "ae111111-1111-4111-8111-111111111111";

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
    { id: USER_ADMIN, display_name: "Admin", email: "admin@example.com", status: "active", deleted_at: null },
    { id: USER_TEACHER, display_name: "Teacher", email: "teacher@example.com", status: "active", deleted_at: null },
    { id: USER_OTHER, display_name: "Other", email: "other@example.com", status: "active", deleted_at: null },
    { id: USER_STUDENT, display_name: "Student", email: "student@example.com", status: "active", deleted_at: null },
  ];
  db.membership = [
    { id: MEMBER_ADMIN, user_id: USER_ADMIN, institute_id: INST_A, status: "active", deleted_at: null },
    { id: MEMBER_TEACHER, user_id: USER_TEACHER, institute_id: INST_A, status: "active", deleted_at: null },
    { id: MEMBER_OTHER, user_id: USER_OTHER, institute_id: INST_B, status: "active", deleted_at: null },
    { id: MEMBER_STUDENT, user_id: USER_STUDENT, institute_id: INST_A, status: "active", deleted_at: null },
  ];
  db.membership_role = [
    { membership_id: MEMBER_ADMIN, role_code: "institute_admin" },
    { membership_id: MEMBER_TEACHER, role_code: "teacher" },
    { membership_id: MEMBER_OTHER, role_code: "institute_admin" },
    { membership_id: MEMBER_STUDENT, role_code: "student" },
  ];
  db.teacher = [
    { id: TEACHER_A, institute_id: INST_A, user_profile_id: USER_TEACHER, status: "active", deleted_at: null },
  ];
  db.academic_year = [
    { id: YEAR_A, institute_id: INST_A, deleted_at: null },
  ];
  db.class = [
    { id: CLASS_A, institute_id: INST_A, academic_year_id: YEAR_A, deleted_at: null, name: "10th", code: "10" },
  ];
  db.subject = [
    { id: SUBJECT_A, institute_id: INST_A, deleted_at: null },
  ];
  db.section = [
    {
      id: SECTION_A,
      institute_id: INST_A,
      academic_year_id: YEAR_A,
      class_id: CLASS_A,
      deleted_at: null,
      name: "Section A",
      code: "A",
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
    {
      id: SLOT_B,
      institute_id: INST_A,
      academic_year_id: YEAR_A,
      class_id: CLASS_A,
      section_id: SECTION_A,
      teacher_assignment_id: ASSIGN_A,
      day_of_week: 2,
      period_index: 2,
      starts_at: "09:00:00",
      ends_at: "09:45:00",
      room: "102",
      status: "inactive",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      deleted_at: null,
    },
  ];
  db.student = [
    { id: STUDENT_A, institute_id: INST_A, user_profile_id: USER_STUDENT, status: "active", deleted_at: null },
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
        "token-student": USER_STUDENT,
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

describe("timetable-publication — publish creates publication row", () => {
  it("persists a publication row on publish-section", async () => {
    const db = baseDb();
    db.notification = [];
    db.notification_recipient = [];
    const app = appWithDb(db);

    const res = await app.request("/api/v1/timetable/publish-section", {
      method: "POST",
      headers: jsonHeaders("token-admin"),
      body: JSON.stringify({
        institute_id: INST_A,
        section_id: SECTION_A,
      }),
    });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.data.activatedCount).toBe(1);
    expect(body.data.publicationId).toBeDefined();

    expect(db.timetable_publication.length).toBe(1);
    const pub = db.timetable_publication[0]!;
    expect(pub.institute_id).toBe(INST_A);
    expect(pub.section_id).toBe(SECTION_A);
    expect(pub.academic_year_id).toBe(YEAR_A);
    expect(pub.class_id).toBe(CLASS_A);
    expect(pub.published_by_user_id).toBe(USER_ADMIN);
    expect(pub.slot_count).toBe(2);
  });

  it("creates publication even with zero activated slots", async () => {
    const db = baseDb();
    db.timetable_slot.forEach((s) => {
      s.status = "active";
    });
    const app = appWithDb(db);

    const res = await app.request("/api/v1/timetable/publish-section", {
      method: "POST",
      headers: jsonHeaders("token-admin"),
      body: JSON.stringify({
        institute_id: INST_A,
        section_id: SECTION_A,
      }),
    });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.data.activatedCount).toBe(0);
    expect(body.data.publicationId).toBeDefined();

    expect(db.timetable_publication.length).toBe(1);
    expect(db.timetable_publication[0]!.slot_count).toBe(2);
  });
});

describe("timetable-publication — list publications", () => {
  it("lists publications for a section", async () => {
    const db = baseDb();
    db.timetable_publication = [
      {
        id: "fa111111-1111-4111-8111-111111111111",
        institute_id: INST_A,
        academic_year_id: YEAR_A,
        class_id: CLASS_A,
        section_id: SECTION_A,
        published_at: "2026-09-01T10:00:00.000Z",
        published_by_user_id: USER_ADMIN,
        note: null,
        slot_count: 5,
        created_at: "2026-09-01T10:00:00.000Z",
        updated_at: "2026-09-01T10:00:00.000Z",
        deleted_at: null,
      },
      {
        id: "fa222222-2222-4222-8222-222222222222",
        institute_id: INST_A,
        academic_year_id: YEAR_A,
        class_id: CLASS_A,
        section_id: SECTION_A,
        published_at: "2026-09-02T10:00:00.000Z",
        published_by_user_id: USER_ADMIN,
        note: "Updated schedule",
        slot_count: 8,
        created_at: "2026-09-02T10:00:00.000Z",
        updated_at: "2026-09-02T10:00:00.000Z",
        deleted_at: null,
      },
    ];
    const app = appWithDb(db);

    const res = await app.request(
      `/api/v1/timetable/publications?institute_id=${INST_A}&section_id=${SECTION_A}`,
      { headers: auth("token-admin") },
    );
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.data).toHaveLength(2);
    expect(body.data[0].sectionId).toBe(SECTION_A);
    expect(body.data[0].slotCount).toBeGreaterThan(0);
  });

  it("lists all publications for institute without section filter", async () => {
    const db = baseDb();
    db.timetable_publication = [
      {
        id: "fa111111-1111-4111-8111-111111111111",
        institute_id: INST_A,
        academic_year_id: YEAR_A,
        class_id: CLASS_A,
        section_id: SECTION_A,
        published_at: "2026-09-01T10:00:00.000Z",
        published_by_user_id: USER_ADMIN,
        note: null,
        slot_count: 5,
        created_at: "2026-09-01T10:00:00.000Z",
        updated_at: "2026-09-01T10:00:00.000Z",
        deleted_at: null,
      },
    ];
    const app = appWithDb(db);

    const res = await app.request(
      `/api/v1/timetable/publications?institute_id=${INST_A}`,
      { headers: auth("token-admin") },
    );
    expect(res.status).toBe(200);
    expect((await json(res)).data).toHaveLength(1);
  });

  it("returns a single publication by id", async () => {
    const PUB_ID = "fa111111-1111-4111-8111-111111111111";
    const db = baseDb();
    db.timetable_publication = [
      {
        id: PUB_ID,
        institute_id: INST_A,
        academic_year_id: YEAR_A,
        class_id: CLASS_A,
        section_id: SECTION_A,
        published_at: "2026-09-01T10:00:00.000Z",
        published_by_user_id: USER_ADMIN,
        note: null,
        slot_count: 5,
        created_at: "2026-09-01T10:00:00.000Z",
        updated_at: "2026-09-01T10:00:00.000Z",
        deleted_at: null,
      },
    ];
    const app = appWithDb(db);

    const res = await app.request(`/api/v1/timetable/publications/${PUB_ID}`, {
      headers: auth("token-admin"),
    });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.data.id).toBe(PUB_ID);
    expect(body.data.slotCount).toBe(5);
    expect(body.data.publishedByUserId).toBe(USER_ADMIN);
  });
});

describe("timetable-publication — authentication", () => {
  it("returns 401 without JWT", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request(`/api/v1/timetable/publications?institute_id=${INST_A}`);
    expect(res.status).toBe(401);
    expect((await json(res)).error.code).toBe("UNAUTHENTICATED");
  });
});

describe("timetable-publication — tenant isolation", () => {
  it("rejects cross-institute list", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request(`/api/v1/timetable/publications?institute_id=${INST_B}`, {
      headers: auth("token-admin"),
    });
    expect(res.status).toBe(403);
    expect((await json(res)).error.code).toBe("FORBIDDEN");
  });
});

describe("timetable-publication — read authorization", () => {
  it("allows teacher to list publications", async () => {
    const db = baseDb();
    db.timetable_publication = [
      {
        id: "fa111111-1111-4111-8111-111111111111",
        institute_id: INST_A,
        academic_year_id: YEAR_A,
        class_id: CLASS_A,
        section_id: SECTION_A,
        published_at: "2026-09-01T10:00:00.000Z",
        published_by_user_id: USER_ADMIN,
        note: null,
        slot_count: 3,
        created_at: "2026-09-01T10:00:00.000Z",
        updated_at: "2026-09-01T10:00:00.000Z",
        deleted_at: null,
      },
    ];
    const app = appWithDb(db);

    const res = await app.request(`/api/v1/timetable/publications?institute_id=${INST_A}`, {
      headers: auth("token-teacher"),
    });
    expect(res.status).toBe(200);
    expect((await json(res)).data).toHaveLength(1);
  });
});
