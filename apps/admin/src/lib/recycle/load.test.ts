import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClientError } from "@/lib/api";
import type { RecycleItemDto } from "./types";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function dto(overrides: Partial<RecycleItemDto> = {}): RecycleItemDto {
  return {
    id: "recycle-1",
    instituteId: INST,
    entityKind: "student",
    entityId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    module: "Students",
    title: "Rahul Sharma",
    subtitle: null,
    snapshot: null,
    status: "in_bin",
    deletedByUserId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
    deletedAt: "2026-06-01T10:00:00Z",
    restoredByUserId: null,
    restoredAt: null,
    purgedByUserId: null,
    purgedAt: null,
    createdAt: "2026-06-01T09:00:00Z",
    updatedAt: "2026-06-01T10:00:00Z",
    ...overrides,
  };
}

describe("loadRecycleItemsList", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns demo status without calling API in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const listRecycleItems = vi.fn();
    vi.doMock("./api", () => ({ listRecycleItems }));
    const { loadRecycleItemsList } = await import("./load");
    const result = await loadRecycleItemsList(INST);
    expect(result).toEqual({ status: "demo", items: [], errorMessage: null });
    expect(listRecycleItems).not.toHaveBeenCalled();
  });

  it("requires a valid active institute UUID in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listRecycleItems = vi.fn();
    vi.doMock("./api", () => ({ listRecycleItems }));
    const { loadRecycleItemsList } = await import("./load");
    await expect(loadRecycleItemsList(null)).resolves.toMatchObject({
      status: "needs_institute",
      items: [],
    });
    await expect(loadRecycleItemsList("admin-tenant")).resolves.toMatchObject({
      status: "needs_institute",
      items: [],
    });
    expect(listRecycleItems).not.toHaveBeenCalled();
  });

  it("maps successful API list and does not invent demo rows", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listRecycleItems = vi.fn().mockResolvedValue([dto()]);
    vi.doMock("./api", () => ({ listRecycleItems }));
    const { loadRecycleItemsList } = await import("./load");
    const result = await loadRecycleItemsList(INST);
    expect(result.status).toBe("ready");
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.id).toBe("recycle-1");
    expect(listRecycleItems).toHaveBeenCalledWith({ instituteId: INST });
  });

  it("returns empty status when API returns no rows", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listRecycleItems = vi.fn().mockResolvedValue([]);
    vi.doMock("./api", () => ({ listRecycleItems }));
    const { loadRecycleItemsList } = await import("./load");
    await expect(loadRecycleItemsList(INST)).resolves.toEqual({
      status: "empty",
      items: [],
      errorMessage: null,
    });
  });

  it("returns forbidden on 403 without demo fallback", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listRecycleItems = vi.fn().mockRejectedValue(
      new ApiClientError({
        status: 403,
        code: "FORBIDDEN",
        message: "No access",
      }),
    );
    vi.doMock("./api", () => ({ listRecycleItems }));
    const { loadRecycleItemsList } = await import("./load");
    const result = await loadRecycleItemsList(INST);
    expect(result.status).toBe("forbidden");
    expect(result.items).toEqual([]);
  });

  it("returns error on 401 without demo fallback", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listRecycleItems = vi.fn().mockRejectedValue(
      new ApiClientError({
        status: 401,
        code: "UNAUTHENTICATED",
        message: "Authentication required",
      }),
    );
    vi.doMock("./api", () => ({ listRecycleItems }));
    const { loadRecycleItemsList } = await import("./load");
    const result = await loadRecycleItemsList(INST);
    expect(result.status).toBe("error");
    expect(result.items).toEqual([]);
  });

  it("returns error on network failure without demo fallback", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listRecycleItems = vi.fn().mockRejectedValue(
      new ApiClientError({
        status: 0,
        code: "NETWORK_ERROR",
        message: "Network request failed",
      }),
    );
    vi.doMock("./api", () => ({ listRecycleItems }));
    const { loadRecycleItemsList } = await import("./load");
    const result = await loadRecycleItemsList(INST);
    expect(result.status).toBe("error");
    expect(result.items).toEqual([]);
  });

  it("returns error when mapping throws on malformed payload", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listRecycleItems = vi.fn().mockResolvedValue({ not: "an array" });
    vi.doMock("./api", () => ({ listRecycleItems }));
    const { loadRecycleItemsList } = await import("./load");
    const result = await loadRecycleItemsList(INST);
    expect(result.status).toBe("error");
    expect(result.items).toEqual([]);
  });
});
