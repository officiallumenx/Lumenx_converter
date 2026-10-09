import { describe, expect, it } from "vitest";
import { connectQueryRoots } from "./keys";
import { shouldDehydrateConnectQuery } from "./persist";

describe("shouldDehydrateConnectQuery", () => {
  it("persists stable portal data", () => {
    expect(
      shouldDehydrateConnectQuery({
        queryKey: [connectQueryRoots.parentPortal, "inst", "child"],
        state: { status: "success" },
      }),
    ).toBe(true);
  });

  it("skips live transport and inbox", () => {
    expect(
      shouldDehydrateConnectQuery({
        queryKey: [connectQueryRoots.transport, "inst", "live"],
        state: { status: "success" },
      }),
    ).toBe(false);
    expect(
      shouldDehydrateConnectQuery({
        queryKey: [connectQueryRoots.inbox, "inst", "parent"],
        state: { status: "success" },
      }),
    ).toBe(false);
  });

  it("skips failed queries", () => {
    expect(
      shouldDehydrateConnectQuery({
        queryKey: [connectQueryRoots.homework, "inst"],
        state: { status: "error" },
      }),
    ).toBe(false);
  });
});
