import { describe, expect, it, beforeEach } from "vitest";
import {
  adminCacheKey,
  cachedAdminFetch,
  invalidateAdminCache,
  peekAdminCache,
  setAdminCache,
} from "./admin-resource-cache";

describe("admin-resource-cache", () => {
  beforeEach(() => {
    invalidateAdminCache("admin:");
  });

  it("returns fresh cached values without refetch", async () => {
    const key = adminCacheKey("students-list", "inst-1");
    let calls = 0;
    const fetcher = async () => {
      calls += 1;
      return { status: "ready" as const, items: [1], errorMessage: null };
    };
    await cachedAdminFetch(key, fetcher);
    await cachedAdminFetch(key, fetcher);
    expect(calls).toBe(1);
    expect(peekAdminCache(key)).toEqual({
      status: "ready",
      items: [1],
      errorMessage: null,
    });
  });

  it("force bypasses fresh cache", async () => {
    const key = adminCacheKey("teachers-list", "inst-1");
    setAdminCache(key, { v: 1 });
    let calls = 0;
    await cachedAdminFetch(
      key,
      async () => {
        calls += 1;
        return { v: 2 };
      },
      { force: true },
    );
    expect(calls).toBe(1);
    expect(peekAdminCache<{ v: number }>(key)?.v).toBe(2);
  });
});
