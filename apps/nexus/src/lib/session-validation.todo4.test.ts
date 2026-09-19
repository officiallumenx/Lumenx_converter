import { afterEach, describe, expect, it, vi } from "vitest";
import { validateNexusSession } from "./nexus-login-api";

describe("Nexus restored-session validation", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("rejects an authenticated user without operator role", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(
        new Response(
          JSON.stringify({
            data: {
              profile: { status: "active" },
              platformOperator: { active: false },
            },
          }),
          { status: 200 },
        ),
      ),
    );
    await expect(validateNexusSession("token")).resolves.toBe(false);
  });

  it("distinguishes transient server failure from unusable auth", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("{}", { status: 503 })));
    await expect(validateNexusSession("token")).rejects.toThrow(
      "Session validation failed (503)",
    );
  });
});
