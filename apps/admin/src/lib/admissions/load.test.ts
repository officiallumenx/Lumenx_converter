import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClientError } from "@/lib/api";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("loadAdmissionsList", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns demo status without calling API in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const listAdmissionApplications = vi.fn();
    vi.doMock("./api", () => ({ listAdmissionApplications }));
    const { loadAdmissionsList } = await import("./load");
    const result = await loadAdmissionsList(INST);
    expect(result.status).toBe("demo");
    expect(listAdmissionApplications).not.toHaveBeenCalled();
  });

  it("returns forbidden on 403 without demo fallback", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listAdmissionApplications = vi.fn().mockRejectedValue(
      new ApiClientError({
        status: 403,
        code: "FORBIDDEN",
        message: "No access",
      }),
    );
    vi.doMock("./api", () => ({ listAdmissionApplications }));
    const { loadAdmissionsList } = await import("./load");
    const result = await loadAdmissionsList(INST);
    expect(result.status).toBe("forbidden");
    expect(result.items).toEqual([]);
  });
});
