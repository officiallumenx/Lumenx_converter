import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "@/lib/api";
import type { ComplaintDto } from "./types";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function dto(overrides: Partial<ComplaintDto> = {}): ComplaintDto {
  return {
    id: "cmp-1",
    instituteId: INST,
    title: "HVAC issue",
    body: "Block B too warm",
    category: "Parent",
    priority: "high",
    status: "pending",
    destination: "principal_admin",
    requestedByUserId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
    studentId: null,
    teacherId: null,
    responseNote: null,
    createdAt: "2026-08-01T10:00:00Z",
    updatedAt: "2026-08-01T10:00:00Z",
    ...overrides,
  };
}

describe("complaints api repository", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("refuses to call backend in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const { listComplaints } = await import("./api");
    const fetchMock = vi.fn();
    const client = createApiClient({
      getBaseUrl: () => "http://api.test",
      getAccessToken: async () => "tok",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    await expect(
      listComplaints({ instituteId: INST }, client),
    ).rejects.toThrow(/API auth mode/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects non-UUID institute ids without calling fetch", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { listComplaints } = await import("./api");
    const fetchMock = vi.fn();
    const client = createApiClient({
      getBaseUrl: () => "http://api.test",
      getAccessToken: async () => "tok",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    await expect(
      listComplaints({ instituteId: "admin-tenant" }, client),
    ).rejects.toThrow(/UUID/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("lists complaints with institute_id query in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { listComplaints } = await import("./api");
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
    const result = await listComplaints({ instituteId: INST }, client);
    expect(result).toEqual(payload);
    expect(fetchMock).toHaveBeenCalledWith(
      `http://api.test/api/v1/complaints?institute_id=${INST}`,
      expect.objectContaining({ method: "GET" }),
    );
  });
});
