import { describe, expect, it } from "vitest";
import type { AppNotification } from "@lumenx/types";
import { teacherCategoryFromAppNotification } from "./map-teacher";

function n(
  partial: Partial<AppNotification> & Pick<AppNotification, "title">,
): AppNotification {
  return {
    id: "1",
    desc: "",
    time: "now",
    type: "info",
    category: "circulars",
    unread: true,
    priority: "normal",
    ...partial,
  };
}

describe("teacherCategoryFromAppNotification", () => {
  it("does not treat trip start as announcement or urgent", () => {
    expect(
      teacherCategoryFromAppNotification(
        n({
          title: "Driver started a trip",
          desc: "A transport trip is now active.",
          category: "circulars",
          priority: "high",
        }),
      ),
    ).toBe("transport");
    expect(
      teacherCategoryFromAppNotification(
        n({
          title: "Trip started",
          category: "transport",
          type: "warning",
        }),
      ),
    ).toBe("transport");
  });

  it("maps diary reminders to diary, leave to leave, circulars stay announcements", () => {
    expect(
      teacherCategoryFromAppNotification(
        n({ title: "Activity diary overdue", category: "leave" }),
      ),
    ).toBe("homework");
    expect(
      teacherCategoryFromAppNotification(
        n({
          title: "New leave request",
          category: "leave",
          payload: { presentation: "alert" },
          priority: "high",
          type: "warning",
        }),
      ),
    ).toBe("leave");
    expect(
      teacherCategoryFromAppNotification(
        n({ title: "School closed Friday", category: "circulars" }),
      ),
    ).toBe("announcements");
  });

  it("maps staff operational rows away from announcements", () => {
    expect(
      teacherCategoryFromAppNotification(
        n({ title: "Payment received", category: "fees" }),
      ),
    ).toBe("staff_notices");
    expect(
      teacherCategoryFromAppNotification(
        n({ title: "Timetable published: Class 8 · Sec A", category: "academic" }),
      ),
    ).toBe("staff_notices");
  });

  it("keeps SOS as urgent", () => {
    expect(
      teacherCategoryFromAppNotification(
        n({ title: "SOS from bus 12", category: "emergency" }),
      ),
    ).toBe("urgent");
  });
});
