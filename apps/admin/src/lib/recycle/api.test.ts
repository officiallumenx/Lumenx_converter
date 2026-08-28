import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "@/lib/api";
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
    subtitle: "Class 10-A",
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

describe("recycle api repository", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("refuses to call backend in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const { listRecycleItems } = await import("./api");
    const fetchMock = vi.fn();
    const client = createApiClient({
      getBaseUrl: () => "http://api.test",
      getAccessToken: async () => "tok",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    await expect(
      listRecycleItems({ instituteId: INST }, client),
    ).rejects.toThrow(/API auth mode/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects non-UUID institute ids without calling fetch", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { listRecycleItems } = await import("./api");
    const fetchMock = vi.fn();
    const client = createApiClient({
      getBaseUrl: () => "http://api.test",
      getAccessToken: async () => "tok",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    await expect(
      listRecycleItems({ instituteId: "admin-tenant" }, client),
    ).rejects.toThrow(/UUID/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("lists recycle items with institute_id in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { listRecycleItems } = await import("./api");
    const payload = [dto()];
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ data: payload }),
    });
    const client = createApiClient({
      getBaseUrl: () => "http://api.test",
      getAccessToken: async () => "tok",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    const result = await listRecycleItems({ instituteId: INST }, client);
    expect(result).toEqual(payload);
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain(`institute_id=${INST}`);
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/recycle/items?"),
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("unwraps response envelope via shared client", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { listRecycleItems } = await import("./api");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ data: [dto({ id: "recycle-2" })] }),
    });
    const client = createApiClient({
      getBaseUrl: () => "http://api.test",
      getAccessToken: async () => "tok",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    const result = await listRecycleItems({ instituteId: INST }, client);
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("recycle-2");
  });
});
