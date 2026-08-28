import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "@/lib/api";
import type { EventDto } from "./types";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function dto(overrides: Partial<EventDto> = {}): EventDto {
  return {
    id: "cal-1",
    instituteId: INST,
    title: "Summer Break",
    kind: "holiday",
    customKindLabel: null,
    source: "calendar",
    startsOn: "2026-06-01",
    endsOn: null,
    startTime: null,
    endTime: null,
    audienceScope: "all",
    audienceLabel: null,
    classId: null,
    sectionId: null,
    location: null,
    description: null,
    reminder: "none",
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

describe("calendar api repository", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("refuses to call backend in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const { listCalendarEvents } = await import("./api");
    const fetchMock = vi.fn();
    const client = createApiClient({
      getBaseUrl: () => "http://api.test",
      getAccessToken: async () => "tok",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    await expect(
      listCalendarEvents({ instituteId: INST }, client),
    ).rejects.toThrow(/API auth mode/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects non-UUID institute ids without calling fetch", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { listCalendarEvents } = await import("./api");
    const fetchMock = vi.fn();
    const client = createApiClient({
      getBaseUrl: () => "http://api.test",
      getAccessToken: async () => "tok",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    await expect(
      listCalendarEvents({ instituteId: "admin-tenant" }, client),
    ).rejects.toThrow(/UUID/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("lists calendar events with institute_id only in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { listCalendarEvents } = await import("./api");
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
    const result = await listCalendarEvents({ instituteId: INST }, client);
    expect(result).toEqual(payload);
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain(`institute_id=${INST}`);
    expect(url).not.toContain("source=");
    expect(url).not.toContain("include_cancelled");
    expect(fetchMock).toHaveBeenCalledWith(
      expect.stringContaining("/api/v1/events/calendar?"),
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("unwraps response envelope via shared client", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { listCalendarEvents } = await import("./api");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ data: [dto({ id: "cal-2" })] }),
    });
    const client = createApiClient({
      getBaseUrl: () => "http://api.test",
      getAccessToken: async () => "tok",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    const result = await listCalendarEvents({ instituteId: INST }, client);
    expect(result).toHaveLength(1);
    expect(result[0]?.id).toBe("cal-2");
  });
});
