import { describe, it, expect, vi, beforeEach } from "vitest";
import type { AuthUser } from "@/auth/types";
import { getAttendanceModuleAccess } from "./attendance-coordinator-access";

vi.mock("@/auth/auth-mode", () => ({
  isApiAuthMode: () => true,
}));

vi.mock("@/lib/access-roles/runtime-permissions", () => ({
  getApiAccessState: vi.fn(),
}));

import { getApiAccessState } from "@/lib/access-roles/runtime-permissions";

const mockedState = vi.mocked(getApiAccessState);

const baseUser: AuthUser = {
  id: "user-1",
  name: "Coordinator",
  email: "coord@demo.edu",
  role: "staff",
  instituteId: "inst-1",
  instituteName: "Demo",
};

describe("getAttendanceModuleAccess (API mode)", () => {
  beforeEach(() => {
    mockedState.mockReset();
  });

  it("scopes attendance coordinator to assigned sections from API state", () => {
    mockedState.mockReturnValue({
      instituteId: "inst-1",
      accessRoleId: "role-att",
      accessRoleName: "Attendance Coordinator",
      accessRoleSystemKey: "attendance_coordinator",
      permissions: { "/attendance": "full" },
      assignedSectionKeys: ["10::A", "10::B"],
      instituteWide: false,
    });

    const access = getAttendanceModuleAccess({
      ...baseUser,
      accessRoleId: "ROL-ATT-COORD",
    });

    expect(access.persona).toBe("attendance_coordinator");
    expect(access.assignedSectionKeys).toEqual(["10::A", "10::B"]);
    expect(access.isAttendanceCoordinator).toBe(true);
    expect(access.permission).not.toBe("none");
  });

  it("uses principal persona for institute-wide API access", () => {
    mockedState.mockReturnValue({
      instituteId: "inst-1",
      accessRoleId: null,
      accessRoleName: null,
      accessRoleSystemKey: null,
      permissions: {},
      assignedSectionKeys: [],
      instituteWide: true,
    });

    const access = getAttendanceModuleAccess({
      ...baseUser,
      role: "principal",
      accessRoleId: "ROL-001",
    });

    expect(access.persona).toBe("principal");
    expect(access.scopeMode).toBe("institute");
  });
});
