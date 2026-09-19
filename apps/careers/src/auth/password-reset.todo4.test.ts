import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  firebaseReset: vi.fn(),
}));

vi.mock("@lumenx/auth", () => ({
  completeVerifiedAppSignup: vi.fn(),
  firebaseEmailLoginToLumenXSession: vi.fn(),
  firebaseLogout: vi.fn(),
  requestFirebasePasswordReset: mocks.firebaseReset,
}));
vi.mock("@lumenx/notifications", () => ({
  invalidatePushDeviceTokensBeforeSignOut: vi.fn(),
}));
vi.mock("@/lib/supabase-browser", () => ({
  getSupabaseBrowserClient: () => ({
    auth: { resetPasswordForEmail: vi.fn(), signOut: vi.fn() },
  }),
}));
vi.mock("@/lib/careers/repositories", () => ({
  persistApiCareersUser: vi.fn(),
  signOutUser: vi.fn(),
}));
vi.mock("./me-bridge", () => ({
  careersUserFromMe: vi.fn(),
  fetchInstituteName: vi.fn(),
  fetchMe: vi.fn(),
}));
vi.mock("./auth-mode", () => ({ isFirebaseAuthProvider: () => true }));

describe("Careers API password reset", () => {
  beforeEach(() => vi.clearAllMocks());

  it("awaits Firebase and propagates delivery errors", async () => {
    mocks.firebaseReset.mockRejectedValueOnce(new Error("delivery failed"));
    const { apiRequestPasswordReset } = await import("./api-auth");
    await expect(apiRequestPasswordReset("candidate@example.com")).rejects.toThrow(
      "delivery failed",
    );
    expect(mocks.firebaseReset).toHaveBeenCalledWith("candidate@example.com");
  });
});
