import { beforeEach, describe, expect, it } from "vitest";

import {
  ATTENDANCE_NOTIFICATION_DEEP_LINK,
  ATTENDANCE_NOTIFICATION_INBOX_KEY,
  clearAttendanceNotificationOutboxForTests,
  emitAttendanceNotifications,
  listAttendanceNotificationInbox,
  notifyAttendancePercentageWarning,
  notifyFromAttendanceSubmit,
  saveAttendanceNotificationConfig,
} from "./index";

describe("attendance notification phase 3", () => {
  beforeEach(() => {
    clearAttendanceNotificationOutboxForTests();
    saveAttendanceNotificationConfig({
      timing: "immediate",
      triggers: ["daily_absence", "period_absence"],
      recipients: ["parent", "student"],
      updatedAt: new Date().toISOString(),
      updatedBy: "test",
    });
  });

  it("sends absent alerts to parent only (not student)", () => {
    const created = notifyFromAttendanceSubmit({
      date: "2026-08-21",
      sectionKey: "10:B",
      classLabel: "10",
      section: "B",
      slotId: "day",
      slotLabel: "Full day",
      slotKind: "day",
      absentStudents: [{ id: "stu:10:B:14", name: "Aarav Sharma" }],
    });
    expect(created.length).toBe(1);
    expect(created[0]!.recipient).toBe("parent");
    expect(created.every((m) => m.recipient !== "student")).toBe(true);

    const parentInbox = listAttendanceNotificationInbox("parent");
    const studentInbox = listAttendanceNotificationInbox("student");
    expect(parentInbox.some((i) => i.studentId === "stu:10:B:14")).toBe(true);
    expect(studentInbox.some((i) => i.trigger === "daily_absence")).toBe(false);
  });

  it("preserves /attendance deep link on inbox rows", () => {
    notifyFromAttendanceSubmit({
      date: "2026-08-21",
      sectionKey: "10:B",
      classLabel: "10",
      section: "B",
      slotId: "day",
      slotLabel: "Full day",
      slotKind: "day",
      absentStudents: [{ id: "stu:10:B:01", name: "Test Student" }],
    });
    const row = listAttendanceNotificationInbox("parent")[0]!;
    expect(row.href).toBe(ATTENDANCE_NOTIFICATION_DEEP_LINK);
    expect(row.href).toBe("/attendance");
  });

  it("emits percentage warning to parent + student info", () => {
    const created = notifyAttendancePercentageWarning({
      studentId: "stu:10:B:14",
      studentName: "Aarav Sharma",
      attendancePct: 68,
      thresholdPct: 75,
      date: "2026-08-21",
    });
    expect(created.map((c) => c.recipient).sort()).toEqual(["parent", "student"]);
    const parent = created.find((c) => c.recipient === "parent")!;
    const student = created.find((c) => c.recipient === "student")!;
    expect(parent.body.toLowerCase()).toContain("68");
    expect(student.body.toLowerCase()).toContain("68");
    expect(parent.trigger).toBe("percentage_warning");
    expect(listAttendanceNotificationInbox("parent")[0]!.href).toBe("/attendance");
  });

  it("dedupes percentage warnings for the same day/student", () => {
    notifyAttendancePercentageWarning({
      studentId: "stu:10:B:14",
      studentName: "Aarav",
      attendancePct: 70,
      thresholdPct: 75,
      date: "2026-08-21",
    });
    notifyAttendancePercentageWarning({
      studentId: "stu:10:B:14",
      studentName: "Aarav",
      attendancePct: 69,
      thresholdPct: 75,
      date: "2026-08-21",
    });
    const parentRows = listAttendanceNotificationInbox("parent").filter(
      (i) => i.studentId === "stu:10:B:14" && i.trigger === "percentage_warning",
    );
    expect(parentRows.length).toBe(1);
    expect(parentRows[0]!.body).toContain("69");
  });

  it("dedupes absence re-emits for the same mark identity", () => {
    const input = {
      date: "2026-08-21",
      sectionKey: "10:B",
      classLabel: "10",
      section: "B",
      slotId: "morning",
      slotLabel: "Morning",
      slotKind: "morning" as const,
      absentStudents: [{ id: "stu:10:B:02", name: "Riya" }],
    };
    const a = notifyFromAttendanceSubmit(input);
    const b = notifyFromAttendanceSubmit(input);
    expect(a[0]!.id).toBe(b[0]!.id);
    const rows = listAttendanceNotificationInbox("parent").filter(
      (i) => i.studentId === "stu:10:B:02",
    );
    expect(rows.length).toBe(1);
  });

  it("keeps attendance inbox key and deep link", () => {
    expect(ATTENDANCE_NOTIFICATION_INBOX_KEY).toBe(
      "lumenx.attendance-notification-inbox.v1",
    );
    emitAttendanceNotifications({
      trigger: "period_absence",
      date: "2026-08-21",
      sectionKey: "10:B",
      classLabel: "10",
      section: "B",
      slotId: "p1",
      slotLabel: "Period 1",
      students: [{ id: "stu:10:B:03", name: "Kabir" }],
    });
    expect(listAttendanceNotificationInbox("parent")[0]!.href).toBe("/attendance");
  });
});
