/**
 * Admin staff/root login mode + first-login OTP contract (notebook).
 */
import { describe, expect, it, vi } from "vitest";

vi.mock("../../src/domains/otp-delivery/index.js", () => ({
  deliverLoginOtp: vi.fn(async () => undefined),
  isOtpDemoMode: () => true,
}));

describe("resolveStaffLoginMode notebook contract", () => {
  it("requires OTP on first login for assigned and institute-wide accounts", async () => {
    const { workflowFlagsFromCredential } = await import(
      "../src/domains/auth-credentials/repository.js"
    );

    const first = workflowFlagsFromCredential(null, {
      dualOtpOnFirstLogin: true,
      pinAlways: true,
    });
    expect(first.firstLogin).toBe(true);
    expect(first.requiresDualOtp).toBe(true);
    expect(first.requiresPin).toBe(true);

    const returning = workflowFlagsFromCredential(
      {
        user_id: "u1",
        username: "teacher1",
        pin_hash: "x",
        pin_salt: "y",
        pin_set_at: new Date().toISOString(),
        first_login_completed_at: new Date().toISOString(),
        phone_verified_at: null,
        email_verified_at: null,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      },
      { dualOtpOnFirstLogin: true, pinAlways: true },
    );
    expect(returning.firstLogin).toBe(false);
    expect(returning.requiresDualOtp).toBe(false);
    expect(returning.requiresPin).toBe(true);
  });
});
