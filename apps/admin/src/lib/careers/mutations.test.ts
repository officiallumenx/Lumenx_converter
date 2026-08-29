import { beforeEach, describe, expect, it, vi } from "vitest";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("careers mutations", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("refuses create in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const { createCareerJob } = await import("./mutations");
    await expect(
      createCareerJob({ instituteId: INST, title: "Math Teacher" }),
    ).rejects.toThrow(/API auth mode/);
  });

  it("does not call network for invalid UUID on delete", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const del = vi.fn();
    const client = { delete: del } as never;
    const { deleteCareerJob } = await import("./mutations");
    await expect(deleteCareerJob("bad", client)).rejects.toThrow(/UUID/);
    expect(del).not.toHaveBeenCalled();
  });

  it("posts job in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const post = vi.fn().mockResolvedValue({ id: ID });
    const client = { post } as never;
    const { createCareerJob } = await import("./mutations");
    await createCareerJob(
      { instituteId: INST, title: "Math Teacher", openNow: true },
      client,
    );
    expect(post).toHaveBeenCalledWith(
      "/api/v1/careers/jobs",
      expect.objectContaining({
        institute_id: INST,
        title: "Math Teacher",
        open_now: true,
      }),
    );
  });
});
