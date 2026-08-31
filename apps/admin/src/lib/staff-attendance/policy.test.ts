import { describe, expect, it } from "vitest";
import {
  canEditSubmittedStaffAttendanceDay,
  staffAttendanceEditWindowRemainingMs,
  STAFF_ATTENDANCE_REOPEN_WINDOW_HOURS,
} from "./policy";

describe("staff-attendance policy", () => {
  it("allows edit within reopen window", () => {
    const now = Date.parse("2026-06-01T12:00:00.000Z");
    const submittedAt = "2026-06-01T10:00:00.000Z";
    expect(canEditSubmittedStaffAttendanceDay(submittedAt, now)).toBe(true);
    expect(staffAttendanceEditWindowRemainingMs(submittedAt, now)).toBe(
      (STAFF_ATTENDANCE_REOPEN_WINDOW_HOURS - 2) * 60 * 60 * 1000,
    );
  });

  it("blocks edit after reopen window expires", () => {
    const submittedAt = "2026-06-01T10:00:00.000Z";
    const now = Date.parse("2026-06-02T08:00:00.000Z");
    expect(canEditSubmittedStaffAttendanceDay(submittedAt, now)).toBe(false);
    expect(staffAttendanceEditWindowRemainingMs(submittedAt, now)).toBe(0);
  });
});
