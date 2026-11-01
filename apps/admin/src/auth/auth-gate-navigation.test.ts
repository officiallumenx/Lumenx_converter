import { describe, expect, it } from "vitest";
import { resolveAuthGateNavigateTo } from "./auth-gate-navigation";

describe("AuthGate navigation", () => {
  it("sends unauthenticated users on private routes to welcome", () => {
    expect(
      resolveAuthGateNavigateTo({
        isAuthenticated: false,
        pathname: "/",
        gateKind: "allow",
        isVerified: null,
        unauthenticatedAllowed: false,
      }),
    ).toBe("/welcome");
  });

  it("allows unauthenticated access to signup without redirect", () => {
    expect(
      resolveAuthGateNavigateTo({
        isAuthenticated: false,
        pathname: "/signup",
        gateKind: "allow",
        isVerified: null,
        unauthenticatedAllowed: true,
      }),
    ).toBeNull();
  });

  it("waits while registration gate is loading (no bounce)", () => {
    expect(
      resolveAuthGateNavigateTo({
        isAuthenticated: true,
        pathname: "/signup",
        gateKind: "loading",
        isVerified: false,
        unauthenticatedAllowed: true,
      }),
    ).toBeNull();
  });

  it("routes pending registration to pending-verification", () => {
    expect(
      resolveAuthGateNavigateTo({
        isAuthenticated: true,
        pathname: "/signup",
        gateKind: "pending",
        isVerified: false,
        unauthenticatedAllowed: true,
      }),
    ).toBe("/pending-verification");
  });

  it("does not send unverified allow on signup to the dashboard", () => {
    expect(
      resolveAuthGateNavigateTo({
        isAuthenticated: true,
        pathname: "/signup",
        gateKind: "allow",
        isVerified: false,
        unauthenticatedAllowed: true,
      }),
    ).toBe("/pending-verification");
  });

  it("sends verified allow on signup to dashboard", () => {
    expect(
      resolveAuthGateNavigateTo({
        isAuthenticated: true,
        pathname: "/signup",
        gateKind: "allow",
        isVerified: true,
        unauthenticatedAllowed: true,
      }),
    ).toBe("/");
  });
});
