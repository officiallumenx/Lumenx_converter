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
const PARENT_A = "ba111111-1111-4111-8111-111111111111";
const STUDENT_A = "ac111111-1111-4111-8111-111111111111";
const STUDENT_B = "ac222222-2222-4222-8222-222222222222";
const STUDENT_OTHER = "ac333333-3333-4333-8333-333333333333";
const SEC_ACTIVE = "a0111111-1111-4111-8111-111111111111";
const SEC_DRAFT = "a0222222-2222-4222-8222-222222222222";
const TEAM_ACTIVE = "a0333333-3333-4333-8333-333333333333";
const TEAM_DRAFT = "a0444444-4444-4444-8444-444444444444";
const MEM_OWN = "a0555555-5555-4555-8555-555555555555";
const MEM_OTHER = "a0666666-6666-4666-8666-666666666666";
const MEM_CROSS = "a0777777-7777-4777-8777-777777777777";
const ACH_OWN = "a0888888-8888-4888-8888-888888888888";
const ACH_OTHER = "a0999999-9999-4999-8999-999999999999";
const ACH_CROSS = "a0aaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const PRAC_DRAFT = "a0bbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const PRAC_ACTIVE = "a0cccccc-cccc-4ccc-8ccc-cccccccccccc";

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
  db.student = [
    {
      id: STUDENT_A,
      institute_id: INST_A,
      user_profile_id: null,
      display_name: "Child A",
      deleted_at: null,
    },
    {
      id: STUDENT_B,
      institute_id: INST_A,
      user_profile_id: null,
      display_name: "Other Child",
      deleted_at: null,
    },
    {
      id: STUDENT_OTHER,
      institute_id: INST_B,
      user_profile_id: null,
      display_name: "Cross Tenant",
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
      parent_id: PARENT_A,
      student_id: STUDENT_A,
      institute_id: INST_A,
      status: "active",
      deleted_at: null,
    },
  ];
  db.activity_section = [
    {
      id: SEC_ACTIVE,
      institute_id: INST_A,
      domain: "sports",
      sports_category: "outdoor",
      name: "Football",
      slug: "football",
      description: null,
      status: "active",
      created_by_user_id: USER_ADMIN,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
    {
      id: SEC_DRAFT,
      institute_id: INST_A,
      domain: "sports",
      sports_category: "indoor",
      name: "Hidden Chess",
      slug: "hidden-chess",
      description: null,
      status: "draft",
      created_by_user_id: USER_ADMIN,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
  ];
  db.activity_team = [
    {
      id: TEAM_ACTIVE,
      institute_id: INST_A,
      section_id: SEC_ACTIVE,
      kind: "team",
      name: "A Team",
      status: "active",
      created_by_user_id: USER_ADMIN,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
    {
      id: TEAM_DRAFT,
      institute_id: INST_A,
      section_id: SEC_DRAFT,
      kind: "team",
      name: "Draft Team",
      status: "active",
      created_by_user_id: USER_ADMIN,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
  ];
  db.activity_membership = [
    {
      id: MEM_OWN,
      institute_id: INST_A,
      team_id: TEAM_ACTIVE,
      student_id: STUDENT_A,
      role: "member",
      status: "active",
      joined_at: "2026-08-01T00:00:00.000Z",
      created_by_user_id: USER_ADMIN,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
    {
      id: MEM_OTHER,
      institute_id: INST_A,
      team_id: TEAM_ACTIVE,
      student_id: STUDENT_B,
      role: "member",
      status: "active",
      joined_at: "2026-08-01T00:00:00.000Z",
      created_by_user_id: USER_ADMIN,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
    {
      id: MEM_CROSS,
      institute_id: INST_B,
      team_id: TEAM_ACTIVE,
      student_id: STUDENT_OTHER,
      role: "member",
      status: "active",
      joined_at: "2026-08-01T00:00:00.000Z",
      created_by_user_id: USER_OTHER,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
  ];
  db.achievement = [
    {
      id: ACH_OWN,
      institute_id: INST_A,
      student_id: STUDENT_A,
      section_id: SEC_ACTIVE,
      team_id: TEAM_ACTIVE,
      title: "Gold Medal",
      kind: "award",
      awarded_on: "2026-08-01",
      notes: null,
      created_by_user_id: USER_ADMIN,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
    {
      id: ACH_OTHER,
      institute_id: INST_A,
      student_id: STUDENT_B,
      section_id: SEC_ACTIVE,
      team_id: null,
      title: "Silver",
      kind: "award",
      awarded_on: "2026-08-01",
      notes: null,
      created_by_user_id: USER_ADMIN,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
    {
      id: ACH_CROSS,
      institute_id: INST_B,
      student_id: STUDENT_OTHER,
      section_id: null,
      team_id: null,
      title: "Other Inst Award",
      kind: "award",
      awarded_on: "2026-08-01",
      notes: null,
      created_by_user_id: USER_OTHER,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
  ];
  db.practice_session = [
    {
      id: PRAC_ACTIVE,
      institute_id: INST_A,
      team_id: TEAM_ACTIVE,
      title: "Morning drill",
      scheduled_on: "2026-08-10",
      start_time: "07:00",
      end_time: "08:00",
      location: "Field",
      notes: null,
      status: "scheduled",
      created_by_user_id: USER_ADMIN,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
    {
      id: PRAC_DRAFT,
      institute_id: INST_A,
      team_id: TEAM_DRAFT,
      title: "Secret practice",
      scheduled_on: "2026-08-11",
      start_time: null,
      end_time: null,
      location: null,
      notes: null,
      status: "scheduled",
      created_by_user_id: USER_ADMIN,
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

describe("activity api", () => {
  it("hides draft sections from parents; GET/PATCH draft → 404", async () => {
    const app = appWithDb(baseDb());

    const list = await app.request(
      `/api/v1/activity/sections?institute_id=${INST_A}`,
      { headers: { Authorization: "Bearer token-parent" } },
    );
    expect(list.status).toBe(200);
    const ids = (await json(list)).data.map((s: { id: string }) => s.id);
    expect(ids).toContain(SEC_ACTIVE);
    expect(ids).not.toContain(SEC_DRAFT);

    const draftGet = await app.request(`/api/v1/activity/sections/${SEC_DRAFT}`, {
      headers: { Authorization: "Bearer token-parent" },
    });
    expect(draftGet.status).toBe(404);

    const draftPatch = await app.request(
      `/api/v1/activity/sections/${SEC_DRAFT}`,
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

  it("allows teacher to create section; parent create → 403", async () => {
    const app = appWithDb(baseDb());

    const teacherCreate = await app.request("/api/v1/activity/sections", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-teacher",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        domain: "eca",
        name: "Drama Club",
        slug: "drama-club",
      }),
    });
    expect(teacherCreate.status).toBe(201);

    const parentCreate = await app.request("/api/v1/activity/sections", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-parent",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        domain: "eca",
        name: "No Write",
        slug: "no-write",
      }),
    });
    expect(parentCreate.status).toBe(403);
  });

  it("parent cannot create membership (403); staff can add to draft-section team; unknown team → 400", async () => {
    const app = appWithDb(baseDb());

    const parentAdd = await app.request("/api/v1/activity/memberships", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-parent",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        team_id: TEAM_DRAFT,
        student_id: STUDENT_A,
      }),
    });
    expect(parentAdd.status).toBe(403);

    const staffAdd = await app.request("/api/v1/activity/memberships", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-teacher",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        team_id: TEAM_DRAFT,
        student_id: STUDENT_A,
      }),
    });
    expect(staffAdd.status).toBe(201);

    const missingTeam = await app.request("/api/v1/activity/memberships", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-teacher",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        team_id: "a0ffffff-ffff-4fff-8fff-ffffffffffff",
        student_id: STUDENT_A,
      }),
    });
    expect(missingTeam.status).toBe(400);
  });

  it("parent sees only own child's memberships/achievements; cross-tenant 404", async () => {
    const app = appWithDb(baseDb());

    const memList = await app.request(
      `/api/v1/activity/memberships?institute_id=${INST_A}`,
      { headers: { Authorization: "Bearer token-parent" } },
    );
    expect(memList.status).toBe(200);
    const memIds = (await json(memList)).data.map((m: { id: string }) => m.id);
    expect(memIds).toEqual([MEM_OWN]);

    const achList = await app.request(
      `/api/v1/activity/achievements?institute_id=${INST_A}`,
      { headers: { Authorization: "Bearer token-parent" } },
    );
    expect(achList.status).toBe(200);
    const achIds = (await json(achList)).data.map((a: { id: string }) => a.id);
    expect(achIds).toEqual([ACH_OWN]);

    const crossMem = await app.request(
      `/api/v1/activity/memberships/${MEM_CROSS}`,
      {
        method: "PATCH",
        headers: {
          Authorization: "Bearer token-parent",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ role: "captain" }),
      },
    );
    expect(crossMem.status).toBe(404);

    const crossAch = await app.request(
      `/api/v1/activity/achievements/${ACH_CROSS}`,
      {
        method: "PATCH",
        headers: {
          Authorization: "Bearer token-parent",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ title: "probe" }),
      },
    );
    expect(crossAch.status).toBe(404);
  });

  it("practice session on team under draft section: parent get → 404", async () => {
    const app = appWithDb(baseDb());

    const list = await app.request(
      `/api/v1/activity/practice-sessions?institute_id=${INST_A}`,
      { headers: { Authorization: "Bearer token-parent" } },
    );
    expect(list.status).toBe(200);
    const ids = (await json(list)).data.map((p: { id: string }) => p.id);
    expect(ids).toContain(PRAC_ACTIVE);
    expect(ids).not.toContain(PRAC_DRAFT);

    const draftGet = await app.request(
      `/api/v1/activity/practice-sessions/${PRAC_DRAFT}`,
      { headers: { Authorization: "Bearer token-parent" } },
    );
    expect(draftGet.status).toBe(404);
  });

  it("non-writer parent PATCH on readable section → 404", async () => {
    const app = appWithDb(baseDb());

    const patch = await app.request(`/api/v1/activity/sections/${SEC_ACTIVE}`, {
      method: "PATCH",
      headers: {
        Authorization: "Bearer token-parent",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: "probe" }),
    });
    expect(patch.status).toBe(404);
  });

  it("practice create notifies team guardians (Phase 2 Step 10)", async () => {
    const db = baseDb();
    const app = appWithDb(db);

    const res = await app.request("/api/v1/activity/practice-sessions", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-admin",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        team_id: TEAM_ACTIVE,
        title: "Morning drills",
        scheduled_on: "2026-09-10",
        start_time: "07:00",
        location: "Field A",
      }),
    });
    expect(res.status).toBe(201);
    const practice = (await json(res)).data;
    expect(
      db.notification.some(
        (n) =>
          n.dedupe_key === `activity:practice:${practice.id}` &&
          String(n.title).includes("Morning drills"),
      ),
    ).toBe(true);
    expect(
      db.notification_recipient.some((r) => r.user_profile_id === USER_PARENT),
    ).toBe(true);
  });

  it("achievement create notifies guardians (Phase 2 Step 10)", async () => {
    const db = baseDb();
    const app = appWithDb(db);

    const res = await app.request("/api/v1/activity/achievements", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-admin",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        student_id: STUDENT_A,
        title: "Gold medal",
        kind: "award",
        awarded_on: "2026-09-01",
      }),
    });
    expect(res.status).toBe(201);
    const achievement = (await json(res)).data;
    expect(
      db.notification.some(
        (n) => n.dedupe_key === `activity:achievement:${achievement.id}`,
      ),
    ).toBe(true);
    expect(
      db.notification_recipient.some((r) => r.user_profile_id === USER_PARENT),
    ).toBe(true);
  });
});
