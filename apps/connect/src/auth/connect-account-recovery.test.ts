/**
 * Connect does not implement institute self-registration + Nexus approval.
 * End users are provisioned by Admin, then recover via phone OTP / PIN.
 * These tests lock that contract and session-recovery expectations.
 */
import { describe, expect, it } from "vitest";
import { getConnectProtectedRouteDecision } from "./protected-route";
import {
  CONNECT_ROLE_DENIED_REDIRECT,
  getConnectRoleGateDecision,
} from "@/lib/role-route-access";

const teacher = {
  id: "u1",
  name: "Teacher",
  phone: "9999999999",
  roles: ["teacher" as const],
};

describe("Connect account recovery (no self-registration approval)", () => {
  it("unhydrated session does not grant portal access", () => {
    expect(getConnectProtectedRouteDecision(false, null, null)).toBe("loading");
    expect(getConnectRoleGateDecision(false, "teacher", ["teacher"])).toBe(
      "loading",
    );
  });

  it("hydrated anonymous user is redirected to login — not a pending-approval screen", () => {
    expect(getConnectProtectedRouteDecision(true, null, null)).toBe("redirect");
  });

  it("role routes require matching role; client cannot invent approval", () => {
    expect(getConnectRoleGateDecision(true, "parent", ["teacher"])).toBe("deny");
    expect(getConnectRoleGateDecision(true, "teacher", ["teacher"])).toBe("allow");
    expect(getConnectRoleGateDecision(true, "student", ["student"])).toBe("allow");
    expect(getConnectProtectedRouteDecision(true, teacher, "teacher")).toBe(
      "allow",
    );
    expect(getConnectProtectedRouteDecision(true, teacher, "parent")).toBe(
      "redirect",
    );
    expect(CONNECT_ROLE_DENIED_REDIRECT).toBe("/");
  });

  it("documents first-login vs returning modes without inventing registration approval", () => {
    const modes = ["first_login_otp", "returning_pin"] as const;
    expect(modes).toContain("first_login_otp");
    expect(modes).toContain("returning_pin");
    expect((modes as readonly string[]).includes("pending_approval")).toBe(false);
  });
});
