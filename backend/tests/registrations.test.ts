import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { createApp } from "../src/app.js";
import { loadEnv, resetEnvCache } from "../src/config/env.js";
import { createLogger } from "../src/logger/logger.js";
import {
  createMockSupabaseClients,
  emptyMockDb,
  type MockAuthUsersByEmail,
  type MockDb,
} from "./helpers/mock-supabase.js";

const silentLogger = createLogger("error");

const USER_A = "11111111-1111-4111-8111-111111111111";
const USER_B = "22222222-2222-4222-8222-222222222222";
const REG_A = "reg11111-1111-4111-8111-111111111111";
const REG_REJECTED = "reg22222-2222-4222-8222-222222222222";
const TOKEN_A = "token-user-a";
const TOKEN_B = "token-user-b";

const validPayload = {
  instituteName: "Test1School",
  instituteCode: "TEST1SCHOOL",
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

function baseDb(): MockDb {
  const db = emptyMockDb();
  db.user_profile = [
    {
      id: USER_A,
      display_name: "Applicant A",
      email: "applicant-a@example.com",
      phone: null,
      avatar_url: null,
      status: "active",
      deleted_at: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    },
    {
      id: USER_B,
      display_name: "Applicant B",
      email: "applicant-b@example.com",
      phone: null,
      avatar_url: null,
      status: "active",
      deleted_at: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-01T00:00:00.000Z",
    },
  ];
  db.institute_registration = [
    {
      id: REG_A,
      applicant_user_id: USER_A,
      applicant_name: "Applicant A",
      email: "applicant-a@example.com",
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

function appFor(
  db: MockDb,
  authUsersByEmail: MockAuthUsersByEmail = {},
  authPasswords: Record<string, string> = {},
) {
  const env = loadEnv();
  const supabase = createMockSupabaseClients({
    tokens: {
      [TOKEN_A]: USER_A,
      [TOKEN_B]: USER_B,
    },
    db,
    authUsersByEmail,
    authPasswords,
  });
  return createApp(env, silentLogger, supabase);
}

describe("POST /api/v1/registrations", () => {
  it("creates a pending registration without institute or privileged roles", async () => {
    const db = emptyMockDb();
    const authUsersByEmail: MockAuthUsersByEmail = {};
    const app = appFor(db, authUsersByEmail);

    const res = await app.request("/api/v1/registrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        applicant_name: "Anita Rao",
        email: "new.registrant@example.com",
        password: "SecurePass1!",
        phone: "+91 98765 43210",
        payload: validPayload,
      }),
    });

    expect(res.status).toBe(201);
    const body = await json(res);
    expect(body.data.status).toBe("pending");
    expect(body.data.instituteId).toBeNull();
    expect(body.data.email).toBe("new.registrant@example.com");
    expect(body.data.payload.instituteName).toBe(validPayload.instituteName);
    expect(body.data).not.toHaveProperty("password");

    expect(db.institute).toHaveLength(0);
    expect(db.platform_operator).toHaveLength(0);
    expect(db.membership).toHaveLength(0);
    expect(db.membership_role).toHaveLength(0);
    expect(db.institute_registration).toHaveLength(1);
    expect(db.institute_registration[0]?.status).toBe("pending");
    expect(db.user_profile).toHaveLength(1);
    expect(authUsersByEmail["new.registrant@example.com"]?.id).toBeTruthy();

    const storedPayload = db.institute_registration[0]?.payload as Record<string, unknown>;
    expect(storedPayload).not.toHaveProperty("password");
    expect(JSON.stringify(storedPayload)).not.toContain("SecurePass1!");
  });

  it("accepts a logo uploaded within the advertised 2 MiB limit", async () => {
    const db = emptyMockDb();
    const app = appFor(db, {});
    const logoPreview = `data:image/png;base64,${"A".repeat(2_800_000)}`;

    const res = await app.request("/api/v1/registrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        applicant_name: "Logo Applicant",
        email: "logo.applicant@example.com",
        password: "SecurePass1!",
        payload: { ...validPayload, logoPreview },
      }),
    });

    expect(res.status).toBe(201);
    expect(db.institute_registration[0]?.payload).toMatchObject({ logoPreview });
  });

  it("rejects duplicate email registration", async () => {
    const db = emptyMockDb();
    const authUsersByEmail: MockAuthUsersByEmail = {
      "taken@example.com": { id: USER_A },
    };
    const app = appFor(db, authUsersByEmail);

    const res = await app.request("/api/v1/registrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        applicant_name: "Someone",
        email: "taken@example.com",
        password: "SecurePass1!",
        payload: { instituteName: "Test School", instituteCode: "TESTSCHOOL" },
      }),
    });

    expect(res.status).toBe(409);
    expect(db.institute_registration).toHaveLength(0);
  });

  it("resumes the same pending registration after a post-create login failure", async () => {
    const db = baseDb();
    const authUsersByEmail: MockAuthUsersByEmail = {
      "applicant-a@example.com": { id: USER_A },
    };
    const app = appFor(db, authUsersByEmail, {
      "applicant-a@example.com": "SecurePass1!",
    });

    const res = await app.request("/api/v1/registrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        applicant_name: "Applicant A",
        email: "applicant-a@example.com",
        password: "SecurePass1!",
        payload: validPayload,
      }),
    });

    expect(res.status).toBe(201);
    const body = await json(res);
    expect(body.data.id).toBe(REG_A);
    expect(db.institute_registration).toHaveLength(1);
  });

  it("backfills profile and registration for an orphan Auth user on retry", async () => {
    const db = emptyMockDb();
    const authUsersByEmail: MockAuthUsersByEmail = {
      "orphan@example.com": { id: USER_A },
    };
    const app = appFor(db, authUsersByEmail, {
      "orphan@example.com": "SecurePass1!",
    });

    const res = await app.request("/api/v1/registrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        applicant_name: "Recovered Applicant",
        email: "orphan@example.com",
        password: "SecurePass1!",
        phone: "9876543210",
        payload: validPayload,
      }),
    });

    expect(res.status).toBe(201);
    expect(db.user_profile).toHaveLength(1);
    expect(db.user_profile[0]?.id).toBe(USER_A);
    expect(db.institute_registration).toHaveLength(1);
    expect(db.institute_registration[0]?.applicant_user_id).toBe(USER_A);
  });

  it.each([
    ["approved", "already has an approved institute registration"],
    ["rejected", "Sign in to review and resubmit"],
  ] as const)(
    "does not create a second registration when the existing one is %s",
    async (status, expectedMessage) => {
      const db = baseDb();
      db.institute_registration[0]!.status = status;
      const app = appFor(
        db,
        { "applicant-a@example.com": { id: USER_A } },
        { "applicant-a@example.com": "SecurePass1!" },
      );

      const res = await app.request("/api/v1/registrations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          applicant_name: "Applicant A",
          email: "applicant-a@example.com",
          password: "SecurePass1!",
          payload: validPayload,
        }),
      });

      expect(res.status).toBe(409);
      expect((await json(res)).error.message).toContain(expectedMessage);
      expect(db.institute_registration).toHaveLength(1);
    },
  );
});

describe("GET /api/v1/registrations/me", () => {
  it("returns 401 without authentication", async () => {
    const app = appFor(baseDb());
    const res = await app.request("/api/v1/registrations/me");
    expect(res.status).toBe(401);
  });

  it("returns only the authenticated user's registration", async () => {
    const app = appFor(baseDb());
    const res = await app.request("/api/v1/registrations/me", {
      headers: { Authorization: `Bearer ${TOKEN_A}` },
    });

    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.data.id).toBe(REG_A);
    expect(body.data.applicantUserId).toBe(USER_A);
    expect(body.data.status).toBe("pending");
    expect(body.data).not.toHaveProperty("password");
  });

  it("does not expose another user's registration via /me", async () => {
    const app = appFor(baseDb());
    const res = await app.request("/api/v1/registrations/me", {
      headers: { Authorization: `Bearer ${TOKEN_B}` },
    });

    expect(res.status).toBe(404);
  });
});

describe("POST /api/v1/registrations/me/resubmit", () => {
  function rejectedDb(): MockDb {
    const db = baseDb();
    db.institute_registration.push({
      id: REG_REJECTED,
      applicant_user_id: USER_B,
      applicant_name: "Applicant B",
      email: "applicant-b@example.com",
      phone: null,
      payload: {
        ...validPayload,
        instituteName: "Rejected School",
      },
      status: "rejected",
      reviewed_by: USER_A,
      reviewed_at: "2026-01-02T00:00:00.000Z",
      rejection_reason: "Incomplete documentation",
      institute_id: null,
      created_at: "2026-01-01T00:00:00.000Z",
      updated_at: "2026-01-02T00:00:00.000Z",
    });
    return db;
  }

  it("returns rejected registration back to pending for the same account", async () => {
    const db = rejectedDb();
    const app = appFor(db);

    const res = await app.request("/api/v1/registrations/me/resubmit", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN_B}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        payload: {
          ...validPayload,
          instituteName: "Rejected School Updated",
        },
      }),
    });

    expect(res.status).toBe(200);
    const body = await json(res);
    expect(body.data.status).toBe("pending");
    expect(body.data.rejectionReason).toBeNull();
    expect(body.data.payload.instituteName).toBe("Rejected School Updated");

    const row = db.institute_registration.find((r) => r.id === REG_REJECTED);
    expect(row?.status).toBe("pending");
    expect(row?.rejection_reason).toBeNull();
  });

  it("rejects resubmit when registration is still pending", async () => {
    const app = appFor(baseDb());
    const res = await app.request("/api/v1/registrations/me/resubmit", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${TOKEN_A}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        payload: validPayload,
      }),
    });
    expect(res.status).toBe(409);
  });
});

describe("registration security invariants", () => {
  it("does not create institute rows on registration", async () => {
    const db = emptyMockDb();
    const app = appFor(db, {});

    await app.request("/api/v1/registrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        applicant_name: "Owner",
        email: "owner@example.com",
        password: "SecurePass1!",
        payload: { instituteName: "Owner Institute", instituteCode: "OWNERINST" },
      }),
    });

    expect(db.institute).toHaveLength(0);
    expect(db.institute_settings).toHaveLength(0);
  });

  it("does not create platform_operator or institute_admin membership", async () => {
    const db = emptyMockDb();
    const app = appFor(db, {});

    await app.request("/api/v1/registrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        applicant_name: "Owner",
        email: "owner2@example.com",
        password: "SecurePass1!",
        payload: { instituteName: "Owner Institute 2", instituteCode: "OWNERINST2" },
      }),
    });

    expect(db.platform_operator).toHaveLength(0);
    expect(db.membership).toHaveLength(0);
    expect(db.membership_role).toHaveLength(0);
  });
});
