import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "@/lib/api";
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
    description: "Annual celebration",
    reminder: "one_day",
    bannerAssetPath: null,
    registrationRequired: false,
    recurrence: null,
    rsvpCount: 42,
    published: true,
    publishedAt: "2026-05-01T10:00:00Z",
    cancelled: false,
    cancellationReason: null,
    cancelledAt: null,
    createdByUserId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    createdAt: "2026-05-01T09:00:00Z",
    updatedAt: "2026-05-01T10:00:00Z",
    ...overrides,
  };
}

describe("events api repository", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("refuses to call backend in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const { listEvents } = await import("./api");
    const fetchMock = vi.fn();
    const client = createApiClient({
      getBaseUrl: () => "http://api.test",
      getAccessToken: async () => "tok",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    await expect(listEvents({ instituteId: INST }, client)).rejects.toThrow(
      /API auth mode/i,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects non-UUID institute ids without calling fetch", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { listEvents } = await import("./api");
    const fetchMock = vi.fn();
    const client = createApiClient({
      getBaseUrl: () => "http://api.test",
      getAccessToken: async () => "tok",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    await expect(
      listEvents({ instituteId: "admin-tenant" }, client),
    ).rejects.toThrow(/UUID/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("lists events with institute_id and source=events in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { listEvents } = await import("./api");
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
    const result = await listEvents(
      { instituteId: INST, source: "events" },
      client,
    );
    expect(result).toEqual(payload);
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain(`institute_id=${INST}`);
    expect(url).toContain("source=events");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/events?"),
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("unwraps response envelope via shared client", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { listEvents } = await import("./api");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ data: [dto({ id: "evt-2" })] }),
    });
    const client = createApiClient({
      getBaseUrl: () => "http://api.test",
      getAccessToken: async () => "tok",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    const result = await listEvents({ instituteId: INST }, client);
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("evt-2");
  });
});
