import { describe, expect, it } from "vitest";
import {
  androidAccentHexFromPriority,
  backendCategoryDisplayLabel,
  NOTIFICATION_ACCENT_HEX,
  presentationFromPriority,
  toneTokenFromPriority,
} from "./priority-presentation";

describe("notification presentation metadata", () => {
  it("maps INFO/normal priority to blue accent", () => {
    expect(androidAccentHexFromPriority("normal")).toBe(NOTIFICATION_ACCENT_HEX.info);
    expect(toneTokenFromPriority("normal")).toBe("primary");
    expect(presentationFromPriority("normal").type).toBe("info");
  });

  it("maps WARNING/important to amber accent", () => {
    expect(androidAccentHexFromPriority("important")).toBe(
      NOTIFICATION_ACCENT_HEX.warning,
    );
    expect(androidAccentHexFromPriority("normal", { severity: "attention" })).toBe(
      NOTIFICATION_ACCENT_HEX.warning,
    );
    expect(toneTokenFromPriority("important")).toBe("warning");
  });

  it("maps CRITICAL to red accent", () => {
    expect(androidAccentHexFromPriority("critical")).toBe(
      NOTIFICATION_ACCENT_HEX.critical,
    );
    expect(androidAccentHexFromPriority("normal", { isAlert: true })).toBe(
      NOTIFICATION_ACCENT_HEX.critical,
    );
    expect(
      androidAccentHexFromPriority("normal", { alertSeverity: "emergency" }),
    ).toBe(NOTIFICATION_ACCENT_HEX.critical);
  });

  it("preserves announcement / message / event category labels", () => {
    expect(backendCategoryDisplayLabel("announcements")).toBe("Announcement");
    expect(backendCategoryDisplayLabel("messages")).toBe("Message");
    expect(backendCategoryDisplayLabel("events")).toBe("Event");
  });
});
