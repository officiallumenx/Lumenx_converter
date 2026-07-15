/** ─────────────────────────────────────────────────────────────
 *  LumenX Admin — Recovery Flow Store
 *  Session state for Forgot Password / Forgot PIN wizards.
 * ───────────────────────────────────────────────────────────── */

export type RecoveryFlowType = "forgot_password" | "forgot_pin";

export type RecoveryStep =
  | "identify"
  | "email_otp"
  | "mobile_otp"
  | "reset"
  | "complete";

export interface RecoveryFlowState {
  type: RecoveryFlowType;
  step: RecoveryStep;
  email: string;
  mobile: string;
  userId: string;
  userName: string;
  emailVerified: boolean;
  mobileVerified: boolean;
  startedAt: number;
}

const RECOVERY_FLOW_KEY = "lx_recovery_flow_v1";

export function loadRecoveryFlow(): RecoveryFlowState | null {
  try {
    const raw = sessionStorage.getItem(RECOVERY_FLOW_KEY);
    return raw ? (JSON.parse(raw) as RecoveryFlowState) : null;
  } catch {
    return null;
  }
}

export function saveRecoveryFlow(flow: RecoveryFlowState): void {
  try {
    sessionStorage.setItem(RECOVERY_FLOW_KEY, JSON.stringify(flow));
  } catch {
    // ignore
  }
}

export function clearRecoveryFlow(): void {
  try {
    sessionStorage.removeItem(RECOVERY_FLOW_KEY);
  } catch {
    // ignore
  }
}

export function initRecoveryFlow(
  type: RecoveryFlowType,
  data: Pick<RecoveryFlowState, "email" | "mobile" | "userId" | "userName">,
): RecoveryFlowState {
  const flow: RecoveryFlowState = {
    type,
    step: "email_otp",
    email: data.email,
    mobile: data.mobile,
    userId: data.userId,
    userName: data.userName,
    emailVerified: false,
    mobileVerified: false,
    startedAt: Date.now(),
  };
  saveRecoveryFlow(flow);
  return flow;
}

export function updateRecoveryFlow(patch: Partial<RecoveryFlowState>): RecoveryFlowState | null {
  const current = loadRecoveryFlow();
  if (!current) return null;
  const next = { ...current, ...patch };
  saveRecoveryFlow(next);
  return next;
}

export const FORGOT_PASSWORD_STEPS = [
  { id: "identify", label: "Account", short: "Account" },
  { id: "email_otp", label: "Email OTP", short: "Email" },
  { id: "mobile_otp", label: "Mobile OTP", short: "Mobile" },
  { id: "reset", label: "New Password", short: "Password" },
] as const;

export const FORGOT_PIN_STEPS = [
  { id: "identify", label: "Verify Login", short: "Login" },
  { id: "email_otp", label: "Email OTP", short: "Email" },
  { id: "mobile_otp", label: "Mobile OTP", short: "Mobile" },
  { id: "reset", label: "New PIN", short: "PIN" },
] as const;

export function stepIndex(type: RecoveryFlowType, step: RecoveryStep): number {
  const steps = type === "forgot_password" ? FORGOT_PASSWORD_STEPS : FORGOT_PIN_STEPS;
  const idx = steps.findIndex((s) => s.id === step);
  return idx === -1 ? 0 : idx;
}
