import { afterEach, describe, expect, it, vi } from "vitest";
import {
  __photoSignedUrlCacheSizeForTests,
  clearPhotoSignedUrlCache,
  getCachedPhotoSignedUrl,
  invalidateCachedPhotoSignedUrl,
  setCachedPhotoSignedUrl,
} from "./signed-url-cache";

describe("photo signed-url cache", () => {
  afterEach(() => {
    clearPhotoSignedUrlCache();
    vi.useRealTimers();
  });

  it("returns cached url within TTL and skips expired", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-10-09T10:00:00.000Z"));
    setCachedPhotoSignedUrl("student", "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa", {
      photoAssetPath: "path/a.jpg",
      photoSignedUrl: "https://example.com/a.jpg?token=1",
      photoExpiresAt: "2026-10-09T11:00:00.000Z",
    });
    expect(
      getCachedPhotoSignedUrl("student", "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa")
        ?.photoSignedUrl,
    ).toBe("https://example.com/a.jpg?token=1");

    // Within margin of expiry — treat as stale.
    vi.setSystemTime(new Date("2026-10-09T10:59:30.000Z"));
    expect(
      getCachedPhotoSignedUrl("student", "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa"),
    ).toBeNull();
    expect(__photoSignedUrlCacheSizeForTests()).toBe(0);
  });

  it("isolates kinds and supports invalidate", () => {
    const id = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
    setCachedPhotoSignedUrl("student", id, {
      photoAssetPath: null,
      photoSignedUrl: "https://example.com/s.jpg",
      photoExpiresAt: null,
    });
    setCachedPhotoSignedUrl("teacher", id, {
      photoAssetPath: null,
      photoSignedUrl: "https://example.com/t.jpg",
      photoExpiresAt: null,
    });
    expect(getCachedPhotoSignedUrl("student", id)?.photoSignedUrl).toContain("/s.jpg");
    expect(getCachedPhotoSignedUrl("teacher", id)?.photoSignedUrl).toContain("/t.jpg");
    invalidateCachedPhotoSignedUrl("student", id);
    expect(getCachedPhotoSignedUrl("student", id)).toBeNull();
    expect(getCachedPhotoSignedUrl("teacher", id)?.photoSignedUrl).toContain("/t.jpg");
  });
});
