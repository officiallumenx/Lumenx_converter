import { beforeEach, describe, expect, it, vi } from "vitest";

const ITEM = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("recycle mutations", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("refuses restore in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const { restoreRecycleItem } = await import("./mutations");
    await expect(restoreRecycleItem(ITEM)).rejects.toThrow(/API auth mode/);
  });

  it("does not call network for invalid item UUID on purge", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const post = vi.fn();
    const client = { post } as never;
    const { purgeRecycleItem } = await import("./mutations");
    await expect(purgeRecycleItem("not-a-uuid", client)).rejects.toThrow(/UUID/);
    expect(post).not.toHaveBeenCalled();
  });

  it("posts restore in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const post = vi.fn().mockResolvedValue({ id: ITEM, status: "restored" });
    const client = { post } as never;
    const { restoreRecycleItem } = await import("./mutations");
    await restoreRecycleItem(ITEM, client);
    expect(post).toHaveBeenCalledWith(
      `/api/v1/recycle/items/${ITEM}/restore`,
    );
  });

  it("posts purge in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const post = vi.fn().mockResolvedValue({ id: ITEM, status: "purged" });
    const client = { post } as never;
    const { purgeRecycleItem } = await import("./mutations");
    await purgeRecycleItem(ITEM, client);
    expect(post).toHaveBeenCalledWith(`/api/v1/recycle/items/${ITEM}/purge`);
  });
});
