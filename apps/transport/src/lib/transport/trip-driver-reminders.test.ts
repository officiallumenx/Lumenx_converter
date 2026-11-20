import { describe, expect, it } from "vitest";
import {
  TRIP_DRIVER_REMINDER_INTERVAL_MS,
  TRIP_DRIVER_REMINDER_MAX_MS,
  isTripDriverReminderHourBoundary,
  reminderActionSilentlyEndsTrip,
  resolveTripDriverReminderAction,
} from "./trip-driver-reminders";

describe("Issue 7 — driver trip reminder policy", () => {
  it("schedules on a 10-minute interval with a 60-minute ceiling", () => {
    expect(TRIP_DRIVER_REMINDER_INTERVAL_MS).toBe(10 * 60_000);
    expect(TRIP_DRIVER_REMINDER_MAX_MS).toBe(60 * 60_000);
    expect(
      Math.floor(TRIP_DRIVER_REMINDER_MAX_MS / TRIP_DRIVER_REMINDER_INTERVAL_MS),
    ).toBe(6);
  });

  it("hour boundary is detected after max elapsed, not before", () => {
    expect(isTripDriverReminderHourBoundary(59 * 60_000)).toBe(false);
    expect(isTripDriverReminderHourBoundary(60 * 60_000)).toBe(false);
    expect(isTripDriverReminderHourBoundary(60 * 60_000 + 1)).toBe(true);
  });

  it("Continue keeps trip active; End only requests end flow; never silent-end", () => {
    expect(resolveTripDriverReminderAction("trip_continue")).toBe("continue");
    expect(resolveTripDriverReminderAction("trip_end")).toBe("end_request");
    expect(resolveTripDriverReminderAction("tap")).toBe("open_only");
    for (const id of ["trip_continue", "trip_end", "tap", "unknown"]) {
      expect(reminderActionSilentlyEndsTrip(id)).toBe(false);
    }
  });
});
