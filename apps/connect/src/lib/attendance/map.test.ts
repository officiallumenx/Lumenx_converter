import { describe, expect, it } from "vitest";
import { monthIsoRange, overlayPortalAttendanceDays, portalDaysToStatusMap } from "./map";
import type { AttendanceDay, PortalLearnerAttendanceDto } from "./types";

describe("connect attendance map", () => {
  it("maps portal days to status map and overlays calendar skeleton", () => {
    const dto: PortalLearnerAttendanceDto = {
      instituteId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      studentId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      fromDate: "2026-08-01",
      toDate: "2026-08-31",
      days: [
        { date: "2026-08-01", status: "present" },
        { date: "2026-08-02", status: "absent" },
      ],
      summary: {
        present: 1,
        absent: 1,
        leave: 0,
        unknown: 29,
        attendancePct: 50,
      },
    };

    const statusByDate = portalDaysToStatusMap(dto);
    expect(statusByDate.get("2026-08-02")).toBe("absent");

    const skeleton: AttendanceDay[] = [
      { day: 1, status: "unknown" },
      { day: 2, status: "unknown" },
    ];
    const overlaid = overlayPortalAttendanceDays(skeleton, {
      year: 2026,
      month: 7,
      statusByDate,
    });
    expect(overlaid[0]?.status).toBe("present");
    expect(overlaid[1]?.status).toBe("absent");
  });

  it("computes month iso range", () => {
    expect(monthIsoRange(2026, 7)).toEqual({
      from: "2026-08-01",
      to: "2026-08-31",
    });
  });
});
