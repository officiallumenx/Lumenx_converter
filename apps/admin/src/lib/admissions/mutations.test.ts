import { beforeEach, describe, expect, it, vi } from "vitest";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const ID = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("admissions mutations", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("refuses create in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const { createAdmissionProgram } = await import("./mutations");
    await expect(
      createAdmissionProgram({ instituteId: INST, name: "Grade 1" }),
    ).rejects.toThrow(/API auth mode/);
  });

  it("does not call network for invalid UUID on delete", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const del = vi.fn();
    const client = { delete: del } as never;
    const { deleteAdmissionProgram } = await import("./mutations");
    await expect(deleteAdmissionProgram("bad", client)).rejects.toThrow(/UUID/);
    expect(del).not.toHaveBeenCalled();
  });

  it("posts program and transitions application in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const post = vi.fn().mockResolvedValue({ id: ID });
    const client = { post } as never;
    const { createAdmissionProgram, transitionAdmissionApplication } =
      await import("./mutations");
    await createAdmissionProgram({ instituteId: INST, name: "Grade 1" }, client);
    expect(post).toHaveBeenCalledWith(
      "/api/v1/admissions/programs",
      expect.objectContaining({ institute_id: INST, name: "Grade 1" }),
    );
    await transitionAdmissionApplication(
      ID,
      { status: "approved", decisionNote: "ok" },
      client,
    );
    expect(post).toHaveBeenCalledWith(
      `/api/v1/admissions/applications/${ID}/transition`,
      expect.objectContaining({ status: "approved", decision_note: "ok" }),
    );
  });
});
