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
  readVerifiedSetupCoreSnapshot,
  isVerifiedSetupCoreCompleteFresh,
  writeVerifiedSetupCoreComplete,
  clearVerifiedSetupCoreComplete,
  type VerifiedSetupCoreSnapshot,
} from "./load";
export {
  shouldDeferSetupChecklistNetwork,
  scheduleDeferredSetupRefresh,
  verifiedCompletePlaceholderState,
  SETUP_VERIFIED_FRESH_MS,
  SETUP_DEFER_IDLE_TIMEOUT_MS,
} from "./defer";
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
