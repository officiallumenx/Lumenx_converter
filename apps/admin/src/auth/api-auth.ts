import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import {
  clearStoredActiveInstituteId,
  resolveActiveInstitute,
  selectActiveInstitute,
} from "@/lib/active-institute";
import { authUserFromMe, fetchInstituteName, fetchMe } from "@/auth/me-bridge";
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

/**
 * Sign in with Supabase Auth (email + password), then hydrate via GET /api/v1/me.
 * Does not accept or generate mock JWTs.
 */
export async function apiSignInWithPassword(
  email: string,
  password: string,
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

  return hydrateFromAccessToken(data.session.access_token);
}

export async function hydrateFromAccessToken(
  accessToken: string,
  preferredInstituteId?: string | null,
): Promise<ApiAuthHydration> {
  let me;
  try {
    me = await fetchMe(accessToken);
  } catch (err) {
    // Failed real auth must not fall back to demo identity.
    await getSupabaseBrowserClient().auth.signOut().catch(() => undefined);
    clearStoredActiveInstituteId();
    if (err instanceof ApiClientError) {
      throw new Error(err.message);
    }
    throw err;
  }

  if (preferredInstituteId) {
    try {
      selectActiveInstitute(preferredInstituteId, me.institutes);
    } catch {
      // Fall back to stored / single-institute resolution.
    }
  }

  const resolved = resolveActiveInstitute(me.institutes);
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
 * Staff Admin login: institute + email/mobile OTP + password every session.
 */
export async function apiSignInWithStaffOtp(input: {
  instituteId: string;
  identifier: string;
  otp: string;
  password: string;
}): Promise<ApiAuthHydration> {
  const session = await verifyStaffLogin(input);
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
  try {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
  } catch {
    // still clear local API state
  }
  clearStoredActiveInstituteId();
  clearApiAccessState();
}

export function setApiActiveInstitute(
  instituteId: string,
  memberships: Array<{ instituteId: string; status: string }>,
): void {
  selectActiveInstitute(instituteId, memberships);
}
