import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "@/lib/api";
import type { InstituteRegistrationDto } from "./types";

const REG_ID = "11111111-1111-4111-8111-111111111111";

function pendingDto(): InstituteRegistrationDto {
  return {
    id: REG_ID,
    applicantUserId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
    applicantName: "Dr. Ananya Verma",
    email: "principal@school.edu",
    phone: "+919876543210",
    payload: {
      instituteName: "Alpha International School",
      instituteType: "School (K-12)",
      educationBoard: "CBSE",
      city: "Bengaluru",
      state: "Karnataka",
    },
    status: "pending",
    reviewedBy: null,
    reviewedAt: null,
    rejectionReason: null,
    instituteId: null,
    createdAt: "2024-06-01T08:00:00Z",
    updatedAt: "2024-06-01T08:00:00Z",
  };
}

describe("nexus registrations api repository", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("refuses to call backend in demo mode", async () => {
    vi.stubEnv("VITE_NEXUS_AUTH_MODE", "demo");
    const { listRegistrations } = await import("./api");
    const fetchMock = vi.fn();
    const client = createApiClient({
      getBaseUrl: () => "http://api.test",
      getAccessToken: async () => "tok",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    await expect(listRegistrations("all", client)).rejects.toThrow(/API auth mode/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("loads registrations from GET /api/nexus/registrations in API mode", async () => {
    vi.stubEnv("VITE_NEXUS_AUTH_MODE", "api");
    const { listRegistrations } = await import("./api");
    const dto = pendingDto();
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
    const result = await listRegistrations("pending", client);
    expect(result).toEqual([dto]);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/api/nexus/registrations?status=pending",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer reviewer-token",
        }),
      }),
    );
  });
});
