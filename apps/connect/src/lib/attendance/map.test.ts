import { describe, expect, it } from "vitest";
import {
  monthIsoRange,
  overlayPortalAttendanceDays,
  portalDaysToDetailMap,
  portalDaysToStatusMap,
  presentAbsentRatio,
} from "./map";
import type { AttendanceDay, PortalLearnerAttendanceDto } from "./types";

describe("connect attendance map", () => {
  it("maps portal days to status map and overlays calendar skeleton", () => {
    const dto: PortalLearnerAttendanceDto = {
      instituteId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      studentId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      fromDate: "2026-08-01",
      toDate: "2026-08-31",
      days: [
        {
          date: "2026-08-01",
          status: "present",
          method: "daily",
          presentCount: 1,
          absentCount: 0,
          leaveCount: 0,
          slots: [
            {
              slotCode: "slot:day",
              slotKind: "day",
              slotLabel: "Full day",
              status: "present",
            },
          ],
        },
        {
          date: "2026-08-02",
          status: "partial",
          method: "morning_afternoon",
          presentCount: 1,
          absentCount: 1,
          leaveCount: 0,
          slots: [
            {
              slotCode: "slot:morning",
              slotKind: "morning",
              slotLabel: "Morning",
              status: "present",
            },
            {
              slotCode: "slot:afternoon",
              slotKind: "afternoon",
              slotLabel: "Afternoon",
              status: "absent",
            },
          ],
        },
      ],
      summary: {
        present: 1,
        absent: 0,
        leave: 0,
        unknown: 29,
        attendancePct: 50,
      },
    };

    const statusByDate = portalDaysToStatusMap(dto);
    expect(statusByDate.get("2026-08-02")).toBe("partial");

    const detailByDate = portalDaysToDetailMap(dto);
    const skeleton: AttendanceDay[] = [
      { day: 1, status: "unknown" },
      { day: 2, status: "unknown" },
    ];
    const overlaid = overlayPortalAttendanceDays(skeleton, {
      year: 2026,
      month: 7,
      statusByDate,
      detailByDate,
    });
    expect(overlaid[0]?.status).toBe("present");
    expect(overlaid[1]?.status).toBe("partial");
    expect(overlaid[1]?.slots).toHaveLength(2);
    expect(presentAbsentRatio(overlaid[1]!)).toBe(0.5);
  });

  it("computes month iso range", () => {
    expect(monthIsoRange(2026, 7)).toEqual({
      from: "2026-08-01",
      to: "2026-08-31",
    });
  });
});
