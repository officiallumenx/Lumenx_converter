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

const USER_ROOT = "11111111-1111-4111-8111-111111111111";
const USER_SUPPORT = "33333333-3333-4333-8333-333333333333";
const USER_BILLING = "22222222-2222-4222-8222-222222222222";
const USER_ANALYST = "66666666-6666-4666-8666-666666666666";
const USER_ADMIN = "44444444-4444-4444-8444-444444444444";
const USER_ADMIN_B = "55555555-5555-4555-8555-555555555555";
const INST_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const INST_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const MEMBER_ADMIN = "aa444444-4444-4444-8444-444444444444";
const MEMBER_ADMIN_B = "bb555555-5555-4555-8555-555555555555";
const OP_ROOT = "c0111111-1111-4111-8111-111111111111";
const OP_SUPPORT = "c0333333-3333-4333-8333-333333333333";
const OP_BILLING = "c0222222-2222-4222-8222-222222222222";
const OP_ANALYST = "c0666666-6666-4666-8666-666666666666";
const MISSING_ID = "ffffffff-ffff-4fff-8fff-ffffffffffff";

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
      id: USER_ROOT,
      display_name: "Root",
      email: "root@x.com",
      status: "active",
      deleted_at: null,
    },
    {
      id: USER_SUPPORT,
      display_name: "Support",
      email: "sup@x.com",
      status: "active",
      deleted_at: null,
    },
    {
      id: USER_BILLING,
      display_name: "Billing",
      email: "bill@x.com",
      status: "active",
      deleted_at: null,
    },
    {
      id: USER_ANALYST,
      display_name: "Analyst",
      email: "an@x.com",
      status: "active",
      deleted_at: null,
    },
    {
      id: USER_ADMIN,
      display_name: "Admin A",
      email: "a@x.com",
      status: "active",
      deleted_at: null,
    },
    {
      id: USER_ADMIN_B,
      display_name: "Admin B",
      email: "b@x.com",
      status: "active",
      deleted_at: null,
    },
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
      id: OP_SUPPORT,
      user_id: USER_SUPPORT,
      role_code: "support",
      handle: "support",
      display_name: "Support",
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
    {
      id: OP_ANALYST,
      user_id: USER_ANALYST,
      role_code: "analyst",
      handle: "analyst",
      display_name: "Analyst",
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
      name: "Alpha",
      kind: "school",
      status: "active",
      deleted_at: null,
    },
    {
      id: INST_B,
      code: "LX-B",
      name: "Beta",
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
      id: MEMBER_ADMIN_B,
      user_id: USER_ADMIN_B,
      institute_id: INST_B,
      status: "active",
      deleted_at: null,
    },
  ];
  db.membership_role = [
    { membership_id: MEMBER_ADMIN, role_code: "institute_admin" },
    { membership_id: MEMBER_ADMIN_B, role_code: "institute_admin" },
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
        "token-support": USER_SUPPORT,
        "token-billing": USER_BILLING,
        "token-analyst": USER_ANALYST,
        "token-admin": USER_ADMIN,
        "token-admin-b": USER_ADMIN_B,
      },
      db,
    }),
  );
}

const createBody = {
  institute_id: INST_A,
  subject: "Billing shows overdue",
  category: "issue",
  body: "Please confirm our transfer.",
};

describe("nexus support api", () => {
  it("allows institute admin to create and list own threads", async () => {
    const app = appWithDb(baseDb());

    const created = await app.request("/api/nexus/support/threads", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-admin",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(createBody),
    });
    expect(created.status).toBe(201);
    const thread = (await json(created)).data;
    expect(thread.status).toBe("open");
    expect(thread.messages).toHaveLength(1);
    expect(thread.messages[0].authorRole).toBe("institute");

    const list = await app.request(
      `/api/nexus/support/threads?institute_id=${INST_A}`,
      { headers: { Authorization: "Bearer token-admin" } },
    );
    expect(list.status).toBe(200);
    expect((await json(list)).data).toHaveLength(1);
  });

  it("hides other institute threads with 404", async () => {
    const app = appWithDb(baseDb());

    const created = await app.request("/api/nexus/support/threads", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-admin",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(createBody),
    });
    const thread = (await json(created)).data;

    const crossList = await app.request(
      `/api/nexus/support/threads?institute_id=${INST_A}`,
      { headers: { Authorization: "Bearer token-admin-b" } },
    );
    expect(crossList.status).toBe(404);

    const crossGet = await app.request(
      `/api/nexus/support/threads/${thread.id}`,
      { headers: { Authorization: "Bearer token-admin-b" } },
    );
    expect(crossGet.status).toBe(404);
  });

  it("support role replies and posts internal notes; institute never sees notes", async () => {
    const app = appWithDb(baseDb());

    const created = await app.request("/api/nexus/support/threads", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-admin",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        subject: "Billing shows overdue",
        category: "issue",
        body: "Please confirm our transfer.",
      }),
    });
    const thread = (await json(created)).data;
    expect(thread.priority).toBe("medium");

    const reply = await app.request(
      `/api/nexus/support/threads/${thread.id}/messages`,
      {
        method: "POST",
        headers: {
          Authorization: "Bearer token-support",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ body: "We are matching the UTR." }),
      },
    );
    expect(reply.status).toBe(201);
    const afterReply = (await json(reply)).data;
    expect(afterReply.status).toBe("in_progress");
    expect(afterReply.messages).toHaveLength(2);
    const lastMessageAt = afterReply.lastMessageAt;

    const note = await app.request(
      `/api/nexus/support/threads/${thread.id}/notes`,
      {
        method: "POST",
        headers: {
          Authorization: "Bearer token-support",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ body: "Escalate to finance EOD." }),
      },
    );
    expect(note.status).toBe(201);
    const withNote = (await json(note)).data;
    expect(withNote.messages.some((m: { isInternal: boolean }) => m.isInternal))
      .toBe(true);
    expect(withNote.lastMessageAt).toBe(lastMessageAt);

    const instituteView = await app.request(
      `/api/nexus/support/threads/${thread.id}`,
      { headers: { Authorization: "Bearer token-admin" } },
    );
    expect(instituteView.status).toBe(200);
    const visible = (await json(instituteView)).data;
    expect(visible.messages.every((m: { isInternal: boolean }) => !m.isInternal))
      .toBe(true);
    expect(visible.messages).toHaveLength(2);
    expect(visible.lastMessageAt).toBe(lastMessageAt);

    const billingView = await app.request(
      `/api/nexus/support/threads/${thread.id}`,
      { headers: { Authorization: "Bearer token-billing" } },
    );
    expect(billingView.status).toBe(200);
    const billingData = (await json(billingView)).data;
    expect(
      billingData.messages.every((m: { isInternal: boolean }) => !m.isInternal),
    ).toBe(true);
    expect(billingData.messages).toHaveLength(2);
  });

  it("rejects institute priority on create", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request("/api/nexus/support/threads", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-admin",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ ...createBody, priority: "high" }),
    });
    expect(res.status).toBe(403);
  });

  it("billing and analyst can list but not create or reply", async () => {
    const app = appWithDb(baseDb());

    for (const token of ["token-billing", "token-analyst"] as const) {
      const list = await app.request(
        `/api/nexus/support/threads?institute_id=${INST_A}`,
        { headers: { Authorization: `Bearer ${token}` } },
      );
      expect(list.status).toBe(200);

      const create = await app.request("/api/nexus/support/threads", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify(createBody),
      });
      expect(create.status).toBe(403);
    }
  });

  it("assigns thread and soft-deletes as platform writer", async () => {
    const app = appWithDb(baseDb());

    const created = await app.request("/api/nexus/support/threads", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-support",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        ...createBody,
        author_role: "institute",
      }),
    });
    expect(created.status).toBe(201);
    const thread = (await json(created)).data;

    const patched = await app.request(
      `/api/nexus/support/threads/${thread.id}`,
      {
        method: "PATCH",
        headers: {
          Authorization: "Bearer token-support",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ assignee_handle: "support.maya" }),
      },
    );
    expect(patched.status).toBe(200);
    const data = (await json(patched)).data;
    expect(data.assigneeHandle).toBe("support.maya");
    expect(data.status).toBe("in_progress");

    const del = await app.request(`/api/nexus/support/threads/${thread.id}`, {
      method: "DELETE",
      headers: { Authorization: "Bearer token-root" },
    });
    expect(del.status).toBe(200);

    const get = await app.request(`/api/nexus/support/threads/${thread.id}`, {
      headers: { Authorization: "Bearer token-support" },
    });
    expect(get.status).toBe(404);
  });

  it("returns 404 for missing thread", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request(`/api/nexus/support/threads/${MISSING_ID}`, {
      headers: { Authorization: "Bearer token-support" },
    });
    expect(res.status).toBe(404);
  });

  it("rejects institute internal-note attempts with 403", async () => {
    const app = appWithDb(baseDb());
    const created = await app.request("/api/nexus/support/threads", {
      method: "POST",
      headers: {
        Authorization: "Bearer token-admin",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(createBody),
    });
    const thread = (await json(created)).data;

    const note = await app.request(
      `/api/nexus/support/threads/${thread.id}/notes`,
      {
        method: "POST",
        headers: {
          Authorization: "Bearer token-admin",
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ body: "secret" }),
      },
    );
    expect(note.status).toBe(403);
  });
});
