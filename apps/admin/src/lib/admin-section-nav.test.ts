import { describe, expect, it } from "vitest";
import { adminNav } from "@/lib/admin-nav";
import { getAdminSectionForPath, isRouteActive } from "@/lib/admin-section-nav";

describe("admin section routing helpers", () => {
  it("maps known routes to the correct section", () => {
    expect(getAdminSectionForPath("/timetable", adminNav)).toBe("Academics");
    expect(getAdminSectionForPath("/modules", adminNav)).toBe("Operations");
    expect(getAdminSectionForPath("/subscription", adminNav)).toBe("Operations");
    expect(getAdminSectionForPath("/transport", adminNav)).toBe("Services");
  });

  it("matches exact and nested routes consistently", () => {
    expect(isRouteActive("/students", "/students")).toBe(true);
    expect(isRouteActive("/students/STU-1", "/students")).toBe(true);
    expect(isRouteActive("/students", "/teachers")).toBe(false);
  });
});
