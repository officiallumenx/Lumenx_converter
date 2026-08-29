import { beforeEach, describe, expect, it, vi } from "vitest";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ANN = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("announcements mutations", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("refuses create in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const { createAnnouncement } = await import("./mutations");
    await expect(
      createAnnouncement({ instituteId: INST, title: "Hello" }),
    ).rejects.toThrow(/API auth mode/);
  });

  it("does not call network for invalid announcement UUID on delete", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const del = vi.fn();
    const client = { delete: del } as never;
    const { deleteAnnouncement } = await import("./mutations");
    await expect(deleteAnnouncement("not-a-uuid", client)).rejects.toThrow(
      /UUID/,
    );
    expect(del).not.toHaveBeenCalled();
  });

  it("posts create payload in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const post = vi.fn().mockResolvedValue({ id: ANN });
    const client = { post } as never;
    const { createAnnouncement } = await import("./mutations");
    await createAnnouncement(
      {
        instituteId: INST,
        title: "Sports Day",
        body: "Details",
        audienceScope: "all",
        publishNow: true,
      },
      client,
    );
    expect(post).toHaveBeenCalledWith(
      "/api/v1/announcements",
      expect.objectContaining({
        institute_id: INST,
        title: "Sports Day",
        publish_now: true,
      }),
    );
  });

  it("posts publish in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const post = vi.fn().mockResolvedValue({ id: ANN });
    const client = { post } as never;
    const { publishAnnouncement } = await import("./mutations");
    await publishAnnouncement(ANN, client);
    expect(post).toHaveBeenCalledWith(
      `/api/v1/announcements/${ANN}/publish`,
    );
  });
});
