import { beforeEach, describe, expect, it, vi } from "vitest";

describe("login-flow-auth", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("selects api strategy when VITE_ADMIN_AUTH_MODE=api", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { getLoginAuthStrategy, isDemoCompleteSignInAllowed } = await import(
      "./login-flow-auth"
    );
    expect(getLoginAuthStrategy()).toBe("api");
    expect(isDemoCompleteSignInAllowed()).toBe(false);
  });

  it("selects demo strategy by default", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "");
    const { getLoginAuthStrategy, isDemoCompleteSignInAllowed } = await import(
      "./login-flow-auth"
    );
    expect(getLoginAuthStrategy()).toBe("demo");
    expect(isDemoCompleteSignInAllowed()).toBe(true);
  });

  it("requireApiLoginEmail accepts email and rejects mobile", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { requireApiLoginEmail } = await import("./login-flow-auth");
    expect(requireApiLoginEmail("  Admin@School.edu ")).toBe("admin@school.edu");
    expect(() => requireApiLoginEmail("9876543210")).toThrow(/email/i);
  });

  it("mergeApiPresentationPatch keeps role and instituteId authoritative", async () => {
    const { mergeApiPresentationPatch } = await import("./login-flow-auth");
    const current = {
      id: "11111111-1111-4111-8111-111111111111",
      email: "a@b.edu",
      name: "A",
      initials: "A",
      role: "principal" as const,
      title: "principal",
      instituteId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      instituteName: "Real Institute",
      isVerified: true,
      mfaEnabled: false,
      createdAt: "2024-01-01T00:00:00Z",
    };
    const patched = mergeApiPresentationPatch(current, {
      ...current,
      name: "Display Name",
      initials: "DN",
      role: "teacher",
      instituteId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      instituteName: "Evil Tenant",
    });
    expect(patched.name).toBe("Display Name");
    expect(patched.role).toBe("principal");
    expect(patched.instituteId).toBe("aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa");
    expect(patched.instituteName).toBe("Real Institute");
  });
});
