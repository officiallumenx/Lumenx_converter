import { beforeEach, describe, expect, it, vi } from "vitest";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const YEAR = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const CLASS = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";
const SECTION = "dddddddd-dddd-4ddd-8ddd-dddddddddddd";
const ASSIGN = "eeeeeeee-eeee-4eee-8eee-eeeeeeeeeeee";
const SLOT = "ffffffff-ffff-4fff-8fff-ffffffffffff";

describe("timetable mutations", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("refuses create in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const { createTimetableSlot } = await import("./mutations");
    await expect(
      createTimetableSlot({
        instituteId: INST,
        academicYearId: YEAR,
        classId: CLASS,
        sectionId: SECTION,
        teacherAssignmentId: ASSIGN,
        dayOfWeek: 1,
        periodIndex: 1,
        startsAt: "09:00",
        endsAt: "09:45",
      }),
    ).rejects.toThrow(/API auth mode/);
  });

  it("does not call network for invalid slot UUID on delete", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const del = vi.fn();
    const client = { delete: del } as never;
    const { deleteTimetableSlot } = await import("./mutations");
    await expect(deleteTimetableSlot("not-a-uuid", client)).rejects.toThrow(
      /UUID/,
    );
    expect(del).not.toHaveBeenCalled();
  });

  it("does not call network for invalid assignment UUID on create", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const post = vi.fn();
    const client = { post } as never;
    const { createTimetableSlot } = await import("./mutations");
    await expect(
      createTimetableSlot(
        {
          instituteId: INST,
          academicYearId: YEAR,
          classId: CLASS,
          sectionId: SECTION,
          teacherAssignmentId: "bad",
          dayOfWeek: 1,
          periodIndex: 1,
          startsAt: "09:00",
          endsAt: "09:45",
        },
        client,
      ),
    ).rejects.toThrow(/UUID/);
    expect(post).not.toHaveBeenCalled();
  });

  it("posts create payload in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const post = vi.fn().mockResolvedValue({ id: SLOT });
    const client = { post } as never;
    const { createTimetableSlot } = await import("./mutations");
    await createTimetableSlot(
      {
        instituteId: INST,
        academicYearId: YEAR,
        classId: CLASS,
        sectionId: SECTION,
        teacherAssignmentId: ASSIGN,
        dayOfWeek: 2,
        periodIndex: 3,
        startsAt: "10:00",
        endsAt: "10:45",
        room: "B-12",
      },
      client,
    );
    expect(post).toHaveBeenCalledWith(
      "/api/v1/timetable",
      expect.objectContaining({
        institute_id: INST,
        teacher_assignment_id: ASSIGN,
        day_of_week: 2,
        period_index: 3,
      }),
    );
  });

  it("patches update payload in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const patch = vi.fn().mockResolvedValue({ id: SLOT });
    const client = { patch } as never;
    const { updateTimetableSlot } = await import("./mutations");
    await updateTimetableSlot(
      SLOT,
      {
        room: "Lab-2",
        status: "inactive",
        dayOfWeek: 4,
        periodIndex: 2,
        startsAt: "11:00",
        endsAt: "11:45",
        teacherAssignmentId: ASSIGN,
      },
      client,
    );
    expect(patch).toHaveBeenCalledWith(
      `/api/v1/timetable/${SLOT}`,
      expect.objectContaining({
        room: "Lab-2",
        status: "inactive",
        day_of_week: 4,
        period_index: 2,
        teacher_assignment_id: ASSIGN,
      }),
    );
  });

  it("rejects empty update payload without calling network", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const patch = vi.fn();
    const client = { patch } as never;
    const { updateTimetableSlot } = await import("./mutations");
    await expect(updateTimetableSlot(SLOT, {}, client)).rejects.toThrow(
      /At least one field/,
    );
    expect(patch).not.toHaveBeenCalled();
  });

  it("deletes slot in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const del = vi.fn().mockResolvedValue(undefined);
    const client = { delete: del } as never;
    const { deleteTimetableSlot } = await import("./mutations");
    await deleteTimetableSlot(SLOT, client);
    expect(del).toHaveBeenCalledWith(`/api/v1/timetable/${SLOT}`);
  });
});
