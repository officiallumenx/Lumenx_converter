import { describe, expect, it } from "vitest";
import { asAdminQueryResult } from "./query-result";
import { ApiClientError } from "@/lib/api";

describe("asAdminQueryResult", () => {
  it("passes through ready payloads", () => {
    const ready = { status: "ready" as const, items: [{ id: "1" }], errorMessage: null };
    expect(asAdminQueryResult(ready)).toBe(ready);
  });

  it("throws NETWORK_ERROR for status error so reconnect can refetch", () => {
    expect(() =>
      asAdminQueryResult({
        status: "error",
        items: [],
        errorMessage: "Network request failed",
      }),
    ).toThrow(ApiClientError);
    try {
      asAdminQueryResult({ status: "error", items: [], errorMessage: "down" });
    } catch (err) {
      expect(err).toMatchObject({ code: "NETWORK_ERROR", message: "down" });
    }
  });

  it("throws FORBIDDEN for status forbidden", () => {
    try {
      asAdminQueryResult({ status: "forbidden", items: [], errorMessage: "no access" });
      expect.fail("expected throw");
    } catch (err) {
      expect(err).toMatchObject({ code: "FORBIDDEN", status: 403 });
    }
  });
});
