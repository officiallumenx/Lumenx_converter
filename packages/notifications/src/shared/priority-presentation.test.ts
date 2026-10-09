import { describe, expect, it } from "vitest";
import {
  androidAccentHexFromPriority,
  backendCategoryDisplayLabel,
  NOTIFICATION_ACCENT_HEX,
  presentationFromPriority,
  SEVERITY_UI_LABEL,
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

  it("normal transport notification is INFO (blue) — not red/orange", () => {
    // Trip started, student boarded, etc. → priority=normal → blue
    expect(androidAccentHexFromPriority("normal")).toBe(NOTIFICATION_ACCENT_HEX.info);
    expect(androidAccentHexFromPriority("success")).toBe(NOTIFICATION_ACCENT_HEX.info);
    // Category does not override severity color
    const transportColor = androidAccentHexFromPriority("normal", { severity: undefined });
    expect(transportColor).toBe(NOTIFICATION_ACCENT_HEX.info);
  });

  it("SEVERITY_UI_LABEL maps priority to human label", () => {
    expect(SEVERITY_UI_LABEL["normal"]).toBe("Update");
    expect(SEVERITY_UI_LABEL["success"]).toBe("Update");
    expect(SEVERITY_UI_LABEL["important"]).toBe("Attention");
    expect(SEVERITY_UI_LABEL["critical"]).toBe("Urgent");
  });

  it("category and severity labels are independent", () => {
    // Category label = "Transport", severity label = "Update" (for normal)
    expect(backendCategoryDisplayLabel("transport")).toBe("Transport");
    expect(SEVERITY_UI_LABEL["normal"]).toBe("Update");
    // So UI shows: "Transport · Bus approaching your stop" (category label + title)
    // The severity badge is separate ("Update" / "Attention" / "Urgent")
  });
});
