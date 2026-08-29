import { beforeEach, describe, expect, it, vi } from "vitest";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const YEAR = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const CLASS = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const SECTION = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";

describe("classes mutations", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("refuses create in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const { createClass } = await import("./mutations");
    await expect(
      createClass({
        instituteId: INST,
        academicYearId: YEAR,
        name: "Grade 10",
        code: "G10",
      }),
    ).rejects.toThrow(/API auth mode/);
  });

  it("does not call network for invalid section UUID on delete", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const del = vi.fn();
    const client = { delete: del } as never;
    const { deleteSection } = await import("./mutations");
    await expect(deleteSection("not-a-uuid", client)).rejects.toThrow(/UUID/);
    expect(del).not.toHaveBeenCalled();
  });

  it("posts create section payload in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const post = vi.fn().mockResolvedValue({ id: SECTION });
    const client = { post } as never;
    const { createSection } = await import("./mutations");
    await createSection(
      {
        instituteId: INST,
        academicYearId: YEAR,
        classId: CLASS,
        name: "A",
        code: "A",
        capacity: 40,
        room: "B-101",
      },
      client,
    );
    expect(post).toHaveBeenCalledWith(
      "/api/v1/sections",
      expect.objectContaining({
        institute_id: INST,
        class_id: CLASS,
        name: "A",
        capacity: 40,
      }),
    );
  });

  it("patches class in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const patch = vi.fn().mockResolvedValue({ id: CLASS });
    const client = { patch } as never;
    const { updateClass } = await import("./mutations");
    await updateClass(CLASS, { status: "inactive" }, client);
    expect(patch).toHaveBeenCalledWith(
      `/api/v1/classes/${CLASS}`,
      expect.objectContaining({ status: "inactive" }),
    );
  });
});
