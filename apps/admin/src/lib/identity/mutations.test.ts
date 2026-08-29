import { beforeEach, describe, expect, it, vi } from "vitest";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const USER = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const MEMBERSHIP = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

describe("identity memberships mutations", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("refuses create in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const { createMembership } = await import("./mutations");
    await expect(
      createMembership({
        instituteId: INST,
        userId: USER,
        roles: ["admin"],
      }),
    ).rejects.toThrow(/API auth mode/);
  });

  it("does not call network for invalid membership UUID on delete", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const del = vi.fn();
    const client = { delete: del } as never;
    const { deleteMembership } = await import("./mutations");
    await expect(deleteMembership("not-a-uuid", client)).rejects.toThrow(/UUID/);
    expect(del).not.toHaveBeenCalled();
  });

  it("posts create payload in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const post = vi.fn().mockResolvedValue({ id: MEMBERSHIP });
    const client = { post } as never;
    const { createMembership } = await import("./mutations");
    await createMembership(
      {
        instituteId: INST,
        userId: USER,
        roles: ["admin", "teacher"],
        status: "invited",
      },
      client,
    );
    expect(post).toHaveBeenCalledWith(
      "/api/v1/memberships",
      expect.objectContaining({
        institute_id: INST,
        user_id: USER,
        roles: ["admin", "teacher"],
        status: "invited",
      }),
    );
  });

  it("patches update payload in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const patch = vi.fn().mockResolvedValue({ id: MEMBERSHIP });
    const client = { patch } as never;
    const { updateMembership } = await import("./mutations");
    await updateMembership(
      MEMBERSHIP,
      { status: "suspended", roles: ["admin"] },
      client,
    );
    expect(patch).toHaveBeenCalledWith(`/api/v1/memberships/${MEMBERSHIP}`, {
      status: "suspended",
      roles: ["admin"],
    });
  });
});
