import { beforeEach, describe, expect, it, vi } from "vitest";

const PLAN = "11111111-1111-4111-8111-111111111111";
const STUDENT = "22222222-2222-4222-8222-222222222222";
const CLASS = "33333333-3333-4333-8333-333333333333";

describe("loadStudentFeeAccountView", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns demo status in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const { loadStudentFeeAccountView } = await import("./account-load");
    const result = await loadStudentFeeAccountView({
      planId: PLAN,
      studentId: STUDENT,
      classId: CLASS,
    });
    expect(result.status).toBe("demo");
  });

  it("returns invalid without network call for bad student UUID", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const getStudentFeeAccount = vi.fn();
    vi.doMock("./api", () => ({ getStudentFeeAccount }));
    const { loadStudentFeeAccountView } = await import("./account-load");
    const result = await loadStudentFeeAccountView({
      planId: PLAN,
      studentId: "not-a-uuid",
      classId: CLASS,
    });
    expect(result.status).toBe("invalid");
    expect(getStudentFeeAccount).not.toHaveBeenCalled();
  });
});
