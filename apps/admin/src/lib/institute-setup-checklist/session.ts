/**
 * Sync snapshot for AdminChrome nav (outside React render of the checklist page).
 */
import { emptySetupNavGate, type SetupNavGateSnapshot } from "./gate";

let gate: SetupNavGateSnapshot = emptySetupNavGate();
const listeners = new Set<() => void>();

export function getSetupNavGate(): SetupNavGateSnapshot {
  return gate;
}

export function setSetupNavGate(next: SetupNavGateSnapshot): void {
  gate = next;
  for (const listener of listeners) listener();
}

export function subscribeSetupNavGate(listener: () => void): () => void {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}
