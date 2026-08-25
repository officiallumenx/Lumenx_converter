import { describe, expect, it } from "vitest";

import {
  buildAppNotification,
  createLumenXNotification,
  fromAppNotification,
  fromAppNotificationPriority,
  toAppNotification,
  toAppNotificationPriority,
} from "./index";

describe("notification foundation", () => {
  it("creates shared notifications with required fields", () => {
    const n = createLumenXNotification({
      category: "attendance",
      title: "Marked absent",
      message: "Student was marked absent today.",
      source: "attendance.flow",
      audience: "parent",
      priority: "important",
      href: "/attendance",
    });
    expect(n.id).toBeTruthy();
    expect(n.priority).toBe("important");
    expect(n.type).toBe("warning");
    expect(n.unread).toBe(true);
    expect(n.href).toBe("/attendance");
  });

  it("round-trips through AppNotification adapter", () => {
    const shared = createLumenXNotification({
      id: "n1",
      category: "fees",
      title: "Fee due",
      message: "Installment due Friday",
      source: "fees.reminders",
      audience: "parent",
      priority: "critical",
      href: "/fees",
    });
    const app = toAppNotification(shared);
    expect(app.priority).toBe("high");
    expect(app.desc).toBe(shared.message);
    expect(app.href).toBe("/fees");
    const back = fromAppNotification(app, {
      audience: "parent",
      source: "fees.reminders",
      category: "fees",
    });
    expect(back.title).toBe("Fee due");
    expect(back.priority).toBe("important");
  });

  it("maps priority both ways", () => {
    expect(fromAppNotificationPriority("high")).toBe("important");
    expect(toAppNotificationPriority("success")).toBe("normal");
    expect(toAppNotificationPriority("critical")).toBe("high");
  });

  it("buildAppNotification produces legacy shape", () => {
    const app = buildAppNotification({
      category: "transport",
      title: "Bus delayed",
      message: "ETA +10 min",
      source: "transport.bridge",
      audience: "parent",
      priority: "success",
    });
    expect(app.type).toBe("positive");
    expect(app.category).toBe("circulars");
  });
});
