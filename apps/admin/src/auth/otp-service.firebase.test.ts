import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";

describe("Admin OTP service — API-only (no demo OTP)", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.unstubAllEnvs();
  });

  afterEach(() => {
    vi.unstubAllEnvs();
    vi.resetModules();
  });

  it("does not accept demo OTP even if AUTH_MODE is incorrectly set to demo", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    vi.stubEnv("VITE_AUTH_PROVIDER", "supabase");
    const { createOtpService, DEMO_OTP } = await import("./otp-service");
    const svc = createOtpService();
    await expect(svc.sendMobileOtp("9876500001")).rejects.toThrow(/disabled in API mode/i);
    await expect(svc.verifyMobileOtp("9876500001", DEMO_OTP)).rejects.toThrow(
      /disabled in API mode/i,
    );
  });

  it("API mode does not silently use demo OTP", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    vi.stubEnv("VITE_AUTH_PROVIDER", "supabase");
    const { createOtpService, DEMO_OTP } = await import("./otp-service");
    const svc = createOtpService();
    await expect(svc.sendMobileOtp("9876500001")).rejects.toThrow(/disabled in API mode/i);
    await expect(svc.verifyMobileOtp("9876500001", DEMO_OTP)).rejects.toThrow(
      /disabled in API mode/i,
    );
  });

  it("Firebase provider rejects email OTP channel (password auth instead)", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    vi.stubEnv("VITE_AUTH_PROVIDER", "firebase");
    vi.stubEnv("VITE_FIREBASE_API_KEY", "AIza-test");
    vi.stubEnv("VITE_FIREBASE_AUTH_DOMAIN", "demo.firebaseapp.com");
    vi.stubEnv("VITE_FIREBASE_PROJECT_ID", "demo");
    vi.stubEnv("VITE_FIREBASE_APP_ID", "1:1:web:abc");
    const { createOtpService } = await import("./otp-service");
    const svc = createOtpService();
    await expect(svc.sendEmailOtp("a@b.com")).rejects.toThrow(/email\/password/i);
  });

  it("normalizes phone session keys to last 10 digits across E.164 variants", async () => {
    const { phoneSessionKey } = await import("./otp-service");
    expect(phoneSessionKey("+91 98765 00001")).toBe("9876500001");
    expect(phoneSessionKey("919876500001")).toBe("9876500001");
    expect(phoneSessionKey("9876500001")).toBe("9876500001");
  });
});
