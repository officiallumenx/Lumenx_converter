import { beforeEach, describe, expect, it, vi } from "vitest";
import { createApiClient } from "@/lib/api";
import type { InstituteStorageUsageDto } from "./types";

const INST_ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

function usageDto(): InstituteStorageUsageDto {
  return {
    instituteId: INST_ID,
    totalAssets: 2,
    totalBytes: 3072,
    byCategory: [
      { key: "logo", label: "logo", count: 1, bytes: 1024 },
      { key: "other", label: "other", count: 1, bytes: 2048 },
    ],
    byBucket: [
      { key: "institute-branding", label: "institute branding", count: 1, bytes: 1024 },
    ],
  };
}

describe("storage api repository", () => {
  beforeEach(() => {
    vi.resetModules();
  });

  it("refuses to call backend in demo mode", async () => {
    vi.doMock("@/auth/auth-mode", () => ({ isApiAuthMode: () => false }));
    const { getStorageUsage } = await import("./api");
    await expect(getStorageUsage(INST_ID)).rejects.toThrow(/API auth mode/i);
  });

  it("loads institute usage in api mode", async () => {
    vi.doMock("@/auth/auth-mode", () => ({ isApiAuthMode: () => true }));
    vi.doMock("@/lib/admin-api", () => ({
      getAdminApiClient: () =>
        createApiClient({
          getBaseUrl: () => "http://test",
          getAccessToken: async () => "token",
          fetchImpl: async (url) => {
            expect(String(url)).toContain("/api/v1/storage/usage");
            return new Response(JSON.stringify({ data: usageDto() }), {
              status: 200,
              headers: { "Content-Type": "application/json" },
            });
          },
        }),
    }));
    const { getStorageUsage } = await import("./api");
    const data = await getStorageUsage(INST_ID);
    expect(data.totalBytes).toBe(3072);
  });
});
