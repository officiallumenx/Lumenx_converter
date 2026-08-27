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
const USER_STAFF = "55555555-5555-4555-8555-555555555555";
const INST_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const INST_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const MEMBER_ADMIN = "aa111111-1111-4111-8111-111111111111";
const MEMBER_TEACHER = "aa222222-2222-4222-8222-222222222222";
const MEMBER_STUDENT = "aa333333-3333-4333-8333-333333333333";
const MEMBER_OTHER = "aa444444-4444-4444-8444-444444444444";
const MEMBER_STAFF = "aa555555-5555-4555-8555-555555555555";
const STAFF_A = "bb111111-1111-4111-8111-111111111111";
const STAFF_B = "bb222222-2222-4222-8222-222222222222";
const STAFF_SELF = "bb333333-3333-4333-8333-333333333333";

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

function staffRow(
  id: string,
  instituteId: string,
  overrides: Record<string, unknown> = {},
) {
  return {
    id,
    institute_id: instituteId,
    user_profile_id: null,
    legacy_code: null,
    employee_id: null,
    display_name: "Staff Member",
    phone: null,
    email: null,
    department: "Accounts",
    job_title: "Accountant",
    date_of_birth: null,
    joined_on: null,
    status: "active",
    source_career_application_id: null,
    created_at: "2026-08-01T00:00:00.000Z",
    updated_at: "2026-08-01T00:00:00.000Z",
    deleted_at: null,
    ...overrides,
  };
}

function baseDb(): MockDb {
  const db = emptyMockDb();
  db.user_profile = [
    { id: USER_ADMIN, display_name: "Admin", email: "a@x.com", status: "active", deleted_at: null },
    { id: USER_TEACHER, display_name: "Teacher", email: "t@x.com", status: "active", deleted_at: null },
    { id: USER_STUDENT, display_name: "Student", email: "s@x.com", status: "active", deleted_at: null },
    { id: USER_OTHER, display_name: "Other", email: "o@x.com", status: "active", deleted_at: null },
    { id: USER_STAFF, display_name: "Staff", email: "st@x.com", status: "active", deleted_at: null },
  ];
  db.membership = [
    { id: MEMBER_ADMIN, user_id: USER_ADMIN, institute_id: INST_A, status: "active", deleted_at: null },
    { id: MEMBER_TEACHER, user_id: USER_TEACHER, institute_id: INST_A, status: "active", deleted_at: null },
    { id: MEMBER_STUDENT, user_id: USER_STUDENT, institute_id: INST_A, status: "active", deleted_at: null },
    { id: MEMBER_OTHER, user_id: USER_OTHER, institute_id: INST_B, status: "active", deleted_at: null },
    { id: MEMBER_STAFF, user_id: USER_STAFF, institute_id: INST_A, status: "active", deleted_at: null },
  ];
  db.membership_role = [
    { membership_id: MEMBER_ADMIN, role_code: "institute_admin" },
    { membership_id: MEMBER_TEACHER, role_code: "teacher" },
    { membership_id: MEMBER_STUDENT, role_code: "student" },
    { membership_id: MEMBER_OTHER, role_code: "institute_admin" },
    { membership_id: MEMBER_STAFF, role_code: "accountant" },
  ];
  db.institute = [
    { id: INST_A, code: "A", name: "A", kind: "school", status: "active", deleted_at: null },
    { id: INST_B, code: "B", name: "B", kind: "school", status: "active", deleted_at: null },
  ];
  db.staff_account = [
    staffRow(STAFF_A, INST_A, {
      display_name: "Ravi Accounts",
      employee_id: "EMP-1",
    }),
    staffRow(STAFF_B, INST_B, { display_name: "Other Staff" }),
    staffRow(STAFF_SELF, INST_A, {
      display_name: "Self Staff",
      user_profile_id: USER_STAFF,
      department: "Finance",
    }),
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
        "token-student": USER_STUDENT,
        "token-other": USER_OTHER,
        "token-staff": USER_STAFF,
      },
      db,
    }),
  );
}

describe("staff accounts api", () => {
  it("lists staff for admin and teacher; blocks student and cross-tenant", async () => {
    const app = appWithDb(baseDb());

    const ok = await app.request(`/api/v1/staff?institute_id=${INST_A}`, {
      headers: { Authorization: "Bearer token-admin" },
    });
    expect(ok.status).toBe(200);
    const body = await json(ok);
    expect(body.data).toHaveLength(2);

    const teacher = await app.request(`/api/v1/staff?institute_id=${INST_A}`, {
      headers: { Authorization: "Bearer token-teacher" },
    });
    expect(teacher.status).toBe(200);

    const student = await app.request(`/api/v1/staff?institute_id=${INST_A}`, {
      headers: { Authorization: "Bearer token-student" },
    });
    expect(student.status).toBe(403);

    const cross = await app.request(`/api/v1/staff?institute_id=${INST_B}`, {
      headers: { Authorization: "Bearer token-admin" },
    });
    expect(cross.status).toBe(403);
  });

  it("creates staff and ignores client user_profile_id", async () => {
    const db = baseDb();
    const app = appWithDb(db);

    const res = await app.request("/api/v1/staff", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-admin",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        display_name: "New Clerk",
        department: "Office",
        job_title: "Clerk",
        user_profile_id: USER_STUDENT,
      }),
    });
    expect(res.status).toBe(201);
    const body = await json(res);
    expect(body.data.displayName).toBe("New Clerk");
    expect(body.data.userProfileId).toBeNull();
    expect(body.data.jobTitle).toBe("Clerk");
  });

  it("allows linked staff to read own row only when not a directory reader", async () => {
    const db = baseDb();
    // Give staff user only a generic role that is NOT in READ_ROLES... wait accountant IS in READ_ROLES.
    // Use a membership with role that isn't in read set - students can't. For self-only,
    // remove accountant role and leave no membership roles that are readers — but then
    // requireInstituteId fails without membership. Linked staff still needs membership.
    // Pattern like teacher self: teacher role is in READ_ROLES so they see full directory.
    // For self-only path, use a user with membership role outside READ - only "driver"?
    // driver is not in STAFF_ACCOUNT_READ_ROLES.
    db.membership_role = db.membership_role.map((r) =>
      r.membership_id === MEMBER_STAFF
        ? { ...r, role_code: "driver" }
        : r,
    );
    const app = appWithDb(db);

    const list = await app.request(`/api/v1/staff?institute_id=${INST_A}`, {
      headers: { Authorization: "Bearer token-staff" },
    });
    expect(list.status).toBe(200);
    const listed = await json(list);
    expect(listed.data).toHaveLength(1);
    expect(listed.data[0].id).toBe(STAFF_SELF);

    const other = await app.request(`/api/v1/staff/${STAFF_A}`, {
      headers: { Authorization: "Bearer token-staff" },
    });
    expect(other.status).toBe(403);
  });

  it("soft-deletes staff", async () => {
    const db = baseDb();
    const app = appWithDb(db);
    const res = await app.request(`/api/v1/staff/${STAFF_A}`, {
      method: "DELETE",
      headers: { Authorization: "Bearer token-admin" },
    });
    expect(res.status).toBe(200);
    expect(db.staff_account.find((s) => s.id === STAFF_A)?.deleted_at).toBeTruthy();
  });
});
