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
const USER_BILLING = "22222222-2222-4222-8222-222222222222";
const OP_BILLING = "c0222222-2222-4222-8222-222222222222";
const INST_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const INST_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const MEMBER_ADMIN = "aa111111-1111-4111-8111-111111111111";
const MEMBER_OTHER = "aa444444-4444-4444-8444-444444444444";
const ASSET_A1 = "a0111111-1111-4111-8111-111111111111";
const ASSET_A2 = "a0222222-2222-4222-8222-222222222222";
const ASSET_B1 = "a0333333-3333-4333-8333-333333333333";

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
      id: USER_BILLING,
      display_name: "Billing",
      email: "b@x.com",
      status: "active",
      deleted_at: null,
    },
  ];
  db.platform_operator = [
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
  db.institute = [
    {
      id: INST_A,
      code: "LX-A",
      name: "Alpha School",
      kind: "school",
      status: "active",
      deleted_at: null,
    },
    {
      id: INST_B,
      code: "LX-B",
      name: "Beta School",
      kind: "school",
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
  ];
  db.membership_role = [
    { membership_id: MEMBER_ADMIN, role_code: "institute_admin" },
    { membership_id: MEMBER_OTHER, role_code: "institute_admin" },
  ];
  db.stored_asset = [
    {
      id: ASSET_A1,
      institute_id: INST_A,
      bucket: "institute-branding",
      object_path: "a/logo.png",
      category: "logo",
      file_name: "logo.png",
      content_type: "image/png",
      byte_size: 1024,
      checksum: null,
      visibility: "institute",
      status: "active",
      linked_entity_kind: null,
      linked_entity_id: null,
      owner_user_id: USER_ADMIN,
      created_by_user_id: USER_ADMIN,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      deleted_at: null,
    },
    {
      id: ASSET_A2,
      institute_id: INST_A,
      bucket: "generated-documents",
      object_path: "a/doc.pdf",
      category: "other",
      file_name: "doc.pdf",
      content_type: "application/pdf",
      byte_size: 2048,
      checksum: null,
      visibility: "institute",
      status: "active",
      linked_entity_kind: null,
      linked_entity_id: null,
      owner_user_id: USER_ADMIN,
      created_by_user_id: USER_ADMIN,
      created_at: "2026-01-02T00:00:00.000Z",
      updated_at: "2026-01-02T00:00:00.000Z",
      deleted_at: null,
    },
    {
      id: ASSET_B1,
      institute_id: INST_B,
      bucket: "institute-branding",
      object_path: "b/logo.png",
      category: "logo",
      file_name: "logo.png",
      content_type: "image/png",
      byte_size: 512,
      checksum: null,
      visibility: "institute",
      status: "active",
      linked_entity_kind: null,
      linked_entity_id: null,
      owner_user_id: USER_OTHER,
      created_by_user_id: USER_OTHER,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
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
        "token-other": USER_OTHER,
        "token-billing": USER_BILLING,
      },
      db,
    }),
  );
}

describe("storage usage api", () => {
  it("returns institute usage for member", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request(
      `/api/v1/storage/usage?institute_id=${INST_A}`,
      { headers: { Authorization: "Bearer token-admin" } },
    );
    expect(res.status).toBe(200);
    const body = (await json(res)).data;
    expect(body.totalAssets).toBe(2);
    expect(body.totalBytes).toBe(3072);
    expect(body.byCategory.length).toBeGreaterThan(0);
    expect(body.byBucket.length).toBeGreaterThan(0);
  });

  it("forbids cross-tenant institute usage", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request(
      `/api/v1/storage/usage?institute_id=${INST_A}`,
      { headers: { Authorization: "Bearer token-other" } },
    );
    expect(res.status).toBe(403);
  });

  it("returns network summary for platform operator", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request("/api/nexus/storage/summary", {
      headers: { Authorization: "Bearer token-billing" },
    });
    expect(res.status).toBe(200);
    const body = (await json(res)).data;
    expect(body.instituteCount).toBe(2);
    expect(body.totalAssets).toBe(3);
    expect(body.totalBytes).toBe(3584);
  });

  it("lists per-institute usage for platform operator", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request("/api/nexus/storage/institutes", {
      headers: { Authorization: "Bearer token-billing" },
    });
    expect(res.status).toBe(200);
    const rows = (await json(res)).data;
    expect(rows).toHaveLength(2);
    expect(rows[0].instituteId).toBe(INST_A);
    expect(rows[0].totalBytes).toBe(3072);
    expect(rows[0].instituteName).toBe("Alpha School");
  });

  it("rejects institute admin from nexus storage", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request("/api/nexus/storage/summary", {
      headers: { Authorization: "Bearer token-admin" },
    });
    expect(res.status).toBe(403);
  });
});
