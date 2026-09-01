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
const ANN_PUB = "ae111111-1111-4111-8111-111111111111";
const ANN_DRAFT = "ae222222-2222-4222-8222-222222222222";
const ANN_TEACHERS = "ae333333-3333-4333-8333-333333333333";
const ANN_OTHER = "ae444444-4444-4444-8444-444444444444";

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
  db.parent = [
    { id: "ba111111-1111-4111-8111-111111111111", institute_id: INST_A, user_profile_id: USER_PARENT, deleted_at: null },
  ];
  db.guardian_link = [
    {
      parent_id: "ba111111-1111-4111-8111-111111111111",
      student_id: "ac111111-1111-4111-8111-111111111111",
      institute_id: INST_A,
      status: "active",
      deleted_at: null,
    },
  ];
  db.student = [
    {
      id: "ac111111-1111-4111-8111-111111111111",
      institute_id: INST_A,
      deleted_at: null,
    },
  ];
  db.teacher = [
    {
      id: "bb111111-1111-4111-8111-111111111111",
      institute_id: INST_A,
      user_profile_id: USER_TEACHER,
      status: "active",
      deleted_at: null,
    },
  ];
  db.announcement = [
    {
      id: ANN_PUB,
      institute_id: INST_A,
      title: "Term starts Monday",
      body: "Please arrive by 8am.",
      audience_scope: "all",
      audience_label: "All",
      class_id: null,
      section_id: null,
      activity_team_id: null,
      status: "published",
      scheduled_at: null,
      published_at: "2026-08-01T00:00:00.000Z",
      archived_at: null,
      pinned: true,
      pin_until: null,
      views: 10,
      created_by_user_id: USER_ADMIN,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
    {
      id: ANN_DRAFT,
      institute_id: INST_A,
      title: "Draft notice",
      body: "Not ready",
      audience_scope: "all",
      audience_label: "All",
      class_id: null,
      section_id: null,
      activity_team_id: null,
      status: "draft",
      scheduled_at: null,
      published_at: null,
      archived_at: null,
      pinned: false,
      pin_until: null,
      views: 0,
      created_by_user_id: USER_ADMIN,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
    {
      id: ANN_TEACHERS,
      institute_id: INST_A,
      title: "Staff briefing",
      body: "Teachers only",
      audience_scope: "teachers",
      audience_label: "Teachers",
      class_id: null,
      section_id: null,
      activity_team_id: null,
      status: "published",
      scheduled_at: null,
      published_at: "2026-08-01T00:00:00.000Z",
      archived_at: null,
      pinned: false,
      pin_until: null,
      views: 2,
      created_by_user_id: USER_ADMIN,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
    {
      id: ANN_OTHER,
      institute_id: INST_B,
      title: "Other school",
      body: null,
      audience_scope: "all",
      audience_label: null,
      class_id: null,
      section_id: null,
      activity_team_id: null,
      status: "published",
      scheduled_at: null,
      published_at: "2026-08-01T00:00:00.000Z",
      archived_at: null,
      pinned: false,
      pin_until: null,
      views: 0,
      created_by_user_id: USER_OTHER,
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

describe("announcements api", () => {
  it("lists announcements for staff and hides drafts + teacher-only from parents", async () => {
    const app = appWithDb(baseDb());

    const staff = await app.request(
      `/api/v1/announcements?institute_id=${INST_A}`,
      { headers: { Authorization: "Bearer token-admin" } },
    );
    expect(staff.status).toBe(200);
    expect((await json(staff)).data).toHaveLength(3);

    const parent = await app.request(
      `/api/v1/announcements?institute_id=${INST_A}`,
      { headers: { Authorization: "Bearer token-parent" } },
    );
    expect(parent.status).toBe(200);
    const parentBody = await json(parent);
    expect(parentBody.data).toHaveLength(1);
    expect(parentBody.data[0].id).toBe(ANN_PUB);

    const cross = await app.request(
      `/api/v1/announcements?institute_id=${INST_B}`,
      { headers: { Authorization: "Bearer token-admin" } },
    );
    expect(cross.status).toBe(403);
  });

  it("admin creates draft, publishes, archives", async () => {
    const db = baseDb();
    db.announcement = [];
    const app = appWithDb(db);

    const created = await app.request("/api/v1/announcements", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-admin",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        title: "New notice",
        body: "Details here",
        audience_scope: "parents",
      }),
    });
    expect(created.status).toBe(201);
    const createdBody = await json(created);
    expect(createdBody.data.status).toBe("draft");
    const id = createdBody.data.id as string;

    const published = await app.request(`/api/v1/announcements/${id}/publish`, {
      method: "POST",
      headers: { Authorization: "Bearer token-admin" },
    });
    expect(published.status).toBe(200);
    expect((await json(published)).data.status).toBe("published");

    const archived = await app.request(`/api/v1/announcements/${id}/archive`, {
      method: "POST",
      headers: { Authorization: "Bearer token-admin" },
    });
    expect(archived.status).toBe(200);
    expect((await json(archived)).data.status).toBe("archived");
  });

  it("creates scheduled when scheduled_at provided", async () => {
    const db = baseDb();
    db.announcement = [];
    const app = appWithDb(db);

    const res = await app.request("/api/v1/announcements", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-admin",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        title: "Future notice",
        scheduled_at: "2026-12-01T09:00:00.000Z",
      }),
    });
    expect(res.status).toBe(201);
    expect((await json(res)).data.status).toBe("scheduled");
  });

  it("blocks teacher create and parent draft/teacher-only reads", async () => {
    const app = appWithDb(baseDb());

    const create = await app.request("/api/v1/announcements", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-teacher",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        title: "Nope",
      }),
    });
    expect(create.status).toBe(403);

    const draft = await app.request(`/api/v1/announcements/${ANN_DRAFT}`, {
      headers: { Authorization: "Bearer token-parent" },
    });
    expect(draft.status).toBe(403);

    const teachersOnly = await app.request(
      `/api/v1/announcements/${ANN_TEACHERS}`,
      { headers: { Authorization: "Bearer token-parent" } },
    );
    expect(teachersOnly.status).toBe(403);

    const teacherOk = await app.request(
      `/api/v1/announcements/${ANN_TEACHERS}`,
      { headers: { Authorization: "Bearer token-teacher" } },
    );
    expect(teacherOk.status).toBe(200);
  });

  it("soft-deletes non-published only", async () => {
    const app = appWithDb(baseDb());

    const publishedDelete = await app.request(
      `/api/v1/announcements/${ANN_PUB}`,
      {
        method: "DELETE",
        headers: { Authorization: "Bearer token-admin" },
      },
    );
    expect(publishedDelete.status).toBe(409);

    const draftDelete = await app.request(
      `/api/v1/announcements/${ANN_DRAFT}`,
      {
        method: "DELETE",
        headers: { Authorization: "Bearer token-admin" },
      },
    );
    expect(draftDelete.status).toBe(204);
  });

  it("blocks cross-tenant get by id", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request(`/api/v1/announcements/${ANN_OTHER}`, {
      headers: { Authorization: "Bearer token-admin" },
    });
    expect(res.status).toBe(403);
  });

  it("fans out inbox notifications when an announcement is published", async () => {
    const db = baseDb();
    db.announcement = [];
    db.notification = [];
    db.notification_recipient = [];
    const app = appWithDb(db);

    const created = await app.request("/api/v1/announcements", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-admin",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        title: "Holiday notice",
        body: "School closed Friday",
        audience_scope: "parents",
        publish_now: true,
      }),
    });
    expect(created.status).toBe(201);
    expect(db.notification.length).toBe(1);
    expect(db.notification[0]?.category).toBe("announcements");
    expect(db.notification_recipient.length).toBeGreaterThan(0);
    expect(db.notification_recipient.some((r) => r.user_profile_id === USER_PARENT)).toBe(
      true,
    );
    expect(db.notification[0]?.deep_link).toMatch(/^\/announcements\//);
  });

  it("records a view for published announcements", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request(`/api/v1/announcements/${ANN_PUB}/view`, {
      method: "POST",
      headers: { Authorization: "Bearer token-parent" },
    });
    expect(res.status).toBe(200);
    expect((await json(res)).data.views).toBe(11);
  });

  it("auto-publishes due scheduled announcements on list", async () => {
    const db = baseDb();
    const ANN_DUE = "ae555555-5555-4555-8555-555555555555";
    db.announcement.push({
      id: ANN_DUE,
      institute_id: INST_A,
      title: "Due notice",
      body: "Should publish now",
      audience_scope: "parents",
      audience_label: "Parents",
      class_id: null,
      section_id: null,
      status: "scheduled",
      scheduled_at: "2020-01-01T09:00:00.000Z",
      published_at: null,
      archived_at: null,
      pinned: false,
      pin_until: null,
      views: 0,
      created_by_user_id: USER_ADMIN,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    });
    db.notification = [];
    db.notification_recipient = [];
    const app = appWithDb(db);

    const list = await app.request(
      `/api/v1/announcements?institute_id=${INST_A}`,
      { headers: { Authorization: "Bearer token-parent" } },
    );
    expect(list.status).toBe(200);
    const rows = (await json(list)).data as Array<{ id: string; status: string }>;
    expect(rows.some((r) => r.id === ANN_DUE && r.status === "published")).toBe(true);
    expect(db.notification.length).toBe(1);
  });

  it("allows teacher to publish activity_team announcements", async () => {
    const db = baseDb();
    db.activity_section = [
      {
        id: "a0111111-1111-4111-8111-111111111111",
        institute_id: INST_A,
        domain: "sports",
        sports_category: "outdoor",
        name: "Cricket",
        slug: "cricket",
        description: null,
        status: "active",
        created_by_user_id: USER_ADMIN,
        created_at: "2026-08-01T00:00:00.000Z",
        updated_at: "2026-08-01T00:00:00.000Z",
        deleted_at: null,
      },
    ];
    db.activity_team = [
      {
        id: "a0333333-3333-4333-8333-333333333333",
        institute_id: INST_A,
        section_id: "a0111111-1111-4111-8111-111111111111",
        kind: "team",
        name: "Team A",
        status: "active",
        created_by_user_id: USER_ADMIN,
        created_at: "2026-08-01T00:00:00.000Z",
        updated_at: "2026-08-01T00:00:00.000Z",
        deleted_at: null,
      },
    ];
    const app = appWithDb(db);

    const res = await app.request("/api/v1/announcements", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-teacher",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        title: "Team practice moved",
        body: "Report at 4 PM",
        audience_scope: "activity_team",
        activity_team_id: "a0333333-3333-4333-8333-333333333333",
        publish_now: true,
      }),
    });
    expect(res.status).toBe(201);
    expect((await json(res)).data.audienceScope).toBe("activity_team");
  });
});
