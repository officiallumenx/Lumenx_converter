import { beforeEach, describe, expect, it, vi } from "vitest";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ASSET = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("assets mutations", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("refuses create in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const { createAsset } = await import("./mutations");
    await expect(
      createAsset({
        instituteId: INST,
        bucket: "institute-branding",
        objectPath: "logo.png",
        category: "logo",
      }),
    ).rejects.toThrow(/API auth mode/);
  });

  it("does not call network for invalid asset UUID on delete", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const del = vi.fn();
    const client = { delete: del } as never;
    const { deleteAsset } = await import("./mutations");
    await expect(deleteAsset("not-a-uuid", client)).rejects.toThrow(/UUID/);
    expect(del).not.toHaveBeenCalled();
  });

  it("posts create payload in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const post = vi.fn().mockResolvedValue({ id: ASSET });
    const client = { post } as never;
    const { createAsset } = await import("./mutations");
    await createAsset(
      {
        instituteId: INST,
        bucket: "student-media",
        objectPath: "photos/a.jpg",
        category: "student_photo",
        fileName: "a.jpg",
      },
      client,
    );
    expect(post).toHaveBeenCalledWith(
      "/api/v1/assets",
      expect.objectContaining({
        institute_id: INST,
        object_path: "photos/a.jpg",
        category: "student_photo",
      }),
    );
  });

  it("deletes asset by UUID in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const del = vi.fn().mockResolvedValue(undefined);
    const client = { delete: del } as never;
    const { deleteAsset } = await import("./mutations");
    await deleteAsset(ASSET, client);
    expect(del).toHaveBeenCalledWith(`/api/v1/assets/${ASSET}`);
  });
});
