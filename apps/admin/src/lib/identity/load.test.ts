import { beforeEach, describe, expect, it, vi } from "vitest";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("loadMembershipsList", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns demo status without calling API in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const listMemberships = vi.fn();
    vi.doMock("./api", () => ({ listMemberships }));
    const { loadMembershipsList } = await import("./load");
    const result = await loadMembershipsList(INST);
    expect(result.status).toBe("demo");
    expect(listMemberships).not.toHaveBeenCalled();
  });

  it("returns needs_institute for invalid UUID", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { loadMembershipsList } = await import("./load");
    const result = await loadMembershipsList("admin-tenant");
    expect(result.status).toBe("needs_institute");
  });
});

describe("loadRolesCatalog", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns demo status without calling API in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const listRoles = vi.fn();
    vi.doMock("./api", () => ({ listRoles }));
    const { loadRolesCatalog } = await import("./load");
    const result = await loadRolesCatalog();
    expect(result.status).toBe("demo");
    expect(listRoles).not.toHaveBeenCalled();
  });
});
