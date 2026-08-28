import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClientError } from "@/lib/api";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("loadAttendanceRegistersList", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns demo status without calling API in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const listAttendanceRegisters = vi.fn();
    vi.doMock("./api", () => ({ listAttendanceRegisters }));
    const { loadAttendanceRegistersList } = await import("./load");
    const result = await loadAttendanceRegistersList(INST, {});
    expect(result.status).toBe("demo");
    expect(listAttendanceRegisters).not.toHaveBeenCalled();
  });

  it("returns forbidden on 403 without demo fallback", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listAttendanceRegisters = vi.fn().mockRejectedValue(
      new ApiClientError({
        status: 403,
        code: "FORBIDDEN",
        message: "No access",
      }),
    );
    vi.doMock("./api", () => ({ listAttendanceRegisters }));
    const { loadAttendanceRegistersList } = await import("./load");
    const result = await loadAttendanceRegistersList(INST, {});
    expect(result.status).toBe("forbidden");
    expect(result.items).toEqual([]);
  });
});
