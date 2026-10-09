import { describe, expect, it } from "vitest";

/**
 * Mirrors SessionValidationError unusable semantics from api-auth.ts:
 * only HTTP 401 makes a session unusable for hydrate→signOut.
 */
function isSessionUnusable(status: number): boolean {
  return status === 401;
}

describe("Transport session unusable semantics", () => {
  it("treats 401 as unusable (refresh then logout if refresh fails)", () => {
    expect(isSessionUnusable(401)).toBe(true);
  });

  it("does NOT treat 403 as unusable (authorization ≠ logout)", () => {
    expect(isSessionUnusable(403)).toBe(false);
  });

  it("does NOT treat network/5xx as unusable", () => {
    expect(isSessionUnusable(0)).toBe(false);
    expect(isSessionUnusable(500)).toBe(false);
    expect(isSessionUnusable(503)).toBe(false);
  });
});
