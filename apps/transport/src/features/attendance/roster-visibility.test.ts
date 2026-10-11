import { describe, expect, it } from "vitest";
import {
  defaultAttendanceTabForSlot,
  requiresBoardedBeforeDrop,
  resolveDropStopIdForMark,
  rosterForAttendanceTab,
} from "./roster-visibility";
import type { AttendanceStudentState } from "@/lib/transport";

function student(
  id: string,
  boarding: AttendanceStudentState["boarding"],
): AttendanceStudentState {
  return {
    id,
    name: id,
    grade: "10",
    stopName: "Stop",
    stopId: "stop-1",
    rollNo: "1",
    boarding,
    dropping: "pending",
    boardedAt: null,
    droppedAt: null,
  };
}

describe("rosterForAttendanceTab", () => {
  const roster = [
    student("A", "boarded"),
    student("B", "pending"),
    student("C", "not_boarded"),
  ];

  it("shows all assigned students on Pickup and Drop (including different trip_id Drop)", () => {
    expect(rosterForAttendanceTab(roster, "boarding")).toHaveLength(3);
    expect(rosterForAttendanceTab(roster, "dropping").map((s) => s.id)).toEqual(
      ["A", "B", "C"],
    );
  });
});

describe("requiresBoardedBeforeDrop", () => {
  it("skips board-first on evening Drop trip", () => {
    expect(requiresBoardedBeforeDrop("evening")).toBe(false);
  });

  it("keeps board-first for morning / same-trip dropping", () => {
    expect(requiresBoardedBeforeDrop("morning")).toBe(true);
    expect(requiresBoardedBeforeDrop(null)).toBe(true);
  });
});

describe("evening Drop tab + stop resolution (regression)", () => {
  it("defaults Attendance to Dropping on evening slot", () => {
    expect(defaultAttendanceTabForSlot("evening")).toBe("dropping");
  });

  it("does not send pickup stop when route has a later drop endpoint", () => {
    expect(
      resolveDropStopIdForMark({
        dropStopId: undefined,
        pickupStopId: "2d2cb67b-pickup",
        routeStopIds: ["2d2cb67b-pickup", "school-stop"],
      }),
    ).toBe("school-stop");
  });
});
