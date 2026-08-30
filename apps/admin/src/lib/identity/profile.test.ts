import { beforeEach, describe, expect, it, vi } from "vitest";

const PROFILE = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("identity profile API", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("refuses getProfile in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const { getProfile } = await import("./api");
    await expect(getProfile(PROFILE)).rejects.toThrow(/API auth mode/);
  });

  it("does not call network for invalid profile UUID", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const get = vi.fn();
    const client = { get } as never;
    const { getProfile } = await import("./api");
    await expect(getProfile("not-a-uuid", client)).rejects.toThrow(/UUID/);
    expect(get).not.toHaveBeenCalled();
  });

  it("gets profile in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const get = vi.fn().mockResolvedValue({ id: PROFILE, displayName: "Ada" });
    const client = { get } as never;
    const { getProfile } = await import("./api");
    await getProfile(PROFILE, client);
    expect(get).toHaveBeenCalledWith(`/api/v1/profiles/${PROFILE}`);
  });
});

describe("identity profile mutations", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("refuses updateOwnProfile in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const { updateOwnProfile } = await import("./mutations");
    await expect(
      updateOwnProfile(PROFILE, { displayName: "Ada" }),
    ).rejects.toThrow(/API auth mode/);
  });

  it("patches own profile in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const patch = vi.fn().mockResolvedValue({ id: PROFILE });
    const client = { patch } as never;
    const { updateOwnProfile } = await import("./mutations");
    await updateOwnProfile(
      PROFILE,
      { displayName: "Ada Lovelace", phone: "+911234567890" },
      client,
    );
    expect(patch).toHaveBeenCalledWith(`/api/v1/profiles/${PROFILE}`, {
      display_name: "Ada Lovelace",
      phone: "+911234567890",
    });
  });
});
