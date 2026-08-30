import { beforeEach, describe, expect, it, vi } from "vitest";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("institutes mutations", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("refuses update in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const { updateInstitute } = await import("./mutations");
    await expect(
      updateInstitute(INST, { name: "New Name" }),
    ).rejects.toThrow(/API auth mode/);
  });

  it("does not call network for invalid institute UUID", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const patch = vi.fn();
    const client = { patch } as never;
    const { updateInstituteSettings } = await import("./mutations");
    await expect(
      updateInstituteSettings("not-a-uuid", { timezone: "Asia/Kolkata" }, client),
    ).rejects.toThrow(/UUID/);
    expect(patch).not.toHaveBeenCalled();
  });

  it("patches institute identity in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const patch = vi.fn().mockResolvedValue({ id: INST });
    const client = { patch } as never;
    const { updateInstitute } = await import("./mutations");
    await updateInstitute(INST, { name: "Lumen School", status: "active" }, client);
    expect(patch).toHaveBeenCalledWith(
      `/api/v1/institutes/${INST}`,
      expect.objectContaining({ name: "Lumen School", status: "active" }),
    );
  });

  it("patches institute settings in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const patch = vi.fn().mockResolvedValue({ instituteId: INST });
    const client = { patch } as never;
    const { updateInstituteSettings } = await import("./mutations");
    await updateInstituteSettings(
      INST,
      { timezone: "Asia/Kolkata", locale: "en-IN" },
      client,
    );
    expect(patch).toHaveBeenCalledWith(
      `/api/v1/institutes/${INST}/settings`,
      expect.objectContaining({ timezone: "Asia/Kolkata", locale: "en-IN" }),
    );
  });

  it("refuses createInstitute in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const { createInstitute } = await import("./mutations");
    await expect(
      createInstitute({ code: "LX", name: "School", kind: "school" }),
    ).rejects.toThrow(/API auth mode/);
  });

  it("posts createInstitute in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const post = vi.fn().mockResolvedValue({ id: INST });
    const client = { post } as never;
    const { createInstitute } = await import("./mutations");
    await createInstitute(
      {
        code: "LX-DEMO",
        name: "Lumen School",
        kind: "school",
        status: "active",
        timezone: "Asia/Kolkata",
      },
      client,
    );
    expect(post).toHaveBeenCalledWith(
      "/api/v1/institutes",
      expect.objectContaining({
        code: "LX-DEMO",
        name: "Lumen School",
        kind: "school",
        status: "active",
        timezone: "Asia/Kolkata",
      }),
    );
  });
});
