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
const INST_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const INST_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const MEMBER_ADMIN = "aa111111-1111-4111-8111-111111111111";
const MEMBER_TEACHER = "aa222222-2222-4222-8222-222222222222";
const MEMBER_OTHER = "aa333333-3333-4333-8333-333333333333";
const YEAR_A = "ee111111-1111-4111-8111-111111111111";

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
  db.academic_year = [
    { id: YEAR_A, institute_id: INST_A, deleted_at: null },
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

const validBands = [
  { min: 90, max: 100, grade: "A+", gpa: 4.0 },
  { min: 80, max: 89, grade: "A", gpa: 3.7 },
  { min: 70, max: 79, grade: "B+", gpa: 3.3 },
  { min: 60, max: 69, grade: "B", gpa: 3.0 },
  { min: 0, max: 59, grade: "F", gpa: 0 },
];

describe("grade-scheme — authentication", () => {
  it("returns 401 without JWT", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request(`/api/v1/marks/grade-schemes?institute_id=${INST_A}`);
    expect(res.status).toBe(401);
    const body = await json(res);
    expect(body.error.code).toBe("UNAUTHENTICATED");
  });

  it("returns 401 for invalid JWT", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request(`/api/v1/marks/grade-schemes?institute_id=${INST_A}`, {
      headers: auth("bad-token"),
    });
    expect(res.status).toBe(401);
    expect((await json(res)).error.code).toBe("UNAUTHENTICATED");
  });
});

describe("grade-scheme — CRUD", () => {
  it("creates a grade scheme and lists it", async () => {
    const app = appWithDb(baseDb());

    const create = await app.request("/api/v1/marks/grade-schemes", {
      method: "POST",
      headers: jsonHeaders("token-admin"),
      body: JSON.stringify({
        institute_id: INST_A,
        name: "Standard Grading",
        is_default: true,
        bands: validBands,
      }),
    });
    expect(create.status).toBe(201);
    const created = (await json(create)).data;
    expect(created.name).toBe("Standard Grading");
    expect(created.isDefault).toBe(true);
    expect(created.bands).toHaveLength(5);
    expect(created.instituteId).toBe(INST_A);
    expect(created.createdByUserId).toBe(USER_ADMIN);

    const list = await app.request(`/api/v1/marks/grade-schemes?institute_id=${INST_A}`, {
      headers: auth("token-admin"),
    });
    expect(list.status).toBe(200);
    const items = (await json(list)).data;
    expect(items).toHaveLength(1);
    expect(items[0].id).toBe(created.id);
  });

  it("gets a single grade scheme by id", async () => {
    const app = appWithDb(baseDb());

    const create = await app.request("/api/v1/marks/grade-schemes", {
      method: "POST",
      headers: jsonHeaders("token-admin"),
      body: JSON.stringify({
        institute_id: INST_A,
        name: "Lookup Test",
        bands: validBands,
      }),
    });
    const created = (await json(create)).data;

    const get = await app.request(`/api/v1/marks/grade-schemes/${created.id}`, {
      headers: auth("token-admin"),
    });
    expect(get.status).toBe(200);
    expect((await json(get)).data.name).toBe("Lookup Test");
  });

  it("patches a grade scheme", async () => {
    const app = appWithDb(baseDb());

    const create = await app.request("/api/v1/marks/grade-schemes", {
      method: "POST",
      headers: jsonHeaders("token-admin"),
      body: JSON.stringify({
        institute_id: INST_A,
        name: "Before Patch",
        bands: validBands,
      }),
    });
    const created = (await json(create)).data;

    const patch = await app.request(`/api/v1/marks/grade-schemes/${created.id}`, {
      method: "PATCH",
      headers: jsonHeaders("token-admin"),
      body: JSON.stringify({ name: "After Patch", is_default: true }),
    });
    expect(patch.status).toBe(200);
    const patched = (await json(patch)).data;
    expect(patched.name).toBe("After Patch");
    expect(patched.isDefault).toBe(true);
  });

  it("soft-deletes a grade scheme", async () => {
    const app = appWithDb(baseDb());

    const create = await app.request("/api/v1/marks/grade-schemes", {
      method: "POST",
      headers: jsonHeaders("token-admin"),
      body: JSON.stringify({
        institute_id: INST_A,
        name: "Deletable",
        bands: validBands,
      }),
    });
    const created = (await json(create)).data;

    const del = await app.request(`/api/v1/marks/grade-schemes/${created.id}`, {
      method: "DELETE",
      headers: auth("token-admin"),
    });
    expect(del.status).toBe(200);

    const get = await app.request(`/api/v1/marks/grade-schemes/${created.id}`, {
      headers: auth("token-admin"),
    });
    expect(get.status).toBe(404);
  });

  it("creates with optional academic_year_id", async () => {
    const app = appWithDb(baseDb());

    const create = await app.request("/api/v1/marks/grade-schemes", {
      method: "POST",
      headers: jsonHeaders("token-admin"),
      body: JSON.stringify({
        institute_id: INST_A,
        name: "Year Scoped",
        academic_year_id: YEAR_A,
        bands: validBands,
      }),
    });
    expect(create.status).toBe(201);
    expect((await json(create)).data.academicYearId).toBe(YEAR_A);
  });
});

describe("grade-scheme — is_default behavior", () => {
  it("allows creating a default scheme", async () => {
    const app = appWithDb(baseDb());

    const res = await app.request("/api/v1/marks/grade-schemes", {
      method: "POST",
      headers: jsonHeaders("token-admin"),
      body: JSON.stringify({
        institute_id: INST_A,
        name: "Default Scheme",
        is_default: true,
        bands: validBands,
      }),
    });
    expect(res.status).toBe(201);
    expect((await json(res)).data.isDefault).toBe(true);
  });
});

describe("grade-scheme — validation", () => {
  it("rejects empty bands array", async () => {
    const app = appWithDb(baseDb());

    const res = await app.request("/api/v1/marks/grade-schemes", {
      method: "POST",
      headers: jsonHeaders("token-admin"),
      body: JSON.stringify({
        institute_id: INST_A,
        name: "Bad Bands",
        bands: [],
      }),
    });
    expect(res.status).toBe(400);
    expect((await json(res)).error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects band with min > max", async () => {
    const app = appWithDb(baseDb());

    const res = await app.request("/api/v1/marks/grade-schemes", {
      method: "POST",
      headers: jsonHeaders("token-admin"),
      body: JSON.stringify({
        institute_id: INST_A,
        name: "Bad Range",
        bands: [{ min: 100, max: 50, grade: "X" }],
      }),
    });
    expect(res.status).toBe(400);
    expect((await json(res)).error.code).toBe("VALIDATION_ERROR");
  });

  it("rejects empty name", async () => {
    const app = appWithDb(baseDb());

    const res = await app.request("/api/v1/marks/grade-schemes", {
      method: "POST",
      headers: jsonHeaders("token-admin"),
      body: JSON.stringify({
        institute_id: INST_A,
        name: "",
        bands: validBands,
      }),
    });
    expect(res.status).toBe(400);
  });

  it("rejects band without grade label", async () => {
    const app = appWithDb(baseDb());

    const res = await app.request("/api/v1/marks/grade-schemes", {
      method: "POST",
      headers: jsonHeaders("token-admin"),
      body: JSON.stringify({
        institute_id: INST_A,
        name: "No Grade Label",
        bands: [{ min: 0, max: 100 }],
      }),
    });
    expect(res.status).toBe(400);
  });
});

describe("grade-scheme — authorization", () => {
  it("forbids teacher from creating grade schemes", async () => {
    const app = appWithDb(baseDb());

    const res = await app.request("/api/v1/marks/grade-schemes", {
      method: "POST",
      headers: jsonHeaders("token-teacher"),
      body: JSON.stringify({
        institute_id: INST_A,
        name: "Teacher Scheme",
        bands: validBands,
      }),
    });
    expect(res.status).toBe(403);
    expect((await json(res)).error.code).toBe("FORBIDDEN");
  });

  it("allows teacher to read grade schemes", async () => {
    const db = baseDb();
    db.grade_scheme = [
      {
        id: "ff111111-1111-4111-8111-111111111111",
        institute_id: INST_A,
        name: "Readable",
        academic_year_id: null,
        is_default: false,
        bands: validBands,
        created_by_user_id: USER_ADMIN,
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
        deleted_at: null,
      },
    ];
    const app = appWithDb(db);

    const list = await app.request(`/api/v1/marks/grade-schemes?institute_id=${INST_A}`, {
      headers: auth("token-teacher"),
    });
    expect(list.status).toBe(200);
    expect((await json(list)).data).toHaveLength(1);
  });

  it("forbids cross-institute access", async () => {
    const app = appWithDb(baseDb());

    const res = await app.request(`/api/v1/marks/grade-schemes?institute_id=${INST_B}`, {
      headers: auth("token-admin"),
    });
    expect(res.status).toBe(403);
  });

  it("forbids teacher from patching grade schemes", async () => {
    const db = baseDb();
    db.grade_scheme = [
      {
        id: "ff111111-1111-4111-8111-111111111111",
        institute_id: INST_A,
        name: "Existing",
        academic_year_id: null,
        is_default: false,
        bands: validBands,
        created_by_user_id: USER_ADMIN,
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
        deleted_at: null,
      },
    ];
    const app = appWithDb(db);

    const res = await app.request("/api/v1/marks/grade-schemes/ff111111-1111-4111-8111-111111111111", {
      method: "PATCH",
      headers: jsonHeaders("token-teacher"),
      body: JSON.stringify({ name: "Hacked" }),
    });
    expect(res.status).toBe(403);
  });

  it("forbids teacher from deleting grade schemes", async () => {
    const db = baseDb();
    db.grade_scheme = [
      {
        id: "ff111111-1111-4111-8111-111111111111",
        institute_id: INST_A,
        name: "Existing",
        academic_year_id: null,
        is_default: false,
        bands: validBands,
        created_by_user_id: USER_ADMIN,
        created_at: "2026-01-01T00:00:00.000Z",
        updated_at: "2026-01-01T00:00:00.000Z",
        deleted_at: null,
      },
    ];
    const app = appWithDb(db);

    const res = await app.request("/api/v1/marks/grade-schemes/ff111111-1111-4111-8111-111111111111", {
      method: "DELETE",
      headers: auth("token-teacher"),
    });
    expect(res.status).toBe(403);
  });
});

describe("grade-scheme — resolveGradeFromScheme", () => {
  it("resolves correct grade from bands", async () => {
    const { resolveGradeFromScheme } = await import(
      "../src/domains/marks/grade-scheme-service.js"
    );

    const result90 = resolveGradeFromScheme(validBands, 95);
    expect(result90?.grade).toBe("A+");

    const result60 = resolveGradeFromScheme(validBands, 65);
    expect(result60?.grade).toBe("B");

    const resultBoundary = resolveGradeFromScheme(validBands, 80);
    expect(resultBoundary?.grade).toBe("A");

    const resultLow = resolveGradeFromScheme(validBands, 10);
    expect(resultLow?.grade).toBe("F");
  });
});
