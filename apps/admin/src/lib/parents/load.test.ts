import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClientError } from "@/lib/api";
import type { ParentDto } from "./types";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function dto(overrides: Partial<ParentDto> = {}): ParentDto {
  return {
    id: "ba111111-1111-4111-8111-111111111111",
    instituteId: INST,
    userProfileId: null,
    legacyCode: null,
    name: "Rohan Sharma",
    phone: "9876512345",
    email: null,
    address: null,
    inviteStatus: "active",
    accessStatus: "active",
    createdAt: "2026-06-01T10:00:00Z",
    updatedAt: "2026-06-01T10:00:00Z",
    ...overrides,
  };
}

describe("loadParentsList", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns demo status without calling API in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const listParents = vi.fn();
    vi.doMock("./api", () => ({ listParents }));
    const { loadParentsList } = await import("./load");
    const result = await loadParentsList(INST);
    expect(result).toEqual({ status: "demo", items: [], errorMessage: null });
    expect(listParents).not.toHaveBeenCalled();
  });

  it("requires a valid active institute UUID in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listParents = vi.fn();
    vi.doMock("./api", () => ({ listParents }));
    const { loadParentsList } = await import("./load");
    await expect(loadParentsList(null)).resolves.toMatchObject({
      status: "needs_institute",
      items: [],
    });
    await expect(loadParentsList("admin-tenant")).resolves.toMatchObject({
      status: "needs_institute",
      items: [],
    });
    expect(listParents).not.toHaveBeenCalled();
  });

  it("maps successful API list and does not invent demo rows", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listParents = vi.fn().mockResolvedValue([dto()]);
    vi.doMock("./api", () => ({ listParents }));
    const { loadParentsList } = await import("./load");
    const result = await loadParentsList(INST);
    expect(result.status).toBe("ready");
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.name).toBe("Rohan Sharma");
    expect(listParents).toHaveBeenCalledWith({ instituteId: INST });
  });

  it("returns empty status when API returns no rows", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listParents = vi.fn().mockResolvedValue([]);
    vi.doMock("./api", () => ({ listParents }));
    const { loadParentsList } = await import("./load");
    await expect(loadParentsList(INST)).resolves.toEqual({
      status: "empty",
      items: [],
      errorMessage: null,
    });
  });

  it("returns forbidden on 403 without demo fallback", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listParents = vi.fn().mockRejectedValue(
      new ApiClientError({
        status: 403,
        code: "FORBIDDEN",
        message: "No access",
      }),
    );
    vi.doMock("./api", () => ({ listParents }));
    const { loadParentsList } = await import("./load");
    const result = await loadParentsList(INST);
    expect(result.status).toBe("forbidden");
    expect(result.items).toEqual([]);
  });

  it("returns error on 401 without demo fallback", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listParents = vi.fn().mockRejectedValue(
      new ApiClientError({
        status: 401,
        code: "UNAUTHENTICATED",
        message: "Authentication required",
      }),
    );
    vi.doMock("./api", () => ({ listParents }));
    const { loadParentsList } = await import("./load");
    const result = await loadParentsList(INST);
    expect(result.status).toBe("error");
    expect(result.items).toEqual([]);
  });

  it("returns error on network failure without demo fallback", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listParents = vi.fn().mockRejectedValue(
      new ApiClientError({
        status: 0,
        code: "NETWORK_ERROR",
        message: "Network request failed",
      }),
    );
    vi.doMock("./api", () => ({ listParents }));
    const { loadParentsList } = await import("./load");
    const result = await loadParentsList(INST);
    expect(result.status).toBe("error");
    expect(result.items).toEqual([]);
  });

  it("returns error when mapping throws on malformed payload", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listParents = vi.fn().mockResolvedValue({ not: "an array" });
    vi.doMock("./api", () => ({ listParents }));
    const { loadParentsList } = await import("./load");
    const result = await loadParentsList(INST);
    expect(result.status).toBe("error");
    expect(result.items).toEqual([]);
  });
});
