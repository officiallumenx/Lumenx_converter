import { describe, it, expect } from "vitest";
import {
  ACCESS_ROLE_SYSTEM_KEYS,
  demoRoleIdForSystemKey,
  isAttendanceCoordinatorRole,
  isAttendanceCoordinatorSystemKey,
} from "./system-keys";

describe("access role system keys", () => {
  it("maps attendance coordinator to demo role id", () => {
    expect(demoRoleIdForSystemKey(ACCESS_ROLE_SYSTEM_KEYS.attendanceCoordinator)).toBe(
      "ROL-ATT-COORD",
    );
    expect(demoRoleIdForSystemKey(ACCESS_ROLE_SYSTEM_KEYS.principalRoot)).toBe("ROL-001");
    expect(demoRoleIdForSystemKey(null)).toBeUndefined();
  });

  it("detects attendance coordinator roles", () => {
    expect(
      isAttendanceCoordinatorSystemKey(ACCESS_ROLE_SYSTEM_KEYS.attendanceCoordinator),
    ).toBe(true);
    expect(isAttendanceCoordinatorRole({ systemKey: "attendance_coordinator" })).toBe(
      true,
    );
    expect(isAttendanceCoordinatorRole({ systemKey: "financial" })).toBe(false);
  });
});
