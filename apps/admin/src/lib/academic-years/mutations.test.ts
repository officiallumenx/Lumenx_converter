import { beforeEach, describe, expect, it, vi } from "vitest";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const YEAR = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("academic-years mutations", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("refuses create in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const { createAcademicYear } = await import("./mutations");
    await expect(
      createAcademicYear({
        instituteId: INST,
        name: "2025-26",
        code: "AY2526",
        startsOn: "2025-04-01",
        endsOn: "2026-03-31",
      }),
    ).rejects.toThrow(/API auth mode/);
  });

  it("does not call network for invalid year UUID on delete", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const del = vi.fn();
    const client = { delete: del } as never;
    const { deleteAcademicYear } = await import("./mutations");
    await expect(deleteAcademicYear("not-a-uuid", client)).rejects.toThrow(/UUID/);
    expect(del).not.toHaveBeenCalled();
  });

  it("posts create payload in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const post = vi.fn().mockResolvedValue({ id: YEAR });
    const client = { post } as never;
    const { createAcademicYear } = await import("./mutations");
    await createAcademicYear(
      {
        instituteId: INST,
        name: "2025-26",
        code: "AY2526",
        startsOn: "2025-04-01",
        endsOn: "2026-03-31",
        status: "upcoming",
      },
      client,
    );
    expect(post).toHaveBeenCalledWith(
      "/api/v1/academic-years",
      expect.objectContaining({
        institute_id: INST,
        name: "2025-26",
        code: "AY2526",
        starts_on: "2025-04-01",
        ends_on: "2026-03-31",
      }),
    );
  });

  it("patches academic year in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const patch = vi.fn().mockResolvedValue({ id: YEAR });
    const client = { patch } as never;
    const { updateAcademicYear } = await import("./mutations");
    await updateAcademicYear(YEAR, { status: "active" }, client);
    expect(patch).toHaveBeenCalledWith(
      `/api/v1/academic-years/${YEAR}`,
      expect.objectContaining({ status: "active" }),
    );
  });
});
