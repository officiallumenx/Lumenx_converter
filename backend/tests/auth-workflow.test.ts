/**
 * Auth workflow notebook APIs — signup OTP, Nexus mode, Connect mode, PIN hash.
 */
import { describe, expect, it } from "vitest";
import { createApp } from "../src/app.js";
import { loadEnv } from "../src/config/env.js";
import { createLogger } from "../src/logger/logger.js";
import {
  createMockSupabaseClients,
  emptyMockDb,
} from "./helpers/mock-supabase.js";
import {
  assertValidPin,
  hashPin,
  verifyPinHash,
  workflowFlagsFromCredential,
} from "../src/domains/auth-credentials/repository.js";
import { WORKFLOW_DEMO_OTP } from "../src/domains/auth-credentials/workflow-otp.js";

const silentLogger = createLogger("error");

describe("auth workflow credentials", () => {
  it("hashes and verifies PIN", () => {
    const pin = assertValidPin("123456");
    const { hash, salt } = hashPin(pin);
    expect(hash).toHaveLength(128);
    expect(verifyPinHash(pin, hash, salt)).toBe(true);
    expect(verifyPinHash("000000", hash, salt)).toBe(false);
  });

  it("marks first login as requiring dual OTP", () => {
    const flags = workflowFlagsFromCredential(null, { dualOtpOnFirstLogin: true });
    expect(flags.firstLogin).toBe(true);
    expect(flags.requiresDualOtp).toBe(true);
    expect(flags.requiresPin).toBe(true);
  });

  it("marks Nexus dual OTP as always required", () => {
    const returning = workflowFlagsFromCredential(
      {
        user_id: "u1",
        username: "ops",
        pin_hash: "x",
        pin_salt: "y",
        pin_set_at: new Date().toISOString(),
        first_login_completed_at: new Date().toISOString(),
        phone_verified_at: new Date().toISOString(),
        email_verified_at: new Date().toISOString(),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { dualOtpAlways: true, pinAlways: true },
    );
    expect(returning.firstLogin).toBe(false);
    expect(returning.requiresDualOtp).toBe(true);
    expect(returning.requiresPin).toBe(true);
  });
});

describe("signup + nexus + connect auth routes", () => {
  it("signup request-otp returns demo code", async () => {
    const app = createApp(
      loadEnv({ NODE_ENV: "test", LOG_LEVEL: "error" }),
      silentLogger,
      createMockSupabaseClients({ db: emptyMockDb(), tokens: {} }),
    );

    const res = await app.request("/api/v1/auth/signup/request-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject_key: "applicant@demo.edu",
        channel: "email",
        destination: "applicant@demo.edu",
      }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as { data: { devOtp?: string; channel: string } };
    expect(body.data.channel).toBe("email");
    expect(body.data.devOtp).toBe(WORKFLOW_DEMO_OTP);

    const verify = await app.request("/api/v1/auth/signup/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        subject_key: "applicant@demo.edu",
        channel: "email",
        otp: WORKFLOW_DEMO_OTP,
      }),
    });
    expect(verify.status).toBe(200);
    const verifiedBody = (await verify.json()) as {
      data: { grant: string; expiresAt: string };
    };
    expect(verifiedBody.data.grant).toHaveLength(64);
    expect(Date.parse(verifiedBody.data.expiresAt)).toBeGreaterThan(Date.now());
  });

  it("exposes nexus and connect login-mode endpoints", async () => {
    const app = createApp(
      loadEnv({ NODE_ENV: "test", LOG_LEVEL: "error" }),
      silentLogger,
      createMockSupabaseClients({ db: emptyMockDb(), tokens: {} }),
    );

    const nexus = await app.request("/api/v1/auth/nexus/login-mode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ identifier: "nobody@demo.edu" }),
    });
    expect(nexus.status).toBe(404);

    const connect = await app.request("/api/v1/auth/connect/login-mode", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        institute_id: "00000000-0000-4000-8000-000000000001",
        phone: "9876543210",
        role: "parent",
      }),
    });
    expect(connect.status).toBe(400);
    expect(await connect.text()).toContain("Unable to sign in");
  });
});
