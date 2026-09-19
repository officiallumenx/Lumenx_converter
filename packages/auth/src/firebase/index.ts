/**
 * High-level Firebase → LumenX login helpers (phone OTP + email password).
 */

import type { Auth, ApplicationVerifier } from "firebase/auth";
import {
  requestFirebasePhoneOtp,
  type PhoneSignInSession,
} from "./phone-auth";
import { signInWithFirebaseEmail, signOutFirebase } from "./email-auth";
import {
  exchangeFirebaseIdTokenForSession,
  type FirebaseSessionExchangeResult,
} from "./session-api";
import { logLumenXAnalyticsEventForContext } from "./analytics";

export type CompleteFirebaseLoginInput = {
  apiBaseUrl: string;
  idToken: string;
  instituteId?: string;
  autoLink?: boolean;
  authMethod?: "email" | "phone";
  setSupabaseSession?: (tokens: {
    accessToken: string;
    refreshToken: string;
  }) => Promise<void>;
  fetchImpl?: typeof fetch;
};

export async function completeFirebaseLogin(
  input: CompleteFirebaseLoginInput,
): Promise<FirebaseSessionExchangeResult> {
  try {
    const session = await exchangeFirebaseIdTokenForSession({
      apiBaseUrl: input.apiBaseUrl,
      idToken: input.idToken,
      instituteId: input.instituteId,
      autoLink: input.autoLink,
      fetchImpl: input.fetchImpl,
    });

    if (input.setSupabaseSession) {
      await input.setSupabaseSession({
        accessToken: session.accessToken,
        refreshToken: session.refreshToken,
      });
    }

    void logLumenXAnalyticsEventForContext({
      name: "auth_login_success",
      params: { method: input.authMethod ?? "unknown" },
    });

    return session;
  } catch (error) {
    void logLumenXAnalyticsEventForContext({
      name: "auth_login_failure",
      params: { method: input.authMethod ?? "unknown" },
    });
    throw error;
  }
}

/** Step 1 — send Firebase SMS OTP (returns confirm session). */
export async function startFirebasePhoneLogin(input: {
  phone: string;
  verifier: ApplicationVerifier;
  auth?: Auth;
}): Promise<PhoneSignInSession> {
  const session = await requestFirebasePhoneOtp(
    input.phone,
    input.verifier,
    input.auth,
  );
  void logLumenXAnalyticsEventForContext({
    name: "auth_otp_requested",
    params: { method: "phone" },
  });
  return session;
}

/** Step 2 — verify OTP then exchange for LumenX Supabase session. */
export async function confirmFirebasePhoneLogin(input: {
  phoneSession: PhoneSignInSession;
  otp: string;
  apiBaseUrl: string;
  instituteId?: string;
  autoLink?: boolean;
  setSupabaseSession?: CompleteFirebaseLoginInput["setSupabaseSession"];
  fetchImpl?: typeof fetch;
}): Promise<FirebaseSessionExchangeResult> {
  const { idToken } = await input.phoneSession.confirm(input.otp);
  void logLumenXAnalyticsEventForContext({
    name: "auth_otp_verified",
    params: { method: "phone" },
  });
  return completeFirebaseLogin({
    apiBaseUrl: input.apiBaseUrl,
    idToken,
    instituteId: input.instituteId,
    autoLink: input.autoLink,
    authMethod: "phone",
    setSupabaseSession: input.setSupabaseSession,
    fetchImpl: input.fetchImpl,
  });
}

export { requestFirebasePhoneOtp };

export async function loginWithFirebaseEmail(input: {
  email: string;
  password: string;
  apiBaseUrl: string;
  instituteId?: string;
  autoLink?: boolean;
  auth?: Auth;
  setSupabaseSession?: CompleteFirebaseLoginInput["setSupabaseSession"];
  fetchImpl?: typeof fetch;
}): Promise<FirebaseSessionExchangeResult> {
  let signedIn: { idToken: string };
  try {
    signedIn = await signInWithFirebaseEmail(
      input.email,
      input.password,
      input.auth,
    );
  } catch (error) {
    void logLumenXAnalyticsEventForContext({
      name: "auth_login_failure",
      params: { method: "email" },
    });
    throw error;
  }
  return completeFirebaseLogin({
    apiBaseUrl: input.apiBaseUrl,
    idToken: signedIn.idToken,
    instituteId: input.instituteId,
    autoLink: input.autoLink,
    authMethod: "email",
    setSupabaseSession: input.setSupabaseSession,
    fetchImpl: input.fetchImpl,
  });
}

export async function logoutFirebaseAndClearLocal(input?: {
  auth?: Auth;
  clearSupabaseSession?: () => Promise<void>;
  clearLocalSession?: () => void;
}): Promise<void> {
  void logLumenXAnalyticsEventForContext({ name: "auth_logout" });
  try {
    await signOutFirebase(input?.auth);
  } catch {
    // Continue clearing local session even if Firebase sign-out fails.
  }
  if (input?.clearSupabaseSession) {
    await input.clearSupabaseSession();
  }
  input?.clearLocalSession?.();
}
