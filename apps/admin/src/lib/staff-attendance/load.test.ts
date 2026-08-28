import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClientError } from "@/lib/api";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("loadStaffAttendanceDay", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns demo status without calling API in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const listStaffAttendance = vi.fn();
    vi.doMock("./api", () => ({ listStaffAttendance }));
    const { loadStaffAttendanceDay } = await import("./load");
    const result = await loadStaffAttendanceDay(INST, "2026-06-01");
    expect(result.status).toBe("demo");
    expect(listStaffAttendance).not.toHaveBeenCalled();
  });

  it("returns forbidden on 403 without demo fallback", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listStaffAttendance = vi.fn().mockRejectedValue(
      new ApiClientError({
        status: 403,
        code: "FORBIDDEN",
        message: "No access",
      }),
    );
    vi.doMock("./api", () => ({ listStaffAttendance }));
    vi.doMock("@/lib/teachers/api", () => ({
      listTeachers: vi.fn().mockResolvedValue([]),
    }));
    const { loadStaffAttendanceDay } = await import("./load");
    const result = await loadStaffAttendanceDay(INST, "2026-06-01");
    expect(result.status).toBe("forbidden");
    expect(result.summary).toBeNull();
  });
});
