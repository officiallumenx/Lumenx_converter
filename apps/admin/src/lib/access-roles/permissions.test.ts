import { describe, it, expect } from "vitest";
import { createEmptyPermissions } from "@/lib/roles-access";
import type { AccessPermission } from "./types";

function normalizePermissions(
  permissions: Record<string, AccessPermission>,
  routes: string[],
): Record<string, AccessPermission> {
  const out = Object.fromEntries(
    routes.map((r) => [r, "none" as AccessPermission]),
  ) as Record<string, AccessPermission>;
  for (const [route, permission] of Object.entries(permissions)) {
    if (!routes.includes(route)) continue;
    if (permission === "full" || permission === "read" || permission === "none") {
      out[route] = permission;
    }
  }
  return out;
}

describe("access roles permission helpers", () => {
  it("createEmptyPermissions marks all modules none", () => {
    const empty = createEmptyPermissions();
    expect(Object.values(empty).every((p) => p === "none")).toBe(true);
    expect(Object.keys(empty).length).toBeGreaterThan(10);
  });

  it("normalizePermissions keeps only known routes", () => {
    const routes = ["/students", "/fees"];
    const next = normalizePermissions(
      { "/students": "full", "/unknown": "full", "/fees": "read" },
      routes,
    );
    expect(next).toEqual({ "/students": "full", "/fees": "read" });
  });
});
