import { beforeEach, describe, expect, it, vi } from "vitest";

const LEAVE = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("leave mutations", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("refuses decide in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const { decideLeave } = await import("./mutations");
    await expect(
      decideLeave(LEAVE, { outcome: "approved" }),
    ).rejects.toThrow(/API auth mode/);
  });

  it("does not call network for invalid leave UUID on cancel", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const post = vi.fn();
    const client = { post } as never;
    const { cancelLeave } = await import("./mutations");
    await expect(cancelLeave("not-a-uuid", client)).rejects.toThrow(/UUID/);
    expect(post).not.toHaveBeenCalled();
  });

  it("posts decide payload in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const post = vi.fn().mockResolvedValue({ id: LEAVE, status: "approved" });
    const client = { post } as never;
    const { decideLeave } = await import("./mutations");
    await decideLeave(LEAVE, { outcome: "approved", note: "OK" }, client);
    expect(post).toHaveBeenCalledWith(
      `/api/v1/leave/requests/${LEAVE}/decide`,
      expect.objectContaining({ outcome: "approved", note: "OK" }),
    );
  });

  it("posts cancel in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const post = vi.fn().mockResolvedValue({ id: LEAVE, status: "cancelled" });
    const client = { post } as never;
    const { cancelLeave } = await import("./mutations");
    await cancelLeave(LEAVE, client);
    expect(post).toHaveBeenCalledWith(
      `/api/v1/leave/requests/${LEAVE}/cancel`,
    );
  });
});
