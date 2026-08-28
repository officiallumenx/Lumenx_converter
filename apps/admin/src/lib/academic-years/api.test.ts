import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "@/lib/api";
import type { AcademicYearDto } from "./types";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function dto(overrides: Partial<AcademicYearDto> = {}): AcademicYearDto {
  return {
    id: "yy111111-1111-4111-8111-111111111111",
    instituteId: INST,
    name: "2026-2027",
    code: "AY2627",
    startsOn: "2026-04-01",
    endsOn: "2027-03-31",
    status: "active",
    createdAt: "2026-06-01T10:00:00Z",
    updatedAt: "2026-06-01T10:00:00Z",
    ...overrides,
  };
}

describe("academic-years api repository", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("refuses to call backend in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const { listAcademicYears } = await import("./api");
    const fetchMock = vi.fn();
    const client = createApiClient({
      getBaseUrl: () => "http://api.test",
      getAccessToken: async () => "tok",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    await expect(listAcademicYears({ instituteId: INST }, client)).rejects.toThrow(
      /API auth mode/i,
    );
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("rejects non-UUID institute ids without calling fetch", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { listAcademicYears } = await import("./api");
    const fetchMock = vi.fn();
    const client = createApiClient({
      getBaseUrl: () => "http://api.test",
      getAccessToken: async () => "tok",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    await expect(
      listAcademicYears({ instituteId: "admin-tenant" }, client),
    ).rejects.toThrow(/UUID/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("lists academic years with institute_id only in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { listAcademicYears } = await import("./api");
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
    const result = await listAcademicYears({ instituteId: INST }, client);
    expect(result).toEqual(payload);
    const url = fetchMock.mock.calls[0][0] as string;
    expect(url).toContain(`institute_id=${INST}`);
    expect(url).toContain("/api/v1/academic-years?");
    expect(url).not.toContain("status=");
  });
});
