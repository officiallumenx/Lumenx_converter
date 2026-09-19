import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClientError } from "@/lib/api";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const YEAR = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("loadFeesSnapshot", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("ignores demo env and still requires API (product is API-only)", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const listFeePlans = vi.fn().mockResolvedValue([]);
    vi.doMock("./api", () => ({
      listFeePlans,
      listFeeComponents: vi.fn(),
      listFeeConcessions: vi.fn(),
      listFeePayments: vi.fn(),
    }));
    vi.doMock("@/lib/classes/api", () => ({
      listClasses: vi.fn().mockResolvedValue([]),
    }));
    vi.doMock("@/lib/students/api", () => ({
      listStudents: vi.fn().mockResolvedValue([]),
    }));
    const { loadFeesSnapshot } = await import("./load");
    const result = await loadFeesSnapshot(INST, YEAR);
    expect(result.status).toBe("empty");
    expect(listFeePlans).toHaveBeenCalled();
  });

  it("returns forbidden on 403 without demo fallback", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listFeePlans = vi.fn().mockRejectedValue(
      new ApiClientError({
        status: 403,
        code: "FORBIDDEN",
        message: "No access",
      }),
    );
    vi.doMock("./api", () => ({ listFeePlans }));
    vi.doMock("@/lib/classes/api", () => ({ listClasses: vi.fn() }));
    vi.doMock("@/lib/students/api", () => ({ listStudents: vi.fn() }));
    const { loadFeesSnapshot } = await import("./load");
    const result = await loadFeesSnapshot(INST, YEAR);
    expect(result.status).toBe("forbidden");
    expect(result.snapshot).toBeNull();
  });
});
