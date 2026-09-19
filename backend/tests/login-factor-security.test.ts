import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { loadEnv } from "../src/config/env.js";
import { createLogger } from "../src/logger/logger.js";
import type { FirebaseIdentity } from "../src/auth/firebase-identity.js";
import {
  completeNexusFirebaseLogin,
} from "../src/domains/auth-credentials/nexus-login.js";
import { WORKFLOW_DEMO_OTP } from "../src/domains/auth-credentials/workflow-otp.js";
import {
  completeConnectFirebaseLogin,
  resolveConnectLoginMode,
} from "../src/domains/auth-credentials/connect-login.js";
import {
  createMockSupabaseClients,
  emptyMockDb,
} from "./helpers/mock-supabase.js";

const instituteId = "00000000-0000-4000-8000-000000000001";
const operatorId = "00000000-0000-4000-8000-000000000101";
const teacherId = "00000000-0000-4000-8000-000000000102";
const now = new Date().toISOString();

function profile(id: string, email: string, phone: string) {
  return {
    id,
    display_name: "Test User",
    email,
    phone,
    phone_digits: phone,
    status: "active",
    deleted_at: null,
    firebase_uid: null,
    firebase_linked_at: null,
    username: null,
    pin_hash: null,
    pin_salt: null,
    pin_set_at: null,
    first_login_completed_at: null,
    phone_verified_at: null,
    email_verified_at: null,
    created_at: now,
    updated_at: now,
  };
}

function firebaseIdentity(input: {
  uid?: string;
  email?: string;
  phone?: string;
  provider: "password" | "phone";
}): FirebaseIdentity {
  return {
    uid: input.uid ?? "firebase-user",
    email: input.email ?? null,
    emailVerified: Boolean(input.email),
    phoneNumber: input.phone ?? null,
    name: null,
    picture: null,
    authTime: null,
    expiresAt: null,
    issuedAt: null,
    claims: {
      uid: input.uid ?? "firebase-user",
      aud: "test",
      auth_time: 1,
      exp: 2,
      firebase: {
        identities: {},
        sign_in_provider: input.provider,
      },
      iat: 1,
      iss: "test",
      sub: input.uid ?? "firebase-user",
    },
  };
}

describe("server-consumed Nexus factors", () => {
  it("rejects forged client OTP booleans", async () => {
    const db = emptyMockDb();
    db.user_profile.push(profile(operatorId, "operator@test.edu", "9876543210"));
    db.platform_operator.push({
      user_id: operatorId,
      handle: "operator",
      display_name: "Operator",
      status: "active",
      role_code: "super_admin",
    });
    const app = createApp(
      loadEnv({ NODE_ENV: "test", LOG_LEVEL: "error" }),
      createLogger("error"),
      createMockSupabaseClients({
        db,
        tokens: {},
        authUsersByEmail: { "operator@test.edu": { id: operatorId } },
        authPasswords: { "operator@test.edu": "correct-password" },
      }),
    );
    const response = await app.request("/api/v1/auth/nexus/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identifier: "operator@test.edu",
        username: "operator",
        pin: "1234",
        password: "correct-password",
        mobile_otp_verified: true,
        email_otp_verified: true,
      }),
    });
    expect(response.status).toBe(400);
    expect(await response.text()).toMatch(/mobile_otp_grant|Required/i);

    const wrongPassword = await app.request("/api/v1/auth/nexus/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identifier: "operator@test.edu",
        username: "operator",
        pin: "1234",
        password: "wrong-password",
        mobile_otp_grant: "a".repeat(64),
        email_otp_grant: "b".repeat(64),
      }),
    });
    expect(wrongPassword.status).toBe(400);
    expect(await wrongPassword.text()).toContain("Incorrect password");

    const missingPassword = await app.request("/api/v1/auth/nexus/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identifier: "operator@test.edu",
        username: "operator",
        pin: "1234",
        mobile_otp_grant: "a".repeat(64),
        email_otp_grant: "b".repeat(64),
      }),
    });
    expect(missingPassword.status).toBe(400);
  });

  it("accepts only server-issued one-use grants for first login", async () => {
    const db = emptyMockDb();
    db.user_profile.push(profile(operatorId, "operator@test.edu", "9876543210"));
    db.platform_operator.push({
      user_id: operatorId,
      handle: "operator",
      display_name: "Operator",
      status: "active",
      role_code: "super_admin",
    });
    const app = createApp(
      loadEnv({ NODE_ENV: "test", LOG_LEVEL: "error" }),
      createLogger("error"),
      createMockSupabaseClients({
        db,
        tokens: {},
        authUsersByEmail: { "operator@test.edu": { id: operatorId } },
        authPasswords: { "operator@test.edu": "correct-password" },
      }),
    );
    const grants: Record<string, string> = {};
    for (const channel of ["mobile", "email"] as const) {
      await app.request("/api/v1/auth/nexus/request-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ identifier: "operator@test.edu", channel }),
      });
      const verified = await app.request("/api/v1/auth/nexus/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: "operator@test.edu",
          channel,
          otp: WORKFLOW_DEMO_OTP,
        }),
      });
      expect(verified.status).toBe(200);
      const body = (await verified.json()) as { data: { grant: string } };
      grants[channel] = body.data.grant;

      const replay = await app.request("/api/v1/auth/nexus/verify-otp", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identifier: "operator@test.edu",
          channel,
          otp: WORKFLOW_DEMO_OTP,
        }),
      });
      expect(replay.status).toBe(400);
      expect(await replay.text()).toMatch(/incorrect or expired/i);
    }
    const login = await app.request("/api/v1/auth/nexus/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        identifier: "operator@test.edu",
        username: "operator",
        pin: "1234",
        password: "correct-password",
        mobile_otp_grant: grants.mobile,
        email_otp_grant: grants.email,
      }),
    });
    expect(login.status).toBe(200);
    expect(
      db.auth_verification_grant.every((grant) => Boolean(grant.consumed_at)),
    ).toBe(true);
  });

  it("rejects a valid Firebase token for a non-operator", async () => {
    const db = emptyMockDb();
    db.user_profile.push(profile(operatorId, "user@test.edu", "9876543210"));
    const clients = createMockSupabaseClients({ db, tokens: {} });
    await expect(
      completeNexusFirebaseLogin(
        clients.admin,
        firebaseIdentity({ email: "user@test.edu", provider: "password" }),
        {
          provider: "password",
          pin: "1234",
          mobileOtpGrant: "a".repeat(64),
          emailOtpGrant: "b".repeat(64),
        },
      ),
    ).rejects.toMatchObject({ status: 403 });
  });

  it("requires the declared Firebase provider and PIN", async () => {
    const db = emptyMockDb();
    db.user_profile.push(profile(operatorId, "operator@test.edu", "9876543210"));
    db.platform_operator.push({
      user_id: operatorId,
      handle: "operator",
      display_name: "Operator",
      status: "active",
      role_code: "super_admin",
    });
    const clients = createMockSupabaseClients({
      db,
      tokens: {},
      authUsersByEmail: { "operator@test.edu": { id: operatorId } },
      authPasswords: { "operator@test.edu": "correct-password" },
    });
    await expect(
      completeNexusFirebaseLogin(
        clients.admin,
        firebaseIdentity({ email: "operator@test.edu", provider: "password" }),
        {
          provider: "phone",
          pin: "1234",
          mobileOtpGrant: "a".repeat(64),
          emailOtpGrant: "b".repeat(64),
        },
      ),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      completeNexusFirebaseLogin(
        clients.admin,
        firebaseIdentity({ email: "operator@test.edu", provider: "password" }),
        {
          provider: "password",
          pin: "",
          mobileOtpGrant: "a".repeat(64),
          emailOtpGrant: "b".repeat(64),
        },
      ),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      completeNexusFirebaseLogin(
        clients.admin,
        firebaseIdentity({ phone: "+919876543210", provider: "phone" }),
        {
          provider: "phone",
          pin: "1234",
        },
      ),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      completeNexusFirebaseLogin(
        clients.admin,
        firebaseIdentity({ phone: "+919876543210", provider: "phone" }),
        {
          provider: "phone",
          pin: "1234",
          password: "wrong-password",
        },
      ),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("rejects disabled profiles and disabled operators", async () => {
    const disabledProfileDb = emptyMockDb();
    disabledProfileDb.user_profile.push({
      ...profile(operatorId, "operator@test.edu", "9876543210"),
      status: "disabled",
    });
    disabledProfileDb.platform_operator.push({
      user_id: operatorId,
      handle: "operator",
      display_name: "Operator",
      status: "active",
      role_code: "super_admin",
    });
    await expect(
      completeNexusFirebaseLogin(
        createMockSupabaseClients({ db: disabledProfileDb, tokens: {} }).admin,
        firebaseIdentity({ email: "operator@test.edu", provider: "password" }),
        {
          provider: "password",
          pin: "1234",
          mobileOtpGrant: "a".repeat(64),
          emailOtpGrant: "b".repeat(64),
        },
      ),
    ).rejects.toMatchObject({ status: 403 });

    const disabledOperatorDb = emptyMockDb();
    disabledOperatorDb.user_profile.push(
      profile(operatorId, "operator@test.edu", "9876543210"),
    );
    disabledOperatorDb.platform_operator.push({
      user_id: operatorId,
      handle: "operator",
      display_name: "Operator",
      status: "disabled",
      role_code: "super_admin",
    });
    await expect(
      completeNexusFirebaseLogin(
        createMockSupabaseClients({ db: disabledOperatorDb, tokens: {} }).admin,
        firebaseIdentity({ email: "operator@test.edu", provider: "password" }),
        {
          provider: "password",
          pin: "1234",
          mobileOtpGrant: "a".repeat(64),
          emailOtpGrant: "b".repeat(64),
        },
      ),
    ).rejects.toMatchObject({ status: 403 });
  });
});

describe("Connect passwordless role and factor enforcement", () => {
  function teacherDb() {
    const db = emptyMockDb();
    db.institute.push({
      id: instituteId,
      code: "TEST",
      name: "Test Institute",
      kind: "school",
      status: "active",
      deleted_at: null,
      created_at: now,
      updated_at: now,
    });
    db.user_profile.push(profile(teacherId, "teacher@test.edu", "9123456780"));
    db.membership.push({
      id: "00000000-0000-4000-8000-000000000201",
      user_id: teacherId,
      institute_id: instituteId,
      status: "active",
      deleted_at: null,
    });
    // Connect teacher login resolves via public.teacher phone + user_profile_id.
    db.teacher.push({
      id: "00000000-0000-4000-8000-000000000401",
      institute_id: instituteId,
      user_profile_id: teacherId,
      display_name: "Test Teacher",
      phone: "9123456780",
      email: "teacher@test.edu",
      status: "active",
      deleted_at: null,
      created_at: now,
      updated_at: now,
    });
    return db;
  }

  it("rejects role mismatch", async () => {
    const db = teacherDb();
    db.membership_role.push({
      membership_id: "00000000-0000-4000-8000-000000000201",
      role_code: "student",
      created_at: now,
    });
    const clients = createMockSupabaseClients({ db, tokens: {} });
    await expect(
      completeConnectFirebaseLogin(
        clients.admin,
        firebaseIdentity({ phone: "+919123456780", provider: "phone" }),
        { instituteId, role: "teacher", pin: "1234" },
      ),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("rejects login when the selected institute is disabled", async () => {
    const db = teacherDb();
    db.institute[0]!.status = "disabled";
    db.membership_role.push({
      membership_id: "00000000-0000-4000-8000-000000000201",
      role_code: "teacher",
      created_at: now,
    });
    const clients = createMockSupabaseClients({ db, tokens: {} });
    await expect(
      completeConnectFirebaseLogin(
        clients.admin,
        firebaseIdentity({ phone: "+919123456780", provider: "phone" }),
        { instituteId, role: "teacher", pin: "1234" },
      ),
    ).rejects.toMatchObject({ status: 400 });
  });

  it("requires Firebase phone OTP on first login and PIN-only thereafter", async () => {
    const db = teacherDb();
    db.membership_role.push({
      membership_id: "00000000-0000-4000-8000-000000000201",
      role_code: "teacher",
      created_at: now,
    });
    const clients = createMockSupabaseClients({
      db,
      tokens: {},
      authUsersByEmail: { "teacher@test.edu": { id: teacherId } },
    });
    const identity = firebaseIdentity({
      phone: "+919123456780",
      provider: "phone",
    });
    const initialMode = await resolveConnectLoginMode(clients.admin, {
      instituteId,
      role: "teacher",
      phone: "9123456780",
    });
    expect(initialMode).toMatchObject({
      mode: "first_login_otp",
      firstLogin: true,
      requiresOtp: true,
      requiresPin: true,
    });
    expect(initialMode).not.toHaveProperty("displayName");
    await expect(
      completeConnectFirebaseLogin(clients.admin, identity, {
        instituteId,
        role: "teacher",
      }),
    ).rejects.toMatchObject({ status: 400 });

    const first = await completeConnectFirebaseLogin(clients.admin, identity, {
      instituteId,
      role: "teacher",
      pin: "1234",
    });
    expect(first.role).toBe("teacher");
    expect(db.connect_login_credential).toHaveLength(1);
    const returningMode = await resolveConnectLoginMode(clients.admin, {
      instituteId,
      role: "teacher",
      phone: "9123456780",
    });
    expect(returningMode).toMatchObject({
      mode: "returning_pin",
      firstLogin: false,
      requiresOtp: false,
      requiresPin: true,
    });
    expect(returningMode).not.toHaveProperty("displayName");

    await expect(
      completeConnectFirebaseLogin(clients.admin, identity, {
        instituteId,
        role: "teacher",
        pin: "9999",
      }),
    ).rejects.toMatchObject({ status: 400 });

    const app = createApp(
      loadEnv({ NODE_ENV: "test", LOG_LEVEL: "error" }),
      createLogger("error"),
      clients,
    );
    const returning = await app.request("/api/v1/auth/connect/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        institute_id: instituteId,
        role: "teacher",
        phone: "+91 91234 56780",
        pin: "1234",
      }),
    });
    expect(returning.status).toBe(200);
    const body = (await returning.json()) as { data: { access_token: string } };
    expect(body.data.access_token).toBe(`access-${teacherId}`);
  });

  it("scopes PIN credentials by institute and role", async () => {
    const db = teacherDb();
    db.membership_role.push({
      membership_id: "00000000-0000-4000-8000-000000000201",
      role_code: "teacher",
      created_at: now,
    });
    const clients = createMockSupabaseClients({
      db,
      tokens: {},
      authUsersByEmail: { "teacher@test.edu": { id: teacherId } },
    });
    await completeConnectFirebaseLogin(
      clients.admin,
      firebaseIdentity({ phone: "+919123456780", provider: "phone" }),
      { instituteId, role: "teacher", pin: "1234" },
    );

    const app = createApp(
      loadEnv({ NODE_ENV: "test", LOG_LEVEL: "error" }),
      createLogger("error"),
      clients,
    );
    const wrongRole = await app.request("/api/v1/auth/connect/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        institute_id: instituteId,
        role: "student",
        phone: "9123456780",
        pin: "1234",
      }),
    });
    expect(wrongRole.status).toBe(400);
    expect(await wrongRole.text()).toContain("Unable to sign in");
  });

  it("durably locks a credential after five failed PIN attempts", async () => {
    const db = teacherDb();
    db.membership_role.push({
      membership_id: "00000000-0000-4000-8000-000000000201",
      role_code: "teacher",
      created_at: now,
    });
    const clients = createMockSupabaseClients({
      db,
      tokens: {},
      authUsersByEmail: { "teacher@test.edu": { id: teacherId } },
    });
    await completeConnectFirebaseLogin(
      clients.admin,
      firebaseIdentity({ phone: "+919123456780", provider: "phone" }),
      { instituteId, role: "teacher", pin: "1234" },
    );
    const app = createApp(
      loadEnv({ NODE_ENV: "test", LOG_LEVEL: "error" }),
      createLogger("error"),
      clients,
    );

    for (let attempt = 1; attempt <= 5; attempt += 1) {
      const response = await app.request("/api/v1/auth/connect/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          institute_id: instituteId,
          role: "teacher",
          phone: "9123456780",
          pin: "9999",
        }),
      });
      expect(response.status).toBe(attempt === 5 ? 429 : 400);
    }
    expect(db.connect_login_credential[0]?.failed_attempts).toBe(5);
    expect(db.connect_login_credential[0]?.locked_until).toBeTruthy();

    const correctWhileLocked = await app.request("/api/v1/auth/connect/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        institute_id: instituteId,
        role: "teacher",
        phone: "9123456780",
        pin: "1234",
      }),
    });
    expect(correctWhileLocked.status).toBe(429);
  });

  it("uses the same Firebase-phone and scoped-PIN flow for parents", async () => {
    const db = teacherDb();
    db.user_profile.length = 0;
    db.membership.length = 0;
    db.parent.push({
      id: "00000000-0000-4000-8000-000000000301",
      institute_id: instituteId,
      user_profile_id: null,
      legacy_code: null,
      name: "Test Parent",
      phone: "9988776655",
      email: null,
      address: null,
      invite_status: "pending",
      access_status: "active",
      created_at: now,
      updated_at: now,
      deleted_at: null,
    });
    const clients = createMockSupabaseClients({ db, tokens: {} });
    const first = await completeConnectFirebaseLogin(
      clients.admin,
      firebaseIdentity({ phone: "+919988776655", provider: "phone" }),
      { instituteId, role: "parent", pin: "2468" },
    );
    expect(first.role).toBe("parent");
    expect(db.connect_login_credential[0]).toMatchObject({
      institute_id: instituteId,
      role: "parent",
      phone_digits: "9988776655",
    });

    const app = createApp(
      loadEnv({ NODE_ENV: "test", LOG_LEVEL: "error" }),
      createLogger("error"),
      clients,
    );
    const returning = await app.request("/api/v1/auth/connect/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        institute_id: instituteId,
        role: "parent",
        phone: "9988776655",
        pin: "2468",
      }),
    });
    expect(returning.status).toBe(200);
  });
});
