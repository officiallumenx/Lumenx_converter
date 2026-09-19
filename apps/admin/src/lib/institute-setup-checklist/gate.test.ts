import { describe, expect, it } from "vitest";
import {
  buildSetupNavGate,
  isPathAllowedDuringSetup,
  resolveSidebarNavTarget,
} from "./gate";
import type { SetupChecklistState } from "./types";
import { SETUP_STEPS } from "./steps";

function readyState(
  overrides: Partial<SetupChecklistState> & {
    coreComplete: boolean;
    stepStates?: Partial<Record<string, "done" | "todo" | "blocked">>;
  },
): SetupChecklistState {
  const stepStates = overrides.stepStates ?? {};
  const steps = SETUP_STEPS.map((step) => ({
    ...step,
    state: stepStates[step.id] ?? "blocked",
    detail: "",
    blockedReason: null,
  }));
  return {
    status: "ready",
    errorMessage: null,
    counts: null,
    steps,
    coreDone: overrides.coreDone ?? 0,
    coreTotal: overrides.coreTotal ?? 7,
    extendedDone: 0,
    extendedTotal: 0,
    coreComplete: overrides.coreComplete,
  };
}

describe("resolveSidebarNavTarget", () => {
  it("sends module clicks to /setup until core is complete", () => {
    const gate = buildSetupNavGate(
      readyState({
        coreComplete: false,
        stepStates: { academic_year: "todo" },
      }),
    );
    expect(resolveSidebarNavTarget("/students", gate)).toBe("/setup");
    expect(resolveSidebarNavTarget("/classes", gate)).toBe("/setup");
    expect(resolveSidebarNavTarget("/", gate)).toBe("/");
    expect(resolveSidebarNavTarget("/setup", gate)).toBe("/setup");
  });

  it("allows free sidebar nav after core complete", () => {
    const gate = buildSetupNavGate(readyState({ coreComplete: true }));
    expect(resolveSidebarNavTarget("/students", gate)).toBe("/students");
  });
});

describe("isPathAllowedDuringSetup", () => {
  it("allows checklist step destinations that are todo or done", () => {
    const gate = buildSetupNavGate(
      readyState({
        coreComplete: false,
        stepStates: {
          academic_year: "done",
          classes: "todo",
        },
      }),
    );
    expect(isPathAllowedDuringSetup("/academic-management", gate)).toBe(true);
    expect(isPathAllowedDuringSetup("/classes", gate)).toBe(true);
    expect(isPathAllowedDuringSetup("/students", gate)).toBe(false);
    expect(isPathAllowedDuringSetup("/fees", gate)).toBe(false);
  });
});
