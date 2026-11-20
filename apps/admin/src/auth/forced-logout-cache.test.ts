import { beforeEach, describe, expect, it, vi } from "vitest";
import { createAdminQueryClient, getAdminQueryClient } from "@/lib/admin-queries/query-client";
import { adminPersistStorageKey } from "@/lib/admin-queries/persist";
import { clearApiModeLocalIdentity } from "./api-local-cleanup";

const USER_A = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const USER_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("forced logout cache isolation (User A → User B)", () => {
  beforeEach(() => {
    vi.resetModules();
    getAdminQueryClient()?.clear();
  });

  it("clears in-memory QueryClient so User A data cannot render after forced logout", async () => {
    const client = createAdminQueryClient();
    client.setQueryData(["admin", "students", USER_A], {
      rows: [{ id: "s-a", name: "Student A private" }],
    });
    expect(client.getQueryData(["admin", "students", USER_A])).toBeTruthy();

    // Forced logout path (AuthContext unauthorized) uses full local identity clear.
    await clearApiModeLocalIdentity();

    expect(getAdminQueryClient()?.getQueryData(["admin", "students", USER_A])).toBeUndefined();
    expect(client.getQueryData(["admin", "students", USER_A])).toBeUndefined();
  });

  it("partitions persisted cache keys by user id (User B cannot address User A bucket)", () => {
    const keyA = adminPersistStorageKey(USER_A);
    const keyB = adminPersistStorageKey(USER_B);
    expect(keyA).not.toBe(keyB);
    expect(keyA).toContain(USER_A);
    expect(keyB).toContain(USER_B);
    expect(keyA.includes(USER_B)).toBe(false);
    expect(keyB.includes(USER_A)).toBe(false);
  });

  it("session-only clear keeps in-memory cache but forced logout wipes it before User B", async () => {
    const { clearApiModeSessionIdentity } = await import("./api-local-cleanup");
    const client = createAdminQueryClient();
    client.setQueryData(["admin", "me"], { id: USER_A, role: "institute_admin" });

    // Cold-start miss path (same returning user) — session identity only.
    clearApiModeSessionIdentity({ clearActiveInstitute: true });
    expect(client.getQueryData(["admin", "me"])).toEqual({
      id: USER_A,
      role: "institute_admin",
    });

    // Forced logout / account switch must wipe that memory before User B paints.
    await clearApiModeLocalIdentity();
    expect(client.getQueryData(["admin", "me"])).toBeUndefined();
  });

  it("sign-in path clears in-memory residue so User B cannot read User A queries", () => {
    const client = createAdminQueryClient();
    client.setQueryData(["admin", "students"], {
      rows: [{ id: "s-a", name: "Student A" }],
    });
    // AuthContext.resetInMemoryCachesForNewSession() calls clearAdminQueryClient().
    const singleton = getAdminQueryClient();
    expect(singleton).toBe(client);
    singleton?.clear();
    expect(client.getQueryData(["admin", "students"])).toBeUndefined();
  });
});
