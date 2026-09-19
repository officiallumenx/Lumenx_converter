import { describe, expect, it } from "vitest";
import { getTransportProtectedRouteDecision } from "./protected-route";

describe("Transport protected route guard", () => {
  it("makes deterministic hydration and authentication decisions", () => {
    expect(getTransportProtectedRouteDecision(false, null)).toBe("loading");
    expect(getTransportProtectedRouteDecision(true, null)).toBe("redirect");
    expect(
      getTransportProtectedRouteDecision(true, {
        id: "u1",
        name: "Driver",
        phone: "9999999999",
        employeeId: "D1",
      }),
    ).toBe("allow");
  });
});
