/**
 * Shared Firebase → LumenX session bridge for app api-auth modules.
 */

import {
  loginWithFirebaseEmail,
  logoutFirebaseAndClearLocal,
  startFirebasePhoneLogin,
  confirmFirebasePhoneLogin,
} from "./index";
import { registerWithFirebaseEmail } from "./email-auth";
import { createInvisibleRecaptcha, type PhoneSignInSession } from "./phone-auth";
import { getCurrentFirebaseIdToken } from "./phone-auth";
import { getViteApiBaseUrl } from "./vite-provider";
import { logLumenXAnalyticsEventForContext } from "./analytics";
import { assertFirebasePhoneAuthHostAllowed } from "./phone-host";

export type SetSupabaseSessionFn = (tokens: {
  accessToken: string;
  refreshToken: string;
}) => Promise<void>;

export async function firebaseEmailLoginToLumenXSession(input: {
  email: string;
  password: string;
  instituteId?: string;
  autoLink?: boolean;
  setSupabaseSession: SetSupabaseSessionFn;
  apiBaseUrl?: string;
}) {
  return loginWithFirebaseEmail({
    email: input.email,
    password: input.password,
    apiBaseUrl: input.apiBaseUrl ?? getViteApiBaseUrl(),
    instituteId: input.instituteId,
    autoLink: input.autoLink ?? true,
    setSupabaseSession: input.setSupabaseSession,
  });
}

export async function firebaseEmailRegister(input: {
  email: string;
  password: string;
}) {
  void logLumenXAnalyticsEventForContext({
    name: "auth_signup_started",
    params: { method: "email" },
  });
  return registerWithFirebaseEmail(input.email, input.password);
}

export async function linkFirebaseToCurrentSupabaseUser(input: {
  supabaseAccessToken: string;
  firebaseIdToken?: string;
  apiBaseUrl?: string;
  fetchImpl?: typeof fetch;
}): Promise<void> {
  const base = (input.apiBaseUrl ?? getViteApiBaseUrl()).replace(/\/$/, "");
  const idToken =
    input.firebaseIdToken ?? (await getCurrentFirebaseIdToken(true));
  if (!idToken) {
    throw new Error("Firebase session missing after registration.");
  }
  const fetchFn = input.fetchImpl ?? fetch;
  const res = await fetchFn(`${base}/api/v1/auth/firebase/link`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${input.supabaseAccessToken}`,
      "X-Firebase-Id-Token": idToken,
      Accept: "application/json",
    },
  });
  if (!res.ok) {
    const body = (await res.json().catch(() => null)) as {
      error?: { message?: string };
    } | null;
    throw new Error(body?.error?.message ?? `Firebase link failed (${res.status})`);
  }
}

const phoneSessions = new Map<string, PhoneSignInSession>();
let sharedRecaptcha: ReturnType<typeof createInvisibleRecaptcha> | null = null;

function phoneKey(phone: string): string {
  return phone.replace(/\D/g, "").slice(-10);
}

function ensureBrowserRecaptcha(): ReturnType<typeof createInvisibleRecaptcha> {
  if (typeof document === "undefined") {
    throw new Error("Firebase phone auth requires a browser.");
  }
  if (sharedRecaptcha) return sharedRecaptcha;
  let el = document.getElementById("lx-firebase-recaptcha");
  if (!el) {
    el = document.createElement("div");
    el.id = "lx-firebase-recaptcha";
    document.body.appendChild(el);
  }
  sharedRecaptcha = createInvisibleRecaptcha(el);
  return sharedRecaptcha;
}

function resetBrowserRecaptcha(): void {
  sharedRecaptcha?.clear();
  sharedRecaptcha = null;
  document.getElementById("lx-firebase-recaptcha")?.remove();
}

export async function firebaseRequestPhoneOtp(phone: string): Promise<{
  maskedDestination: string;
}> {
  assertFirebasePhoneAuthHostAllowed();
  let session: PhoneSignInSession;
  try {
    resetBrowserRecaptcha();
    const verifier = ensureBrowserRecaptcha();
    await verifier.render();
    session = await startFirebasePhoneLogin({ phone, verifier });
    resetBrowserRecaptcha();
  } catch (error) {
    resetBrowserRecaptcha();
    throw error;
  }
  phoneSessions.set(phoneKey(phone), session);
  const digits = phoneKey(phone);
  const masked =
    digits.length >= 5
      ? `••••• ${digits.slice(-5)}`
      : phone;
  return { maskedDestination: masked };
}

export async function firebaseConfirmPhoneOtpOnly(input: {
  phone: string;
  otp: string;
}): Promise<{ idToken: string; uid: string }> {
  const key = phoneKey(input.phone);
  const pending = phoneSessions.get(key);
  if (!pending) {
    throw new Error("Request a new OTP before verifying.");
  }
  const result = await pending.confirm(input.otp);
  phoneSessions.delete(key);
  return result;
}

export async function firebaseConfirmPhoneOtpToLumenXSession(input: {
  phone: string;
  otp: string;
  instituteId?: string;
  autoLink?: boolean;
  setSupabaseSession: SetSupabaseSessionFn;
  apiBaseUrl?: string;
}) {
  const key = phoneKey(input.phone);
  const pending = phoneSessions.get(key);
  if (!pending) {
    throw new Error("Request a new OTP before verifying.");
  }
  const result = await confirmFirebasePhoneLogin({
    phoneSession: pending,
    otp: input.otp,
    apiBaseUrl: input.apiBaseUrl ?? getViteApiBaseUrl(),
    instituteId: input.instituteId,
    autoLink: input.autoLink ?? true,
    setSupabaseSession: input.setSupabaseSession,
  });
  phoneSessions.delete(key);
  return result;
}

export async function firebaseLogout(input?: {
  clearSupabaseSession?: () => Promise<void>;
  clearLocalSession?: () => void;
}): Promise<void> {
  await logoutFirebaseAndClearLocal(input);
}
