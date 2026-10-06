import { describe, expect, it } from "vitest";
import { escapeIlikePattern, normalizeUsername } from "../src/domains/auth-credentials/repository.js";

describe("username lookup", () => {
  it("normalizes case and trims", () => {
    expect(normalizeUsername("  Loki_Admin ")).toBe("loki_admin");
  });

  it("escapes ILIKE wildcards so underscores are literal", () => {
    expect(escapeIlikePattern("loki_admin")).toBe("loki\\_admin");
    expect(escapeIlikePattern("100%")).toBe("100\\%");
    expect(escapeIlikePattern("a\\b")).toBe("a\\\\b");
  });
});
