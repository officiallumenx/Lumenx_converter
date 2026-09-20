import type { Role, User } from "@lumenx/types";
import { clearAppAuthSession } from "@lumenx/auth";
import { invalidatePushDeviceTokensBeforeSignOut } from "@lumenx/notifications";
import { getConnectApiClient } from "@/lib/connect-api";
import type { MeResponse } from "@/lib/api/me-types";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { isInstituteUuid } from "@/lib/institute-id";

export type ConnectApiSession = {
  user: User;
  instituteId: string;
  me: MeResponse;
};

export type ConnectOtpChannel = "server";

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
    case "teacher": {
      // Prefer institutes with a linked teacher row — membership-only is not enough
      // for My Classes / attendance (those need identities.teachers[].teacherId).
      const fromIdentity = me.identities.teachers.map((t) => t.instituteId);
      const fromMembership = me.institutes
        .filter((m) => m.roles.includes("teacher") && m.status === "active")
        .map((m) => m.instituteId);
      return [...new Set([...fromIdentity, ...fromMembership])];
    }
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
  if (role === "teacher") {
    const withActiveIdentity = me.identities.teachers
      .filter((t) => t.status === "active" && isInstituteUuid(t.instituteId))
      .map((t) => t.instituteId)
      .filter((id) => eligible.includes(id));
    if (withActiveIdentity[0]) return withActiveIdentity[0];
    const withAnyIdentity = me.identities.teachers
      .map((t) => t.instituteId)
      .filter((id) => isInstituteUuid(id) && eligible.includes(id));
    if (withAnyIdentity[0]) return withAnyIdentity[0];
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

export async function apiConnectLoginMode(input: {
  instituteId: string;
  phone: string;
  role: Role;
}): Promise<{
  mode: "first_login_otp" | "returning_pin";
  requiresOtp: boolean;
  requiresPin: boolean;
  firstLogin: boolean;
}> {
  if (!isInstituteUuid(input.instituteId)) {
    throw new Error("Select your institute to continue.");
  }
  const digits = input.phone.replace(/\D/g, "").slice(-10);
  const api = getConnectApiClient();
  return api.post("/api/v1/auth/connect/login-mode", buildConnectLoginModePayload({
    institute_id: input.instituteId,
    phone: digits,
    role: input.role,
  }), { skipAuth: true });
}

export type ConnectLoginPayload = {
  institute_id: string;
  phone: string;
  role: Role;
};

export function buildConnectLoginModePayload(input: ConnectLoginPayload): ConnectLoginPayload {
  return input;
}

export function buildConnectReturningLoginPayload(
  input: ConnectLoginPayload & { pin: string },
): ConnectLoginPayload & { pin: string } {
  return input;
}

/** Request Connect mobile OTP via server (StartMessaging / Twilio / webhook). */
export async function apiRequestConnectLoginOtp(input: {
  instituteId: string;
  phone: string;
  role: Role;
}): Promise<{
  maskedDestination: string;
  displayName: string;
  channel: ConnectOtpChannel;
  devOtp?: string;
}> {
  if (!isInstituteUuid(input.instituteId)) {
    throw new Error("Select your institute to continue.");
  }
  const digits = input.phone.replace(/\D/g, "").slice(-10);

  const api = getConnectApiClient();
  const data = await api.post<{
    maskedDestination: string;
    displayName: string;
    devOtp?: string;
  }>(
    "/api/v1/auth/connect/request-otp",
    {
      institute_id: input.instituteId,
      phone: digits,
      role: input.role,
    },
    { skipAuth: true },
  );
  return { ...data, channel: "server" };
}

export async function apiVerifyConnectLoginOtp(input: {
  instituteId: string;
  phone: string;
  role: Role;
  otp: string;
}): Promise<{ otpGrant: string; channel: ConnectOtpChannel }> {
  if (!isInstituteUuid(input.instituteId)) {
    throw new Error("Select your institute to continue.");
  }
  const digits = input.phone.replace(/\D/g, "").slice(-10);
  if (input.otp.trim().length !== 6) {
    throw new Error("Enter the 6-digit SMS code.");
  }

  const api = getConnectApiClient();
  const data = await api.post<{ otpGrant: string }>(
    "/api/v1/auth/connect/verify-otp",
    {
      institute_id: input.instituteId,
      phone: digits,
      role: input.role,
      otp: input.otp.trim(),
    },
    { skipAuth: true },
  );
  return { otpGrant: data.otpGrant, channel: "server" };
}

async function finishConnectSession(input: {
  accessToken: string;
  refreshToken: string;
  instituteId: string;
  role: Role;
  phone: string;
  displayName?: string;
}): Promise<ConnectApiSession> {
  const supabase = getSupabaseBrowserClient();
  const { error } = await supabase.auth.setSession({
    access_token: input.accessToken,
    refresh_token: input.refreshToken,
  });
  if (error) throw new Error(error.message || "Unable to start session.");

  const me = await fetchMe(input.accessToken);
  const instituteId = resolveInstituteForRole(me, input.role, input.instituteId);
  if (!instituteId) {
    await supabase.auth.signOut().catch(() => undefined);
    throw new Error(`No ${input.role} access found for this account at the selected institute.`);
  }
  return {
    user: {
      ...connectUserFromMe(me, input.role),
      name: input.displayName || me.profile.displayName,
      phone: input.phone,
    },
    instituteId,
    me,
  };
}

/** First-login: store PIN after OTP proof, then enter-PIN step signs in. */
export async function apiCreateConnectPinAfterOtp(input: {
  instituteId: string;
  phone: string;
  role: Role;
  pin: string;
  otpGrant?: string;
}): Promise<void> {
  if (!isInstituteUuid(input.instituteId)) {
    throw new Error("Select your institute to continue.");
  }
  if (!/^\d{4,8}$/.test(input.pin)) throw new Error("Enter a 4–8 digit PIN.");
  const digits = input.phone.replace(/\D/g, "").slice(-10);

  if (!input.otpGrant) {
    throw new Error("Verification expired. Request a new code.");
  }
  const api = getConnectApiClient();
  await api.post(
    "/api/v1/auth/connect/complete-pin",
    {
      institute_id: input.instituteId,
      phone: digits,
      role: input.role,
      pin: input.pin,
      otp_grant: input.otpGrant,
    },
    { skipAuth: true },
  );
  await getSupabaseBrowserClient().auth.signOut().catch(() => undefined);
}

/** Forgotten PIN: OTP proof + new PIN, then apply session. */
export async function apiCompleteConnectForgotPin(input: {
  instituteId: string;
  phone: string;
  role: Role;
  pin: string;
  otpGrant?: string;
}): Promise<ConnectApiSession> {
  if (!isInstituteUuid(input.instituteId)) {
    throw new Error("Select your institute to continue.");
  }
  const digits = input.phone.replace(/\D/g, "").slice(-10);
  if (!/^\d{4,8}$/.test(input.pin)) throw new Error("Enter a 4–8 digit PIN.");

  if (!input.otpGrant) {
    throw new Error("Verification expired. Request a new code.");
  }
  const api = getConnectApiClient();
  const result = await api.post<{
    access_token: string;
    refresh_token: string;
    institute_id: string;
    display_name: string;
    role: Role;
  }>(
    "/api/v1/auth/connect/complete-pin",
    {
      institute_id: input.instituteId,
      phone: digits,
      role: input.role,
      pin: input.pin,
      otp_grant: input.otpGrant,
    },
    { skipAuth: true },
  );
  return finishConnectSession({
    accessToken: result.access_token,
    refreshToken: result.refresh_token,
    instituteId: input.instituteId,
    role: input.role,
    phone: digits,
    displayName: result.display_name,
  });
}

export async function apiCompleteConnectLogin(input: {
  instituteId: string;
  phone: string;
  role: Role;
  pin: string;
}): Promise<ConnectApiSession> {
  if (!isInstituteUuid(input.instituteId)) {
    throw new Error("Select your institute to continue.");
  }
  const digits = input.phone.replace(/\D/g, "").slice(-10);
  if (!/^\d{4,8}$/.test(input.pin)) throw new Error("Enter a 4–8 digit PIN.");
  const api = getConnectApiClient();
  const result = await api.post<{
    access_token: string;
    refresh_token: string;
    institute_id: string;
    display_name: string;
    role: Role;
  }>("/api/v1/auth/connect/login", buildConnectReturningLoginPayload({
    institute_id: input.instituteId,
    phone: digits,
    role: input.role,
    pin: input.pin,
  }), { skipAuth: true });
  return finishConnectSession({
    accessToken: result.access_token,
    refreshToken: result.refresh_token,
    instituteId: input.instituteId,
    role: input.role,
    phone: digits,
    displayName: result.display_name,
  });
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
  if (!instituteId) {
    await supabase.auth.signOut().catch(() => undefined);
    return null;
  }

  return {
    user: connectUserFromMe(me, role),
    instituteId,
    me,
  };
}

export async function apiSignOut(): Promise<void> {
  await invalidatePushDeviceTokensBeforeSignOut({
    app: "connect",
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
}
