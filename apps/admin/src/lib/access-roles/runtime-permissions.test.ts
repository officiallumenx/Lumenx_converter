import { describe, it, expect, vi, beforeEach } from "vitest";
import {
  clearApiAccessState,
  getApiAccessState,
  getApiRolePermission,
  syncApiAccessPermissions,
} from "./runtime-permissions";

vi.mock("./api", () => ({
  fetchMyAccessPermissions: vi.fn(),
}));

vi.mock("@/auth/auth-mode", () => ({
  isApiAuthMode: () => true,
}));

import { fetchMyAccessPermissions } from "./api";

const mockedFetch = vi.mocked(fetchMyAccessPermissions);

describe("runtime access permissions", () => {
  beforeEach(() => {
    clearApiAccessState();
    mockedFetch.mockReset();
  });

  it("syncs permissions and gates routes", async () => {
    mockedFetch.mockResolvedValue({
      accessRoleId: "role-1",
      accessRoleName: "Financial",
      accessRoleSystemKey: "financial",
      permissions: { "/fees": "full", "/students": "none" },
      assignedSectionKeys: [],
      instituteWide: false,
    });

    await syncApiAccessPermissions("inst-a");
    const state = getApiAccessState();
    expect(state.accessRoleSystemKey).toBe("financial");
    expect(getApiRolePermission("/fees")).toBe("full");
    expect(getApiRolePermission("/fees/plans")).toBe("full");
    expect(getApiRolePermission("/students")).toBe("none");
  });

  it("institute-wide grants full access", async () => {
    mockedFetch.mockResolvedValue({
      accessRoleId: null,
      accessRoleName: null,
      accessRoleSystemKey: null,
      permissions: {},
      assignedSectionKeys: [],
      instituteWide: true,
    });

    await syncApiAccessPermissions("inst-a");
    expect(getApiRolePermission("/anything")).toBe("full");
  });

  it("clears state when institute is null", async () => {
    await syncApiAccessPermissions("inst-a");
    clearApiAccessState();
    expect(getApiAccessState().instituteId).toBeNull();
  });
});
