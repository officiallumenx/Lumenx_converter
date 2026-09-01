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
const USER_OPS = "22222222-2222-4222-8222-222222222222";
const USER_BILLING = "33333333-3333-4333-8333-333333333333";
const USER_APPLICANT = "44444444-4444-4444-8444-444444444444";
const USER_ADMIN = "55555555-5555-4555-8555-555555555555";
const REG_PENDING = "a1111111-1111-4111-8111-111111111111";
const INST_EXISTING = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const MEMBER_ADMIN = "aa555555-5555-4555-8555-555555555555";

const TOKEN_ROOT = "token-root";
const TOKEN_OPS = "token-ops";
const TOKEN_BILLING = "token-billing";
const TOKEN_APPLICANT = "token-applicant";
const TOKEN_ADMIN = "token-admin";

const validPayload = {
  instituteName: "Greenfield Public School",
  instituteType: "School (K-12)",
  educationBoard: "CBSE",
  country: "India",
  state: "Karnataka",
  city: "Bengaluru",
  address: "45 Residency Road",
  pincode: "560025",
  principalName: "Anita Rao",
  principalEmail: "registrar@greenfield.edu.in",
  principalMobile: "9876543210",
};

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

function reviewDb(): MockDb {
  const db = emptyMockDb();
  db.user_profile = [
    {
      id: USER_ROOT,
      display_name: "Root",
      email: "root@x.com",
      phone: null,
      avatar_url: null,
      status: "active",
      deleted_at: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    },
    {
      id: USER_OPS,
      display_name: "Operations",
      email: "ops@x.com",
      phone: null,
      avatar_url: null,
      status: "active",
      deleted_at: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    },
    {
      id: USER_BILLING,
      display_name: "Billing",
      email: "bill@x.com",
      phone: null,
      avatar_url: null,
      status: "active",
      deleted_at: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    },
    {
      id: USER_APPLICANT,
      display_name: "Applicant",
      email: "applicant@example.com",
      phone: null,
      avatar_url: null,
      status: "active",
      deleted_at: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    },
    {
      id: USER_ADMIN,
      display_name: "Institute Admin",
      email: "admin@example.com",
      phone: null,
      avatar_url: null,
      status: "active",
      deleted_at: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    },
  ];
  db.platform_operator = [
    {
      id: "po-root",
      user_id: USER_ROOT,
      role_code: "nexus_root",
      handle: "root",
      display_name: "Root",
      status: "active",
      deleted_at: null,
    },
    {
      id: "po-ops",
      user_id: USER_OPS,
      role_code: "operations",
      handle: "ops",
      display_name: "Operations",
      status: "active",
      deleted_at: null,
    },
    {
      id: "po-billing",
      user_id: USER_BILLING,
      role_code: "billing",
      handle: "billing",
      display_name: "Billing",
      status: "active",
      deleted_at: null,
    },
  ];
  db.institute = [
    {
      id: INST_EXISTING,
      code: "LX-A",
      name: "Alpha",
      kind: "school",
      status: "active",
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
      deleted_at: null,
    },
  ];
  db.membership = [
    {
      id: MEMBER_ADMIN,
      user_id: USER_ADMIN,
      institute_id: INST_EXISTING,
      status: "active",
      deleted_at: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    },
  ];
  db.membership_role = [
    { membership_id: MEMBER_ADMIN, role_code: "institute_admin" },
  ];
  db.institute_registration = [
    {
      id: REG_PENDING,
      applicant_user_id: USER_APPLICANT,
      applicant_name: "Applicant",
      email: "applicant@example.com",
      phone: null,
      payload: validPayload,
      status: "pending",
      reviewed_by: null,
      reviewed_at: null,
      rejection_reason: null,
      institute_id: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    },
  ];
  return db;
}

function appFor(db: MockDb) {
  const env = loadEnv();
  return createApp(
    env,
    silentLogger,
    createMockSupabaseClients({
      tokens: {
        [TOKEN_ROOT]: USER_ROOT,
        [TOKEN_OPS]: USER_OPS,
        [TOKEN_BILLING]: USER_BILLING,
        [TOKEN_APPLICANT]: USER_APPLICANT,
        [TOKEN_ADMIN]: USER_ADMIN,
      },
      db,
    }),
  );
}

describe("GET /api/nexus/registrations", () => {
  it("lists registrations for authorized platform staff", async () => {
    const app = appFor(reviewDb());
    const res = await app.request("/api/nexus/registrations?status=pending", {
      headers: { Authorization: `Bearer ${TOKEN_ROOT}` },
    });
    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.data).toHaveLength(1);
    expect(body.data[0].status).toBe("pending");
  });

  it("rejects ordinary institute admin", async () => {
    const app = appFor(reviewDb());
    const res = await app.request("/api/nexus/registrations", {
      headers: { Authorization: `Bearer ${TOKEN_ADMIN}` },
    });
    expect(res.status).toBe(403);
  });
});

describe("POST /api/nexus/registrations/:id/approve", () => {
  it("approves pending registration and creates institute records", async () => {
    const db = reviewDb();
    const app = appFor(db);

    const res = await app.request(
      `/api/nexus/registrations/${REG_PENDING}/approve`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${TOKEN_OPS}` },
      },
    );

    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.data.status).toBe("approved");
    expect(body.data.instituteId).toBeTruthy();
    expect(body.data.reviewedBy).toBe(USER_OPS);

    expect(db.institute).toHaveLength(2);
    expect(db.institute_settings).toHaveLength(1);
    const seededProfile = (
      db.institute_settings[0]?.settings as { profile?: { name?: string; principal?: string } }
    )?.profile;
    expect(seededProfile?.name).toBe(validPayload.instituteName);
    expect(seededProfile?.principal).toBe(validPayload.principalName);
    expect(db.membership).toHaveLength(2);
    expect(db.membership_role.filter((r) => r.role_code === "institute_admin")).toHaveLength(2);
    expect(db.platform_operator).toHaveLength(3);
    expect(db.institute_registration[0]?.status).toBe("approved");
  });

  it("starts a 60-day trial subscription when institute is approved", async () => {
    const db = reviewDb();
    const app = appFor(db);

    const res = await app.request(
      `/api/nexus/registrations/${REG_PENDING}/approve`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${TOKEN_OPS}` },
      },
    );
    expect(res.status).toBe(200);
    const body = await json(res);
    const instituteId = body.data.instituteId as string;

    expect(db.subscription).toHaveLength(1);
    const sub = db.subscription[0];
    expect(sub?.institute_id).toBe(instituteId);
    expect(sub?.lifecycle_status).toBe("trial_active");
    expect(sub?.assigned_rate_inr).toBe(12);
    expect(sub?.trial_start_at).toBeTruthy();
    expect(sub?.trial_end_at).toBeTruthy();
    expect(sub?.grace_ends_at).toBeTruthy();
  });

  it("seeds default access roles when institute is approved", async () => {
    const db = reviewDb();
    const app = appFor(db);

    const res = await app.request(
      `/api/nexus/registrations/${REG_PENDING}/approve`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${TOKEN_OPS}` },
      },
    );
    expect(res.status).toBe(200);
    const body = await json(res);
    const instituteId = body.data.instituteId as string;

    const roles = db.institute_access_role.filter(
      (r) => r.institute_id === instituteId && r.deleted_at == null,
    );
    expect(roles.length).toBeGreaterThanOrEqual(7);
    expect(
      roles.some((r) => r.system_key === "principal_root"),
    ).toBe(true);
    expect(
      roles.some((r) => r.system_key === "attendance_coordinator"),
    ).toBe(true);
  });

  it("exposes institute_admin membership to applicant on GET /api/v1/me after approval", async () => {
    const db = reviewDb();
    const app = appFor(db);

    const approve = await app.request(
      `/api/nexus/registrations/${REG_PENDING}/approve`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${TOKEN_OPS}` },
      },
    );
    expect(approve.status).toBe(200);
    const approved = await json(approve);
    const instituteId = approved.data.instituteId as string;

    const me = await app.request("/api/v1/me", {
      headers: { Authorization: `Bearer ${TOKEN_APPLICANT}` },
    });
    expect(me.status).toBe(200);
    const meBody = await json(me);
    expect(meBody.data.institutes).toHaveLength(1);
    expect(meBody.data.institutes[0].instituteId).toBe(instituteId);
    expect(meBody.data.institutes[0].status).toBe("active");
    expect(meBody.data.institutes[0].roles).toContain("institute_admin");
  });

  it("rejects unauthorized platform role", async () => {
    const db = reviewDb();
    const app = appFor(db);
    const res = await app.request(
      `/api/nexus/registrations/${REG_PENDING}/approve`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${TOKEN_BILLING}` },
      },
    );
    expect(res.status).toBe(403);
    expect(db.institute).toHaveLength(1);
  });

  it("rejects applicant self-approval", async () => {
    const db = reviewDb();
    const app = appFor(db);
    const res = await app.request(
      `/api/nexus/registrations/${REG_PENDING}/approve`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${TOKEN_APPLICANT}` },
      },
    );
    expect(res.status).toBe(403);
    expect(db.institute).toHaveLength(1);
    expect(db.institute_registration[0]?.status).toBe("pending");
  });

  it("rejects ordinary institute admin", async () => {
    const db = reviewDb();
    const app = appFor(db);
    const res = await app.request(
      `/api/nexus/registrations/${REG_PENDING}/approve`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${TOKEN_ADMIN}` },
      },
    );
    expect(res.status).toBe(403);
  });

  it("is idempotent — double approval creates no duplicates", async () => {
    const db = reviewDb();
    const app = appFor(db);

    const first = await app.request(
      `/api/nexus/registrations/${REG_PENDING}/approve`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${TOKEN_ROOT}` },
      },
    );
    expect(first.status).toBe(200);
    const firstBody = await json(first);
    const instituteId = firstBody.data.instituteId;

    const second = await app.request(
      `/api/nexus/registrations/${REG_PENDING}/approve`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${TOKEN_ROOT}` },
      },
    );
    expect(second.status).toBe(200);
    const secondBody = await json(second);
    expect(secondBody.data.instituteId).toBe(instituteId);

    expect(db.institute).toHaveLength(2);
    expect(db.membership).toHaveLength(2);
    expect(
      db.membership_role.filter((r) => r.role_code === "institute_admin"),
    ).toHaveLength(2);
  });

  it("records platform audit event on approval", async () => {
    const db = reviewDb();
    const app = appFor(db);

    const res = await app.request(
      `/api/nexus/registrations/${REG_PENDING}/approve`,
      {
        method: "POST",
        headers: { Authorization: `Bearer ${TOKEN_ROOT}` },
      },
    );
    expect(res.status).toBe(200);

    const platformEvents = db.audit_event.filter((e) => e.scope === "platform");
    expect(platformEvents.some((e) => e.action === "registration_approved")).toBe(
      true,
    );
  });
});

describe("POST /api/nexus/registrations/:id/reject", () => {
  it("rejects pending registration without creating institute", async () => {
    const db = reviewDb();
    const app = appFor(db);

    const res = await app.request(
      `/api/nexus/registrations/${REG_PENDING}/reject`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${TOKEN_ROOT}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason: "Incomplete documentation" }),
      },
    );

    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.data.status).toBe("rejected");
    expect(body.data.rejectionReason).toBe("Incomplete documentation");
    expect(body.data.instituteId).toBeNull();
    expect(db.institute).toHaveLength(1);
    expect(db.membership).toHaveLength(1);

    const platformEvents = db.audit_event.filter((e) => e.scope === "platform");
    expect(platformEvents.some((e) => e.action === "registration_rejected")).toBe(
      true,
    );
  });

  it("prevents applicant self-review", async () => {
    const db = reviewDb();
    const app = appFor(db);
    const res = await app.request(
      `/api/nexus/registrations/${REG_PENDING}/reject`,
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${TOKEN_APPLICANT}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ reason: "Self reject" }),
      },
    );
    expect(res.status).toBe(403);
    expect(db.institute_registration[0]?.status).toBe("pending");
  });
});
