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
const TEACHER_A = "bb111111-1111-4111-8111-111111111111";
const PARENT_A = "ba111111-1111-4111-8111-111111111111";
const STUDENT_A = "ac111111-1111-4111-8111-111111111111";
const TPL_ACTIVE = "ae111111-1111-4111-8111-111111111111";
const TPL_DRAFT = "ae222222-2222-4222-8222-222222222222";
const TPL_PLATFORM = "ae333333-3333-4333-8333-333333333333";
const TPL_OTHER = "ae444444-4444-4444-8444-444444444444";
const GEN_DRAFT = "af111111-1111-4111-8111-111111111111";
const GEN_PUBLISHED = "af222222-2222-4222-8222-222222222222";
const GEN_OTHER = "af333333-3333-4333-8333-333333333333";
const SECTION_A = "cc111111-1111-4111-8111-111111111111";
const YEAR_A = "ee111111-1111-4111-8111-111111111111";
const CLASS_A = "ff111111-1111-4111-8111-111111111111";
const ENROLL_A = "ad111111-1111-4111-8111-111111111111";
const ASSIGN_A = "ag111111-1111-4111-8111-111111111111";
const GEN_REPORT = "af444444-4444-4444-8444-444444444444";
const USER_TEACHER2 = "33333333-3333-4333-8333-333333333333";
const MEMBER_TEACHER2 = "aa333333-3333-4333-8333-333333333333";
const TEACHER_B = "bb222222-2222-4222-8222-222222222222";
const TPL_REPORT = "ae555555-5555-4555-8555-555555555555";

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
    { id: USER_PARENT, display_name: "Parent", email: "p@x.com", status: "active", deleted_at: null },
    { id: USER_OTHER, display_name: "Other", email: "o@x.com", status: "active", deleted_at: null },
  ];
  db.membership = [
    { id: MEMBER_ADMIN, user_id: USER_ADMIN, institute_id: INST_A, status: "active", deleted_at: null },
    { id: MEMBER_TEACHER, user_id: USER_TEACHER, institute_id: INST_A, status: "active", deleted_at: null },
    { id: MEMBER_TEACHER2, user_id: USER_TEACHER2, institute_id: INST_A, status: "active", deleted_at: null },
    { id: MEMBER_PARENT, user_id: USER_PARENT, institute_id: INST_A, status: "active", deleted_at: null },
    { id: MEMBER_OTHER, user_id: USER_OTHER, institute_id: INST_B, status: "active", deleted_at: null },
  ];
  db.membership_role = [
    { membership_id: MEMBER_ADMIN, role_code: "institute_admin" },
    { membership_id: MEMBER_TEACHER, role_code: "teacher" },
    { membership_id: MEMBER_TEACHER2, role_code: "teacher" },
    { membership_id: MEMBER_PARENT, role_code: "parent" },
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
  db.student = [
    { id: STUDENT_A, institute_id: INST_A, deleted_at: null },
  ];
  db.parent = [
    { id: PARENT_A, institute_id: INST_A, user_profile_id: USER_PARENT, deleted_at: null },
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
  db.academic_year = [
    { id: YEAR_A, institute_id: INST_A, status: "active", deleted_at: null },
  ];
  db.section = [
    {
      id: SECTION_A,
      institute_id: INST_A,
      academic_year_id: YEAR_A,
      class_id: CLASS_A,
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
      status: "active",
      deleted_at: null,
    },
  ];
  db.teacher_assignment = [
    {
      id: ASSIGN_A,
      institute_id: INST_A,
      teacher_id: TEACHER_A,
      section_id: SECTION_A,
      status: "active",
      deleted_at: null,
    },
  ];
  db.template = [
    {
      id: TPL_ACTIVE,
      owner_scope: "institute",
      institute_id: INST_A,
      type: "certificate",
      name: "Bonafide Certificate",
      description: null,
      category: "Academic",
      status: "active",
      source: "custom",
      version: 1,
      preview_aspect: "a4",
      layout_mode: "blocks",
      blocks: [],
      visual_theme: null,
      visual_fields: null,
      tags: [],
      created_by_user_id: USER_ADMIN,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
    {
      id: TPL_DRAFT,
      owner_scope: "institute",
      institute_id: INST_A,
      type: "report",
      name: "Draft report card",
      description: null,
      category: "Reports",
      status: "draft",
      source: "custom",
      version: 1,
      preview_aspect: "a4",
      layout_mode: "blocks",
      blocks: [],
      visual_theme: null,
      visual_fields: null,
      tags: [],
      created_by_user_id: USER_ADMIN,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
    {
      id: TPL_PLATFORM,
      owner_scope: "platform",
      institute_id: null,
      type: "id_card",
      name: "Student ID — Standard",
      description: null,
      category: "Identity",
      status: "active",
      source: "system",
      version: 1,
      preview_aspect: "id_card",
      layout_mode: "visual",
      blocks: [],
      visual_theme: "student_id_blue",
      visual_fields: null,
      tags: [],
      created_by_user_id: null,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
    {
      id: TPL_OTHER,
      owner_scope: "institute",
      institute_id: INST_B,
      type: "certificate",
      name: "Other institute template",
      description: null,
      category: null,
      status: "active",
      source: "custom",
      version: 1,
      preview_aspect: "a4",
      layout_mode: "blocks",
      blocks: [],
      visual_theme: null,
      visual_fields: null,
      tags: [],
      created_by_user_id: USER_OTHER,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
    {
      id: TPL_REPORT,
      owner_scope: "institute",
      institute_id: INST_A,
      type: "report",
      name: "Term report",
      description: null,
      category: "Reports",
      status: "active",
      source: "custom",
      version: 1,
      preview_aspect: "a4",
      layout_mode: "blocks",
      blocks: [],
      visual_theme: null,
      visual_fields: null,
      tags: [],
      created_by_user_id: USER_ADMIN,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
  ];
  db.generated_document = [
    {
      id: GEN_DRAFT,
      institute_id: INST_A,
      template_id: TPL_ACTIVE,
      type: "certificate",
      title: "Bonafide — Student A",
      student_id: STUDENT_A,
      teacher_id: null,
      recipient_name: "Student A",
      recipient_ref: "STU-A",
      status: "ready",
      workflow_state: "draft",
      certificate_number: null,
      portal_student: false,
      portal_parent: false,
      portal_teacher: false,
      rejection_reason: null,
      payload: {},
      asset_path: null,
      generated_by_user_id: USER_ADMIN,
      published_at: null,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
    {
      id: GEN_PUBLISHED,
      institute_id: INST_A,
      template_id: TPL_ACTIVE,
      type: "certificate",
      title: "Published cert",
      student_id: STUDENT_A,
      teacher_id: null,
      recipient_name: "Student A",
      recipient_ref: "STU-A",
      status: "ready",
      workflow_state: "published",
      certificate_number: "CERT-1",
      portal_student: true,
      portal_parent: true,
      portal_teacher: false,
      rejection_reason: null,
      payload: {},
      asset_path: null,
      generated_by_user_id: USER_ADMIN,
      published_at: "2026-08-02T00:00:00.000Z",
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-02T00:00:00.000Z",
      deleted_at: null,
    },
    {
      id: GEN_OTHER,
      institute_id: INST_B,
      template_id: TPL_OTHER,
      type: "certificate",
      title: "Other institute doc",
      student_id: null,
      teacher_id: null,
      recipient_name: "Someone",
      recipient_ref: null,
      status: "ready",
      workflow_state: "published",
      certificate_number: null,
      portal_student: true,
      portal_parent: true,
      portal_teacher: false,
      rejection_reason: null,
      payload: {},
      asset_path: null,
      generated_by_user_id: USER_OTHER,
      published_at: "2026-08-02T00:00:00.000Z",
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-02T00:00:00.000Z",
      deleted_at: null,
    },
    {
      id: GEN_REPORT,
      institute_id: INST_A,
      template_id: TPL_REPORT,
      type: "report",
      title: "Term report — Student A",
      student_id: STUDENT_A,
      teacher_id: null,
      recipient_name: "Student A",
      recipient_ref: "STU-A",
      status: "ready",
      workflow_state: "teacher_review",
      certificate_number: null,
      portal_student: false,
      portal_parent: false,
      portal_teacher: false,
      rejection_reason: null,
      payload: {},
      asset_path: null,
      generated_by_user_id: USER_ADMIN,
      published_at: null,
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
        "token-parent": USER_PARENT,
        "token-other": USER_OTHER,
      },
      db,
    }),
  );
}

describe("documents api", () => {
  it("lists active templates for staff and hides drafts from teachers", async () => {
    const app = appWithDb(baseDb());

    const staff = await app.request(
      `/api/v1/documents/templates?institute_id=${INST_A}`,
      { headers: { Authorization: "Bearer token-admin" } },
    );
    expect(staff.status).toBe(200);
    const staffIds = (await json(staff)).data.map((t: { id: string }) => t.id);
    expect(staffIds).toContain(TPL_ACTIVE);
    expect(staffIds).toContain(TPL_DRAFT);
    expect(staffIds).toContain(TPL_PLATFORM);
    expect(staffIds).not.toContain(TPL_OTHER);

    const teacher = await app.request(
      `/api/v1/documents/templates?institute_id=${INST_A}`,
      { headers: { Authorization: "Bearer token-teacher" } },
    );
    expect(teacher.status).toBe(200);
    const teacherIds = (await json(teacher)).data.map(
      (t: { id: string }) => t.id,
    );
    expect(teacherIds).toContain(TPL_ACTIVE);
    expect(teacherIds).toContain(TPL_PLATFORM);
    expect(teacherIds).not.toContain(TPL_DRAFT);
  });

  it("blocks teacher from mutating templates and platform templates", async () => {
    const app = appWithDb(baseDb());

    const create = await app.request("/api/v1/documents/templates", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-teacher",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        type: "certificate",
        name: "Should fail",
      }),
    });
    expect(create.status).toBe(403);

    const platformPatch = await app.request(
      `/api/v1/documents/templates/${TPL_PLATFORM}`,
      {
        method: "PATCH",
        headers: {
          Authorization: "Bearer token-admin",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ name: "Hacked" }),
      },
    );
    expect(platformPatch.status).toBe(403);
  });

  it("admin creates activates and generates then publishes certificate", async () => {
    const db = baseDb();
    db.generated_document = [];
    const app = appWithDb(db);

    const created = await app.request("/api/v1/documents/templates", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-admin",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        type: "certificate",
        name: "Character Certificate",
        activate_now: true,
      }),
    });
    expect(created.status).toBe(201);
    const tpl = (await json(created)).data;
    expect(tpl.status).toBe("active");

    const gen = await app.request("/api/v1/documents/generated", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-admin",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        template_id: tpl.id,
        recipient_name: "Student A",
        student_id: STUDENT_A,
      }),
    });
    expect(gen.status).toBe(201);
    const doc = (await json(gen)).data;
    expect(doc.workflowState).toBe("draft");

    const published = await app.request(
      `/api/v1/documents/generated/${doc.id}/transition`,
      {
        method: "POST",
        headers: {
          Authorization: "Bearer token-admin",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ workflow_state: "published" }),
      },
    );
    expect(published.status).toBe(200);
    const pubBody = await json(published);
    expect(pubBody.data.workflowState).toBe("published");
    expect(pubBody.data.portalVisibility.parent).toBe(true);
  });

  it("parent reads published generated docs only", async () => {
    const app = appWithDb(baseDb());

    const list = await app.request(
      `/api/v1/documents/generated?institute_id=${INST_A}`,
      { headers: { Authorization: "Bearer token-parent" } },
    );
    expect(list.status).toBe(200);
    const ids = (await json(list)).data.map((d: { id: string }) => d.id);
    expect(ids).toContain(GEN_PUBLISHED);
    expect(ids).not.toContain(GEN_DRAFT);

    const draftGet = await app.request(
      `/api/v1/documents/generated/${GEN_DRAFT}`,
      { headers: { Authorization: "Bearer token-parent" } },
    );
    expect(draftGet.status).toBe(403);
  });

  it("teacher cannot publish certificate drafts", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request(
      `/api/v1/documents/generated/${GEN_DRAFT}/transition`,
      {
        method: "POST",
        headers: {
          Authorization: "Bearer token-teacher",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ workflow_state: "published" }),
      },
    );
    expect(res.status).toBe(403);
  });

  it("scopes report teacher_review approval to assigned teachers", async () => {
    const app = appWithDb(baseDb());

    const covered = await app.request(
      `/api/v1/documents/generated/${GEN_REPORT}/transition`,
      {
        method: "POST",
        headers: {
          Authorization: "Bearer token-teacher",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ workflow_state: "admin_review" }),
      },
    );
    expect(covered.status).toBe(200);
    expect((await json(covered)).data.workflowState).toBe("admin_review");

    // Reset for second teacher — use fresh db
    const app2 = appWithDb(baseDb());
    const uncovered = await app2.request(
      `/api/v1/documents/generated/${GEN_REPORT}/transition`,
      {
        method: "POST",
        headers: {
          Authorization: "Bearer token-teacher2",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ workflow_state: "admin_review" }),
      },
    );
    expect(uncovered.status).toBe(403);
  });

  it("blocks cross-tenant generated get", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request(`/api/v1/documents/generated/${GEN_OTHER}`, {
      headers: { Authorization: "Bearer token-admin" },
    });
    expect(res.status).toBe(403);
  });
});
