import { describe, expect, it } from "vitest";
import {
  parseSendCategory,
  sendApiContractForCategory,
  shouldIgnoreDuplicateSendClick,
} from "@/lib/communications/send-category";

describe("Send forms behavior contracts", () => {
  it("Announcements category uses createAnnouncement contract", () => {
    expect(sendApiContractForCategory(parseSendCategory("announcements")).kind).toBe(
      "announcement_create_publish",
    );
  });

  it("Alerts category uses broadcastSchoolAlert contract", () => {
    expect(sendApiContractForCategory(parseSendCategory("alerts")).kind).toBe(
      "school_alert_broadcast",
    );
  });

  it("Holidays category uses calendar holiday createEvent contract", () => {
    expect(sendApiContractForCategory(parseSendCategory("holidays")).kind).toBe(
      "calendar_holiday_create",
    );
  });

  it("Events category uses events create+publish contract", () => {
    expect(sendApiContractForCategory(parseSendCategory("events")).kind).toBe(
      "event_create_publish",
    );
  });

  it("duplicate submit is ignored while busy", () => {
    expect(shouldIgnoreDuplicateSendClick(true)).toBe(true);
    expect(shouldIgnoreDuplicateSendClick(false)).toBe(false);
  });
});
