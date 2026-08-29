import { beforeEach, describe, expect, it, vi } from "vitest";

const COMPLAINT = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("complaints mutations", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("refuses transition in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const { transitionComplaint } = await import("./mutations");
    await expect(
      transitionComplaint(COMPLAINT, { status: "review" }),
    ).rejects.toThrow(/API auth mode/);
  });

  it("does not call network for invalid complaint UUID on update", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const patch = vi.fn();
    const client = { patch } as never;
    const { updateComplaint } = await import("./mutations");
    await expect(
      updateComplaint("not-a-uuid", { title: "X" }, client),
    ).rejects.toThrow(/UUID/);
    expect(patch).not.toHaveBeenCalled();
  });

  it("posts transition payload in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const post = vi.fn().mockResolvedValue({ id: COMPLAINT, status: "resolved" });
    const client = { post } as never;
    const { transitionComplaint } = await import("./mutations");
    await transitionComplaint(
      COMPLAINT,
      { status: "resolved", responseNote: "Fixed" },
      client,
    );
    expect(post).toHaveBeenCalledWith(
      `/api/v1/complaints/${COMPLAINT}/transition`,
      expect.objectContaining({
        status: "resolved",
        response_note: "Fixed",
      }),
    );
  });

  it("patches complaint in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const patch = vi.fn().mockResolvedValue({ id: COMPLAINT });
    const client = { patch } as never;
    const { updateComplaint } = await import("./mutations");
    await updateComplaint(COMPLAINT, { priority: "high" }, client);
    expect(patch).toHaveBeenCalledWith(
      `/api/v1/complaints/${COMPLAINT}`,
      expect.objectContaining({ priority: "high" }),
    );
  });
});
