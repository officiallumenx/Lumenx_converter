/** ─────────────────────────────────────────────────────────────
 *  LumenX Admin — Login Flow Store (sessionStorage)
 *  Remembers entered credentials only for the active login flow
 *  (e.g. navigating to Forgot Password and back).
 *  Cleared on successful sign-in or explicit sign-out.
 * ───────────────────────────────────────────────────────────── */

const LOGIN_FLOW_KEY = "lx_login_flow_session_v1";

export interface LoginFlowDraft {
  identifier: string;
  rememberMe: boolean;
}

export function loadLoginFlowDraft(): LoginFlowDraft | null {
  try {
    const raw = sessionStorage.getItem(LOGIN_FLOW_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as LoginFlowDraft;
  } catch {
    return null;
  }
}

export function saveLoginFlowDraft(draft: LoginFlowDraft): void {
  try {
    sessionStorage.setItem(LOGIN_FLOW_KEY, JSON.stringify(draft));
  } catch {
    // sessionStorage unavailable
  }
}

export function clearLoginFlowDraft(): void {
  try {
    sessionStorage.removeItem(LOGIN_FLOW_KEY);
  } catch {
    // ignore
  }
}
