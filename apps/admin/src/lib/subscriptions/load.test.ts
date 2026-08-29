import { beforeEach, describe, expect, it, vi } from "vitest";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("loadCurrentSubscription", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns demo status without calling API in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const getCurrentSubscription = vi.fn();
    vi.doMock("./api", () => ({ getCurrentSubscription }));
    const { loadCurrentSubscription } = await import("./load");
    const result = await loadCurrentSubscription(INST);
    expect(result.status).toBe("demo");
    expect(getCurrentSubscription).not.toHaveBeenCalled();
  });

  it("returns needs_institute for invalid UUID", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { loadCurrentSubscription } = await import("./load");
    const result = await loadCurrentSubscription("admin-tenant");
    expect(result.status).toBe("needs_institute");
  });
});
