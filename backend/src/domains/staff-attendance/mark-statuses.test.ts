import { describe, expect, it } from "vitest";
import { STAFF_ATTENDANCE_MARK_STATUSES } from "./types.js";

describe("staff attendance mark statuses", () => {
  it("matches flowchart select status options exactly", () => {
    expect([...STAFF_ATTENDANCE_MARK_STATUSES]).toEqual([
      "present",
      "absent",
      "half-day",
      "leave",
    ]);
  });
});
