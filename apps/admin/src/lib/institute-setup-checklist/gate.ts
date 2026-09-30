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
    // Optimistic until the first ready checklist arrives — avoids /setup bounce on launch.
    coreComplete: true,
    allowedPathnames: ALWAYS_ALLOWED,
  };
}

export function buildSetupNavGate(
  state: SetupChecklistState | null,
): SetupNavGateSnapshot {
  if (!state) return emptySetupNavGate();
  // Load / institute errors must not lock the app into /setup.
  if (state.status === "loading" || state.status === "error" || state.status === "needs_institute") {
    return {
      status: state.status === "loading" ? "unknown" : state.status,
      // Preserve navigation while we recover — never treat unknown as incomplete setup.
      coreComplete: true,
      allowedPathnames: ALWAYS_ALLOWED,
    };
  }
  if (state.status !== "ready") {
    return {
      status: state.status,
      coreComplete: true,
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
