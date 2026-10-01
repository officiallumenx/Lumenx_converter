export type {
  SetupChecklistState,
  SetupCounts,
  SetupStepId,
  SetupStepProgress,
  SetupStepState,
} from "./types";
export { SETUP_STEPS } from "./steps";
export { evaluateSetupProgress, summarizeSetupProgress } from "./progress";
export {
  loadSetupChecklist,
  peekSetupChecklistCache,
  invalidateSetupChecklistCache,
  readVerifiedSetupCoreComplete,
  writeVerifiedSetupCoreComplete,
  clearVerifiedSetupCoreComplete,
} from "./load";
export {
  buildSetupNavGate,
  resolveSidebarNavTarget,
  isPathAllowedDuringSetup,
  emptySetupNavGate,
  type SetupNavGateSnapshot,
} from "./gate";
export { getSetupNavGate, setSetupNavGate, subscribeSetupNavGate } from "./session";
export {
  SetupChecklistProvider,
  useSetupChecklist,
  shouldRetainPreviousComplete,
} from "./context";
