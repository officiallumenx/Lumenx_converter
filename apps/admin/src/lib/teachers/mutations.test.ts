import { beforeEach, describe, expect, it, vi } from "vitest";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const TEACHER = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";

describe("teachers mutations", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("refuses create in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const { createTeacher } = await import("./mutations");
    await expect(
      createTeacher({
        instituteId: INST,
        displayName: "Sarah",
        department: "Mathematics",
        teachingScope: "subject_teacher",
        portalAccessLevel: "faculty_grading",
      }),
    ).rejects.toThrow(/API auth mode/);
  });

  it("does not call network for invalid teacher UUID on delete", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const del = vi.fn();
    const client = { delete: del } as never;
    const { deleteTeacher } = await import("./mutations");
    await expect(deleteTeacher("not-a-uuid", client)).rejects.toThrow(/UUID/);
    expect(del).not.toHaveBeenCalled();
  });

  it("posts create payload in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const post = vi.fn().mockResolvedValue({ id: TEACHER });
    const client = { post } as never;
    const { createTeacher } = await import("./mutations");
    await createTeacher(
      {
        instituteId: INST,
        displayName: "Sarah Jenkins",
        department: "Mathematics",
        teachingScope: "subject_teacher",
        portalAccessLevel: "faculty_grading",
        email: "s.jenkins@institute.edu",
      },
      client,
    );
    expect(post).toHaveBeenCalledWith(
      "/api/v1/teachers",
      expect.objectContaining({
        institute_id: INST,
        display_name: "Sarah Jenkins",
        department: "Mathematics",
        teaching_scope: "subject_teacher",
        portal_access_level: "faculty_grading",
      }),
    );
  });

  it("patches update payload in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const patch = vi.fn().mockResolvedValue({ id: TEACHER });
    const client = { patch } as never;
    const { updateTeacher } = await import("./mutations");
    await updateTeacher(
      TEACHER,
      { displayName: "Sarah J.", status: "on_leave" },
      client,
    );
    expect(patch).toHaveBeenCalledWith(`/api/v1/teachers/${TEACHER}`, {
      display_name: "Sarah J.",
      status: "on_leave",
    });
  });
});
