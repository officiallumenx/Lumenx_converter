import { describe, it, expect } from "vitest";
import {
  portalSchoolAlertToSchoolAlert,
  portalSchoolAlertsToSchoolAlerts,
  schoolAlertInitials,
} from "./map";
import type { PortalSchoolAlertDto } from "./types";

const baseDto: PortalSchoolAlertDto = {
  id: "alert-1",
  instituteId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa",
  title: "School closed",
  summary: "Weather closure",
  detail: "All classes cancelled.",
  severity: "emergency",
  category: "closure",
  time: "2026-09-02T10:00:00.000Z",
  source: "Principal",
  childName: "Alex",
  studentId: "student-1",
  unread: true,
  acknowledged: false,
};

describe("portalSchoolAlertToSchoolAlert", () => {
  it("maps emergency unacknowledged alert with action required", () => {
    const alert = portalSchoolAlertToSchoolAlert(baseDto);
    expect(alert.id).toBe("alert-1");
    expect(alert.severity).toBe("emergency");
    expect(alert.category).toBe("closure");
    expect(alert.childName).toBe("Alex");
    expect(alert.childId).toBe("student-1");
    expect(alert.actionRequired).toBe(true);
    expect(alert.actionLabel).toBe("Acknowledge now");
  });

  it("clears action required when acknowledged", () => {
    const alert = portalSchoolAlertToSchoolAlert({ ...baseDto, acknowledged: true });
    expect(alert.actionRequired).toBe(false);
    expect(alert.acknowledged).toBe(true);
  });

  it("maps list via portalSchoolAlertsToSchoolAlerts", () => {
    const alerts = portalSchoolAlertsToSchoolAlerts([
      baseDto,
      { ...baseDto, id: "alert-2", severity: "mandatory", category: "holiday" },
    ]);
    expect(alerts).toHaveLength(2);
    expect(alerts[1]?.category).toBe("holiday");
  });

  it("derives initials from child name", () => {
    expect(schoolAlertInitials("Alex Kumar")).toBe("AK");
  });
});
