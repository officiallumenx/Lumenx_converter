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
const SEC_ACTIVE = "a0111111-1111-4111-8111-111111111111";
const TEAM_ACTIVE = "a0333333-3333-4333-8333-333333333333";

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
    { id: STUDENT_A, institute_id: INST_A, user_profile_id: null, display_name: "Child A", deleted_at: null },
    { id: STUDENT_B, institute_id: INST_A, user_profile_id: null, display_name: "Other Child", deleted_at: null },
  ];
  db.parent = [
    { id: PARENT_A, institute_id: INST_A, user_profile_id: USER_PARENT, deleted_at: null },
  ];
  db.guardian_link = [
    { parent_id: PARENT_A, student_id: STUDENT_A, institute_id: INST_A, status: "active", deleted_at: null },
  ];
  db.activity_section = [
    {
      id: SEC_ACTIVE, institute_id: INST_A, domain: "sports", sports_category: "outdoor",
      name: "Football", slug: "football", description: null, status: "active",
      created_by_user_id: USER_ADMIN, created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z", deleted_at: null,
    },
  ];
  db.activity_team = [
    {
      id: TEAM_ACTIVE, institute_id: INST_A, section_id: SEC_ACTIVE,
      kind: "team", name: "A Team", status: "active",
      created_by_user_id: USER_ADMIN, created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z", deleted_at: null,
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

describe("activity sports v2 api", () => {
  // ── Venue + Tournament + Match Result happy path ───────────────

  it("admin creates venue → tournament → match_result (full chain)", async () => {
    const app = appWithDb(baseDb());

    const venueRes = await app.request("/api/v1/activity/venues", {
      method: "POST",
      headers: { Authorization: "Bearer token-admin", "Content-Type": "application/json" },
      body: JSON.stringify({
        institute_id: INST_A,
        name: "Main Ground",
        venue_type: "outdoor",
        capacity: 500,
      }),
    });
    expect(venueRes.status).toBe(201);
    const venue = (await json(venueRes)).data;
    expect(venue.name).toBe("Main Ground");
    expect(venue.capacity).toBe(500);

    const tournRes = await app.request("/api/v1/activity/tournaments", {
      method: "POST",
      headers: { Authorization: "Bearer token-admin", "Content-Type": "application/json" },
      body: JSON.stringify({
        institute_id: INST_A,
        name: "Inter-house Cricket",
        sport_label: "Cricket",
        tournament_type: "knockout",
        venue_id: venue.id,
        section_id: SEC_ACTIVE,
        starts_on: "2026-10-01",
        ends_on: "2026-10-05",
        status: "scheduled",
      }),
    });
    expect(tournRes.status).toBe(201);
    const tournament = (await json(tournRes)).data;
    expect(tournament.name).toBe("Inter-house Cricket");
    expect(tournament.venueId).toBe(venue.id);

    const matchRes = await app.request("/api/v1/activity/match-results", {
      method: "POST",
      headers: { Authorization: "Bearer token-admin", "Content-Type": "application/json" },
      body: JSON.stringify({
        institute_id: INST_A,
        tournament_id: tournament.id,
        match_label: "Final",
        played_on: "2026-10-05",
        home_score: 3,
        away_score: 1,
        result_status: "completed",
      }),
    });
    expect(matchRes.status).toBe(201);
    const match = (await json(matchRes)).data;
    expect(match.matchLabel).toBe("Final");
    expect(match.homeScore).toBe(3);
    expect(match.awayScore).toBe(1);
  });

  // ── List scoped by institute_id ────────────────────────────────

  it("list venues scoped by institute_id", async () => {
    const db = baseDb();
    const app = appWithDb(db);

    await app.request("/api/v1/activity/venues", {
      method: "POST",
      headers: { Authorization: "Bearer token-admin", "Content-Type": "application/json" },
      body: JSON.stringify({ institute_id: INST_A, name: "Gym Hall" }),
    });

    const listRes = await app.request(
      `/api/v1/activity/venues?institute_id=${INST_A}`,
      { headers: { Authorization: "Bearer token-admin" } },
    );
    expect(listRes.status).toBe(200);
    const venues = (await json(listRes)).data;
    expect(venues.length).toBe(1);
    expect(venues[0].name).toBe("Gym Hall");

    const emptyRes = await app.request(
      `/api/v1/activity/venues?institute_id=${INST_B}`,
      { headers: { Authorization: "Bearer token-other" } },
    );
    expect(emptyRes.status).toBe(200);
    expect((await json(emptyRes)).data).toHaveLength(0);
  });

  // ── Reject unauthenticated ─────────────────────────────────────

  it("rejects unauthenticated requests", async () => {
    const app = appWithDb(baseDb());

    const res = await app.request(
      `/api/v1/activity/venues?institute_id=${INST_A}`,
    );
    expect(res.status).toBe(401);
  });

  // ── Reject cross-tenant writes ─────────────────────────────────

  it("cross-tenant user cannot create venue in other institute", async () => {
    const app = appWithDb(baseDb());

    const res = await app.request("/api/v1/activity/venues", {
      method: "POST",
      headers: { Authorization: "Bearer token-other", "Content-Type": "application/json" },
      body: JSON.stringify({ institute_id: INST_A, name: "Intruder Venue" }),
    });
    expect(res.status).toBe(403);
  });

  // ── Equipment create ───────────────────────────────────────────

  it("admin creates equipment", async () => {
    const app = appWithDb(baseDb());

    const res = await app.request("/api/v1/activity/equipment", {
      method: "POST",
      headers: { Authorization: "Bearer token-admin", "Content-Type": "application/json" },
      body: JSON.stringify({
        institute_id: INST_A,
        name: "Cricket Bat",
        category: "batting",
        quantity: 10,
        condition: "good",
      }),
    });
    expect(res.status).toBe(201);
    const data = (await json(res)).data;
    expect(data.name).toBe("Cricket Bat");
    expect(data.quantity).toBe(10);
    expect(data.condition).toBe("good");
  });

  // ── Coach Note create ──────────────────────────────────────────

  it("teacher creates coach note for team", async () => {
    const app = appWithDb(baseDb());

    const res = await app.request("/api/v1/activity/coach-notes", {
      method: "POST",
      headers: { Authorization: "Bearer token-teacher", "Content-Type": "application/json" },
      body: JSON.stringify({
        institute_id: INST_A,
        team_id: TEAM_ACTIVE,
        note_date: "2026-09-05",
        body: "Good improvement in passing drills today.",
        visibility: "guardians",
      }),
    });
    expect(res.status).toBe(201);
    const data = (await json(res)).data;
    expect(data.body).toBe("Good improvement in passing drills today.");
    expect(data.visibility).toBe("guardians");
  });

  // ── Sports Attendance create ───────────────────────────────────

  it("admin creates sports attendance record", async () => {
    const app = appWithDb(baseDb());

    const res = await app.request("/api/v1/activity/sports-attendance", {
      method: "POST",
      headers: { Authorization: "Bearer token-admin", "Content-Type": "application/json" },
      body: JSON.stringify({
        institute_id: INST_A,
        team_id: TEAM_ACTIVE,
        session_on: "2026-09-05",
        student_id: STUDENT_A,
        status: "present",
      }),
    });
    expect(res.status).toBe(201);
    const data = (await json(res)).data;
    expect(data.studentId).toBe(STUDENT_A);
    expect(data.status).toBe("present");
  });

  // ── Medical Fitness create ─────────────────────────────────────

  it("admin creates medical fitness clearance", async () => {
    const app = appWithDb(baseDb());

    const res = await app.request("/api/v1/activity/medical-fitness", {
      method: "POST",
      headers: { Authorization: "Bearer token-admin", "Content-Type": "application/json" },
      body: JSON.stringify({
        institute_id: INST_A,
        student_id: STUDENT_A,
        clearance_status: "clear",
        assessed_on: "2026-09-01",
        valid_until: "2027-03-01",
        notes: "All vitals normal",
      }),
    });
    expect(res.status).toBe(201);
    const data = (await json(res)).data;
    expect(data.clearanceStatus).toBe("clear");
    expect(data.validUntil).toBe("2027-03-01");
  });

  // ── Calendar Event create ──────────────────────────────────────

  it("teacher creates activity calendar event", async () => {
    const app = appWithDb(baseDb());

    const res = await app.request("/api/v1/activity/calendar-events", {
      method: "POST",
      headers: { Authorization: "Bearer token-teacher", "Content-Type": "application/json" },
      body: JSON.stringify({
        institute_id: INST_A,
        team_id: TEAM_ACTIVE,
        title: "Pre-season Friendly",
        event_on: "2026-09-15",
        start_time: "09:00",
        end_time: "11:00",
        event_kind: "match",
        venue_text: "Main Ground",
      }),
    });
    expect(res.status).toBe(201);
    const data = (await json(res)).data;
    expect(data.title).toBe("Pre-season Friendly");
    expect(data.eventKind).toBe("match");
  });

  // ── Team Selection create ──────────────────────────────────────

  it("admin creates team selection with members", async () => {
    const app = appWithDb(baseDb());

    const res = await app.request("/api/v1/activity/team-selections", {
      method: "POST",
      headers: { Authorization: "Bearer token-admin", "Content-Type": "application/json" },
      body: JSON.stringify({
        institute_id: INST_A,
        team_id: TEAM_ACTIVE,
        title: "Match Day Squad",
        event_on: "2026-09-20",
        status: "draft",
        member_student_ids: [STUDENT_A, STUDENT_B],
      }),
    });
    expect(res.status).toBe(201);
    const data = (await json(res)).data;
    expect(data.title).toBe("Match Day Squad");
    expect(data.status).toBe("draft");
  });

  // ── Parent write rejected ──────────────────────────────────────

  it("parent cannot create tournament (403)", async () => {
    const app = appWithDb(baseDb());

    const res = await app.request("/api/v1/activity/tournaments", {
      method: "POST",
      headers: { Authorization: "Bearer token-parent", "Content-Type": "application/json" },
      body: JSON.stringify({
        institute_id: INST_A,
        name: "Parent Tournament",
      }),
    });
    expect(res.status).toBe(403);
  });

  // ── Draft tournament hidden from parent ────────────────────────

  it("draft tournaments hidden from parents", async () => {
    const db = baseDb();
    const app = appWithDb(db);

    await app.request("/api/v1/activity/tournaments", {
      method: "POST",
      headers: { Authorization: "Bearer token-admin", "Content-Type": "application/json" },
      body: JSON.stringify({
        institute_id: INST_A,
        name: "Draft Tournament",
        status: "draft",
      }),
    });

    await app.request("/api/v1/activity/tournaments", {
      method: "POST",
      headers: { Authorization: "Bearer token-admin", "Content-Type": "application/json" },
      body: JSON.stringify({
        institute_id: INST_A,
        name: "Published Tournament",
        status: "scheduled",
      }),
    });

    const parentList = await app.request(
      `/api/v1/activity/tournaments?institute_id=${INST_A}`,
      { headers: { Authorization: "Bearer token-parent" } },
    );
    expect(parentList.status).toBe(200);
    const names = (await json(parentList)).data.map((t: { name: string }) => t.name);
    expect(names).toContain("Published Tournament");
    expect(names).not.toContain("Draft Tournament");

    const adminList = await app.request(
      `/api/v1/activity/tournaments?institute_id=${INST_A}`,
      { headers: { Authorization: "Bearer token-admin" } },
    );
    expect(adminList.status).toBe(200);
    const adminNames = (await json(adminList)).data.map((t: { name: string }) => t.name);
    expect(adminNames).toContain("Draft Tournament");
    expect(adminNames).toContain("Published Tournament");
  });
});
