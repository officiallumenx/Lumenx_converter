import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClientError } from "@/lib/api";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("loadFeesSnapshot", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns demo status without calling API in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const listFeePlans = vi.fn();
    vi.doMock("./api", () => ({ listFeePlans }));
    const { loadFeesSnapshot } = await import("./load");
    const result = await loadFeesSnapshot(INST);
    expect(result.status).toBe("demo");
    expect(listFeePlans).not.toHaveBeenCalled();
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
    const { loadFeesSnapshot } = await import("./load");
    const result = await loadFeesSnapshot(INST);
    expect(result.status).toBe("forbidden");
    expect(result.snapshot).toBeNull();
  });
});
