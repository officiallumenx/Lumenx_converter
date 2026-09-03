import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createApp } from "../src/app.js";
import { loadEnv, resetEnvCache } from "../src/config/env.js";
import { createLogger } from "../src/logger/logger.js";
import {
  createMockSupabaseClients,
  emptyMockDb,
  type MockDb,
} from "./helpers/mock-supabase.js";
import {
  STAFF_LOGIN_DEMO_OTP,
} from "../src/domains/access-roles/staff-otp.js";

const silentLogger = createLogger("error");

const INST_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const USER_ADMIN = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const TOKEN_ADMIN = "access-admin";

beforeEach(() => {
  resetEnvCache();
  vi.spyOn(process.stdout, "write").mockImplementation(() => true);
  vi.spyOn(process.stderr, "write").mockImplementation(() => true);
});

afterEach(() => {
  vi.restoreAllMocks();
});

function baseDb(): MockDb {
  const db = emptyMockDb();
  db.institute = [
    {
      id: INST_A,
      code: "DEMO",
      name: "Demo Institute",
      kind: "school",
      status: "active",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      deleted_at: null,
    },
  ];
  db.user_profile = [
    {
      id: USER_ADMIN,
      display_name: "Admin User",
      email: "admin@demo.edu",
      phone: "9876500001",
      avatar_url: null,
      status: "active",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      deleted_at: null,
    },
  ];
  db.membership = [
    {
      id: "mmmmmmmm-mmmm-4mmm-8mmm-mmmmmmmmmmmm",
      user_id: USER_ADMIN,
      institute_id: INST_A,
      status: "active",
      created_at: "2026-01-01T00:00:00Z",
      updated_at: "2026-01-01T00:00:00Z",
      deleted_at: null,
    },
  ];
  db.membership_role = [
    {
      membership_id: "mmmmmmmm-mmmm-4mmm-8mmm-mmmmmmmmmmmm",
      role_code: "institute_admin",
      created_at: "2026-01-01T00:00:00Z",
    },
  ];
  db.role = [
    {
      code: "institute_admin",
      label: "Institute Admin",
      description: null,
      is_assignable: true,
      created_at: "2026-01-01T00:00:00Z",
    },
    {
      code: "staff",
      label: "Staff",
      description: null,
      is_assignable: true,
      created_at: "2026-01-01T00:00:00Z",
    },
  ];
  return db;
}

function appWithDb(db: MockDb, authUsersByEmail?: Record<string, { id: string }>) {
  const env = loadEnv({ NODE_ENV: "test", LOG_LEVEL: "error" });
  return createApp(
    env,
    silentLogger,
    createMockSupabaseClients({
      db,
      tokens: { [TOKEN_ADMIN]: USER_ADMIN },
      authUsersByEmail: {
        "admin@demo.edu": { id: USER_ADMIN },
        ...authUsersByEmail,
      },
    }),
  );
}

describe("access roles API", () => {
  it("seeds system roles and creates a custom role", async () => {
    const app = appWithDb(baseDb());

    const list = await app.request(
      `/api/v1/access-roles?institute_id=${INST_A}`,
      { headers: { Authorization: `Bearer ${TOKEN_ADMIN}` } },
    );
    expect(list.status).toBe(200);
    const listed = (await list.json()) as { data: unknown[] };
    expect(listed.data.length).toBeGreaterThanOrEqual(7);

    const create = await app.request("/api/v1/access-roles", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN_ADMIN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        name: "Academics In-charge",
        scope: "Academics",
        description: "Custom academics role",
        permissions: {
          "/students": "full",
          "/teachers": "read",
          "/classes": "full",
        },
      }),
    });
    expect(create.status).toBe(201);
    const created = (await create.json()) as {
      data: { name: string; permissions: Record<string, string>; isSystem: boolean };
    };
    expect(created.data.name).toBe("Academics In-charge");
    expect(created.data.permissions["/students"]).toBe("full");
    expect(created.data.isSystem).toBe(false);
  });

  it("staff login request-otp + verify-login", async () => {
    const db = baseDb();
    const app = appWithDb(db);

    // Seed roles then create assignee via service path (API)
    await app.request(`/api/v1/access-roles?institute_id=${INST_A}`, {
      headers: { Authorization: `Bearer ${TOKEN_ADMIN}` },
    });
    const rolesRes = await app.request(
      `/api/v1/access-roles?institute_id=${INST_A}`,
      { headers: { Authorization: `Bearer ${TOKEN_ADMIN}` } },
    );
    const roles = ((await rolesRes.json()) as { data: Array<{ id: string; systemKey: string | null }> })
      .data;
    const financial = roles.find((r) => r.systemKey === "financial");
    expect(financial).toBeTruthy();

    const assign = await app.request("/api/v1/access-assignees", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN_ADMIN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        access_role_id: financial!.id,
        password: "Staff@1234",
        display_name: "Fee Clerk",
        email: "fees@demo.edu",
        phone: "9876509999",
      }),
    });
    expect(assign.status).toBe(201);

    const otpReq = await app.request("/api/v1/auth/staff/request-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        institute_id: INST_A,
        identifier: "fees@demo.edu",
      }),
    });
    expect(otpReq.status).toBe(200);
    const otpBody = (await otpReq.json()) as { data: { devOtp?: string } };
    expect(otpBody.data.devOtp).toBe(STAFF_LOGIN_DEMO_OTP);

    const bad = await app.request("/api/v1/auth/staff/verify-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        institute_id: INST_A,
        identifier: "fees@demo.edu",
        otp: STAFF_LOGIN_DEMO_OTP,
        password: "wrong",
      }),
    });
    expect(bad.status).toBe(400);

    // Re-request OTP after failed verify consumed the challenge
    await app.request("/api/v1/auth/staff/request-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        institute_id: INST_A,
        identifier: "fees@demo.edu",
      }),
    });

    const ok = await app.request("/api/v1/auth/staff/verify-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        institute_id: INST_A,
        identifier: "fees@demo.edu",
        otp: STAFF_LOGIN_DEMO_OTP,
        password: "Staff@1234",
      }),
    });
    expect(ok.status).toBe(200);
    const session = (await ok.json()) as {
      data: { access_token: string; institute_id: string };
    };
    expect(session.data.access_token).toMatch(/^access-/);
    expect(session.data.institute_id).toBe(INST_A);
  });

  it("lists institutes for staff login picker", async () => {
    const app = appWithDb(baseDb());
    const res = await app.request("/api/v1/auth/staff/institutes");
    expect(res.status).toBe(200);
    const body = (await res.json()) as {
      data: Array<{ id: string; name: string; code: string }>;
    };
    expect(body.data).toHaveLength(1);
    expect(body.data[0]?.name).toBe("Demo Institute");
    expect(body.data[0]?.code).toBe("DEMO");
  });

  it("login-mode: staff assignee requires OTP, institute admin does not", async () => {
    const db = baseDb();
    const app = appWithDb(db, {
      "admin@demo.edu": { id: USER_ADMIN },
    });

    await app.request(`/api/v1/access-roles?institute_id=${INST_A}`, {
      headers: { Authorization: `Bearer ${TOKEN_ADMIN}` },
    });
    const rolesRes = await app.request(
      `/api/v1/access-roles?institute_id=${INST_A}`,
      { headers: { Authorization: `Bearer ${TOKEN_ADMIN}` } },
    );
    const roles = ((await rolesRes.json()) as { data: Array<{ id: string; systemKey: string | null }> })
      .data;
    const financial = roles.find((r) => r.systemKey === "financial");
    const assign = await app.request("/api/v1/access-assignees", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN_ADMIN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        access_role_id: financial!.id,
        password: "Staff@1234",
        display_name: "Fee Clerk",
        email: "fees@demo.edu",
        phone: "9876509999",
      }),
    });
    expect(assign.status).toBe(201);

    const staffMode = await app.request("/api/v1/auth/staff/login-mode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        institute_id: INST_A,
        identifier: "fees@demo.edu",
      }),
    });
    expect(staffMode.status).toBe(200);
    const staffBody = (await staffMode.json()) as {
      data: { requiresOtp: boolean; displayName: string };
    };
    expect(staffBody.data.requiresOtp).toBe(true);
    expect(staffBody.data.displayName).toBe("Fee Clerk");

    const adminMode = await app.request("/api/v1/auth/staff/login-mode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        institute_id: INST_A,
        identifier: "admin@demo.edu",
      }),
    });
    expect(adminMode.status).toBe(200);
    const adminBody = (await adminMode.json()) as {
      data: { requiresOtp: boolean; displayName: string };
    };
    expect(adminBody.data.requiresOtp).toBe(false);
    expect(adminBody.data.displayName).toBe("Admin User");
  });

  it("password-login for institute-wide admin without OTP", async () => {
    const app = createApp(
      loadEnv({ NODE_ENV: "test", LOG_LEVEL: "error" }),
      silentLogger,
      createMockSupabaseClients({
        db: baseDb(),
        tokens: { [TOKEN_ADMIN]: USER_ADMIN },
        authUsersByEmail: {
          "admin@demo.edu": { id: USER_ADMIN },
        },
        authPasswords: {
          "admin@demo.edu": "Admin@1234",
        },
      }),
    );

    const bad = await app.request("/api/v1/auth/staff/password-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        institute_id: INST_A,
        identifier: "admin@demo.edu",
        password: "wrong",
      }),
    });
    expect(bad.status).toBe(400);

    const ok = await app.request("/api/v1/auth/staff/password-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        institute_id: INST_A,
        identifier: "admin@demo.edu",
        password: "Admin@1234",
      }),
    });
    expect(ok.status).toBe(200);
    const session = (await ok.json()) as {
      data: { access_token: string; institute_id: string; display_name: string };
    };
    expect(session.data.access_token).toMatch(/^access-/);
    expect(session.data.institute_id).toBe(INST_A);
    expect(session.data.display_name).toBe("Admin User");
  });

  it("rejects password-login for OTP-required staff assignees", async () => {
    const db = baseDb();
    const app = appWithDb(db);

    await app.request(`/api/v1/access-roles?institute_id=${INST_A}`, {
      headers: { Authorization: `Bearer ${TOKEN_ADMIN}` },
    });
    const rolesRes = await app.request(
      `/api/v1/access-roles?institute_id=${INST_A}`,
      { headers: { Authorization: `Bearer ${TOKEN_ADMIN}` } },
    );
    const roles = ((await rolesRes.json()) as { data: Array<{ id: string; systemKey: string | null }> })
      .data;
    const financial = roles.find((r) => r.systemKey === "financial");
    await app.request("/api/v1/access-assignees", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN_ADMIN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        access_role_id: financial!.id,
        password: "Staff@1234",
        display_name: "Fee Clerk",
        email: "fees@demo.edu",
      }),
    });

    const blocked = await app.request("/api/v1/auth/staff/password-login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        institute_id: INST_A,
        identifier: "fees@demo.edu",
        password: "Staff@1234",
      }),
    });
    expect(blocked.status).toBe(400);

    const otpBlocked = await app.request("/api/v1/auth/staff/request-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        institute_id: INST_A,
        identifier: "admin@demo.edu",
      }),
    });
    expect(otpBlocked.status).toBe(400);
  });

  it("returns effective permissions for custom role assignee", async () => {
    const db = baseDb();
    const tokens: Record<string, string> = { [TOKEN_ADMIN]: USER_ADMIN };
    const app = createApp(
      loadEnv({ NODE_ENV: "test", LOG_LEVEL: "error" }),
      silentLogger,
      createMockSupabaseClients({
        db,
        tokens,
        authUsersByEmail: {
          "admin@demo.edu": { id: USER_ADMIN },
        },
      }),
    );

    await app.request(`/api/v1/access-roles?institute_id=${INST_A}`, {
      headers: { Authorization: `Bearer ${TOKEN_ADMIN}` },
    });
    const rolesRes = await app.request(
      `/api/v1/access-roles?institute_id=${INST_A}`,
      { headers: { Authorization: `Bearer ${TOKEN_ADMIN}` } },
    );
    const roles = ((await rolesRes.json()) as { data: Array<{ id: string; systemKey: string | null; name: string }> })
      .data;
    const financial = roles.find((r) => r.systemKey === "financial");
    expect(financial).toBeTruthy();

    const assign = await app.request("/api/v1/access-assignees", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN_ADMIN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        institute_id: INST_A,
        access_role_id: financial!.id,
        password: "Staff@1234",
        display_name: "Fee Clerk",
        email: "fees@demo.edu",
      }),
    });
    expect(assign.status).toBe(201);
    const assignBody = (await assign.json()) as { data: { userId: string } };
    const staffToken = `access-${assignBody.data.userId}`;
    tokens[staffToken] = assignBody.data.userId;

    const permRes = await app.request(
      `/api/v1/me/access/permissions?institute_id=${INST_A}`,
      { headers: { Authorization: `Bearer ${staffToken}` } },
    );
    expect(permRes.status).toBe(200);
    const permBody = (await permRes.json()) as {
      data: {
        accessRoleSystemKey: string | null;
        instituteWide: boolean;
        permissions: Record<string, string>;
      };
    };
    expect(permBody.data.accessRoleSystemKey).toBe("financial");
    expect(permBody.data.instituteWide).toBe(false);
    expect(permBody.data.permissions["/fees"]).toBe("full");
  });
});
