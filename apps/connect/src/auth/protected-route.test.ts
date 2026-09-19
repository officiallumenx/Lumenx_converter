import { describe, expect, it } from "vitest";
import { getConnectProtectedRouteDecision } from "./protected-route";

const user = {
  id: "u1",
  name: "Teacher",
  phone: "9999999999",
  roles: ["teacher" as const],
};

describe("Connect protected route guard", () => {
  it("waits for hydration and redirects missing or mismatched roles", () => {
    expect(getConnectProtectedRouteDecision(false, null, null)).toBe("loading");
    expect(getConnectProtectedRouteDecision(true, null, null)).toBe("redirect");
    expect(getConnectProtectedRouteDecision(true, user, "student")).toBe("redirect");
    expect(getConnectProtectedRouteDecision(true, user, "teacher")).toBe("allow");
  });
});
