import { beforeEach, describe, expect, it, vi } from "vitest";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

describe("loadInstituteProfile", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("returns demo status without calling API in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const getInstitute = vi.fn();
    vi.doMock("./api", () => ({ getInstitute, getInstituteSettings: vi.fn() }));
    const { loadInstituteProfile } = await import("./profile-load");
    const result = await loadInstituteProfile(INST);
    expect(result.status).toBe("demo");
    expect(getInstitute).not.toHaveBeenCalled();
  });

  it("returns needs_institute for invalid UUID", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const { loadInstituteProfile } = await import("./profile-load");
    const result = await loadInstituteProfile("not-a-uuid");
    expect(result.status).toBe("needs_institute");
  });
});

describe("resolveInstituteProfileView", () => {
  it("blocks stale institute paint during switch", async () => {
    const { resolveInstituteProfileView } = await import("./profile-view");
    const view = resolveInstituteProfileView({
      apiMode: true,
      instituteStatus: "ready",
      activeInstituteId: INST,
      resolvedForInstituteId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      storedInstitute: null,
      storedSettings: null,
      storedStatus: "ready",
      storedErrorMessage: null,
      instituteErrorMessage: null,
    });
    expect(view.status).toBe("loading");
    expect(view.detailValid).toBe(false);
  });
});
