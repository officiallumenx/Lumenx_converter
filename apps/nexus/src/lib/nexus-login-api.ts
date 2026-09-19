/** Nexus operator / root login API — Firebase OTP + notebook workflow client. */

import {
  firebaseConfirmPhoneOtpOnly,
  firebaseLogout,
  firebaseRequestPhoneOtp,
  requestFirebasePasswordReset,
  signInWithFirebaseEmail,
} from "@lumenx/auth";
import { invalidatePushDeviceTokensBeforeSignOut } from "@lumenx/notifications";
import { getApiBaseUrl } from "@/lib/nexus-api";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { isFirebaseAuthProvider } from "@/lib/auth-mode";

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as {
    data?: T;
    error?: { message?: string };
  };
  if (!res.ok || !json.data) {
    throw new Error(json.error?.message || `Request failed (${res.status})`);
  }
  return json.data;
}

async function postFirebaseJson<T>(
  path: string,
  idToken: string,
  body: unknown,
): Promise<T> {
  const res = await fetch(`${getApiBaseUrl()}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${idToken}`,
    },
    body: JSON.stringify(body),
  });
  const json = (await res.json().catch(() => ({}))) as {
    data?: T;
    error?: { message?: string };
  };
  if (!res.ok || !json.data) {
    throw new Error(json.error?.message || `Request failed (${res.status})`);
  }
  return json.data;
}

export function isNexusFirebaseProvider(): boolean {
  return isFirebaseAuthProvider();
}

export async function validateNexusSession(accessToken: string): Promise<boolean> {
  const response = await fetch(`${getApiBaseUrl()}/api/v1/me`, {
    headers: {
      Accept: "application/json",
      Authorization: `Bearer ${accessToken}`,
    },
  });
  if (response.status === 401 || response.status === 403) return false;
  if (!response.ok) throw new Error(`Session validation failed (${response.status})`);
  const json = (await response.json()) as {
    data?: { profile?: { status?: string }; platformOperator?: { active?: boolean } };
  };
  return (
    json.data?.profile?.status === "active" &&
    json.data?.platformOperator?.active === true
  );
}

/** Local/dev: establish operator session without the login UI. */
export async function ensureNexusOpenAccessSession(): Promise<boolean> {
  const existing = await getSupabaseBrowserClient()
    .auth.getSession()
    .then((r) => r.data.session?.access_token ?? null)
    .catch(() => null);
  if (existing && (await validateNexusSession(existing).catch(() => false))) {
    return true;
  }

  const session = await postJson<{
    access_token: string;
    refresh_token: string;
    display_name: string;
    is_root?: boolean;
  }>("/api/v1/auth/nexus/open-access", {});

  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.auth.setSession({
    access_token: session.access_token,
    refresh_token: session.refresh_token,
  });
  if (error) throw new Error(error.message || "Unable to establish open-access session.");
  return true;
}

export async function resolveNexusLoginMode(identifier: string) {
  return postJson<{
    firstLogin: boolean;
    requiresDualOtp: boolean;
    requiresPin: boolean;
    displayName: string;
    handle: string | null;
    roleCode: string;
    isRoot: boolean;
  }>("/api/v1/auth/nexus/login-mode", { identifier });
}

export async function requestNexusOtp(
  identifier: string,
  channel: "email" | "mobile",
) {
  if (isFirebaseAuthProvider() && channel === "mobile") {
    const prepared = await postJson<{
      maskedDestination: string;
      channel: "mobile";
      displayName: string;
      phoneE164?: string;
    }>("/api/v1/auth/nexus/request-otp", {
      identifier,
      channel: "mobile",
      delivery: "firebase_client",
    });
    if (!prepared.phoneE164) {
      throw new Error("Operator mobile number is missing for Firebase OTP.");
    }
    const sent = await firebaseRequestPhoneOtp(prepared.phoneE164);
    return {
      maskedDestination: sent.maskedDestination || prepared.maskedDestination,
      channel: "mobile" as const,
      displayName: prepared.displayName,
      phoneE164: prepared.phoneE164,
    };
  }
  return postJson<{
    maskedDestination: string;
    channel: "email" | "mobile";
    displayName: string;
    devOtp?: string;
  }>("/api/v1/auth/nexus/request-otp", { identifier, channel });
}

export async function verifyNexusOtp(
  identifier: string,
  channel: "email" | "mobile",
  otp: string,
  phoneE164?: string,
) {
  if (isFirebaseAuthProvider() && channel === "mobile") {
    if (!phoneE164) {
      throw new Error("Firebase phone session missing. Request OTP again.");
    }
    const confirmed = await firebaseConfirmPhoneOtpOnly({ phone: phoneE164, otp });
    return {
      ok: true as const,
      channel: "mobile" as const,
      firebaseIdToken: confirmed.idToken,
    };
  }
  return postJson<{
    ok: true;
    channel: "email" | "mobile";
    grant: string;
    expiresAt: string;
  }>("/api/v1/auth/nexus/verify-otp", { identifier, channel, otp });
}

export async function completeNexusLogin(input: {
  identifier: string;
  pin: string;
  password: string;
  mobileOtpGrant?: string;
  emailOtpGrant?: string;
  /** After Firebase phone OTP — preferred when VITE_AUTH_PROVIDER=firebase */
  firebasePhoneIdToken?: string;
}) {
  const supabase = getSupabaseBrowserClient();

  if (isFirebaseAuthProvider() && input.firebasePhoneIdToken) {
    const session = await postFirebaseJson<{
      access_token: string;
      refresh_token: string;
      display_name: string;
      is_root?: boolean;
    }>("/api/v1/auth/nexus/firebase-login", input.firebasePhoneIdToken, {
      provider: "phone",
      pin: input.pin,
      password: input.password,
    });
    const { error } = await supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });
    if (error) throw new Error(error.message || "Unable to establish Nexus session.");
    return session;
  }

  if (isFirebaseAuthProvider() && input.identifier.includes("@")) {
    const firebase = await signInWithFirebaseEmail(
      input.identifier.trim().toLowerCase(),
      input.password,
    );
    const session = await postFirebaseJson<{
      access_token: string;
      refresh_token: string;
      display_name: string;
      is_root?: boolean;
    }>("/api/v1/auth/nexus/firebase-login", firebase.idToken, {
      provider: "password",
      pin: input.pin,
    });
    const { error } = await supabase.auth.setSession({
      access_token: session.access_token,
      refresh_token: session.refresh_token,
    });
    if (error) throw new Error(error.message || "Unable to establish Nexus session.");
    return session;
  }

  if (!input.mobileOtpGrant || !input.emailOtpGrant) {
    throw new Error("Verify mobile and email OTP before completing login.");
  }

  const data = await postJson<{
    access_token: string;
    refresh_token: string;
    display_name: string;
    is_root?: boolean;
  }>("/api/v1/auth/nexus/login", {
    identifier: input.identifier,
    pin: input.pin,
    password: input.password,
    mobile_otp_grant: input.mobileOtpGrant,
    email_otp_grant: input.emailOtpGrant,
  });

  const { error } = await supabase.auth.setSession({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
  });
  if (error) throw new Error(error.message || "Unable to establish Nexus session.");
  return data;
}

export async function requestNexusPasswordResetOtp(
  identifier: string,
  channel: "email" | "mobile",
) {
  if (isFirebaseAuthProvider() && channel === "email" && identifier.includes("@")) {
    await requestFirebasePasswordReset(identifier.trim().toLowerCase());
    return {
      maskedDestination: identifier.trim().toLowerCase(),
      channel: "email" as const,
      displayName: "Operator",
      firebaseEmailLink: true as const,
    };
  }
  return postJson<{
    maskedDestination: string;
    channel: "email" | "mobile";
    displayName: string;
    devOtp?: string;
  }>("/api/v1/auth/nexus/forgot-password/request-otp", { identifier, channel });
}

export async function verifyNexusPasswordResetOtp(
  identifier: string,
  channel: "email" | "mobile",
  otp: string,
) {
  return postJson<{
    ok: true;
    channel: "email" | "mobile";
    grant: string;
    expiresAt: string;
  }>("/api/v1/auth/nexus/forgot-password/verify-otp", {
    identifier,
    channel,
    otp,
  });
}

export async function completeNexusPasswordReset(input: {
  identifier: string;
  mobileOtpGrant: string;
  emailOtpGrant: string;
  newPassword: string;
}) {
  return postJson<{ ok: true }>("/api/v1/auth/nexus/forgot-password/complete", {
    identifier: input.identifier,
    mobile_otp_grant: input.mobileOtpGrant,
    email_otp_grant: input.emailOtpGrant,
    new_password: input.newPassword,
  });
}

export async function requestNexusPinResetOtp(
  identifier: string,
  channel: "email" | "mobile",
) {
  return postJson<{
    maskedDestination: string;
    channel: "email" | "mobile";
    displayName: string;
    devOtp?: string;
  }>("/api/v1/auth/nexus/forgot-pin/request-otp", { identifier, channel });
}

export async function verifyNexusPinResetOtp(
  identifier: string,
  channel: "email" | "mobile",
  otp: string,
) {
  return postJson<{
    ok: true;
    channel: "email" | "mobile";
    grant: string;
    expiresAt: string;
  }>("/api/v1/auth/nexus/forgot-pin/verify-otp", {
    identifier,
    channel,
    otp,
  });
}

export async function completeNexusPinReset(input: {
  identifier: string;
  mobileOtpGrant: string;
  emailOtpGrant: string;
  newPin: string;
}) {
  return postJson<{ ok: true }>("/api/v1/auth/nexus/forgot-pin/complete", {
    identifier: input.identifier,
    mobile_otp_grant: input.mobileOtpGrant,
    email_otp_grant: input.emailOtpGrant,
    new_pin: input.newPin,
  });
}

export async function nexusSignOut(): Promise<void> {
  await invalidatePushDeviceTokensBeforeSignOut({
    app: "nexus",
    apiBaseUrl: getApiBaseUrl(),
    getAccessToken: async () => {
      const { data } = await getSupabaseBrowserClient().auth.getSession();
      return data.session?.access_token;
    },
  });
  await firebaseLogout({
    clearSupabaseSession: async () => {
      await getSupabaseBrowserClient().auth.signOut().catch(() => undefined);
    },
  });
}
