import { describe, expect, it } from "vitest";
import {
  parseSendCategory,
  sendApiContractForCategory,
  sendCategoryLabel,
  shouldIgnoreDuplicateSendClick,
} from "./send-category";

describe("send category contracts", () => {
  it("maps category to the correct existing API contract", () => {
    expect(sendApiContractForCategory("announcements").kind).toBe(
      "announcement_create_publish",
    );
    expect(sendApiContractForCategory("alerts").kind).toBe(
      "school_alert_broadcast",
    );
    expect(sendApiContractForCategory("holidays").kind).toBe(
      "calendar_holiday_create",
    );
    expect(sendApiContractForCategory("events").kind).toBe(
      "event_create_publish",
    );
  });

  it("parses search/query category values", () => {
    expect(parseSendCategory("alerts")).toBe("alerts");
    expect(parseSendCategory("announcements")).toBe("announcements");
    expect(parseSendCategory("holidays")).toBe("holidays");
    expect(parseSendCategory("holiday")).toBe("holidays");
    expect(parseSendCategory("events")).toBe("events");
    expect(parseSendCategory(undefined)).toBe("announcements");
  });

  it("labels categories for the Send UI", () => {
    expect(sendCategoryLabel("announcements")).toBe("Announcements");
    expect(sendCategoryLabel("alerts")).toBe("Alerts");
    expect(sendCategoryLabel("holidays")).toBe("Holidays");
    expect(sendCategoryLabel("events")).toBe("Events");
  });

  it("blocks duplicate submit while sending", () => {
    expect(shouldIgnoreDuplicateSendClick(true)).toBe(true);
    expect(shouldIgnoreDuplicateSendClick(false)).toBe(false);
  });
});
