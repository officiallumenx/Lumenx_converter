/**
 * Pure helpers for Create Account submit locking.
 * Signup keeps submitting=true after API success until unmount so AuthGate
 * can navigate without a second competing click/submit.
 */

/** True when a second submit should be ignored (request already in flight or success lock). */
export function shouldIgnoreDuplicateSignupSubmit(submitting: boolean): boolean {
  return submitting;
}

/**
 * Whether to clear the submitting lock after signUp resolves.
 * API mode: keep locked until unmount (AuthGate owns navigation).
 * Demo mode: clear after navigating to OTP (or on error path in the caller).
 */
export function shouldReleaseSignupSubmitLockAfterSuccess(apiMode: boolean): boolean {
  return !apiMode;
}

/** Unauthenticated users may open signup; dashboard routes must redirect to welcome. */
export function signupIsUnauthenticatedPublicPath(pathname: string): boolean {
  return pathname === "/signup" || pathname === "/welcome";
}
