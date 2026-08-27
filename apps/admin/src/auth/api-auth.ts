import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import {
  clearStoredActiveInstituteId,
  resolveActiveInstitute,
  selectActiveInstitute,
} from "@/lib/active-institute";
import { authUserFromMe, fetchInstituteName, fetchMe } from "@/auth/me-bridge";
import type { AuthUser } from "@/auth/types";
import { ApiClientError } from "@/lib/api";

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

  const resolved = resolveActiveInstitute(me.institutes);
  let instituteName = "";
  if (resolved.instituteId) {
    instituteName = await fetchInstituteName(resolved.instituteId, accessToken);
  }

  const user = authUserFromMe(me, resolved.instituteId, instituteName || "Institute");
  return {
    user,
    meInstitutes: me.institutes,
    activeInstituteId: resolved.instituteId,
  };
}

/** Bootstrap: if Supabase has a session, hydrate /me; otherwise null. */
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
}

export function setApiActiveInstitute(
  instituteId: string,
  memberships: Array<{ instituteId: string; status: string }>,
): void {
  selectActiveInstitute(instituteId, memberships);
}
