import { describe, expect, it } from "vitest";
import { pickTodayPeriods, timetableDtoToWeeklySchedule } from "./map";
import type { PortalTimetableDto } from "./types";

describe("connect timetable map", () => {
  it("maps portal dto to weekly schedule", () => {
    const dto: PortalTimetableDto = {
      instituteId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
      studentId: "bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb",
      sectionId: "cccccccc-cccc-4ccc-8ccc-cccccccccccc",
      weekdays: ["Monday", "Tuesday"],
      periods: [
        {
          id: "p1",
          dayOfWeek: 1,
          dayLabel: "Monday",
          periodIndex: 1,
          time: "09:00 – 09:45",
          subject: "Mathematics",
          teacher: "Ada Teacher",
          room: "101",
        },
        {
          id: "p2",
          dayOfWeek: 2,
          dayLabel: "Tuesday",
          periodIndex: 1,
          time: "10:00 – 10:45",
          subject: "Science",
          teacher: "Bob Teacher",
          room: "102",
        },
      ],
    };

    const schedule = timetableDtoToWeeklySchedule(dto);
    expect(schedule.Monday?.[0]?.subject).toBe("Mathematics");
    expect(schedule.Tuesday?.[0]?.teacher).toBe("Bob Teacher");
  });

  it("picks today periods from weekly schedule", () => {
    const schedule = {
      Monday: [{ time: "09:00 – 09:45", subject: "Math", teacher: "Ada" }],
      Tuesday: [{ time: "10:00 – 10:45", subject: "Science", teacher: "Bob" }],
    };
    expect(pickTodayPeriods(schedule, "Monday")).toHaveLength(1);
    expect(pickTodayPeriods(schedule, "Wednesday")).toEqual([]);
  });
});
