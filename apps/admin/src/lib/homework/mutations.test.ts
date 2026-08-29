import { beforeEach, describe, expect, it, vi } from "vitest";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const YEAR = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const CLASS = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const SECTION = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const SUBJECT = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const HW = "ffffffff-ffff-4fff-8fff-ffffffffffff";

describe("homework mutations", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("refuses create in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const { createHomework } = await import("./mutations");
    await expect(
      createHomework({
        instituteId: INST,
        academicYearId: YEAR,
        classId: CLASS,
        sectionId: SECTION,
        subjectId: SUBJECT,
        kind: "homework",
        title: "Essay",
        description: "Write",
        dueDate: "2026-09-01",
      }),
    ).rejects.toThrow(/API auth mode/);
  });

  it("does not call network for invalid homework UUID on delete", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const del = vi.fn();
    const client = { delete: del } as never;
    const { deleteHomework } = await import("./mutations");
    await expect(deleteHomework("not-a-uuid", client)).rejects.toThrow(/UUID/);
    expect(del).not.toHaveBeenCalled();
  });

  it("posts create payload in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const post = vi.fn().mockResolvedValue({ id: HW });
    const client = { post } as never;
    const { createHomework } = await import("./mutations");
    await createHomework(
      {
        instituteId: INST,
        academicYearId: YEAR,
        classId: CLASS,
        sectionId: SECTION,
        subjectId: SUBJECT,
        kind: "homework",
        title: "Essay",
        description: "Write",
        dueDate: "2026-09-01",
      },
      client,
    );
    expect(post).toHaveBeenCalledWith(
      "/api/v1/homework",
      expect.objectContaining({
        institute_id: INST,
        title: "Essay",
        due_date: "2026-09-01",
      }),
    );
  });

  it("posts publish in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const post = vi.fn().mockResolvedValue({ id: HW });
    const client = { post } as never;
    const { publishHomework } = await import("./mutations");
    await publishHomework(HW, client);
    expect(post).toHaveBeenCalledWith(`/api/v1/homework/${HW}/publish`);
  });
});
