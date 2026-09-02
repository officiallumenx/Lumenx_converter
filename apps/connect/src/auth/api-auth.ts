import type { Role, User } from "@lumenx/types";
import { getConnectApiClient } from "@/lib/connect-api";
import type { MeResponse } from "@/lib/api/me-types";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { ApiClientError } from "@/lib/api";
import { isInstituteUuid } from "@/lib/institute-id";

export type ConnectApiSession = {
  user: User;
  instituteId: string;
  me: MeResponse;
};

async function fetchMe(accessToken?: string): Promise<MeResponse> {
  const api = getConnectApiClient();
  return api.get<MeResponse>("/api/v1/me", {
    accessToken: accessToken ?? undefined,
  });
}

function instituteIdsForRole(me: MeResponse, role: Role): string[] {
  switch (role) {
    case "parent":
      return [...new Set(me.identities.parents.map((p) => p.instituteId))];
    case "student":
      return [...new Set(me.identities.students.map((s) => s.instituteId))];
    case "teacher":
      return [
        ...new Set([
          ...me.identities.teachers.map((t) => t.instituteId),
          ...me.institutes
            .filter((m) => m.roles.includes("teacher") && m.status === "active")
            .map((m) => m.instituteId),
        ]),
      ];
    default:
      return [];
  }
}

export function resolveInstituteForRole(
  me: MeResponse,
  role: Role,
  preferredInstituteId?: string | null,
): string | null {
  const eligible = instituteIdsForRole(me, role).filter(isInstituteUuid);
  if (eligible.length === 0) return null;
  if (preferredInstituteId && eligible.includes(preferredInstituteId)) {
    return preferredInstituteId;
  }
  return eligible[0] ?? null;
}

export function connectUserFromMe(me: MeResponse, role: Role): User {
  return {
    id: me.user.id,
    name: me.profile.displayName,
    email: me.profile.email ?? undefined,
    phone: me.profile.phone ?? "",
    roles: [role],
  };
}

async function completePasswordSignIn(input: {
  email: string;
  password: string;
  role: Role;
  preferredInstituteId?: string | null;
}): Promise<ConnectApiSession> {
  const normalized = input.email.trim().toLowerCase();
  if (!normalized.includes("@")) {
    throw new Error("Sign in with your email address.");
  }

  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalized,
    password: input.password,
  });

  if (error || !data.session?.access_token) {
    throw new Error(error?.message ?? "Sign-in failed. Check your email and password.");
  }

  let me: MeResponse;
  try {
    me = await fetchMe(data.session.access_token);
  } catch (err) {
    await supabase.auth.signOut().catch(() => undefined);
    if (err instanceof ApiClientError) throw new Error(err.message);
    throw err;
  }

  const instituteId = resolveInstituteForRole(me, input.role, input.preferredInstituteId);
  if (!instituteId) {
    await supabase.auth.signOut().catch(() => undefined);
    throw new Error(`No ${input.role} access found for this account at the selected institute.`);
  }

  return {
    user: connectUserFromMe(me, input.role),
    instituteId,
    me,
  };
}

export async function apiSignInWithPassword(input: {
  email: string;
  password: string;
  role: Role;
  preferredInstituteId?: string | null;
}): Promise<ConnectApiSession> {
  return completePasswordSignIn(input);
}

export async function apiSignInParentWithPhone(input: {
  phone: string;
  password: string;
  instituteId: string;
}): Promise<ConnectApiSession> {
  throw new Error("Parent sign-in uses mobile OTP. Use apiRequestParentLoginOtp instead.");
}

export async function apiRequestParentLoginOtp(input: {
  phone: string;
  instituteId: string;
}): Promise<{ maskedPhone: string; displayName: string; devOtp?: string }> {
  if (!isInstituteUuid(input.instituteId)) {
    throw new Error("Select your institute to continue.");
  }
  const digits = input.phone.replace(/\D/g, "");
  if (digits.length !== 10) {
    throw new Error("Enter a valid 10-digit mobile number.");
  }

  const api = getConnectApiClient();
  return api.post<{ maskedPhone: string; displayName: string; devOtp?: string }>(
    "/api/v1/auth/parent/request-otp",
    {
      institute_id: input.instituteId,
      phone: digits,
    },
  );
}

export async function apiVerifyParentLoginOtp(input: {
  phone: string;
  instituteId: string;
  otp: string;
}): Promise<ConnectApiSession> {
  if (!isInstituteUuid(input.instituteId)) {
    throw new Error("Select your institute to continue.");
  }
  const digits = input.phone.replace(/\D/g, "");
  if (digits.length !== 10) {
    throw new Error("Enter a valid 10-digit mobile number.");
  }
  if (input.otp.trim().length !== 6) {
    throw new Error("Enter the 6-digit code.");
  }

  const api = getConnectApiClient();
  const result = await api.post<{
    access_token: string;
    refresh_token: string;
    institute_id: string;
    display_name: string;
  }>("/api/v1/auth/parent/verify-otp", {
    institute_id: input.instituteId,
    phone: digits,
    otp: input.otp.trim(),
  });

  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.auth.setSession({
    access_token: result.access_token,
    refresh_token: result.refresh_token,
  });
  if (error) {
    throw new Error(error.message || "Unable to start session.");
  }

  const me = await fetchMe(result.access_token);
  const instituteId = resolveInstituteForRole(me, "parent", input.instituteId);
  if (!instituteId) {
    await supabase.auth.signOut().catch(() => undefined);
    throw new Error("No parent access found for this account at the selected institute.");
  }

  return {
    user: {
      ...connectUserFromMe(me, "parent"),
      name: result.display_name || me.profile.displayName,
      phone: digits,
    },
    instituteId,
    me,
  };
}

export async function tryHydrateApiSession(
  role: Role | null,
  preferredInstituteId?: string | null,
): Promise<ConnectApiSession | null> {
  const supabase = getSupabaseBrowserClient();
  const { data, error } = await supabase.auth.getSession();
  if (error || !data.session?.access_token || !role) return null;

  const me = await fetchMe(data.session.access_token);
  const instituteId = resolveInstituteForRole(me, role, preferredInstituteId);
  if (!instituteId) return null;

  return {
    user: connectUserFromMe(me, role),
    instituteId,
    me,
  };
}

export async function apiSignOut(): Promise<void> {
  try {
    const supabase = getSupabaseBrowserClient();
    await supabase.auth.signOut();
  } catch {
    // ignore
  }
}
