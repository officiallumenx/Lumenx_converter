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
const USER_TEACHER2 = "66666666-6666-4666-8666-666666666666";
const USER_OTHER = "44444444-4444-4444-8444-444444444444";
const INST_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const INST_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const MEMBER_ADMIN = "aa111111-1111-4111-8111-111111111111";
const MEMBER_TEACHER = "aa222222-2222-4222-8222-222222222222";
const MEMBER_TEACHER2 = "aa666666-6666-4666-8666-666666666666";
const MEMBER_OTHER = "aa444444-4444-4444-8444-444444444444";
const TEACHER_A = "bb111111-1111-4111-8111-111111111111";
const TEACHER_B = "bb222222-2222-4222-8222-222222222222";
const ATT_A = "ae111111-1111-4111-8111-111111111111";
const ATT_B = "ae222222-2222-4222-8222-222222222222";
const ATT_OTHER = "ae333333-3333-4333-8333-333333333333";
const DAY = "2026-09-15";

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
    { id: USER_OTHER, display_name: "Other", email: "o@x.com", status: "active", deleted_at: null },
  ];
  db.membership = [
    { id: MEMBER_ADMIN, user_id: USER_ADMIN, institute_id: INST_A, status: "active", deleted_at: null },
    { id: MEMBER_TEACHER, user_id: USER_TEACHER, institute_id: INST_A, status: "active", deleted_at: null },
    { id: MEMBER_TEACHER2, user_id: USER_TEACHER2, institute_id: INST_A, status: "active", deleted_at: null },
    { id: MEMBER_OTHER, user_id: USER_OTHER, institute_id: INST_B, status: "active", deleted_at: null },
  ];
  db.membership_role = [
    { membership_id: MEMBER_ADMIN, role_code: "institute_admin" },
    { membership_id: MEMBER_TEACHER, role_code: "teacher" },
    { membership_id: MEMBER_TEACHER2, role_code: "teacher" },
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
  db.staff_attendance = [
    {
      id: ATT_A,
      institute_id: INST_A,
      teacher_id: TEACHER_A,
      attendance_date: DAY,
      status: "present",
      check_in: "08:05:00",
      check_out: null,
      note: null,
      day_status: "draft",
      marked_by_user_id: USER_ADMIN,
      submitted_at: null,
      submitted_by_user_id: null,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
    {
      id: ATT_B,
      institute_id: INST_A,
      teacher_id: TEACHER_B,
      attendance_date: DAY,
      status: "late",
      check_in: "09:10:00",
      check_out: null,
      note: "Traffic",
      day_status: "draft",
      marked_by_user_id: USER_ADMIN,
      submitted_at: null,
      submitted_by_user_id: null,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
    {
      id: ATT_OTHER,
      institute_id: INST_B,
      teacher_id: TEACHER_A,
      attendance_date: DAY,
      status: "present",
      check_in: "08:00:00",
      check_out: null,
      note: null,
      day_status: "draft",
      marked_by_user_id: USER_OTHER,
      submitted_at: null,
      submitted_by_user_id: null,
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
        "token-other": USER_OTHER,
      },
      db,
    }),
  );
}

describe("staff attendance api", () => {
  it("lists day for admin and scopes teacher to self", async () => {
    const app = appWithDb(baseDb());

    const admin = await app.request(
      `/api/v1/staff-attendance?institute_id=${INST_A}&date=${DAY}`,
      { headers: { Authorization: "Bearer token-admin" } },
    );
    expect(admin.status).toBe(200);
    expect((await json(admin)).data).toHaveLength(2);

    const teacher = await app.request(
      `/api/v1/staff-attendance?institute_id=${INST_A}&date=${DAY}`,
      { headers: { Authorization: "Bearer token-teacher" } },
    );
    expect(teacher.status).toBe(200);
    const teacherBody = await json(teacher);
    expect(teacherBody.data).toHaveLength(1);
    expect(teacherBody.data[0].teacherId).toBe(TEACHER_A);

    const cross = await app.request(
      `/api/v1/staff-attendance?institute_id=${INST_B}&date=${DAY}`,
      { headers: { Authorization: "Bearer token-admin" } },
    );
    expect(cross.status).toBe(403);
  });

  it("upserts day marks, submits, and blocks edit until reopen", async () => {
    const db = baseDb();
    db.staff_attendance = [];
    const app = appWithDb(db);

    const upsert = await app.request("/api/v1/staff-attendance/day", {
      method: "PUT",
      headers: {
        Authorization: "Bearer token-admin",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        date: DAY,
        marks: [
          {
            teacher_id: TEACHER_A,
            status: "present",
            check_in: "08:04",
          },
          {
            teacher_id: TEACHER_B,
            status: "leave",
            note: "Approved medical",
          },
        ],
      }),
    });
    expect(upsert.status).toBe(200);
    expect((await json(upsert)).data).toHaveLength(2);

    const submit = await app.request("/api/v1/staff-attendance/day/submit", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-admin",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ institute_id: INST_A, date: DAY }),
    });
    expect(submit.status).toBe(200);
    expect(
      (await json(submit)).data.every(
        (r: { dayStatus: string }) => r.dayStatus === "submitted",
      ),
    ).toBe(true);

    const blocked = await app.request("/api/v1/staff-attendance/day", {
      method: "PUT",
      headers: {
        Authorization: "Bearer token-admin",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        date: DAY,
        marks: [{ teacher_id: TEACHER_A, status: "late", check_in: "09:00" }],
      }),
    });
    expect(blocked.status).toBe(409);

    const reopen = await app.request("/api/v1/staff-attendance/day/reopen", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-admin",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ institute_id: INST_A, date: DAY }),
    });
    expect(reopen.status).toBe(200);
    expect(
      (await json(reopen)).data.every(
        (r: { dayStatus: string }) => r.dayStatus === "draft",
      ),
    ).toBe(true);
  });

  it("blocks teacher upsert and other teacher get", async () => {
    const app = appWithDb(baseDb());

    const upsert = await app.request("/api/v1/staff-attendance/day", {
      method: "PUT",
      headers: {
        Authorization: "Bearer token-teacher",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        date: DAY,
        marks: [{ teacher_id: TEACHER_A, status: "present", check_in: "08:00" }],
      }),
    });
    expect(upsert.status).toBe(403);

    const other = await app.request(`/api/v1/staff-attendance/${ATT_B}`, {
      headers: { Authorization: "Bearer token-teacher" },
    });
    expect(other.status).toBe(403);

    const own = await app.request(`/api/v1/staff-attendance/${ATT_A}`, {
      headers: { Authorization: "Bearer token-teacher" },
    });
    expect(own.status).toBe(200);
  });

  it("soft-deletes draft marks only", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request(`/api/v1/staff-attendance/${ATT_A}`, {
      method: "DELETE",
      headers: { Authorization: "Bearer token-admin" },
    });
    expect(res.status).toBe(204);
  });

  it("blocks cross-tenant get by id", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request(`/api/v1/staff-attendance/${ATT_OTHER}`, {
      headers: { Authorization: "Bearer token-admin" },
    });
    expect(res.status).toBe(403);
  });
});
