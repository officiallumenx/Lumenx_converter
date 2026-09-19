/**
 * Setup checklist navigation gate.
 * Until core setup is complete: sidebar module clicks return to /setup;
 * checklist step links may still open their allowed destinations.
 */
import type { SetupChecklistState } from "./types";

export type SetupNavGateSnapshot = {
  status: SetupChecklistState["status"] | "unknown";
  coreComplete: boolean;
  /** Pathnames reachable via checklist while core setup is incomplete. */
  allowedPathnames: ReadonlySet<string>;
};

const ALWAYS_ALLOWED = new Set(["/", "/setup"]);

export function emptySetupNavGate(): SetupNavGateSnapshot {
  return {
    status: "unknown",
    coreComplete: false,
    allowedPathnames: ALWAYS_ALLOWED,
  };
}

export function buildSetupNavGate(
  state: SetupChecklistState | null,
): SetupNavGateSnapshot {
  if (!state) return emptySetupNavGate();
  if (state.status !== "ready") {
    return {
      status: state.status,
      coreComplete: false,
      allowedPathnames: ALWAYS_ALLOWED,
    };
  }

  const allowed = new Set(ALWAYS_ALLOWED);
  for (const step of state.steps) {
    if (step.state === "todo" || step.state === "done") {
      allowed.add(step.href);
    }
  }

  return {
    status: "ready",
    coreComplete: state.coreComplete,
    allowedPathnames: allowed,
  };
}

/** Sidebar / swipe module clicks — unfinished setup always returns to checklist. */
export function resolveSidebarNavTarget(
  to: string,
  gate: SetupNavGateSnapshot,
): string {
  if (gate.status !== "ready" || gate.coreComplete) return to;
  if (to === "/" || to === "/setup") return to;
  return "/setup";
}

/** Deep links / checklist Links — only todo/done step routes (+ home/setup). */
export function isPathAllowedDuringSetup(
  pathname: string,
  gate: SetupNavGateSnapshot,
): boolean {
  if (gate.status !== "ready" || gate.coreComplete) return true;
  return gate.allowedPathnames.has(pathname);
}
