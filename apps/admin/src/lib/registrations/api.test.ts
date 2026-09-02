import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "@/lib/api";
import type { InstituteRegistrationDto } from "./types";

const REG_ID = "11111111-1111-4111-8111-111111111111";

function pendingRegistration(): InstituteRegistrationDto {
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
      country: "India",
      state: "Karnataka",
      city: "Bengaluru",
      principalName: "Dr. Ananya Verma",
      principalEmail: "principal@school.edu",
      principalMobile: "+919876543210",
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

describe("registrations api repository", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("refuses to call backend in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const { submitRegistration, fetchOwnRegistration } = await import("./api");
    const fetchMock = vi.fn();
    const client = createApiClient({
      getBaseUrl: () => "http://api.test",
      getAccessToken: async () => "tok",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    await expect(
      submitRegistration(
        {
          applicantName: "Test",
          email: "test@school.edu",
          password: "password123",
          payload: { instituteName: "Test School" },
        },
        client,
      ),
    ).rejects.toThrow(/API auth mode/i);
    await expect(fetchOwnRegistration(client)).rejects.toThrow(/API auth mode/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("posts registration payload without auth in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { submitRegistration } = await import("./api");
    const dto = pendingRegistration();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 201,
      text: async () => JSON.stringify({ data: dto }),
    });
    const client = createApiClient({
      getBaseUrl: () => "http://api.test",
      getAccessToken: async () => "tok",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    const result = await submitRegistration(
      {
        applicantName: "Dr. Ananya Verma",
        email: "principal@school.edu",
        password: "SecurePass123",
        phone: "+919876543210",
        payload: {
          instituteName: "Alpha International School",
          instituteType: "School (K-12)",
        },
      },
      client,
    );
    expect(result).toEqual(dto);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/api/v1/registrations",
      expect.objectContaining({
        method: "POST",
        headers: expect.not.objectContaining({
          Authorization: expect.anything(),
        }),
      }),
    );
    const body = JSON.parse(
      (fetchMock.mock.calls[0][1] as RequestInit).body as string,
    );
    expect(body.applicant_name).toBe("Dr. Ananya Verma");
    expect(body.email).toBe("principal@school.edu");
    expect(body.password).toBe("SecurePass123");
    expect(body.payload.instituteName).toBe("Alpha International School");
  });

  it("fetches own registration with auth in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { fetchOwnRegistration } = await import("./api");
    const dto = pendingRegistration();
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ data: dto }),
    });
    const client = createApiClient({
      getBaseUrl: () => "http://api.test",
      getAccessToken: async () => "tok",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    await expect(fetchOwnRegistration(client)).resolves.toEqual(dto);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/api/v1/registrations/me",
      expect.objectContaining({
        method: "GET",
        headers: expect.objectContaining({
          Authorization: "Bearer tok",
        }),
      }),
    );
  });

  it("posts resubmit payload for rejected registrations in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { resubmitRegistration } = await import("./api");
    const dto = { ...pendingRegistration(), status: "pending" as const };
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ data: dto }),
    });
    const client = createApiClient({
      getBaseUrl: () => "http://api.test",
      getAccessToken: async () => "tok",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    await expect(
      resubmitRegistration(
        {
          payload: {
            instituteName: "Updated School",
          },
        },
        client,
      ),
    ).resolves.toEqual(dto);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/api/v1/registrations/me/resubmit",
      expect.objectContaining({
        method: "POST",
        headers: expect.objectContaining({
          Authorization: "Bearer tok",
        }),
      }),
    );
  });
});
