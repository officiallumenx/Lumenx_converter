import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "@/lib/api";
import type { PlatformAuditEventDto } from "./types";

const AUDIT_ID = "11111111-1111-4111-8111-111111111111";

function sampleDto(): PlatformAuditEventDto {
  return {
    id: AUDIT_ID,
    scope: "platform",
    instituteId: null,
    actorUserId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    action: "plan_changed",
    entityType: "license",
    entityId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    metadata: {
      operator: "ops.priya",
      targetLabel: "Test1School",
      before: "Plus",
      after: "Max",
    },
    createdAt: "2026-01-04T00:00:00.000Z",
  };
}

describe("nexus audit api repository", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("refuses to call backend in demo mode", async () => {
    vi.stubEnv("VITE_NEXUS_AUTH_MODE", "demo");
    const { listPlatformAuditEvents } = await import("./api");
    const fetchMock = vi.fn();
    const client = createApiClient({
      getBaseUrl: () => "http://api.test",
      getAccessToken: async () => "tok",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    await expect(listPlatformAuditEvents({}, client)).rejects.toThrow(/API auth mode/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("loads audit events from GET /api/nexus/audit in API mode", async () => {
    vi.stubEnv("VITE_NEXUS_AUTH_MODE", "api");
    const { listPlatformAuditEvents } = await import("./api");
    const dto = sampleDto();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ data: [dto] }),
    });
    const client = createApiClient({
      getBaseUrl: () => "http://api.test",
      getAccessToken: async () => "reviewer-token",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    const result = await listPlatformAuditEvents({ limit: 50 }, client);
    expect(result).toEqual([dto]);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/api/nexus/audit?limit=50",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer reviewer-token",
        }),
      }),
    );
  });
});
