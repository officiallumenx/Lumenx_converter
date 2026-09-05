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
const ASSET_INSTITUTE = "a0111111-1111-4111-8111-111111111111";
const ASSET_PRIVATE = "a0222222-2222-4222-8222-222222222222";
const ASSET_STAFF = "a0333333-3333-4333-8333-333333333333";
const ASSET_CROSS = "a0444444-4444-4444-8444-444444444444";
const ASSET_PARENT_PRIVATE = "a0555555-5555-4555-8555-555555555555";

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
  db.stored_asset = [
    {
      id: ASSET_INSTITUTE,
      institute_id: INST_A,
      bucket: "institute-branding",
      object_path: "logos/main.png",
      category: "logo",
      file_name: "main.png",
      content_type: "image/png",
      byte_size: 1024,
      checksum: null,
      visibility: "institute",
      status: "active",
      linked_entity_kind: null,
      linked_entity_id: null,
      owner_user_id: USER_ADMIN,
      created_by_user_id: USER_ADMIN,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
    {
      id: ASSET_PRIVATE,
      institute_id: INST_A,
      bucket: "student-media",
      object_path: "teachers/avatar.jpg",
      category: "avatar",
      file_name: "avatar.jpg",
      content_type: "image/jpeg",
      byte_size: 2048,
      checksum: null,
      visibility: "private",
      status: "active",
      linked_entity_kind: null,
      linked_entity_id: null,
      owner_user_id: USER_TEACHER,
      created_by_user_id: USER_TEACHER,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
    {
      id: ASSET_STAFF,
      institute_id: INST_A,
      bucket: "admission-docs",
      object_path: "internal/notes.pdf",
      category: "admission_doc",
      file_name: "notes.pdf",
      content_type: "application/pdf",
      byte_size: 4096,
      checksum: null,
      visibility: "staff",
      status: "active",
      linked_entity_kind: null,
      linked_entity_id: null,
      owner_user_id: USER_ADMIN,
      created_by_user_id: USER_ADMIN,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
    {
      id: ASSET_CROSS,
      institute_id: INST_B,
      bucket: "institute-branding",
      object_path: "logos/other.png",
      category: "logo",
      file_name: "other.png",
      content_type: "image/png",
      byte_size: 512,
      checksum: null,
      visibility: "institute",
      status: "active",
      linked_entity_kind: null,
      linked_entity_id: null,
      owner_user_id: USER_OTHER,
      created_by_user_id: USER_OTHER,
      created_at: "2026-08-01T00:00:00.000Z",
      updated_at: "2026-08-01T00:00:00.000Z",
      deleted_at: null,
    },
    {
      id: ASSET_PARENT_PRIVATE,
      institute_id: INST_A,
      bucket: "student-media",
      object_path: "parents/doc.pdf",
      category: "other",
      file_name: "doc.pdf",
      content_type: "application/pdf",
      byte_size: 800,
      checksum: null,
      visibility: "private",
      status: "active",
      linked_entity_kind: null,
      linked_entity_id: null,
      owner_user_id: USER_PARENT,
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

describe("assets api", () => {
  it("parent lists institute asset, not private/staff", async () => {
    const app = appWithDb(baseDb());

    const res = await app.request(
      `/api/v1/assets?institute_id=${INST_A}`,
      { headers: { Authorization: "Bearer token-parent" } },
    );
    expect(res.status).toBe(200);
    const ids = (await json(res)).data.map((a: { id: string }) => a.id);
    expect(ids).toContain(ASSET_INSTITUTE);
    expect(ids).toContain(ASSET_PARENT_PRIVATE);
    expect(ids).not.toContain(ASSET_PRIVATE);
    expect(ids).not.toContain(ASSET_STAFF);
  });

  it("parent GET private → 404; teacher owner GET private → 200", async () => {
    const app = appWithDb(baseDb());

    const parentRes = await app.request(`/api/v1/assets/${ASSET_PRIVATE}`, {
      headers: { Authorization: "Bearer token-parent" },
    });
    expect(parentRes.status).toBe(404);

    const teacherRes = await app.request(`/api/v1/assets/${ASSET_PRIVATE}`, {
      headers: { Authorization: "Bearer token-teacher" },
    });
    expect(teacherRes.status).toBe(200);
    expect((await json(teacherRes)).data.id).toBe(ASSET_PRIVATE);
  });

  it("parent create → 403; admin create → 201", async () => {
    const app = appWithDb(baseDb());
    const payload = {
      institute_id: INST_A,
      bucket: "certificates",
      object_path: "certs/new.pdf",
      category: "certificate_pdf",
      file_name: "new.pdf",
    };

    const parentRes = await app.request("/api/v1/assets", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-parent",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    expect(parentRes.status).toBe(403);

    const adminRes = await app.request("/api/v1/assets", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-admin",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });
    expect(adminRes.status).toBe(201);
    const body = await json(adminRes);
    expect(body.data.bucket).toBe("certificates");
    expect(body.data.objectPath).toBe("certs/new.pdf");
    expect(body.data.ownerUserId).toBe(USER_ADMIN);
  });

  it("duplicate bucket+path → 409", async () => {
    const app = appWithDb(baseDb());

    const res = await app.request("/api/v1/assets", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-admin",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        bucket: "institute-branding",
        object_path: "logos/main.png",
        category: "logo",
      }),
    });
    expect(res.status).toBe(409);
  });

  it("cross-tenant GET → 404", async () => {
    const app = appWithDb(baseDb());

    const res = await app.request(`/api/v1/assets/${ASSET_CROSS}`, {
      headers: { Authorization: "Bearer token-admin" },
    });
    expect(res.status).toBe(404);
  });

  it("parent PATCH institute asset → 404; admin PATCH ok", async () => {
    const app = appWithDb(baseDb());

    const parentRes = await app.request(`/api/v1/assets/${ASSET_INSTITUTE}`, {
      method: "PATCH",
      headers: {
        Authorization: "Bearer token-parent",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ file_name: "hacked.png" }),
    });
    expect(parentRes.status).toBe(404);

    const adminRes = await app.request(`/api/v1/assets/${ASSET_INSTITUTE}`, {
      method: "PATCH",
      headers: {
        Authorization: "Bearer token-admin",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ file_name: "updated.png" }),
    });
    expect(adminRes.status).toBe(200);
    expect((await json(adminRes)).data.fileName).toBe("updated.png");
  });

  it("teacher can soft-delete own private asset", async () => {
    const db = baseDb();
    const app = appWithDb(db);

    const res = await app.request(`/api/v1/assets/${ASSET_PRIVATE}`, {
      method: "DELETE",
      headers: { Authorization: "Bearer token-teacher" },
    });
    expect(res.status).toBe(200);
    expect((await json(res)).data.ok).toBe(true);

    const row = db.stored_asset.find((a) => a.id === ASSET_PRIVATE);
    expect(row?.deleted_at).toBeTruthy();
  });

  it("non-writer private owner cannot widen visibility (404)", async () => {
    const app = appWithDb(baseDb());

    const widen = await app.request(`/api/v1/assets/${ASSET_PARENT_PRIVATE}`, {
      method: "PATCH",
      headers: {
        Authorization: "Bearer token-parent",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ visibility: "institute" }),
    });
    expect(widen.status).toBe(404);

    const meta = await app.request(`/api/v1/assets/${ASSET_PARENT_PRIVATE}`, {
      method: "PATCH",
      headers: {
        Authorization: "Bearer token-parent",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ file_name: "renamed.pdf" }),
    });
    expect(meta.status).toBe(200);
    expect((await json(meta)).data.fileName).toBe("renamed.pdf");
  });

  it("uploads multipart file and mints signed URL; isolates cross-tenant", async () => {
    const app = appWithDb(baseDb());
    const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
    const form = new FormData();
    form.set("institute_id", INST_A);
    form.set("bucket", "institute-branding");
    form.set("category", "logo");
    form.set("file", new File([png], "logo.png", { type: "image/png" }));

    const uploaded = await app.request("/api/v1/assets/upload", {
      method: "POST",
      headers: { Authorization: "Bearer token-admin" },
      body: form,
    });
    expect(uploaded.status).toBe(201);
    const asset = (await json(uploaded)).data;
    expect(asset.bucket).toBe("institute-branding");
    expect(asset.objectPath).toContain(INST_A);

    const signed = await app.request(
      `/api/v1/assets/${asset.id}/signed-url`,
      { headers: { Authorization: "Bearer token-admin" } },
    );
    expect(signed.status).toBe(200);
    expect((await json(signed)).data.signedUrl).toContain("https://");

    expect(
      (
        await app.request(`/api/v1/assets/${ASSET_CROSS}/signed-url`, {
          headers: { Authorization: "Bearer token-admin" },
        })
      ).status,
    ).toBe(404);

    expect(
      (
        await app.request("/api/v1/assets/upload", {
          method: "POST",
          headers: { Authorization: "Bearer token-other" },
          body: form,
        })
      ).status,
    ).toBe(403);
  });

  it("allows upload when institute storage usage exceeds configured quota (monitoring-only)", async () => {
    const db = baseDb();
    db.storage_quota = [
      {
        id: "sq111111-1111-4111-8111-111111111111",
        plan: "core",
        limit_gb: 1,
        warning_pct: 80,
        updated_by_user_id: USER_ADMIN,
        created_at: "2026-08-01T00:00:00.000Z",
        updated_at: "2026-08-01T00:00:00.000Z",
        deleted_at: null,
      },
    ];
    // Already at 1 GB — upload must still succeed (quota is not hard-denied).
    db.stored_asset[0].byte_size = 1024 * 1024 * 1024;
    const app = appWithDb(db);

    const png = new Uint8Array([137, 80, 78, 71, 13, 10, 26, 10]);
    const form = new FormData();
    form.set("institute_id", INST_A);
    form.set("bucket", "institute-branding");
    form.set("category", "logo");
    form.set("file", new File([png], "logo.png", { type: "image/png" }));

    const uploaded = await app.request("/api/v1/assets/upload", {
      method: "POST",
      headers: { Authorization: "Bearer token-admin" },
      body: form,
    });
    expect(uploaded.status).toBe(201);
  });
});
