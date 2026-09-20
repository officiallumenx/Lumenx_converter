import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  signInWithPassword: vi.fn(),
  resetPasswordForEmail: vi.fn(),
  signOut: vi.fn(),
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
    auth: {
      resetPasswordForEmail: mocks.resetPasswordForEmail,
      signInWithPassword: mocks.signInWithPassword,
      signOut: mocks.signOut,
    },
  }),
}));
vi.mock("@/lib/admissions/repositories", () => ({
  persistApiAdmissionsUser: vi.fn(),
  signOutUser: vi.fn(),
}));
vi.mock("./me-bridge", () => ({
  admissionsUserFromMe: vi.fn(),
  fetchInstituteName: vi.fn(),
  fetchMe: vi.fn(),
}));

describe("Admissions API auth failures", () => {
  beforeEach(() => vi.clearAllMocks());

  it("awaits and propagates password-reset failure", async () => {
    mocks.resetPasswordForEmail.mockResolvedValueOnce({
      error: new Error("reset unavailable"),
    });
    const { apiRequestPasswordReset } = await import("./api-auth");
    await expect(apiRequestPasswordReset("parent@example.com")).rejects.toThrow(
      "reset unavailable",
    );
  });

  it("does not report success when async sign-in fails", async () => {
    mocks.signInWithPassword.mockResolvedValueOnce({
      data: { session: null },
      error: new Error("invalid credentials"),
    });
    const { apiSignInWithPassword } = await import("./api-auth");
    await expect(
      apiSignInWithPassword("parent@example.com", "wrong-password"),
    ).rejects.toThrow("invalid credentials");
  });
});
