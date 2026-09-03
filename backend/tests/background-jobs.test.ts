import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { loadEnv, resetEnvCache } from "../src/config/env.js";
import { createLogger } from "../src/logger/logger.js";
import {
  createMockSupabaseClients,
  emptyMockDb,
  type MockDb,
} from "./helpers/mock-supabase.js";
import { flushBackgroundJobs } from "../src/workers/background-jobs-runner.js";
import { DIARY_END_OF_DAY_HOUR } from "../src/domains/diary/reminders.js";

const silentLogger = createLogger("error");

const INST_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const USER_ADMIN = "11111111-1111-4111-8111-111111111111";
const USER_TEACHER = "22222222-2222-4222-8222-222222222222";
const TEACHER_A = "bb111111-1111-4111-8111-111111111111";
const MEMBER_ADMIN = "aa111111-1111-4111-8111-111111111111";
const MEMBER_TEACHER = "aa222222-2222-4222-8222-222222222222";
const ANN_DUE = "ae111111-1111-4111-8111-111111111111";
const RULE_A = "ar111111-1111-4111-8111-111111111111";
const STUDENT_A = "ac111111-1111-4111-8111-111111111111";

beforeEach(() => {
  resetEnvCache();
  loadEnv({ NODE_ENV: "test", LOG_LEVEL: "error" });
  vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  vi.spyOn(process.stderr, "write").mockImplementation(() => true);
});

afterEach(() => {
  vi.restoreAllMocks();
  resetEnvCache();
});

function baseDb(): MockDb {
  const db = emptyMockDb();
  db.institute = [
    {
      id: INST_A,
      code: "A",
      name: "Alpha",
      kind: "school",
      status: "active",
      deleted_at: null,
    },
  ];
  db.user_profile = [
    {
      id: USER_ADMIN,
      display_name: "Admin",
      email: "a@x.com",
      status: "active",
      deleted_at: null,
    },
    {
      id: USER_TEACHER,
      display_name: "Teacher",
      email: "t@x.com",
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
  ];
  db.membership_role = [
    { membership_id: MEMBER_ADMIN, role_code: "institute_admin" },
    { membership_id: MEMBER_TEACHER, role_code: "teacher" },
  ];
  db.teacher = [
    {
      id: TEACHER_A,
      institute_id: INST_A,
      user_profile_id: USER_TEACHER,
      display_name: "Teacher",
      status: "active",
      deleted_at: null,
      teaching_scope: "subject_teacher",
      portal_access_level: "faculty_grading",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    },
  ];
  return db;
}

describe("background jobs worker (Phase 2 Step 7)", () => {
  it("publishes due scheduled announcements without a user session", async () => {
    const db = baseDb();
    db.announcement = [
      {
        id: ANN_DUE,
        institute_id: INST_A,
        title: "Sports day",
        body: "Meet at 9am",
        audience_scope: "all",
        audience_label: null,
        class_id: null,
        section_id: null,
        activity_team_id: null,
        status: "scheduled",
        scheduled_at: "2026-01-01T00:00:00.000Z",
        published_at: null,
        archived_at: null,
        pinned: false,
        pin_until: null,
        views: 0,
        created_by_user_id: USER_ADMIN,
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
        deleted_at: null,
      },
    ];

    const { admin } = createMockSupabaseClients({ db, tokens: {} });
    const result = await flushBackgroundJobs({
      admin,
      logger: silentLogger,
      now: new Date("2026-09-03T12:00:00.000Z"),
    });

    expect(result.announcements.published).toBe(1);
    expect(db.announcement[0]?.status).toBe("published");
    expect(db.announcement[0]?.scheduled_at).toBeNull();
    expect(db.notification.length).toBeGreaterThan(0);
  });

  it("evaluates alert rules and can persist fires system-wide", async () => {
    const db = baseDb();
    db.alert_rule = [
      {
        id: RULE_A,
        institute_id: INST_A,
        name: "Low attendance",
        icon_key: "attendance",
        description: "Attendance below threshold",
        priority: "P1",
        channels: ["Email"],
        audience: "teachers",
        active: true,
        config: { threshold_pct: 90 },
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
        deleted_at: null,
      },
    ];
    db.student = [
      {
        id: STUDENT_A,
        institute_id: INST_A,
        display_name: "Ada",
        status: "active",
        deleted_at: null,
      },
    ];
    db.attendance_mark = [
      {
        id: "am111111-1111-4111-8111-111111111111",
        institute_id: INST_A,
        student_id: STUDENT_A,
        status: "absent",
        deleted_at: null,
      },
      {
        id: "am222222-2222-4222-8222-222222222222",
        institute_id: INST_A,
        student_id: STUDENT_A,
        status: "absent",
        deleted_at: null,
      },
    ];

    const { admin } = createMockSupabaseClients({ db, tokens: {} });
    const result = await flushBackgroundJobs({
      admin,
      logger: silentLogger,
      now: new Date("2026-09-03T12:00:00.000Z"),
    });

    expect(result.alerts.institutes).toBe(1);
    expect(result.alerts.newlyFired).toBeGreaterThanOrEqual(1);
    expect(db.alert_fire.length).toBeGreaterThanOrEqual(1);
  });

  it("emits overdue diary reminders for teachers without listing diary", async () => {
    const db = baseDb();
    // No diary_day rows → yesterday overdue reminders fire
    const { admin } = createMockSupabaseClients({ db, tokens: {} });
    const now = new Date("2026-09-03T18:00:00.000Z"); // after end-of-day hour
    expect(now.getHours()).toBeGreaterThanOrEqual(DIARY_END_OF_DAY_HOUR);

    const result = await flushBackgroundJobs({
      admin,
      logger: silentLogger,
      now,
    });

    expect(result.diary.teachers).toBe(1);
    expect(result.diary.emitted).toBeGreaterThanOrEqual(2); // subject+activity overdue at least
    expect(db.notification.length).toBeGreaterThan(0);
  });

  it("BACKGROUND_JOBS_INTERVAL_MS defaults to 60s", () => {
    expect(loadEnv({}).BACKGROUND_JOBS_INTERVAL_MS).toBe(60_000);
  });
});
