import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createApp } from "../src/app.js";
import { loadEnv, resetEnvCache } from "../src/config/env.js";
import { createLogger } from "../src/logger/logger.js";
import {
  createMockSupabaseClients,
  emptyMockDb,
  type MockDb,
} from "./helpers/mock-supabase.js";
import { writableTrialSubscription } from "./helpers/subscription-fixture.js";
import { pickLatestPublishedPerFamily } from "../src/domains/platform-certificate-templates/service.js";
import type { PlatformCertificateTemplateRow } from "../src/domains/platform-certificate-templates/types.js";
import { makeMinimalPptxBytes } from "./helpers/minimal-pptx.js";

const silentLogger = createLogger("error");

const USER_ROOT = "11111111-1111-4111-8111-111111111111";
const USER_BILLING = "22222222-2222-4222-8222-222222222222";
const USER_ADMIN = "44444444-4444-4444-8444-444444444444";
const USER_OTHER = "55555555-5555-4555-8555-555555555555";
const INST_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const INST_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const MEMBER_ADMIN = "aa444444-4444-4444-8444-444444444444";
const MEMBER_OTHER = "aa555555-5555-4555-8555-555555555555";
const OP_ROOT = "c0111111-1111-4111-8111-111111111111";
const OP_BILLING = "c0222222-2222-4222-8222-222222222222";
const TPL_PUB = "ae111111-1111-4111-8111-111111111111";
const TPL_DRAFT = "ae222222-2222-4222-8222-222222222222";
const TPL_OLD = "ae333333-3333-4333-8333-333333333333";
const FAMILY_A = "af111111-1111-4111-8111-111111111111";

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

function platformRow(
  overrides: Partial<PlatformCertificateTemplateRow>,
): PlatformCertificateTemplateRow {
  const id = overrides.id ?? crypto.randomUUID();
  return {
    id,
    owner_scope: "platform",
    institute_id: null,
    type: "certificate",
    name: "Award Template",
    description: null,
    category: "academic",
    status: "draft",
    source: "custom",
    version: 1,
    family_id: id,
    preview_aspect: "a4",
    layout_mode: "pptx",
    blocks: [],
    visual_theme: null,
    visual_fields: null,
    tags: [],
    asset_path: null,
    file_name: null,
    file_byte_size: null,
    file_content_type: null,
    pptx_meta: {},
    created_by_user_id: USER_ROOT,
    created_at: "2026-10-01T00:00:00.000Z",
    updated_at: "2026-10-01T00:00:00.000Z",
    deleted_at: null,
    ...overrides,
  };
}

function baseDb(): MockDb {
  const db = emptyMockDb();
  db.user_profile = [
    { id: USER_ROOT, display_name: "Root", email: "root@x.com", status: "active", deleted_at: null },
    { id: USER_BILLING, display_name: "Billing", email: "bill@x.com", status: "active", deleted_at: null },
    { id: USER_ADMIN, display_name: "Admin", email: "a@x.com", status: "active", deleted_at: null },
    { id: USER_OTHER, display_name: "Other", email: "o@x.com", status: "active", deleted_at: null },
  ];
  db.platform_operator = [
    {
      id: OP_ROOT,
      user_id: USER_ROOT,
      role_code: "nexus_root",
      handle: "root",
      display_name: "Root",
      status: "active",
      deleted_at: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    },
    {
      id: OP_BILLING,
      user_id: USER_BILLING,
      role_code: "billing",
      handle: "billing",
      display_name: "Billing",
      status: "active",
      deleted_at: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    },
  ];
  db.membership = [
    { id: MEMBER_ADMIN, user_id: USER_ADMIN, institute_id: INST_A, status: "active", deleted_at: null },
    { id: MEMBER_OTHER, user_id: USER_OTHER, institute_id: INST_B, status: "active", deleted_at: null },
  ];
  db.membership_role = [
    { membership_id: MEMBER_ADMIN, role_code: "institute_admin" },
    { membership_id: MEMBER_OTHER, role_code: "institute_admin" },
  ];
  db.institute = [
    { id: INST_A, code: "A", name: "A", kind: "school", status: "active", deleted_at: null },
    { id: INST_B, code: "B", name: "B", kind: "school", status: "active", deleted_at: null },
  ];
  db.subscription = [
    writableTrialSubscription(INST_A, "s0111111-1111-4111-8111-111111111111"),
    writableTrialSubscription(INST_B, "s0222222-2222-4222-8222-222222222222"),
  ];
  db.template = [
    platformRow({
      id: TPL_PUB,
      family_id: FAMILY_A,
      name: "Published Award",
      status: "active",
      version: 2,
      asset_path: `platform/${TPL_PUB}/v2/award.pptx`,
      file_name: "award.pptx",
      file_byte_size: 1200,
      file_content_type:
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      pptx_meta: { format: "pptx", targets: [], mappings: [] },
    }),
    platformRow({
      id: TPL_OLD,
      family_id: FAMILY_A,
      name: "Published Award",
      status: "archived",
      version: 1,
      asset_path: `platform/${TPL_OLD}/v1/award.pptx`,
      file_name: "award.pptx",
      file_byte_size: 1000,
      file_content_type:
        "application/vnd.openxmlformats-officedocument.presentationml.presentation",
    }),
    platformRow({
      id: TPL_DRAFT,
      name: "Draft Award",
      status: "draft",
      version: 1,
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
        "token-root": USER_ROOT,
        "token-billing": USER_BILLING,
        "token-admin": USER_ADMIN,
        "token-other": USER_OTHER,
      },
      db,
    }),
  );
}

describe("platform certificate templates", () => {
  it("pickLatestPublishedPerFamily keeps highest active version only", () => {
    const rows = [
      platformRow({ id: "1", family_id: "f", version: 1, status: "active", name: "A" }),
      platformRow({ id: "2", family_id: "f", version: 3, status: "active", name: "A" }),
      platformRow({ id: "3", family_id: "f", version: 2, status: "archived", name: "A" }),
      platformRow({ id: "4", family_id: "g", version: 1, status: "draft", name: "B" }),
    ];
    const picked = pickLatestPublishedPerFamily(rows);
    expect(picked).toHaveLength(1);
    expect(picked[0]?.id).toBe("2");
  });

  it("Nexus root creates, uploads, publishes, and archives a template", async () => {
    const db = baseDb();
    const app = appWithDb(db);

    const created = await app.request("/api/nexus/certificate-templates", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-root",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "Sports Winner",
        category: "sports",
        pptx_meta: { targets: [{ id: "t1" }] },
      }),
    });
    expect(created.status).toBe(201);
    const createdBody = await json(created);
    const id = createdBody.data.id as string;
    expect(createdBody.data.status).toBe("draft");
    expect(createdBody.data.layoutMode).toBe("pptx");

    const pptx = makeMinimalPptxBytes();
    const form = new FormData();
    form.append(
      "file",
      new File([pptx], "sports.pptx", {
        type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      }),
    );
    const uploaded = await app.request(
      `/api/nexus/certificate-templates/${id}/upload`,
      {
        method: "POST",
        headers: { Authorization: "Bearer token-root" },
        body: form,
      },
    );
    expect(uploaded.status).toBe(200);
    expect((await json(uploaded)).data.hasFile).toBe(true);

    const published = await app.request(
      `/api/nexus/certificate-templates/${id}/publish`,
      {
        method: "POST",
        headers: { Authorization: "Bearer token-root" },
      },
    );
    expect(published.status).toBe(200);
    expect((await json(published)).data.status).toBe("active");

    const archived = await app.request(
      `/api/nexus/certificate-templates/${id}/archive`,
      {
        method: "POST",
        headers: { Authorization: "Bearer token-root" },
      },
    );
    expect(archived.status).toBe(200);
    expect((await json(archived)).data.status).toBe("archived");
  });

  it("blocks billing operator writes and institute admin Nexus list", async () => {
    const app = appWithDb(baseDb());

    const billingCreate = await app.request("/api/nexus/certificate-templates", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-billing",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: "Nope" }),
    });
    expect(billingCreate.status).toBe(403);

    const adminNexus = await app.request("/api/nexus/certificate-templates", {
      headers: { Authorization: "Bearer token-admin" },
    });
    expect(adminNexus.status).toBe(403);
  });

  it("requires auth for Nexus catalog and Admin published list", async () => {
    const app = appWithDb(baseDb());
    const nexus = await app.request("/api/nexus/certificate-templates");
    expect(nexus.status).toBe(401);
    const adminList = await app.request("/api/v1/certificates/platform-templates");
    expect(adminList.status).toBe(401);
  });

  it("Admin published list excludes drafts and older family versions", async () => {
    const app = appWithDb(baseDb());

    const res = await app.request("/api/v1/certificates/platform-templates", {
      headers: { Authorization: "Bearer token-admin" },
    });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].id).toBe(TPL_PUB);
    expect(body.data[0].version).toBe(2);
    expect(body.data[0].status).toBe("active");
  });

  it("Admin cannot read draft platform templates by id", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request(
      `/api/v1/certificates/platform-templates/${TPL_DRAFT}`,
      { headers: { Authorization: "Bearer token-admin" } },
    );
    expect(res.status).toBe(404);
  });

  it("Admin can mint signed URL for published platform templates", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request(
      `/api/v1/certificates/platform-templates/${TPL_PUB}/signed-url`,
      { headers: { Authorization: "Bearer token-admin" } },
    );
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.data.signedUrl).toContain("https://");
    expect(body.data.templateId).toBe(TPL_PUB);
  });

  it("rejects non-PPTX uploads", async () => {
    const db = baseDb();
    const app = appWithDb(db);
    const created = await app.request("/api/nexus/certificate-templates", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-root",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: "Bad file" }),
    });
    const id = (await json(created)).data.id as string;
    const form = new FormData();
    form.append(
      "file",
      new File([new Uint8Array([1])], "notes.pdf", { type: "application/pdf" }),
    );
    const uploaded = await app.request(
      `/api/nexus/certificate-templates/${id}/upload`,
      {
        method: "POST",
        headers: { Authorization: "Bearer token-root" },
        body: form,
      },
    );
    expect(uploaded.status).toBe(400);
  });

  it("blocks publish without a file and creates a new draft version", async () => {
    const app = appWithDb(baseDb());
    const publishDraft = await app.request(
      `/api/nexus/certificate-templates/${TPL_DRAFT}/publish`,
      {
        method: "POST",
        headers: { Authorization: "Bearer token-root" },
      },
    );
    expect(publishDraft.status).toBe(409);

    const versioned = await app.request(
      `/api/nexus/certificate-templates/${TPL_PUB}/new-version`,
      {
        method: "POST",
        headers: { Authorization: "Bearer token-root" },
      },
    );
    expect(versioned.status).toBe(201);
    const body = await json(versioned);
    expect(body.data.familyId).toBe(FAMILY_A);
    expect(body.data.version).toBe(3);
    expect(body.data.status).toBe("draft");
    expect(body.data.hasFile).toBe(false);
  });

  it("imports a fixture with base64 PPTX without wiping other rows", async () => {
    const db = baseDb();
    const before = db.template.length;
    const app = appWithDb(db);
    const bytes = makeMinimalPptxBytes();
    const res = await app.request("/api/nexus/certificate-templates/import", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-root",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "Imported",
        category: "imported",
        status: "draft",
        file_name: "imported.pptx",
        file_base64: bytes.toString("base64"),
        content_type:
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      }),
    });
    expect(res.status).toBe(201);
    const body = await json(res);
    expect(body.data.hasFile).toBe(true);
    expect(body.data.source).toBe("imported");
    expect(db.template.length).toBe(before + 1);
  });

  it("rejects invalid PPTX content on upload and import", async () => {
    const app = appWithDb(baseDb());
    const created = await app.request("/api/nexus/certificate-templates", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-root",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: "Bad content" }),
    });
    const id = (await json(created)).data.id as string;
    const form = new FormData();
    form.append(
      "file",
      new File([Buffer.from("%PDF-1.4 fake")], "bad.pptx", {
        type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      }),
    );
    const uploaded = await app.request(
      `/api/nexus/certificate-templates/${id}/upload`,
      {
        method: "POST",
        headers: { Authorization: "Bearer token-root" },
        body: form,
      },
    );
    expect(uploaded.status).toBe(400);

    const imported = await app.request("/api/nexus/certificate-templates/import", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-root",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: "Bad import",
        file_name: "bad.pptx",
        file_base64: Buffer.from("not-a-zip").toString("base64"),
      }),
    });
    expect(imported.status).toBe(400);
  });

  it("blocks re-upload when file exists, upload on archived, and delete of active", async () => {
    const app = appWithDb(baseDb());
    const pptx = makeMinimalPptxBytes();
    const form = () => {
      const f = new FormData();
      f.append(
        "file",
        new File([pptx], "award.pptx", {
          type: "application/vnd.openxmlformats-officedocument.presentationml.presentation",
        }),
      );
      return f;
    };

    const reupload = await app.request(
      `/api/nexus/certificate-templates/${TPL_PUB}/upload`,
      {
        method: "POST",
        headers: { Authorization: "Bearer token-root" },
        body: form(),
      },
    );
    expect(reupload.status).toBe(409);

    const archivedUpload = await app.request(
      `/api/nexus/certificate-templates/${TPL_OLD}/upload`,
      {
        method: "POST",
        headers: { Authorization: "Bearer token-root" },
        body: form(),
      },
    );
    expect(archivedUpload.status).toBe(409);

    const deleteActive = await app.request(
      `/api/nexus/certificate-templates/${TPL_PUB}`,
      {
        method: "DELETE",
        headers: { Authorization: "Bearer token-root" },
      },
    );
    expect(deleteActive.status).toBe(409);
  });

  it("soft-deletes archived templates and keeps published siblings", async () => {
    const db = baseDb();
    const totalBefore = db.template.length;
    const app = appWithDb(db);

    const del = await app.request(
      `/api/nexus/certificate-templates/${TPL_OLD}`,
      {
        method: "DELETE",
        headers: { Authorization: "Bearer token-root" },
      },
    );
    expect(del.status).toBe(200);

    const old = db.template.find((r) => r.id === TPL_OLD);
    expect(old?.deleted_at).toBeTruthy();
    const published = db.template.find((r) => r.id === TPL_PUB);
    expect(published?.deleted_at).toBeNull();
    expect(db.template.length).toBe(totalBefore);
  });

  it("publish archives prior active version in the same family", async () => {
    const db = baseDb();
    const draftId = "ae444444-4444-4444-8444-444444444444";
    db.template.push(
      platformRow({
        id: draftId,
        family_id: FAMILY_A,
        name: "Published Award",
        status: "draft",
        version: 3,
        asset_path: `platform/${draftId}/v3/award.pptx`,
        file_name: "award.pptx",
        file_byte_size: 1200,
        file_content_type:
          "application/vnd.openxmlformats-officedocument.presentationml.presentation",
      }),
    );
    const app = appWithDb(db);

    const published = await app.request(
      `/api/nexus/certificate-templates/${draftId}/publish`,
      {
        method: "POST",
        headers: { Authorization: "Bearer token-root" },
      },
    );
    expect(published.status).toBe(200);
    expect((await json(published)).data.status).toBe("active");
    expect(db.template.find((r) => r.id === TPL_PUB)?.status).toBe("archived");
    expect(db.template.find((r) => r.id === draftId)?.status).toBe("active");
  });
});
