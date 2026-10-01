import { describe, expect, it } from "vitest";
import { shouldRetainPreviousComplete } from "./context";
import type { SetupChecklistState } from "./types";

function state(
  overrides: Partial<SetupChecklistState>,
): SetupChecklistState {
  return {
    status: "ready",
    errorMessage: null,
    counts: null,
    steps: [],
    coreDone: 7,
    coreTotal: 7,
    extendedDone: 0,
    extendedTotal: 0,
    coreComplete: true,
    ...overrides,
  };
}

describe("shouldRetainPreviousComplete", () => {
  it("retains verified complete across checklist error", () => {
    expect(
      shouldRetainPreviousComplete(
        state({ coreComplete: true }),
        state({ status: "error", coreComplete: false, errorMessage: "network" }),
        false,
      ),
    ).toBe(true);
  });

  it("does not retain when previous was incomplete", () => {
    expect(
      shouldRetainPreviousComplete(
        state({ coreComplete: false }),
        state({ status: "error", coreComplete: false }),
        false,
      ),
    ).toBe(false);
  });

  it("accepts authoritative ready+incomplete after hard-fail recount", () => {
    expect(
      shouldRetainPreviousComplete(
        state({ coreComplete: true }),
        state({ status: "ready", coreComplete: false, coreDone: 2 }),
        false,
      ),
    ).toBe(false);
  });
});
