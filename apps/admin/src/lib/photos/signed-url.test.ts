import { describe, expect, it } from "vitest";
import {
  isSignedPhotoUrlUsable,
  photoListStaleTimeMs,
  signedPhotoStaleTimeMs,
} from "./signed-url";

describe("signed photo url freshness", () => {
  const now = Date.parse("2026-09-24T12:00:00.000Z");

  it("rejects missing urls", () => {
    expect(isSignedPhotoUrlUsable(null, null, now)).toBe(false);
    expect(isSignedPhotoUrlUsable("", "2026-09-24T13:00:00.000Z", now)).toBe(false);
  });

  it("accepts urls that expire after the skew window", () => {
    expect(
      isSignedPhotoUrlUsable(
        "https://example/photo",
        "2026-09-24T13:00:00.000Z",
        now,
      ),
    ).toBe(true);
  });

  it("rejects urls inside the skew window", () => {
    expect(
      isSignedPhotoUrlUsable(
        "https://example/photo",
        "2026-09-24T12:04:00.000Z",
        now,
      ),
    ).toBe(false);
  });

  it("computes staleTime from expiry", () => {
    expect(signedPhotoStaleTimeMs("2026-09-24T13:00:00.000Z", now)).toBe(25 * 60_000);
    expect(signedPhotoStaleTimeMs("2026-09-24T12:04:00.000Z", now)).toBe(0);
  });

  it("uses the earliest expiry in a photo list", () => {
    expect(
      photoListStaleTimeMs(
        [
          { photoExpiresAt: "2026-09-24T13:00:00.000Z" },
          { photoExpiresAt: "2026-09-24T12:30:00.000Z" },
        ],
        now,
      ),
    ).toBe(20 * 60_000);
  });
});
