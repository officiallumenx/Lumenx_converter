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
const USER_OTHER = "44444444-4444-4444-8444-444444444444";
const USER_PARENT = "55555555-5555-4555-8555-555555555555";
const INST_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const INST_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const MEMBER_ADMIN = "aa111111-1111-4111-8111-111111111111";
const MEMBER_OTHER = "aa444444-4444-4444-8444-444444444444";
const MEMBER_PARENT = "aa555555-5555-4555-8555-555555555555";
const TEACHER_A = "bb111111-1111-4111-8111-111111111111";
const TEACHER_B = "bb222222-2222-4222-8222-222222222222";
const STUDENT_A = "ac111111-1111-4111-8111-111111111111";
const STUDENT_B = "ac222222-2222-4222-8222-222222222222";
const YEAR_A = "ee111111-1111-4111-8111-111111111111";
const CLASS_A = "ff111111-1111-4111-8111-111111111111";
const SECTION_A = "cc111111-1111-4111-8111-111111111111";
const SECTION_B = "cc222222-2222-4222-8222-222222222222";
const ENROLL_A = "ad111111-1111-4111-8111-111111111111";
const ENROLL_B = "ad222222-2222-4222-8222-222222222222";

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
    {
      id: USER_ADMIN,
      display_name: "Admin",
      email: "a@x.com",
      status: "active",
      deleted_at: null,
    },
    {
      id: USER_OTHER,
      display_name: "Other",
      email: "o@x.com",
      status: "active",
      deleted_at: null,
    },
    {
      id: USER_PARENT,
      display_name: "Parent",
      email: "p@x.com",
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
      id: MEMBER_OTHER,
      user_id: USER_OTHER,
      institute_id: INST_B,
      status: "active",
      deleted_at: null,
    },
    {
      id: MEMBER_PARENT,
      user_id: USER_PARENT,
      institute_id: INST_A,
      status: "active",
      deleted_at: null,
    },
  ];
  db.membership_role = [
    { membership_id: MEMBER_ADMIN, role_code: "institute_admin" },
    { membership_id: MEMBER_OTHER, role_code: "institute_admin" },
    { membership_id: MEMBER_PARENT, role_code: "parent" },
  ];
  db.institute = [
    {
      id: INST_A,
      code: "A",
      name: "A",
      kind: "school",
      status: "active",
      deleted_at: null,
    },
    {
      id: INST_B,
      code: "B",
      name: "B",
      kind: "school",
      status: "active",
      deleted_at: null,
    },
  ];
  db.teacher = [
    {
      id: TEACHER_A,
      institute_id: INST_A,
      display_name: "Teacher A",
      department: "Math",
      teaching_scope: "subject_teacher",
      portal_access_level: "faculty_grading",
      status: "active",
      photo_asset_path: null,
      deleted_at: null,
    },
    {
      id: TEACHER_B,
      institute_id: INST_B,
      display_name: "Teacher B",
      department: "Science",
      teaching_scope: "subject_teacher",
      portal_access_level: "faculty_grading",
      status: "active",
      photo_asset_path: null,
      deleted_at: null,
    },
  ];
  db.student = [
    {
      id: STUDENT_A,
      institute_id: INST_A,
      display_name: "Kid A",
      first_name: "Kid",
      surname: "A",
      gender: "female",
      address: "x",
      status: "active",
      access_status: "active",
      photo_asset_path: null,
      deleted_at: null,
    },
    {
      id: STUDENT_B,
      institute_id: INST_A,
      display_name: "Kid B",
      first_name: "Kid",
      surname: "B",
      gender: "male",
      address: "y",
      status: "active",
      access_status: "active",
      photo_asset_path: null,
      deleted_at: null,
    },
  ];
  db.academic_year = [
    {
      id: YEAR_A,
      institute_id: INST_A,
      label: "2026",
      status: "active",
      deleted_at: null,
    },
  ];
  db.class = [
    {
      id: CLASS_A,
      institute_id: INST_A,
      academic_year_id: YEAR_A,
      name: "Grade 1",
      deleted_at: null,
    },
  ];
  db.section = [
    {
      id: SECTION_A,
      institute_id: INST_A,
      academic_year_id: YEAR_A,
      class_id: CLASS_A,
      code: "A",
      deleted_at: null,
    },
    {
      id: SECTION_B,
      institute_id: INST_A,
      academic_year_id: YEAR_A,
      class_id: CLASS_A,
      code: "B",
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
      roll_no: "1",
      status: "active",
      deleted_at: null,
    },
    {
      id: ENROLL_B,
      institute_id: INST_A,
      academic_year_id: YEAR_A,
      student_id: STUDENT_B,
      class_id: CLASS_A,
      section_id: SECTION_B,
      roll_no: "2",
      status: "active",
      deleted_at: null,
    },
  ];
  db.stored_asset = [];
  return db;
}

function appWithDb(db: MockDb) {
  const env = loadEnv({ NODE_ENV: "test", LOG_LEVEL: "error" });
  const clients = createMockSupabaseClients({
    tokens: {
      "token-admin": USER_ADMIN,
      "token-other": USER_OTHER,
      "token-parent": USER_PARENT,
    },
    db,
  });
  return createApp(env, silentLogger, clients);
}

function pngFile(name = "photo.png") {
  // minimal 1x1 png
  const bytes = Uint8Array.from([
    0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0x00, 0x00, 0x00, 0x0d,
    0x49, 0x48, 0x44, 0x52, 0x00, 0x00, 0x00, 0x01, 0x00, 0x00, 0x00, 0x01,
    0x08, 0x02, 0x00, 0x00, 0x00, 0x90, 0x77, 0x53, 0xde, 0x00, 0x00, 0x00,
    0x0c, 0x49, 0x44, 0x41, 0x54, 0x08, 0xd7, 0x63, 0xf8, 0xff, 0xff, 0x3f,
    0x00, 0x05, 0xfe, 0x02, 0xfe, 0xdc, 0xcc, 0x59, 0xe7, 0x00, 0x00, 0x00,
    0x00, 0x49, 0x45, 0x4e, 0x44, 0xae, 0x42, 0x60, 0x82,
  ]);
  return new File([bytes], name, { type: "image/png" });
}

describe("photos API", () => {
  it("lists teachers for own institute only", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request(
      `/api/v1/photos/teachers?institute_id=${INST_A}`,
      { headers: { Authorization: "Bearer token-admin" } },
    );
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toBe(TEACHER_A);
    expect(body.data[0].photoAssetPath).toBeNull();
  });

  it("denies cross-institute teacher list", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request(
      `/api/v1/photos/teachers?institute_id=${INST_B}`,
      { headers: { Authorization: "Bearer token-admin" } },
    );
    expect(res.status).toBe(403);
  });

  it("lists students filtered by class and section", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request(
      `/api/v1/photos/students?institute_id=${INST_A}&class_id=${CLASS_A}&section_id=${SECTION_A}`,
      { headers: { Authorization: "Bearer token-admin" } },
    );
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toBe(STUDENT_A);
    expect(body.data[0].sectionId).toBe(SECTION_A);
  });

  it("parent cannot upload teacher photo", async () => {
    const app = appWithDb(baseDb());
    const form = new FormData();
    form.append("file", pngFile());
    const res = await app.request(`/api/v1/photos/teachers/${TEACHER_A}`, {
      method: "POST",
      headers: { Authorization: "Bearer token-parent" },
      body: form,
    });
    expect(res.status).toBe(403);
  });

  it("admin uploads teacher photo and sets photoAssetPath", async () => {
    const db = baseDb();
    const app = appWithDb(db);
    const form = new FormData();
    form.append("file", pngFile("teacher.png"));
    const res = await app.request(`/api/v1/photos/teachers/${TEACHER_A}`, {
      method: "POST",
      headers: { Authorization: "Bearer token-admin" },
      body: form,
    });
    expect(res.status).toBe(201);
    const body = await json(res);
    expect(body.data.kind).toBe("teacher");
    expect(body.data.photoAssetPath).toBeTruthy();
    expect(body.data.photoSignedUrl).toContain("https://");
    expect(body.data.person.photoAssetPath).toBe(body.data.photoAssetPath);
    const teacher = db.teacher.find((t) => t.id === TEACHER_A);
    expect(teacher?.photo_asset_path).toBe(body.data.photoAssetPath);
  });

  it("admin uploads student photo", async () => {
    const db = baseDb();
    const app = appWithDb(db);
    const form = new FormData();
    form.append("file", pngFile("student.png"));
    const res = await app.request(`/api/v1/photos/students/${STUDENT_A}`, {
      method: "POST",
      headers: { Authorization: "Bearer token-admin" },
      body: form,
    });
    expect(res.status).toBe(201);
    const body = await json(res);
    expect(body.data.kind).toBe("student");
    expect(db.student.find((s) => s.id === STUDENT_A)?.photo_asset_path).toBe(
      body.data.photoAssetPath,
    );
  });

  it("rejects cross-institute student photo update", async () => {
    const app = appWithDb(baseDb());
    const form = new FormData();
    form.append("file", pngFile());
    const res = await app.request(`/api/v1/photos/students/${STUDENT_A}`, {
      method: "POST",
      headers: { Authorization: "Bearer token-other" },
      body: form,
    });
    expect(res.status).toBe(403);
  });

  it("rejects invalid mime", async () => {
    const app = appWithDb(baseDb());
    const form = new FormData();
    form.append(
      "file",
      new File([new Uint8Array([1, 2, 3])], "x.txt", { type: "text/plain" }),
    );
    const res = await app.request(`/api/v1/photos/teachers/${TEACHER_A}`, {
      method: "POST",
      headers: { Authorization: "Bearer token-admin" },
      body: form,
    });
    expect(res.status).toBe(400);
  });

  it("unauthenticated request denied", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request(
      `/api/v1/photos/teachers?institute_id=${INST_A}`,
    );
    expect(res.status).toBe(401);
  });
});
