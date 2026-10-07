import { describe, expect, it, beforeEach } from "vitest";
import {
  getPushPermissionRecoveryStatus,
  resetPushPermissionRecoveryForTests,
  setPushPermissionRecoveryStatus,
  subscribePushPermissionRecovery,
} from "./push-permission-recovery";

describe("push-permission-recovery", () => {
  beforeEach(() => {
    resetPushPermissionRecoveryForTests();
  });

  it("starts unknown and notifies subscribers on change", () => {
    expect(getPushPermissionRecoveryStatus()).toBe("unknown");
    const seen: string[] = [];
    const unsub = subscribePushPermissionRecovery((s) => seen.push(s));
    setPushPermissionRecoveryStatus("denied");
    setPushPermissionRecoveryStatus("granted");
    unsub();
    setPushPermissionRecoveryStatus("denied");
    expect(seen).toEqual(["unknown", "denied", "granted"]);
  });

  it("does not re-emit identical status", () => {
    const seen: string[] = [];
    subscribePushPermissionRecovery((s) => seen.push(s));
    setPushPermissionRecoveryStatus("denied");
    setPushPermissionRecoveryStatus("denied");
    expect(seen.filter((s) => s === "denied")).toHaveLength(1);
  });
});
