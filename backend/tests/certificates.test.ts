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
const TPL_CERT = "ae111111-1111-4111-8111-111111111111";
const TPL_OTHER = "ae222222-2222-4222-8222-222222222222";
const GEN_PUBLISHED = "af111111-1111-4111-8111-111111111111";
const GEN_DRAFT = "af222222-2222-4222-8222-222222222222";
const ISSUED_A = "b0111111-1111-4111-8111-111111111111";
const ISSUED_OTHER = "b0222222-2222-4222-8222-222222222222";

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
    { id: STUDENT_A, institute_id: INST_A, deleted_at: null },
    { id: STUDENT_B, institute_id: INST_A, deleted_at: null },
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
  db.template = [
    {
      id: TPL_CERT,
      owner_scope: "institute",
      institute_id: INST_A,
      type: "certificate",
      name: "Bonafide Certificate",
      description: null,
      category: "Academic",
      status: "active",
      source: "custom",
      version: 2,
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
      id: TPL_OTHER,
      owner_scope: "institute",
      institute_id: INST_B,
      type: "certificate",
      name: "Other cert",
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
  ];
  db.generated_document = [
    {
      id: GEN_PUBLISHED,
      institute_id: INST_A,
      template_id: TPL_CERT,
      type: "certificate",
      title: "Bonafide — Student A",
      student_id: STUDENT_A,
      teacher_id: null,
      recipient_name: "Student A",
      recipient_ref: "STU-A",
      status: "ready",
      workflow_state: "published",
      certificate_number: null,
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
      id: GEN_DRAFT,
      institute_id: INST_A,
      template_id: TPL_CERT,
      type: "certificate",
      title: "Draft cert",
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
  ];
  db.issued_certificate = [
    {
      id: ISSUED_A,
      institute_id: INST_A,
      generated_document_id: null,
      template_id: TPL_CERT,
      student_id: STUDENT_A,
      teacher_id: null,
      certificate_number: "CERT/2026/0001",
      sequence: 1,
      year: 2026,
      title: "Prior issued",
      category: "Academic",
      template_name: "Bonafide Certificate",
      template_version: 1,
      recipient_name: "Student A",
      recipient_ref: "STU-A",
      status: "issued",
      issued_at: "2026-08-01T00:00:00.000Z",
      issued_by_user_id: USER_ADMIN,
      revoked_at: null,
      revoked_by_user_id: null,
      revoke_reason: null,
      asset_path: null,
      file_kind: null,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
    {
      id: ISSUED_OTHER,
      institute_id: INST_B,
      generated_document_id: null,
      template_id: TPL_OTHER,
      student_id: null,
      teacher_id: null,
      certificate_number: "CERT/2026/0001",
      sequence: 1,
      year: 2026,
      title: "Other institute",
      category: null,
      template_name: "Other cert",
      template_version: 1,
      recipient_name: "Someone",
      recipient_ref: null,
      status: "issued",
      issued_at: "2026-08-01T00:00:00.000Z",
      issued_by_user_id: USER_OTHER,
      revoked_at: null,
      revoked_by_user_id: null,
      revoke_reason: null,
      asset_path: null,
      file_kind: null,
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

describe("certificates api", () => {
  it("lists for staff and scopes parent to linked student issued rows", async () => {
    const app = appWithDb(baseDb());

    const staff = await app.request(
      `/api/v1/certificates?institute_id=${INST_A}`,
      { headers: { Authorization: "Bearer token-admin" } },
    );
    expect(staff.status).toBe(200);
    expect((await json(staff)).data).toHaveLength(1);

    const parent = await app.request(
      `/api/v1/certificates?institute_id=${INST_A}`,
      { headers: { Authorization: "Bearer token-parent" } },
    );
    expect(parent.status).toBe(200);
    const parentBody = await json(parent);
    expect(parentBody.data).toHaveLength(1);
    expect(parentBody.data[0].id).toBe(ISSUED_A);
  });

  it("issues from published generated document and blocks draft", async () => {
    const db = baseDb();
    const app = appWithDb(db);

    const draftIssue = await app.request("/api/v1/certificates", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-admin",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        generated_document_id: GEN_DRAFT,
      }),
    });
    expect(draftIssue.status).toBe(409);

    const issued = await app.request("/api/v1/certificates", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-admin",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        generated_document_id: GEN_PUBLISHED,
      }),
    });
    expect(issued.status).toBe(201);
    const body = await json(issued);
    expect(body.data.status).toBe("issued");
    expect(body.data.certificateNumber).toBe("CERT/2026/0002");
    expect(body.data.sequence).toBe(2);
    expect(body.data.generatedDocumentId).toBe(GEN_PUBLISHED);
    expect(body.data.fileKind).toBe("pdf");
    expect(body.data.assetPath).toMatch(
      new RegExp(`^${INST_A}/[0-9a-f-]+/CERT-2026-0002\\.pdf$`),
    );

    const gen = db.generated_document.find((g) => g.id === GEN_PUBLISHED);
    expect(gen?.certificate_number).toBe("CERT/2026/0002");

    const dup = await app.request("/api/v1/certificates", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-admin",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        generated_document_id: GEN_PUBLISHED,
      }),
    });
    expect(dup.status).toBe(409);
  });

  it("blocks teacher issue and parent revoke", async () => {
    const app = appWithDb(baseDb());

    const teacherIssue = await app.request("/api/v1/certificates", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-teacher",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        generated_document_id: GEN_PUBLISHED,
      }),
    });
    expect(teacherIssue.status).toBe(403);

    const parentRevoke = await app.request(
      `/api/v1/certificates/${ISSUED_A}/revoke`,
      {
        method: "POST",
        headers: {
          Authorization: "Bearer token-parent",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason: "Should fail" }),
      },
    );
    expect(parentRevoke.status).toBe(404);

    const crossRevoke = await app.request(
      `/api/v1/certificates/${ISSUED_OTHER}/revoke`,
      {
        method: "POST",
        headers: {
          Authorization: "Bearer token-admin",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason: "Cross tenant" }),
      },
    );
    expect(crossRevoke.status).toBe(404);
  });

  it("revokes issued certificate and hides from parent", async () => {
    const app = appWithDb(baseDb());

    const revoked = await app.request(
      `/api/v1/certificates/${ISSUED_A}/revoke`,
      {
        method: "POST",
        headers: {
          Authorization: "Bearer token-admin",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason: "Issued in error" }),
      },
    );
    expect(revoked.status).toBe(200);
    expect((await json(revoked)).data.status).toBe("revoked");

    const parent = await app.request(
      `/api/v1/certificates?institute_id=${INST_A}`,
      { headers: { Authorization: "Bearer token-parent" } },
    );
    expect(parent.status).toBe(200);
    expect((await json(parent)).data).toHaveLength(0);

    const parentGet = await app.request(`/api/v1/certificates/${ISSUED_A}`, {
      headers: { Authorization: "Bearer token-parent" },
    });
    expect(parentGet.status).toBe(404);
  });

  it("lookup by number and blocks cross-tenant get", async () => {
    const app = appWithDb(baseDb());

    const lookup = await app.request(
      `/api/v1/certificates/lookup?institute_id=${INST_A}&certificate_number=${encodeURIComponent("CERT/2026/0001")}`,
      { headers: { Authorization: "Bearer token-admin" } },
    );
    expect(lookup.status).toBe(200);
    expect((await json(lookup)).data.id).toBe(ISSUED_A);

    const cross = await app.request(`/api/v1/certificates/${ISSUED_OTHER}`, {
      headers: { Authorization: "Bearer token-admin" },
    });
    expect(cross.status).toBe(404);
  });

  it("public verify returns certificate without auth", async () => {
    const app = appWithDb(baseDb());

    const res = await app.request(
      `/api/v1/certificates/public/verify?institute_id=${INST_A}&certificate_number=${encodeURIComponent("CERT/2026/0001")}`,
    );
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.data.valid).toBe(true);
    expect(body.data.recipientName).toBe("Student A");
  });

  it("metadata_only issue skips asset generation", async () => {
    const app = appWithDb(baseDb());

    const res = await app.request("/api/v1/certificates", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-admin",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        template_id: TPL_CERT,
        student_id: STUDENT_B,
        recipient_name: "Student B",
        title: "Hybrid issue",
        certificate_number: "CERT/2026/0099",
        file_kind: "pptx",
        metadata_only: true,
      }),
    });
    expect(res.status).toBe(201);
    const body = await json(res);
    expect(body.data.fileKind).toBe("pptx");
    expect(body.data.assetPath).toBeNull();
  });

  it("creates and lists certificate recommendations", async () => {
    const app = appWithDb(baseDb());

    const created = await app.request("/api/v1/certificates/recommendations", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-teacher",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        achievement_id: "ach-1",
        achievement_title: "100m Sprint Gold",
        achievement_type: "sports",
        student_id: STUDENT_A,
        student_name: "Student A",
        student_class_label: "10-B",
      }),
    });
    expect(created.status).toBe(201);

    const list = await app.request(
      `/api/v1/certificates/recommendations?institute_id=${INST_A}&status=pending`,
      { headers: { Authorization: "Bearer token-admin" } },
    );
    expect(list.status).toBe(200);
    expect((await json(list)).data).toHaveLength(1);
  });
});
