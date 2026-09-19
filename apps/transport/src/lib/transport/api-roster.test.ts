import { beforeEach, describe, expect, it } from "vitest";

import {
  clearApiDriverRoster,
  getApiApprovedStudentCount,
  getApiPendingStopCount,
  listApiExistingEnrollmentsForVehicle,
  listApiNewEnrollmentsForVehicle,
  setApiDriverRoster,
} from "./api-roster";
import type { DriverRouteRoster } from "@/lib/transport-api";

const VEHICLE = "v1111111-1111-4111-8111-111111111111";
const ROUTE = "r1111111-1111-4111-8111-111111111111";

function sampleRoster(): DriverRouteRoster {
  return {
    driverId: "d1111111-1111-4111-8111-111111111111",
    routeId: ROUTE,
    routeName: "Morning Route",
    vehicleId: VEHICLE,
    locked: false,
    stops: [],
    students: [
      {
        enrollmentId: "e1",
        studentId: "s1",
        studentName: "Asha",
        rollNo: "1",
        classLabel: "5A",
        pickupStopId: "",
        dropStopId: "",
        pickupStopName: null,
        status: "active",
        approvalStatus: "approved",
      },
      {
        enrollmentId: "e2",
        studentId: "s2",
        studentName: "Ravi",
        rollNo: "2",
        classLabel: "5A",
        pickupStopId: "stop-1",
        dropStopId: "stop-1",
        pickupStopName: "Gate",
        status: "active",
        approvalStatus: "approved",
      },
      {
        enrollmentId: "e3",
        studentId: "s3",
        studentName: "Draft",
        rollNo: "3",
        classLabel: "5B",
        pickupStopId: "",
        dropStopId: "",
        pickupStopName: null,
        status: "active",
        approvalStatus: "pending",
      },
    ],
  };
}

describe("api-roster", () => {
  beforeEach(() => {
    clearApiDriverRoster();
  });

  it("splits new vs existing enrollments and counts approved students", () => {
    setApiDriverRoster(sampleRoster(), { vehicleNumber: "TN-01" });

    expect(getApiApprovedStudentCount(VEHICLE)).toBe(2);
    expect(getApiPendingStopCount(VEHICLE)).toBe(2);
    expect(listApiNewEnrollmentsForVehicle(VEHICLE).map((s) => s.studentId)).toEqual([
      "s1",
      "s3",
    ]);
    expect(listApiExistingEnrollmentsForVehicle(VEHICLE).map((s) => s.studentId)).toEqual([
      "s2",
    ]);
  });

  it("returns empty for a different vehicle id", () => {
    setApiDriverRoster(sampleRoster(), { vehicleNumber: "TN-01" });
    expect(getApiApprovedStudentCount("other-vehicle")).toBe(0);
  });
});
