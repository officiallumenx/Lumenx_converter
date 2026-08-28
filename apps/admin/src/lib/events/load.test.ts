import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiClientError } from "@/lib/api";
import type { EventDto } from "./types";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function dto(overrides: Partial<EventDto> = {}): EventDto {
  return {
    id: "evt-1",
    instituteId: INST,
    title: "Founders Day",
    kind: "function",
    customKindLabel: null,
    source: "events",
    startsOn: "2026-06-01",
    endsOn: null,
    startTime: "09:00:00",
    endTime: "17:00:00",
    audienceScope: "all",
    audienceLabel: null,
    classId: null,
    sectionId: null,
    location: "Auditorium",
    description: null,
    reminder: "one_day",
    bannerAssetPath: null,
    registrationRequired: false,
    recurrence: null,
    rsvpCount: 0,
    published: true,
    publishedAt: null,
    cancelled: false,
    cancellationReason: null,
    cancelledAt: null,
    createdByUserId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    createdAt: "2026-05-01T09:00:00Z",
    updatedAt: "2026-05-01T09:00:00Z",
    ...overrides,
  };
}

describe("loadEventsList", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns demo status without calling API in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const listEvents = vi.fn();
    vi.doMock("./api", () => ({ listEvents }));
    const { loadEventsList } = await import("./load");
    const result = await loadEventsList(INST);
    expect(result).toEqual({ status: "demo", items: [], errorMessage: null });
    expect(listEvents).not.toHaveBeenCalled();
  });

  it("requires a valid active institute UUID in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listEvents = vi.fn();
    vi.doMock("./api", () => ({ listEvents }));
    const { loadEventsList } = await import("./load");
    await expect(loadEventsList(null)).resolves.toMatchObject({
      status: "needs_institute",
      items: [],
    });
    await expect(loadEventsList("admin-tenant")).resolves.toMatchObject({
      status: "needs_institute",
      items: [],
    });
    expect(listEvents).not.toHaveBeenCalled();
  });

  it("maps successful API list with source=events and does not invent demo rows", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listEvents = vi.fn().mockResolvedValue([dto()]);
    vi.doMock("./api", () => ({ listEvents }));
    const { loadEventsList } = await import("./load");
    const result = await loadEventsList(INST);
    expect(result.status).toBe("ready");
    expect(result.items).toHaveLength(1);
    expect(result.items[0]?.id).toBe("evt-1");
    expect(listEvents).toHaveBeenCalledWith({
      instituteId: INST,
      source: "events",
    });
  });

  it("returns empty status when API returns no rows", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listEvents = vi.fn().mockResolvedValue([]);
    vi.doMock("./api", () => ({ listEvents }));
    const { loadEventsList } = await import("./load");
    await expect(loadEventsList(INST)).resolves.toEqual({
      status: "empty",
      items: [],
      errorMessage: null,
    });
  });

  it("returns forbidden on 403 without demo fallback", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listEvents = vi.fn().mockRejectedValue(
      new ApiClientError({
        status: 403,
        code: "FORBIDDEN",
        message: "No access",
      }),
    );
    vi.doMock("./api", () => ({ listEvents }));
    const { loadEventsList } = await import("./load");
    const result = await loadEventsList(INST);
    expect(result.status).toBe("forbidden");
    expect(result.items).toEqual([]);
  });

  it("returns error on 401 without demo fallback", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listEvents = vi.fn().mockRejectedValue(
      new ApiClientError({
        status: 401,
        code: "UNAUTHENTICATED",
        message: "Authentication required",
      }),
    );
    vi.doMock("./api", () => ({ listEvents }));
    const { loadEventsList } = await import("./load");
    const result = await loadEventsList(INST);
    expect(result.status).toBe("error");
    expect(result.items).toEqual([]);
  });

  it("returns error on network failure without demo fallback", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listEvents = vi.fn().mockRejectedValue(
      new ApiClientError({
        status: 0,
        code: "NETWORK_ERROR",
        message: "Network request failed",
      }),
    );
    vi.doMock("./api", () => ({ listEvents }));
    const { loadEventsList } = await import("./load");
    const result = await loadEventsList(INST);
    expect(result.status).toBe("error");
    expect(result.items).toEqual([]);
  });

  it("returns error when mapping throws on malformed payload", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const listEvents = vi.fn().mockResolvedValue({ not: "an array" });
    vi.doMock("./api", () => ({ listEvents }));
    const { loadEventsList } = await import("./load");
    const result = await loadEventsList(INST);
    expect(result.status).toBe("error");
    expect(result.items).toEqual([]);
  });
});
