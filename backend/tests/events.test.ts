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
const EVENT_PUB = "ae111111-1111-4111-8111-111111111111";
const EVENT_DRAFT = "ae222222-2222-4222-8222-222222222222";
const EVENT_HOLIDAY = "ae333333-3333-4333-8333-333333333333";
const EVENT_OTHER = "ae444444-4444-4444-8444-444444444444";

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
  db.event = [
    {
      id: EVENT_PUB,
      institute_id: INST_A,
      title: "Science Symposium",
      kind: "function",
      custom_kind_label: null,
      source: "events",
      starts_on: "2026-09-20",
      ends_on: null,
      start_time: "09:00:00",
      end_time: null,
      audience_scope: "all",
      audience_label: "All grades",
      class_id: null,
      section_id: null,
      location: "Auditorium",
      description: "Annual science day",
      reminder: "one_day",
      banner_asset_path: null,
      registration_required: false,
      recurrence: null,
      rsvp_count: 12,
      published: true,
      published_at: "2026-08-01T00:00:00.000Z",
      cancelled: false,
      cancellation_reason: null,
      cancelled_at: null,
      created_by_user_id: USER_ADMIN,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
    {
      id: "ae555555-5555-4555-8555-555555555555",
      institute_id: INST_A,
      title: "Teachers only briefing",
      kind: "meeting",
      custom_kind_label: null,
      source: "events",
      starts_on: "2026-09-25",
      ends_on: null,
      start_time: "16:00:00",
      end_time: null,
      audience_scope: "teachers",
      audience_label: "Teachers",
      class_id: null,
      section_id: null,
      location: "Staff room",
      description: "Internal",
      reminder: "none",
      banner_asset_path: null,
      registration_required: false,
      recurrence: null,
      rsvp_count: 0,
      published: true,
      published_at: "2026-08-01T00:00:00.000Z",
      cancelled: false,
      cancellation_reason: null,
      cancelled_at: null,
      created_by_user_id: USER_ADMIN,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
    {
      id: EVENT_DRAFT,
      institute_id: INST_A,
      title: "Draft Sports Meet",
      kind: "function",
      custom_kind_label: null,
      source: "events",
      starts_on: "2026-10-01",
      ends_on: "2026-10-02",
      start_time: "07:30:00",
      end_time: null,
      audience_scope: "students",
      audience_label: "All students",
      class_id: null,
      section_id: null,
      location: "Field",
      description: null,
      reminder: "none",
      banner_asset_path: null,
      registration_required: true,
      recurrence: null,
      rsvp_count: 0,
      published: false,
      published_at: null,
      cancelled: false,
      cancellation_reason: null,
      cancelled_at: null,
      created_by_user_id: USER_ADMIN,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
    {
      id: EVENT_HOLIDAY,
      institute_id: INST_A,
      title: "Independence Day",
      kind: "holiday",
      custom_kind_label: null,
      source: "calendar",
      starts_on: "2026-08-15",
      ends_on: null,
      start_time: null,
      end_time: null,
      audience_scope: "all",
      audience_label: null,
      class_id: null,
      section_id: null,
      location: null,
      description: null,
      reminder: "none",
      banner_asset_path: null,
      registration_required: false,
      recurrence: null,
      rsvp_count: 0,
      published: true,
      published_at: "2026-08-01T00:00:00.000Z",
      cancelled: false,
      cancellation_reason: null,
      cancelled_at: null,
      created_by_user_id: USER_ADMIN,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
    {
      id: EVENT_OTHER,
      institute_id: INST_B,
      title: "Other school day",
      kind: "meeting",
      custom_kind_label: null,
      source: "events",
      starts_on: "2026-09-01",
      ends_on: null,
      start_time: null,
      end_time: null,
      audience_scope: "all",
      audience_label: null,
      class_id: null,
      section_id: null,
      location: null,
      description: null,
      reminder: "none",
      banner_asset_path: null,
      registration_required: false,
      recurrence: null,
      rsvp_count: 0,
      published: true,
      published_at: "2026-08-01T00:00:00.000Z",
      cancelled: false,
      cancellation_reason: null,
      cancelled_at: null,
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

describe("events api", () => {
  it("lists events for staff and hides drafts from parents", async () => {
    const app = appWithDb(baseDb());

    const staff = await app.request(`/api/v1/events?institute_id=${INST_A}`, {
      headers: { Authorization: "Bearer token-admin" },
    });
    expect(staff.status).toBe(200);
    expect((await json(staff)).data).toHaveLength(4);

    const parent = await app.request(`/api/v1/events?institute_id=${INST_A}`, {
      headers: { Authorization: "Bearer token-parent" },
    });
    expect(parent.status).toBe(200);
    const parentBody = await json(parent);
    expect(parentBody.data).toHaveLength(2);
    expect(
      parentBody.data.every(
        (e: { published: boolean; audienceScope: string }) =>
          e.published && e.audienceScope !== "teachers",
      ),
    ).toBe(true);

    const cross = await app.request(`/api/v1/events?institute_id=${INST_B}`, {
      headers: { Authorization: "Bearer token-admin" },
    });
    expect(cross.status).toBe(403);
  });

  it("lists calendar projection", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request(
      `/api/v1/events/calendar?institute_id=${INST_A}`,
      { headers: { Authorization: "Bearer token-admin" } },
    );
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.data.some((e: { id: string }) => e.id === EVENT_HOLIDAY)).toBe(
      true,
    );
    expect(body.data.some((e: { id: string }) => e.id === EVENT_PUB)).toBe(true);
  });

  it("admin creates, publishes, cancels event", async () => {
    const db = baseDb();
    db.event = [];
    const app = appWithDb(db);

    const created = await app.request("/api/v1/events", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-admin",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        title: "PTA Meeting",
        kind: "meeting",
        source: "events",
        starts_on: "2026-11-01",
        start_time: "16:00",
        audience_scope: "parents",
        reminder: "one_day",
      }),
    });
    expect(created.status).toBe(201);
    const createdBody = await json(created);
    expect(createdBody.data.published).toBe(false);
    const id = createdBody.data.id as string;

    const published = await app.request(`/api/v1/events/${id}/publish`, {
      method: "POST",
      headers: { Authorization: "Bearer token-admin" },
    });
    expect(published.status).toBe(200);
    expect((await json(published)).data.published).toBe(true);

    const cancelled = await app.request(`/api/v1/events/${id}/cancel`, {
      method: "POST",
      headers: {
        Authorization: "Bearer token-admin",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ cancellation_reason: "Schedule conflict" }),
    });
    expect(cancelled.status).toBe(200);
    const cancelBody = await json(cancelled);
    expect(cancelBody.data.cancelled).toBe(true);
    expect(cancelBody.data.published).toBe(false);
  });

  it("blocks teacher create and parent draft read", async () => {
    const app = appWithDb(baseDb());

    const create = await app.request("/api/v1/events", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-teacher",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        title: "Teacher event",
        kind: "function",
        source: "events",
        starts_on: "2026-11-01",
      }),
    });
    expect(create.status).toBe(403);

    const draft = await app.request(`/api/v1/events/${EVENT_DRAFT}`, {
      headers: { Authorization: "Bearer token-parent" },
    });
    expect(draft.status).toBe(403);
  });

  it("blocks parent from teacher-only published event", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request(
      "/api/v1/events/ae555555-5555-4555-8555-555555555555",
      { headers: { Authorization: "Bearer token-parent" } },
    );
    expect(res.status).toBe(403);

    const teacher = await app.request(
      "/api/v1/events/ae555555-5555-4555-8555-555555555555",
      { headers: { Authorization: "Bearer token-teacher" } },
    );
    expect(teacher.status).toBe(200);
  });

  it("soft-deletes unpublished drafts only", async () => {
    const app = appWithDb(baseDb());

    const publishedDelete = await app.request(`/api/v1/events/${EVENT_PUB}`, {
      method: "DELETE",
      headers: { Authorization: "Bearer token-admin" },
    });
    expect(publishedDelete.status).toBe(409);

    const draftDelete = await app.request(`/api/v1/events/${EVENT_DRAFT}`, {
      method: "DELETE",
      headers: { Authorization: "Bearer token-admin" },
    });
    expect(draftDelete.status).toBe(204);

    const get = await app.request(`/api/v1/events/${EVENT_DRAFT}`, {
      headers: { Authorization: "Bearer token-admin" },
    });
    expect(get.status).toBe(404);
  });

  it("blocks cross-tenant get by id", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request(`/api/v1/events/${EVENT_OTHER}`, {
      headers: { Authorization: "Bearer token-admin" },
    });
    expect(res.status).toBe(403);
  });
});
