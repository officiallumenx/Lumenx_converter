import { describe, expect, it } from "vitest";
import {
  kindToUiCategory,
  nextEventForMonth,
  uiCategoryToKind,
  type CalendarViewItem,
} from "./calendar-view-helpers";

const items: CalendarViewItem[] = [
  { id: "1", title: "Past holiday", date: "2026-09-05", kind: "holiday" },
  { id: "2", title: "Sports day", date: "2026-10-12", kind: "function", time: "09:00" },
  { id: "3", title: "Diwali", date: "2026-10-20", kind: "holiday" },
  { id: "4", title: "Nov meeting", date: "2026-11-02", kind: "meeting" },
];

describe("calendar view helpers", () => {
  it("maps UI category to store kind", () => {
    expect(uiCategoryToKind("holiday")).toBe("holiday");
    expect(uiCategoryToKind("event")).toBe("function");
    expect(kindToUiCategory("holiday")).toBe("holiday");
    expect(kindToUiCategory("function")).toBe("event");
    expect(kindToUiCategory("exam")).toBe("event");
  });

  it("picks next upcoming event in the current month", () => {
    const next = nextEventForMonth(items, 2026, 9, "2026-10-15"); // October
    expect(next?.title).toBe("Diwali");
  });

  it("returns null when current-month events are all before today", () => {
    const next = nextEventForMonth(items, 2026, 9, "2026-10-25");
    expect(next).toBeNull();
  });

  it("returns first event for past months", () => {
    const next = nextEventForMonth(items, 2026, 8, "2026-10-15"); // September
    expect(next?.title).toBe("Past holiday");
  });
});
