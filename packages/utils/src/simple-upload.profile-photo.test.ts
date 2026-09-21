import { describe, expect, it } from "vitest";
import {
  PROFILE_PHOTO_COMPRESS,
  prepareProfilePhotoFile,
  profilePhotoCompressLabel,
} from "./simple-upload";

describe("PROFILE_PHOTO_COMPRESS", () => {
  it("documents profile-friendly limits (not full camera originals)", () => {
    expect(PROFILE_PHOTO_COMPRESS.maxEdge).toBe(1200);
    expect(PROFILE_PHOTO_COMPRESS.maxBytes).toBe(800 * 1024);
    expect(PROFILE_PHOTO_COMPRESS.maxBytes).toBeLessThan(2 * 1024 * 1024);
    expect(PROFILE_PHOTO_COMPRESS.preferredMime).toBe("image/webp");
    expect(PROFILE_PHOTO_COMPRESS.fallbackMime).toBe("image/jpeg");
  });

  it("exposes a human-readable compress label", () => {
    expect(profilePhotoCompressLabel()).toMatch(/1200px/);
    expect(profilePhotoCompressLabel()).toMatch(/800 KB/);
  });
});

describe("prepareProfilePhotoFile validation", () => {
  it("rejects non-image files before any upload", async () => {
    const pdf = new File([new Uint8Array([1, 2, 3])], "doc.pdf", {
      type: "application/pdf",
    });
    await expect(prepareProfilePhotoFile(pdf)).rejects.toThrow(/JPEG|PNG|WebP/i);
  });

  it("rejects empty files", async () => {
    const empty = new File([], "empty.jpg", { type: "image/jpeg" });
    await expect(prepareProfilePhotoFile(empty)).rejects.toThrow(/empty/i);
  });
});
