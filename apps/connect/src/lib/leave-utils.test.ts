import { describe, expect, it } from "vitest";
import type { LeaveStatus } from "@lumenx/types";
import { isInactiveLeaveCalendarStatus } from "@/components/app/leave/LeaveRequestCalendar";
import {
  isClosedLeaveStatus,
  LEAVE_STATUS_LABELS,
  LEAVE_STATUS_TONE,
} from "@/lib/leave-utils";

const ALL_STATUSES: LeaveStatus[] = [
  "pending",
  "approved",
  "rejected",
  "ignored",
  "cancelled",
];

describe("shared LeaveStatus contract", () => {
  it("defines a label and tone for every LeaveStatus including cancelled", () => {
    for (const status of ALL_STATUSES) {
      expect(LEAVE_STATUS_LABELS[status].length).toBeGreaterThan(0);
      expect(LEAVE_STATUS_TONE[status]).toBeTruthy();
    }
    expect(LEAVE_STATUS_LABELS.cancelled).toBe("Cancelled");
  });

  it("treats cancelled as inactive on the leave calendar but not as ignored/rejected closed", () => {
    expect(isInactiveLeaveCalendarStatus("cancelled")).toBe(true);
    expect(isInactiveLeaveCalendarStatus("rejected")).toBe(true);
    expect(isInactiveLeaveCalendarStatus("ignored")).toBe(true);
    expect(isInactiveLeaveCalendarStatus("pending")).toBe(false);
    expect(isInactiveLeaveCalendarStatus("approved")).toBe(false);

    expect(isClosedLeaveStatus("cancelled")).toBe(false);
    expect(isClosedLeaveStatus("ignored")).toBe(true);
    expect(isClosedLeaveStatus("rejected")).toBe(true);
  });
});
