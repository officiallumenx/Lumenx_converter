import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "@/lib/api";
import type { InstituteDto } from "./types";

const A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

function institute(id: string, name: string, code: string): InstituteDto {
  return {
    id,
    code,
    name,
    kind: "school",
    status: "active",
    createdAt: "2024-01-01T00:00:00Z",
    updatedAt: "2024-01-01T00:00:00Z",
  };
}

describe("institutes api repository", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("refuses to call backend in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const { listInstitutes, getInstitute } = await import("./api");
    const fetchMock = vi.fn();
    const client = createApiClient({
      getBaseUrl: () => "http://api.test",
      getAccessToken: async () => "tok",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    await expect(listInstitutes(client)).rejects.toThrow(/API auth mode/i);
    await expect(getInstitute(A, client)).rejects.toThrow(/API auth mode/i);
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it("lists institutes and unwraps DTO array in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { listInstitutes } = await import("./api");
    const payload = [institute(A, "Alpha School", "ALPHA")];
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
    const result = await listInstitutes(client);
    expect(result).toEqual(payload);
    expect(fetchMock).toHaveBeenCalledWith(
      "http://api.test/api/v1/institutes",
      expect.objectContaining({ method: "GET" }),
    );
  });

  it("gets institute by id in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { getInstitute } = await import("./api");
    const one = institute(B, "Beta College", "BETA");
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      text: async () => JSON.stringify({ data: one }),
    });
    const client = createApiClient({
      getBaseUrl: () => "http://api.test",
      getAccessToken: async () => "tok",
      fetchImpl: fetchMock as unknown as typeof fetch,
    });
    await expect(getInstitute(B, client)).resolves.toEqual(one);
    expect(fetchMock).toHaveBeenCalledWith(
      `http://api.test/api/v1/institutes/${B}`,
      expect.objectContaining({ method: "GET" }),
    );
  });
});
