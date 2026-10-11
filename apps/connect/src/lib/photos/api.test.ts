import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/auth/auth-mode", () => ({
  isApiAuthMode: () => true,
}));

import { getPhotoSignedUrl, clearPhotoSignedUrlCache } from "./api";

describe("getPhotoSignedUrl", () => {
  afterEach(() => {
    clearPhotoSignedUrlCache();
    vi.restoreAllMocks();
  });

  it("dedupes concurrent identical requests and reuses TTL cache", async () => {
    const id = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
    let calls = 0;
    const client = {
      get: async () => {
        calls += 1;
        await new Promise((r) => setTimeout(r, 5));
        return {
          kind: "student" as const,
          id,
          photoAssetPath: "p.jpg",
          photoSignedUrl: "https://signed.example/p.jpg",
          photoExpiresAt: new Date(Date.now() + 3_600_000).toISOString(),
        };
      },
    };

    const [a, b] = await Promise.all([
      getPhotoSignedUrl("student", id, client as never),
      getPhotoSignedUrl("student", id, client as never),
    ]);
    expect(a.photoSignedUrl).toBe(b.photoSignedUrl);
    expect(calls).toBe(1);

    const c = await getPhotoSignedUrl("student", id, client as never);
    expect(c.photoSignedUrl).toBe("https://signed.example/p.jpg");
    expect(calls).toBe(1);
  });
});
