import { describe, expect, it } from "vitest";
import {
  CONNECT_ROLE_DENIED_REDIRECT,
  getConnectRoleGateDecision,
} from "./role-route-access";

describe("getConnectRoleGateDecision", () => {
  it("waits for hydration", () => {
    expect(getConnectRoleGateDecision(false, "teacher", ["teacher"])).toBe(
      "loading",
    );
  });

  it("allows matching roles and denies others", () => {
    expect(getConnectRoleGateDecision(true, "teacher", ["teacher"])).toBe(
      "allow",
    );
    expect(getConnectRoleGateDecision(true, "parent", ["teacher"])).toBe(
      "deny",
    );
    expect(getConnectRoleGateDecision(true, "student", ["teacher"])).toBe(
      "deny",
    );
  });

  it("fails closed for unknown or missing roles", () => {
    expect(getConnectRoleGateDecision(true, null, ["teacher"])).toBe("deny");
    expect(getConnectRoleGateDecision(true, undefined, ["teacher"])).toBe(
      "deny",
    );
  });

  it("denied redirect target is home", () => {
    expect(CONNECT_ROLE_DENIED_REDIRECT).toBe("/");
  });
});
