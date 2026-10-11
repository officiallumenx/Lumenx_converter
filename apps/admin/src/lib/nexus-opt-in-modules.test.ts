import { describe, expect, it } from "vitest";
import {
  applyNexusEntitlementCeiling,
  isNexusModuleGranted,
  NEXUS_OPT_IN_ADMIN_MODULES,
} from "@lumenx/config";
import {
  defaultEnabledModules,
  isAdminRouteModuleEnabled,
} from "@/lib/admin-plan-config";

describe("Nexus opt-in Accounts + Homework", () => {
  it("lists accounts and homework-logs as opt-in Admin modules", () => {
    expect(NEXUS_OPT_IN_ADMIN_MODULES).toContain("accounts");
    expect(NEXUS_OPT_IN_ADMIN_MODULES).toContain("homework-logs");
  });

  it("defaults Accounts and Homework off for every institute", () => {
    const enabled = defaultEnabledModules();
    expect(enabled.accounts).toBe(false);
    expect(enabled["homework-logs"]).toBe(false);
    expect(isAdminRouteModuleEnabled("/accounts", enabled)).toBe(false);
    expect(isAdminRouteModuleEnabled("/homework", enabled)).toBe(false);
  });

  it("keeps Accounts/Homework off when Nexus entitlements are missing", () => {
    const next = applyNexusEntitlementCeiling(
      { accounts: true, "homework-logs": true, students: true },
      null,
    );
    expect(next.accounts).toBe(false);
    expect(next["homework-logs"]).toBe(false);
    expect(next.students).toBe(true);
  });

  it("does not enable via Admin local preference without Nexus grant", () => {
    const next = applyNexusEntitlementCeiling(
      { accounts: true, "homework-logs": true },
      { accounts: false, homework: false },
    );
    expect(next.accounts).toBe(false);
    expect(next["homework-logs"]).toBe(false);
  });

  it("grants Homework when Nexus uses the homework catalog id", () => {
    expect(isNexusModuleGranted({ homework: true }, "homework-logs")).toBe(true);
    const next = applyNexusEntitlementCeiling(
      { "homework-logs": false, accounts: false },
      { homework: true, accounts: true },
    );
    // Ceiling only forces opt-in off when not granted; granted leaves Admin preference.
    expect(next["homework-logs"]).toBe(false);
    expect(isNexusModuleGranted({ accounts: true }, "accounts")).toBe(true);
  });
});
