/** Nexus operator / root login API — server OTP + notebook workflow client. */

import { clearAppAuthSession } from "@lumenx/auth";
import { invalidatePushDeviceTokensBeforeSignOut } from "@lumenx/notifications";
import { getApiBaseUrl } from "@/lib/nexus-api";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

/** Set only after a successful /login flow — open-access sessions do not set this. */
export const NEXUS_OPERATOR_LOGIN_MARKER = "lumenx.nexus.operatorLogin.v1";

export function hasNexusOperatorLoginMarker(): boolean {
  if (typeof window === "undefined") return false;
  try {
    return window.localStorage.getItem(NEXUS_OPERATOR_LOGIN_MARKER) === "1";
  } catch {
    return false;
  }
}

export function markNexusOperatorLogin(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(NEXUS_OPERATOR_LOGIN_MARKER, "1");
  } catch {
    // ignore
  }
}

export function clearNexusOperatorLoginMarker(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(NEXUS_OPERATOR_LOGIN_MARKER);
    window.localStorage.removeItem("lumenx.nexus.openAccessCleared.v1");
  } catch {
    // ignore
  }
}

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

/** @deprecated Firebase OTP removed — always false. */
export function isNexusFirebaseProvider(): boolean {
  return false;
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
) {
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
}) {
  const supabase = getSupabaseBrowserClient();

  if (!input.mobileOtpGrant) {
    throw new Error("Verify mobile OTP before completing login.");
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
    ...(input.emailOtpGrant ? { email_otp_grant: input.emailOtpGrant } : {}),
  });

  const { error } = await supabase.auth.setSession({
    access_token: data.access_token,
    refresh_token: data.refresh_token,
  });
  if (error) throw new Error(error.message || "Unable to establish Nexus session.");
  markNexusOperatorLogin();
  return data;
}

export async function requestNexusPasswordResetOtp(
  identifier: string,
  channel: "email" | "mobile",
) {
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
  emailOtpGrant?: string;
  newPassword: string;
}) {
  return postJson<{ ok: true }>("/api/v1/auth/nexus/forgot-password/complete", {
    identifier: input.identifier,
    mobile_otp_grant: input.mobileOtpGrant,
    ...(input.emailOtpGrant ? { email_otp_grant: input.emailOtpGrant } : {}),
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
  emailOtpGrant?: string;
  newPin: string;
}) {
  return postJson<{ ok: true }>("/api/v1/auth/nexus/forgot-pin/complete", {
    identifier: input.identifier,
    mobile_otp_grant: input.mobileOtpGrant,
    ...(input.emailOtpGrant ? { email_otp_grant: input.emailOtpGrant } : {}),
    new_pin: input.newPin,
  });
}

export async function nexusSignOut(): Promise<void> {
  clearNexusOperatorLoginMarker();
  await invalidatePushDeviceTokensBeforeSignOut({
    app: "nexus",
    apiBaseUrl: getApiBaseUrl(),
    getAccessToken: async () => {
      const { data } = await getSupabaseBrowserClient().auth.getSession();
      return data.session?.access_token;
    },
  });
  await clearAppAuthSession({
    clearSupabaseSession: async () => {
      await getSupabaseBrowserClient().auth.signOut().catch(() => undefined);
    },
  });
}
