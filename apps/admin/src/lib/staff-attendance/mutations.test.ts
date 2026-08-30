import { beforeEach, describe, expect, it, vi } from "vitest";

const INST = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";
const TEACHER = "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb";
const ROW = "cccccccc-cccc-4ccc-8ccc-cccccccccccc";

describe("staff attendance mutations", () => {
  beforeEach(() => {
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("refuses upsert in demo mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "demo");
    const { upsertStaffAttendanceDay } = await import("./mutations");
    await expect(
      upsertStaffAttendanceDay({
        instituteId: INST,
        date: "2026-08-29",
        marks: [{ teacherId: TEACHER, status: "present" }],
      }),
    ).rejects.toThrow(/API auth mode/);
  });

  it("does not call network for invalid attendance UUID on delete", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const del = vi.fn();
    const client = { delete: del } as never;
    const { deleteStaffAttendance } = await import("./mutations");
    await expect(deleteStaffAttendance("not-a-uuid", client)).rejects.toThrow(
      /UUID/,
    );
    expect(del).not.toHaveBeenCalled();
  });

  it("puts day marks in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const put = vi.fn().mockResolvedValue([{ id: ROW }]);
    const client = { put } as never;
    const { upsertStaffAttendanceDay } = await import("./mutations");
    await upsertStaffAttendanceDay(
      {
        instituteId: INST,
        date: "2026-08-29",
        marks: [{ teacherId: TEACHER, status: "late", note: "Traffic" }],
      },
      client,
    );
    expect(put).toHaveBeenCalledWith(
      "/api/v1/staff-attendance/day",
      expect.objectContaining({
        institute_id: INST,
        date: "2026-08-29",
        marks: [
          expect.objectContaining({
            teacher_id: TEACHER,
            status: "late",
            note: "Traffic",
          }),
        ],
      }),
    );
  });

  it("posts submit and reopen in API mode", async () => {
    vi.stubEnv("VITE_ADMIN_AUTH_MODE", "api");
    const post = vi.fn().mockResolvedValue([]);
    const client = { post } as never;
    const { submitStaffAttendanceDay, reopenStaffAttendanceDay } =
      await import("./mutations");
    await submitStaffAttendanceDay(
      { instituteId: INST, date: "2026-08-29" },
      client,
    );
    await reopenStaffAttendanceDay(
      { instituteId: INST, date: "2026-08-29" },
      client,
    );
    expect(post).toHaveBeenNthCalledWith(
      1,
      "/api/v1/staff-attendance/day/submit",
      { institute_id: INST, date: "2026-08-29" },
    );
    expect(post).toHaveBeenNthCalledWith(
      2,
      "/api/v1/staff-attendance/day/reopen",
      { institute_id: INST, date: "2026-08-29" },
    );
  });
});
