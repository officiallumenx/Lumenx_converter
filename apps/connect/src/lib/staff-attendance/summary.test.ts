import { describe, expect, it } from "vitest";
import { buildTeacherSelfAttendanceSummary } from "./summary";
import type { StaffAttendanceDto } from "./types";

function row(
  partial: Partial<StaffAttendanceDto> & Pick<StaffAttendanceDto, "id" | "status" | "dayStatus" | "attendanceDate">,
): StaffAttendanceDto {
  return {
    instituteId: "inst",
    teacherId: "teacher",
    checkIn: null,
    checkOut: null,
    note: null,
    markedByUserId: "admin",
    submittedAt: null,
    submittedByUserId: null,
    createdAt: "",
    updatedAt: "",
    ...partial,
  };
}

describe("buildTeacherSelfAttendanceSummary", () => {
  it("computes percentage from submitted days only", () => {
    const summary = buildTeacherSelfAttendanceSummary([
      row({
        id: "1",
        attendanceDate: "2026-09-01",
        status: "present",
        dayStatus: "submitted",
      }),
      row({
        id: "2",
        attendanceDate: "2026-09-02",
        status: "absent",
        dayStatus: "submitted",
      }),
      row({
        id: "3",
        attendanceDate: "2026-09-03",
        status: "half-day",
        dayStatus: "submitted",
      }),
      row({
        id: "4",
        attendanceDate: "2026-09-04",
        status: "present",
        dayStatus: "draft",
      }),
    ]);

    expect(summary.days).toBe(3);
    expect(summary.present).toBe(1);
    expect(summary.half).toBe(1);
    expect(summary.absent).toBe(1);
    // (present + half) / 3 = 67%
    expect(summary.attendancePct).toBe(67);
    expect(summary.records).toHaveLength(4);
  });

  it("returns 0% when no submitted days", () => {
    const summary = buildTeacherSelfAttendanceSummary([
      row({
        id: "1",
        attendanceDate: "2026-09-01",
        status: "present",
        dayStatus: "draft",
      }),
    ]);
    expect(summary.attendancePct).toBe(0);
    expect(summary.days).toBe(0);
  });
});
