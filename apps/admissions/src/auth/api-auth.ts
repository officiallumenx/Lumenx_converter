import {
  clearAppAuthSession,
  completeVerifiedAppSignup,
} from "@lumenx/auth";
import { invalidatePushDeviceTokensBeforeSignOut } from "@lumenx/notifications";
import type { MeResponse } from "@/lib/api/me-types";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { ApiClientError } from "@/lib/api";
import { persistApiAdmissionsUser, signOutUser } from "@/lib/admissions/repositories";
import type { AdmissionsAccountType, AdmissionsUser } from "@/lib/admissions/types";
import {
  admissionsUserFromMe,
  fetchInstituteName,
  fetchMe,
  type AdmissionsUserFromMeOptions,
} from "./me-bridge";

export type ApiAuthHydration = {
  user: AdmissionsUser;
};

export async function setSupabaseSession(
  accessToken: string,
  refreshToken?: string | null,
): Promise<void> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.auth.setSession({
    access_token: accessToken,
    refresh_token: refreshToken ?? "",
  });
  if (error) {
    throw new Error(error.message);
  }
}

async function hydrateFromAccessToken(
  accessToken: string,
  options: AdmissionsUserFromMeOptions = {},
): Promise<ApiAuthHydration> {
  let me: MeResponse;
  try {
    me = await fetchMe(accessToken);
  } catch (err) {
    if (err instanceof ApiClientError && (err.status === 401 || err.status === 403)) {
      await getSupabaseBrowserClient().auth.signOut().catch(() => undefined);
      throw new Error(err.message);
    }
    throw err;
  }

  let instituteName = options.instituteName;
  const membership = me.institutes.find(
    (m) => m.instituteId === options.preferredInstituteId,
  );
  const resolvedInstituteId =
    options.preferredInstituteId ?? membership?.instituteId;

  if (
    !instituteName &&
    resolvedInstituteId &&
    /^[0-9a-f-]{36}$/i.test(resolvedInstituteId)
  ) {
    instituteName = await fetchInstituteName(resolvedInstituteId, accessToken);
  }

  let user: AdmissionsUser;
  try {
    user = admissionsUserFromMe(me, {
      ...options,
      instituteName,
      preferredInstituteId: resolvedInstituteId ?? options.preferredInstituteId,
    });
  } catch (err) {
    await getSupabaseBrowserClient().auth.signOut().catch(() => undefined);
    throw err;
  }
  persistApiAdmissionsUser(user);
  return { user };
}

export async function apiSignInWithPassword(
  identifier: string,
  password: string,
  options: { accountType?: AdmissionsAccountType } = {},
): Promise<ApiAuthHydration> {
  const digits = identifier.replace(/\D/g, "").slice(-10);
  const apiBase = (import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8787").replace(
    /\/+$/,
    "",
  );

  // Primary: mobile + password via API (email is recovery/details only).
  if (digits.length === 10) {
    const response = await fetch(`${apiBase}/api/v1/auth/signup/password-login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        app: "admissions",
        phone: digits,
        password,
        account_type: options.accountType,
      }),
    });
    const json = (await response.json().catch(() => ({}))) as {
      data?: {
        access_token?: string;
        refresh_token?: string;
      };
      error?: { message?: string };
    };
    if (!response.ok || !json.data?.access_token) {
      throw new Error(json.error?.message ?? "Invalid mobile number or password.");
    }
    await setSupabaseSession(json.data.access_token, json.data.refresh_token);
    return hydrateFromAccessToken(json.data.access_token, {
      forceAccountType: options.accountType,
      phone: digits,
    });
  }

  // Fallback: email + password (legacy / recovery).
  const normalized = identifier.trim().toLowerCase();
  if (!normalized.includes("@")) {
    throw new Error("Sign in with your mobile number.");
  }

  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalized,
    password,
  });

  if (error || !data.session?.access_token) {
    throw new Error(error?.message ?? "Sign-in failed. Check your mobile and password.");
  }

  return hydrateFromAccessToken(data.session.access_token, {
    forceAccountType: options.accountType,
  });
}

export type ApiSignUpInput = {
  email: string;
  password: string;
  name: string;
  phone?: string;
  accountType: AdmissionsAccountType;
  instituteName?: string;
  verificationGrants: string[];
};

export async function apiSignUpWithPassword(input: ApiSignUpInput): Promise<ApiAuthHydration> {
  const normalized = input.email.trim().toLowerCase();
  if (!normalized.includes("@")) {
    throw new Error("API sign-up requires an email address.");
  }

  const data = await completeVerifiedAppSignup({
    apiBaseUrl: (import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8787").trim(),
    app: "admissions",
    accountType: input.accountType,
    email: normalized,
    password: input.password,
    displayName: input.name,
    phone: input.phone,
    verificationGrants: input.verificationGrants,
    metadata: { institute_name: input.instituteName ?? null },
  });
  await setSupabaseSession(data.accessToken, data.refreshToken);
  return hydrateFromAccessToken(data.accessToken, {
    forceAccountType: input.accountType,
    instituteName: input.instituteName,
    phone: input.phone,
  });
}

export async function tryHydrateApiSession(): Promise<ApiAuthHydration | null> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) return null;
  return hydrateFromAccessToken(data.session.access_token);
}

function admissionsApiBase(): string {
  return (import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8787").replace(/\/+$/, "");
}

function phoneDigitsFromIdentifier(identifier: string): string {
  const digits = identifier.replace(/\D/g, "").slice(-10);
  if (digits.length !== 10) throw new Error("Enter a valid 10-digit mobile number.");
  return digits;
}

export async function apiRequestPasswordResetOtp(identifier: string): Promise<{
  maskedDestination: string;
  devOtp?: string;
}> {
  const phone = phoneDigitsFromIdentifier(identifier);
  const response = await fetch(`${admissionsApiBase()}/api/v1/auth/signup/forgot-password/request-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ app: "admissions", phone }),
  });
  const json = (await response.json().catch(() => ({}))) as {
    data?: { maskedDestination?: string; devOtp?: string };
    error?: { message?: string };
  };
  if (!response.ok || !json.data?.maskedDestination) {
    throw new Error(json.error?.message ?? "Unable to send OTP.");
  }
  return {
    maskedDestination: json.data.maskedDestination,
    devOtp: json.data.devOtp,
  };
}

export async function apiVerifyPasswordResetOtp(
  identifier: string,
  otp: string,
): Promise<{ grant: string; expiresAt: string }> {
  const phone = phoneDigitsFromIdentifier(identifier);
  const response = await fetch(`${admissionsApiBase()}/api/v1/auth/signup/forgot-password/verify-otp`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ app: "admissions", phone, otp }),
  });
  const json = (await response.json().catch(() => ({}))) as {
    data?: { grant?: string; expiresAt?: string };
    error?: { message?: string };
  };
  if (!response.ok || !json.data?.grant || !json.data.expiresAt) {
    throw new Error(json.error?.message ?? "Incorrect or expired code.");
  }
  return { grant: json.data.grant, expiresAt: json.data.expiresAt };
}

export async function apiCompletePasswordReset(input: {
  identifier: string;
  mobileOtpGrant: string;
  newPassword: string;
}): Promise<void> {
  const phone = phoneDigitsFromIdentifier(input.identifier);
  const response = await fetch(`${admissionsApiBase()}/api/v1/auth/signup/forgot-password/complete`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      app: "admissions",
      phone,
      mobile_otp_grant: input.mobileOtpGrant,
      new_password: input.newPassword,
    }),
  });
  const json = (await response.json().catch(() => ({}))) as {
    data?: { ok?: boolean };
    error?: { message?: string };
  };
  if (!response.ok || !json.data?.ok) {
    throw new Error(json.error?.message ?? "Unable to update password.");
  }
}

/** @deprecated Prefer mobile OTP reset helpers above. */
export async function apiRequestPasswordReset(identifier: string): Promise<void> {
  await apiRequestPasswordResetOtp(identifier);
}

export async function applyAdminHandoffSession(input: {
  accessToken: string;
  refreshToken?: string | null;
  instituteId: string;
  instituteName: string;
  name?: string;
  phone?: string;
}): Promise<ApiAuthHydration> {
  await setSupabaseSession(input.accessToken, input.refreshToken);
  return hydrateFromAccessToken(input.accessToken, {
    preferredInstituteId: input.instituteId,
    instituteName: input.instituteName,
    phone: input.phone,
    forceAccountType: "institute_admin",
  });
}

export async function exchangeAdminHandoffCode(code: string): Promise<{
  hydration: ApiAuthHydration;
  destination: string;
}> {
  const base = (import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8787").replace(/\/+$/, "");
  const response = await fetch(`${base}/api/v1/auth/handoff/exchange`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code, app: "admissions" }),
  });
  const json = (await response.json().catch(() => ({}))) as {
    data?: {
      access_token: string;
      refresh_token: string;
      institute_id: string;
      institute_name: string;
      destination: string;
      name?: string;
      phone?: string;
    };
    error?: { message?: string };
  };
  if (!response.ok || !json.data) {
    throw new Error(json.error?.message ?? "This setup link expired or was already used.");
  }
  const hydration = await applyAdminHandoffSession({
    accessToken: json.data.access_token,
    refreshToken: json.data.refresh_token,
    instituteId: json.data.institute_id,
    instituteName: json.data.institute_name,
    name: json.data.name,
    phone: json.data.phone,
  });
  return { hydration, destination: json.data.destination };
}

export async function apiSignOut(): Promise<void> {
  await invalidatePushDeviceTokensBeforeSignOut({
    app: "admissions",
    apiBaseUrl: (import.meta.env.VITE_API_BASE_URL ?? "http://127.0.0.1:8787").replace(
      /\/+$/,
      "",
    ),
    getAccessToken: async () => {
      const { data } = await getSupabaseBrowserClient().auth.getSession();
      return data.session?.access_token;
    },
  });
  await clearAppAuthSession({
    clearSupabaseSession: async () => {
      await getSupabaseBrowserClient().auth.signOut().catch(() => undefined);
    },
    clearLocalSession: () => signOutUser(),
  });
}

export { hydrateFromAccessToken };
