import { beforeEach, describe, expect, it, vi } from "vitest";

describe("resolveBirthdayWishPhone", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns the existing teacher phone when valid", async () => {
    vi.doMock("@/auth/auth-mode", () => ({ isApiAuthMode: () => true }));
    vi.doMock("@/lib/students/api", () => ({
      getStudentGuardians: vi.fn(),
    }));
    const { resolveBirthdayWishPhone } = await import("./resolve-birthday-phone");
    await expect(
      resolveBirthdayWishPhone({
        id: "t1",
        role: "Teacher",
        phone: "9000128765",
      }),
    ).resolves.toBe("9000128765");
  });

  it("loads the primary guardian phone for students without a list phone", async () => {
    vi.doMock("@/auth/auth-mode", () => ({ isApiAuthMode: () => true }));
    const getStudentGuardians = vi.fn().mockResolvedValue([
      {
        linkId: "l1",
        parentId: "p1",
        parentName: "Parent",
        phone: "9876501234",
        email: null,
        relationship: "Mother",
        isPrimary: true,
        isEmergency: true,
      },
    ]);
    vi.doMock("@/lib/students/api", () => ({ getStudentGuardians }));
    const { resolveBirthdayWishPhone } = await import("./resolve-birthday-phone");
    await expect(
      resolveBirthdayWishPhone({
        id: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
        role: "Student",
        phone: null,
      }),
    ).resolves.toBe("9876501234");
    expect(getStudentGuardians).toHaveBeenCalled();
  });
});
