import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "@/lib/api";
import type { DriverDto, VehicleDto } from "./types";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function dto(overrides: Partial<VehicleDto> = {}): VehicleDto {
  return {
    id: "vv111111-1111-4111-8111-111111111111",
    instituteId: INST,
    vehicleNumber: "BUS-01",
    registrationNumber: "KA-01-LX-4521",
    capacity: 40,
    status: "active",
    notes: null,
    createdAt: "2026-06-01T10:00:00Z",
    updatedAt: "2026-06-01T10:00:00Z",
    ...overrides,
  };
}

describe("transport vehicles api repository", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("lists vehicles with institute_id in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { listTransportVehicles } = await import("./api");
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
    const result = await listTransportVehicles({ instituteId: INST }, client);
    expect(result).toEqual(payload);
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("/api/v1/transport/vehicles?");
    expect(url).toContain(`institute_id=${INST}`);
  });

  it("lists drivers with institute_id in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { listTransportDrivers } = await import("./api");
    const payload: DriverDto[] = [
      {
        id: "dd111111-1111-4111-8111-111111111111",
        instituteId: INST,
        userProfileId: null,
        displayName: "Ravi Kumar",
        phone: "+91 98765 43210",
        licenseNumber: "DL-12345",
        licenseExpiry: "2027-01-01",
        status: "active",
        notes: null,
        createdAt: "2026-06-01T10:00:00Z",
        updatedAt: "2026-06-01T10:00:00Z",
      },
    ];
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
    const result = await listTransportDrivers({ instituteId: INST }, client);
    expect(result).toEqual(payload);
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain("/api/v1/transport/drivers?");
    expect(url).toContain(`institute_id=${INST}`);
  });
});
