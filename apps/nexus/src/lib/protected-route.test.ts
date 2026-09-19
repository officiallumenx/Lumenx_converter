import { describe, expect, it } from "vitest";
import { getNexusProtectedRouteDecision } from "./protected-route";

describe("Nexus protected route", () => {
  it("keeps demo mode ungated", () => {
    expect(
      getNexusProtectedRouteDecision({
        apiMode: false,
        pathname: "/",
        hydrated: true,
        hasOperatorSession: false,
      }),
    ).toBe("allow");
  });

  it("stays open when login is not required and sends /login home", () => {
    expect(
      getNexusProtectedRouteDecision({
        apiMode: true,
        pathname: "/",
        hydrated: true,
        hasOperatorSession: false,
        requireLogin: false,
      }),
    ).toBe("allow");
    expect(
      getNexusProtectedRouteDecision({
        apiMode: true,
        pathname: "/login",
        hydrated: true,
        hasOperatorSession: false,
        requireLogin: false,
      }),
    ).toBe("redirect-home");
  });

  it("redirects signed-out operators away from app routes", () => {
    expect(
      getNexusProtectedRouteDecision({
        apiMode: true,
        pathname: "/",
        hydrated: true,
        hasOperatorSession: false,
      }),
    ).toBe("redirect-login");
  });

  it("allows login while signed out and sends signed-in operators home", () => {
    expect(
      getNexusProtectedRouteDecision({
        apiMode: true,
        pathname: "/login",
        hydrated: true,
        hasOperatorSession: false,
      }),
    ).toBe("allow");
    expect(
      getNexusProtectedRouteDecision({
        apiMode: true,
        pathname: "/login",
        hydrated: true,
        hasOperatorSession: true,
      }),
    ).toBe("redirect-home");
  });
});
