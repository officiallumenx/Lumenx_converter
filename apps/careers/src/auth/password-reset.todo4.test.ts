import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  resetPasswordForEmail: vi.fn(),
}));

vi.mock("@lumenx/auth", () => ({
  completeVerifiedAppSignup: vi.fn(),
  clearAppAuthSession: vi.fn(),
}));
vi.mock("@lumenx/notifications", () => ({
  invalidatePushDeviceTokensBeforeSignOut: vi.fn(),
}));
vi.mock("@/lib/supabase-browser", () => ({
  getSupabaseBrowserClient: () => ({
    auth: { resetPasswordForEmail: mocks.resetPasswordForEmail, signOut: vi.fn() },
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

describe("Careers API password reset", () => {
  beforeEach(() => vi.clearAllMocks());

  it("awaits Supabase and propagates delivery errors", async () => {
    mocks.resetPasswordForEmail.mockResolvedValueOnce({
      error: new Error("delivery failed"),
    });
    const { apiRequestPasswordReset } = await import("./api-auth");
    await expect(apiRequestPasswordReset("candidate@example.com")).rejects.toThrow(
      "delivery failed",
    );
    expect(mocks.resetPasswordForEmail).toHaveBeenCalledWith("candidate@example.com");
  });
});
