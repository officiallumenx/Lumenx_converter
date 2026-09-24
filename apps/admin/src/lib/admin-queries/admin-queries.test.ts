import { describe, expect, it } from "vitest";
import {
  ADMIN_QUERY_CACHE_BUSTER,
  ADMIN_QUERY_CATALOG_STALE_TIME_MS,
  ADMIN_QUERY_GC_TIME_MS,
  ADMIN_QUERY_PERSIST_MAX_AGE_MS,
  ADMIN_QUERY_SCOPE,
  ADMIN_QUERY_STALE_TIME_MS,
  adminInstitutePrefix,
  adminModulePrefix,
  adminPersistStorageKey,
  adminQueryKeys,
  adminQueryRoots,
  adminScopePrefix,
  isAdminPersistStorageKey,
  shouldDehydrateAdminQuery,
} from "./index";

describe("admin query keys", () => {
  it("uses stable admin/institute/entity shape", () => {
    expect(adminQueryKeys.students("inst-1", { q: "a" })).toEqual([
      ADMIN_QUERY_SCOPE,
      "inst-1",
      "students",
      { q: "a" },
    ]);
    expect(adminQueryKeys.student("inst-1", "stu-1")).toEqual([
      ADMIN_QUERY_SCOPE,
      "inst-1",
      "student",
      "stu-1",
    ]);
    expect(adminModulePrefix("inst-1", adminQueryRoots.teachers)).toEqual([
      ADMIN_QUERY_SCOPE,
      "inst-1",
      "teachers",
    ]);
  });

  it("scopes institutes separately", () => {
    const a = adminQueryKeys.students("inst-a", {});
    const b = adminQueryKeys.students("inst-b", {});
    expect(a[1]).not.toBe(b[1]);
    expect(adminInstitutePrefix("inst-a")).toEqual([ADMIN_QUERY_SCOPE, "inst-a"]);
    expect(adminScopePrefix()).toEqual([ADMIN_QUERY_SCOPE]);
  });
});

describe("persist helpers", () => {
  it("scopes storage keys by user and buster", () => {
    const a = adminPersistStorageKey("user-a");
    const b = adminPersistStorageKey("user-b");
    expect(a).not.toBe(b);
    expect(a).toContain("user-a");
    expect(b).toContain("user-b");
    expect(a).toContain(`v${ADMIN_QUERY_CACHE_BUSTER}`);
    expect(isAdminPersistStorageKey(a)).toBe(true);
    expect(isAdminPersistStorageKey("other-key")).toBe(false);
  });

  it("rejects empty user ids for persist keys", () => {
    expect(() => adminPersistStorageKey("")).toThrow(/non-empty user id/);
    expect(() => adminPersistStorageKey("   ")).toThrow(/non-empty user id/);
  });

  it("dehydrates successful admin queries only", () => {
    expect(
      shouldDehydrateAdminQuery({
        queryKey: [ADMIN_QUERY_SCOPE, "i1", "students", {}],
        state: { status: "success" },
      }),
    ).toBe(true);
    expect(
      shouldDehydrateAdminQuery({
        queryKey: [ADMIN_QUERY_SCOPE, "i1", "students", {}],
        state: { status: "pending" },
      }),
    ).toBe(false);
    expect(
      shouldDehydrateAdminQuery({
        queryKey: ["other", "i1"],
        state: { status: "success" },
      }),
    ).toBe(false);
    expect(
      shouldDehydrateAdminQuery({
        queryKey: [ADMIN_QUERY_SCOPE, "i1", "token-secret"],
        state: { status: "success" },
      }),
    ).toBe(false);
  });
});

describe("cache-first constants", () => {
  it("keeps list/catalog stale aligned with persist maxAge and gcTime", () => {
    expect(ADMIN_QUERY_STALE_TIME_MS).toBe(ADMIN_QUERY_PERSIST_MAX_AGE_MS);
    expect(ADMIN_QUERY_CATALOG_STALE_TIME_MS).toBe(ADMIN_QUERY_PERSIST_MAX_AGE_MS);
    expect(ADMIN_QUERY_GC_TIME_MS).toBeGreaterThanOrEqual(ADMIN_QUERY_PERSIST_MAX_AGE_MS);
  });
});
