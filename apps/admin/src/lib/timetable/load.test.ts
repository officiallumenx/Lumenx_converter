import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClientError } from "@/lib/api";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("loadTimetableReadBundle", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns demo status without calling API in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const listTimetableSlots = vi.fn();
    vi.doMock("./api", () => ({ listTimetableSlots }));
    vi.doMock("@/lib/classes/api", () => ({ listClassesCatalog: vi.fn() }));
    const { loadTimetableReadBundle } = await import("./load");
    const result = await loadTimetableReadBundle(INST);
    expect(result.status).toBe("demo");
    expect(listTimetableSlots).not.toHaveBeenCalled();
  });

  it("requires a valid institute UUID in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listTimetableSlots = vi.fn();
    vi.doMock("./api", () => ({ listTimetableSlots }));
    vi.doMock("@/lib/classes/api", () => ({ listClassesCatalog: vi.fn() }));
    const { loadTimetableReadBundle } = await import("./load");
    await expect(loadTimetableReadBundle(null)).resolves.toMatchObject({
      status: "needs_institute",
      bundle: null,
    });
    expect(listTimetableSlots).not.toHaveBeenCalled();
  });

  it("maps successful API load without demo fallback", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listTimetableSlots = vi.fn().mockResolvedValue([]);
    const listClassesCatalog = vi.fn().mockResolvedValue({
      sections: [],
      classes: [],
    });
    vi.doMock("./api", () => ({ listTimetableSlots }));
    vi.doMock("@/lib/classes/api", () => ({ listClassesCatalog }));
    const { loadTimetableReadBundle } = await import("./load");
    const result = await loadTimetableReadBundle(INST);
    expect(result.status).toBe("empty");
    expect(result.bundle).toEqual({ slots: [], sections: [] });
    expect(listTimetableSlots).toHaveBeenCalledWith({ instituteId: INST });
  });

  it("returns forbidden on 403 without demo fallback", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listTimetableSlots = vi.fn().mockRejectedValue(
      new ApiClientError({
        status: 403,
        code: "FORBIDDEN",
        message: "No access",
      }),
    );
    vi.doMock("./api", () => ({ listTimetableSlots }));
    vi.doMock("@/lib/classes/api", () => ({ listClassesCatalog: vi.fn() }));
    const { loadTimetableReadBundle } = await import("./load");
    const result = await loadTimetableReadBundle(INST);
    expect(result.status).toBe("forbidden");
    expect(result.bundle).toBeNull();
  });

  it("returns error on API failure without demo fallback", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listTimetableSlots = vi.fn().mockRejectedValue(
      new ApiClientError({
        status: 500,
        code: "INTERNAL_ERROR",
        message: "Server error",
      }),
    );
    vi.doMock("./api", () => ({ listTimetableSlots }));
    vi.doMock("@/lib/classes/api", () => ({ listClassesCatalog: vi.fn() }));
    const { loadTimetableReadBundle } = await import("./load");
    const result = await loadTimetableReadBundle(INST);
    expect(result.status).toBe("error");
    expect(result.bundle).toBeNull();
  });
});
