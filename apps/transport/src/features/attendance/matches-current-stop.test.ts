import { describe, expect, it } from "vitest";
import { matchesCurrentStop } from "./matches-current-stop";

describe("matchesCurrentStop", () => {
  const stopA = { id: "stop-a", name: "Oak Street" };
  const stopB = { id: "stop-b", name: "Oak Street" };

  it("shows unassigned students at every stop", () => {
    expect(matchesCurrentStop({ stopId: null }, stopA)).toBe(true);
    expect(matchesCurrentStop({ stopId: "" }, stopB)).toBe(true);
  });

  it("matches assigned students by stop id only (not name)", () => {
    expect(matchesCurrentStop({ stopId: "stop-a" }, stopA)).toBe(true);
    expect(matchesCurrentStop({ stopId: "stop-a" }, stopB)).toBe(false);
  });

  it("returns false when there is no current stop", () => {
    expect(matchesCurrentStop({ stopId: "stop-a" }, null)).toBe(false);
  });
});
