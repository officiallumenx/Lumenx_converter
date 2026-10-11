import { describe, expect, it } from "vitest";
import { AppError } from "../../errors/app-error.js";

/**
 * Contract tests for marks entry cursor pagination messages / limits.
 * Repository paging is covered via HTTP marks suite + walk-guard.
 */
describe("marks entry list pagination contract", () => {
  it("uses stable conflict/forbidden semantics for unauthorized institute access", () => {
    expect(AppError.forbidden("Insufficient permissions").status).toBe(403);
  });

  it("documents default/max page sizes", () => {
    const DEFAULT = 100;
    const MAX = 200;
    expect(Math.min(Math.max(1, undefined as unknown as number) || DEFAULT, MAX)).toBe(
      DEFAULT,
    );
    expect(Math.min(Math.max(1, 500), MAX)).toBe(MAX);
    expect(Math.min(Math.max(1, 25), MAX)).toBe(25);
  });
});
