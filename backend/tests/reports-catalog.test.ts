import { describe, expect, it } from "vitest";
import type { Actor } from "../src/auth/types.js";
import { isReportGenerationSupported } from "../src/domains/reports/generate.js";
import { isAttendanceReportId } from "../src/domains/reports/generate-attendance.js";
import { listReportCatalogForActor } from "../src/domains/reports/service.js";

const INSTITUTE = "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa";

const adminActor: Actor = {
  userId: "11111111-1111-4111-8111-111111111111",
  profileId: "11111111-1111-4111-8111-111111111111",
  displayName: "Admin",
  email: "a@x.com",
  profileStatus: "active",
  memberships: [
    {
      membershipId: "aa111111-1111-4111-8111-111111111111",
      instituteId: INSTITUTE,
      status: "active",
      roles: ["institute_admin"],
    },
  ],
  isPlatformOperator: false,
  platformRoleCode: null,
  teachers: [],
  students: [],
  parents: [],
  staff: [],
};

describe("reports catalog coverage", () => {
  it("marks every catalog entry as generation supported", () => {
    const catalog = listReportCatalogForActor(adminActor, INSTITUTE);
    expect(catalog.length).toBe(19);
    for (const item of catalog) {
      expect(item.generationSupported).toBe(true);
      expect(isReportGenerationSupported(item.id)).toBe(true);
    }
  });

  it("includes all attendance report variants", () => {
    expect(isAttendanceReportId("attendance-daily")).toBe(true);
    expect(isAttendanceReportId("attendance-section")).toBe(true);
    expect(isAttendanceReportId("students")).toBe(false);
  });
});
