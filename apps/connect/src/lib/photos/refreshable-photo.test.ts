import { beforeEach, describe, expect, it, vi } from "vitest";

const getPhotoSignedUrl = vi.fn();
const invalidateCachedPhotoSignedUrl = vi.fn();

vi.mock("./api", () => ({
  getPhotoSignedUrl: (...args: unknown[]) => getPhotoSignedUrl(...args),
  invalidateCachedPhotoSignedUrl: (...args: unknown[]) =>
    invalidateCachedPhotoSignedUrl(...args),
}));

import {
  __resetPhotoRefreshAttemptsForTests,
  clearPhotoRefreshAttempts,
  refreshPhotoSignedUrlOnFailure,
} from "./refreshable-photo";

const ID = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("refreshPhotoSignedUrlOnFailure", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    __resetPhotoRefreshAttemptsForTests();
  });

  it("invalidates cache and returns a fresh URL once", async () => {
    getPhotoSignedUrl.mockResolvedValueOnce({
      kind: "student",
      id: ID,
      photoAssetPath: "p",
      photoSignedUrl: "https://signed.example/new",
      photoExpiresAt: null,
    });

    const url = await refreshPhotoSignedUrlOnFailure("student", ID);
    expect(invalidateCachedPhotoSignedUrl).toHaveBeenCalledWith("student", ID);
    expect(getPhotoSignedUrl).toHaveBeenCalledTimes(1);
    expect(url).toBe("https://signed.example/new");
  });

  it("stops after one refresh attempt (no loop)", async () => {
    getPhotoSignedUrl.mockResolvedValue({
      kind: "student",
      id: ID,
      photoAssetPath: "p",
      photoSignedUrl: "https://signed.example/a",
      photoExpiresAt: null,
    });

    await refreshPhotoSignedUrlOnFailure("student", ID);
    const second = await refreshPhotoSignedUrlOnFailure("student", ID);
    expect(second).toBeNull();
    expect(getPhotoSignedUrl).toHaveBeenCalledTimes(1);
  });

  it("allows another refresh after clearPhotoRefreshAttempts", async () => {
    getPhotoSignedUrl.mockResolvedValue({
      kind: "student",
      id: ID,
      photoAssetPath: "p",
      photoSignedUrl: "https://signed.example/b",
      photoExpiresAt: null,
    });

    await refreshPhotoSignedUrlOnFailure("student", ID);
    clearPhotoRefreshAttempts("student", ID);
    const again = await refreshPhotoSignedUrlOnFailure("student", ID);
    expect(again).toBe("https://signed.example/b");
    expect(getPhotoSignedUrl).toHaveBeenCalledTimes(2);
  });

  it("isolates attempt counters per id", async () => {
    const ID_B = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    getPhotoSignedUrl.mockResolvedValue({
      kind: "student",
      id: ID,
      photoAssetPath: null,
      photoSignedUrl: "https://signed.example/x",
      photoExpiresAt: null,
    });

    await refreshPhotoSignedUrlOnFailure("student", ID);
    await refreshPhotoSignedUrlOnFailure("student", ID_B);
    expect(getPhotoSignedUrl).toHaveBeenCalledTimes(2);
  });
});
