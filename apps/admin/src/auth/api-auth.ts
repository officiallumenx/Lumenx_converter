import { clearAppAuthSession } from "@lumenx/auth";
import { invalidatePushDeviceTokensBeforeSignOut } from "@lumenx/notifications";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import {
  clearStoredActiveInstituteId,
  isInstituteUuid,
  resolveActiveInstitute,
  selectActiveInstitute,
  writeStoredActiveInstituteId,
} from "@/lib/active-institute";
import {
  authUserFromMe,
  fetchInstituteName,
  fetchMe,
  hasAdminAppAccess,
  isPendingAdminApplicant,
} from "@/auth/me-bridge";
import type { AuthUser } from "@/auth/types";
import { ApiClientError } from "@/lib/api";
import {
  clearApiAccessState,
  getApiAccessState,
  syncApiAccessPermissions,
  verifyStaffLogin,
  verifyStaffPasswordLogin,
} from "@/lib/access-roles";
import { demoRoleIdForSystemKey } from "@/lib/access-roles/system-keys";

export type ApiAuthHydration = {
  user: AuthUser;
  meInstitutes: Array<{ instituteId: string; status: string; roles: string[] }>;
  activeInstituteId: string | null;
};

export type HydrateAccessOptions = {
  /**
   * After institute registration, applicants have an active profile but no
   * institute membership until Nexus approval. Allow session hydrate so they
   * can reach pending-verification.
   */
  allowPendingApplicant?: boolean;
};

/**
 * Sign in with email + password via Supabase, then hydrate via GET /api/v1/me.
 * Does not accept or generate mock JWTs. Never falls back to demo.
 */
export async function apiSignInWithPassword(
  email: string,
  password: string,
  opts?: HydrateAccessOptions,
): Promise<ApiAuthHydration> {
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes("@")) {
    throw new Error("API sign-in requires an email address (not mobile).");
  }

  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalized,
    password,
  });

  if (error || !data.session?.access_token) {
    throw new Error(error?.message ?? "Sign-in failed. Check your email and password.");
  }

  return hydrateFromAccessToken(data.session.access_token, null, opts);
}

export async function hydrateFromAccessToken(
  accessToken: string,
  preferredInstituteId?: string | null,
  opts?: HydrateAccessOptions,
): Promise<ApiAuthHydration> {
  let me;
  try {
    me = await fetchMe(accessToken);
  } catch (err) {
    if (err instanceof ApiClientError && (err.status === 401 || err.status === 403)) {
      await getSupabaseBrowserClient().auth.signOut().catch(() => undefined);
      clearStoredActiveInstituteId();
      throw new Error(err.message);
    }
    throw err;
  }

  if (!hasAdminAppAccess(me)) {
    if (opts?.allowPendingApplicant && isPendingAdminApplicant(me)) {
      const user = authUserFromMe(me, null, "", null);
      return {
        user: {
          ...user,
          // Not institute-activated until Nexus approval.
          isVerified: false,
          instituteId: "",
          instituteName: "",
        },
        meInstitutes: me.institutes,
        activeInstituteId: null,
      };
    }
    await getSupabaseBrowserClient().auth.signOut().catch(() => undefined);
    clearStoredActiveInstituteId();
    if (isPendingAdminApplicant(me)) {
      throw new Error(
        "Your institute registration is still under review. Open Pending verification after signup, or wait for Nexus approval.",
      );
    }
    throw new Error("This account does not have active LumenX Admin access.");
  }

  if (preferredInstituteId) {
    try {
      selectActiveInstitute(preferredInstituteId, me.institutes);
    } catch {
      // Platform operators may lack a membership row for the login institute.
      if (me.platformOperator?.active && isInstituteUuid(preferredInstituteId)) {
        writeStoredActiveInstituteId(preferredInstituteId);
      }
    }
  }

  const resolved = resolveActiveInstitute(
    me.institutes,
    undefined,
    me.platformOperator?.active && preferredInstituteId && isInstituteUuid(preferredInstituteId)
      ? { allowInstituteIds: [preferredInstituteId] }
      : undefined,
  );
  let instituteName = "";
  if (resolved.instituteId) {
    instituteName = await fetchInstituteName(resolved.instituteId, accessToken);
  }

  await syncApiAccessPermissions(resolved.instituteId);
  const access = getApiAccessState();
  const user = authUserFromMe(
    me,
    resolved.instituteId,
    instituteName || "Institute",
    access.accessRoleId ?? demoRoleIdForSystemKey(access.accessRoleSystemKey),
  );
  return {
    user: {
      ...user,
      accessRoleId: user.accessRoleId ?? access.accessRoleId ?? undefined,
    },
    meInstitutes: me.institutes,
    activeInstituteId: resolved.instituteId,
  };
}

/**
 * Staff Admin login: server OTP + password + PIN (Supabase session).
 */
export async function apiSignInWithStaffOtp(input: {
  instituteId: string;
  identifier: string;
  otp?: string;
  mobileOtp?: string;
  emailOtp?: string;
  mobileOtpGrant?: string;
  emailOtpGrant?: string;
  password?: string;
  pin: string;
}): Promise<ApiAuthHydration> {
  if (!input.password || input.password.length < 1) {
    throw new Error("Enter your password after OTP verification.");
  }
  const session = await verifyStaffLogin({
    instituteId: input.instituteId,
    identifier: input.identifier,
    otp: input.otp,
    mobileOtp: input.mobileOtp,
    emailOtp: input.emailOtp,
    mobileOtpGrant: input.mobileOtpGrant,
    emailOtpGrant: input.emailOtpGrant,
    password: input.password,
    pin: input.pin,
  });
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.auth.setSession({
    access_token: session.accessToken,
    refresh_token: session.refreshToken,
  });
  if (error) {
    throw new Error(error.message || "Unable to establish staff session.");
  }
  return hydrateFromAccessToken(session.accessToken, input.instituteId);
}

export async function apiSignInWithStaffPassword(input: {
  instituteId: string;
  identifier: string;
  password: string;
  pin: string;
}): Promise<ApiAuthHydration> {
  const session = await verifyStaffPasswordLogin(input);
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.auth.setSession({
    access_token: session.accessToken,
    refresh_token: session.refreshToken,
  });
  if (error) {
    throw new Error(error.message || "Unable to establish staff session.");
  }
  return hydrateFromAccessToken(session.accessToken, input.instituteId);
}

export async function tryHydrateApiSession(): Promise<ApiAuthHydration | null> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token) return null;
  return hydrateFromAccessToken(data.session.access_token);
}

export async function apiSignOut(): Promise<void> {
  await invalidatePushDeviceTokensBeforeSignOut({
    app: "admin",
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
  });
  clearStoredActiveInstituteId();
  clearApiAccessState();
}

export function setApiActiveInstitute(
  instituteId: string,
  memberships: Array<{ instituteId: string; status: string }>,
): void {
  selectActiveInstitute(instituteId, memberships);
}
