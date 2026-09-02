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
    await getSupabaseBrowserClient().auth.signOut().catch(() => undefined);
    if (err instanceof ApiClientError) {
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

  const user = admissionsUserFromMe(me, {
    ...options,
    instituteName,
    preferredInstituteId: resolvedInstituteId ?? options.preferredInstituteId,
  });
  persistApiAdmissionsUser(user);
  return { user };
}

export async function apiSignInWithPassword(
  email: string,
  password: string,
): Promise<ApiAuthHydration> {
  const normalized = email.trim().toLowerCase();
  if (!normalized.includes("@")) {
    throw new Error("API sign-in requires an email address.");
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

export type ApiSignUpInput = {
  email: string;
  password: string;
  name: string;
  phone?: string;
  accountType: AdmissionsAccountType;
  instituteName?: string;
};

export async function apiSignUpWithPassword(input: ApiSignUpInput): Promise<ApiAuthHydration> {
  const normalized = input.email.trim().toLowerCase();
  if (!normalized.includes("@")) {
    throw new Error("API sign-up requires an email address.");
  }

  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.auth.signUp({
    email: normalized,
    password: input.password,
    options: {
      data: {
        display_name: input.name.trim(),
        admissions_account_type: input.accountType,
      },
    },
  });

  if (error) {
    throw new Error(error.message);
  }

  if (!data.session?.access_token) {
    throw new Error(
      "Account created. Confirm your email if required, then sign in.",
    );
  }

  return hydrateFromAccessToken(data.session.access_token, {
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

export async function apiSignOut(): Promise<void> {
  try {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
  } catch {
    /* still clear local session */
  }
  signOutUser();
}

export { hydrateFromAccessToken };
