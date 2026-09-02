import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../errors/app-error.js";
import {
  listActiveInstitutesForLogin,
  listMemberships,
  listRolesForMemberships,
} from "../identity/repository.js";
import { findAccessAssignmentForUserInstitute } from "./repository.js";
import {
  maskStaffIdentifier,
  storeStaffLoginOtp,
  verifyStoredStaffLoginOtp,
} from "./staff-otp.js";

const INSTITUTE_WIDE_ROLES = new Set([
  "institute_admin",
  "principal",
  "vice_principal",
  "it_admin",
]);

export type StaffLoginInstituteDto = {
  id: string;
  name: string;
  code: string;
  kind: string;
};

export async function listInstitutesForStaffLogin(
  admin: SupabaseClient,
): Promise<StaffLoginInstituteDto[]> {
  const rows = await listActiveInstitutesForLogin(admin);
  return rows.map((row) => ({
    id: row.id,
    name: row.name,
    code: row.code,
    kind: row.kind,
  }));
}

export type ResolveStaffLoginModeInput = {
  instituteId: string;
  identifier: string;
};

export type StaffLoginModeResult = {
  requiresOtp: boolean;
  displayName: string;
};

export async function resolveStaffLoginMode(
  admin: SupabaseClient,
  input: ResolveStaffLoginModeInput,
): Promise<StaffLoginModeResult> {
  const resolved = await resolveStaffLoginUser(
    admin,
    input.instituteId.trim(),
    input.identifier,
    { allowInstituteWide: true },
  );
  return {
    requiresOtp: resolved.requiresOtp,
    displayName: resolved.displayName,
  };
}

function normalizePhoneDigits(value: string): string {
  return value.replace(/\D/g, "").slice(-10);
}

export type RequestStaffOtpInput = {
  instituteId: string;
  identifier: string;
};

export type RequestStaffOtpResult = {
  maskedDestination: string;
  channel: "email" | "mobile";
  displayName: string;
  devOtp?: string;
};

type StaffProfile = {
  id: string;
  display_name: string;
  email: string | null;
  phone: string | null;
  status: string;
};

async function resolveStaffLoginUser(
  admin: SupabaseClient,
  instituteId: string,
  identifier: string,
  opts?: { allowInstituteWide?: boolean },
): Promise<{
  userId: string;
  displayName: string;
  authEmail: string;
  channel: "email" | "mobile";
  destination: string;
  requiresOtp: boolean;
}> {
  const trimmed = identifier.trim();
  const isEmail = trimmed.includes("@");
  const channel: "email" | "mobile" = isEmail ? "email" : "mobile";

  let profile: StaffProfile | null = null;
  if (isEmail) {
    const email = trimmed.toLowerCase();
    const { data, error } = await admin
      .from("user_profile")
      .select("id, display_name, email, phone, status")
      .ilike("email", email)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    profile = (data as StaffProfile | null) ?? null;
  } else {
    const phone = normalizePhoneDigits(trimmed);
    if (phone.length !== 10) {
      throw AppError.validation("Enter a valid email or 10-digit mobile number", {
        identifier: ["Invalid"],
      });
    }
    const { data, error } = await admin
      .from("user_profile")
      .select("id, display_name, email, phone, status")
      .eq("phone", phone)
      .is("deleted_at", null)
      .maybeSingle();
    if (error) throw error;
    profile = (data as StaffProfile | null) ?? null;
  }

  if (!profile || profile.status === "disabled") {
    throw AppError.notFound(
      "No staff account found for this institute. Contact your administrator.",
    );
  }

  const memberships = await listMemberships(admin, {
    instituteId,
    userId: profile.id,
  });
  const membership =
    memberships.find((m) => m.status === "active") ??
    memberships.find((m) => m.status !== "ended") ??
    null;
  if (!membership) {
    throw AppError.notFound(
      "No staff account found for this institute. Contact your administrator.",
    );
  }
  if (membership.status === "suspended") {
    throw AppError.forbidden("This account is suspended. Contact your administrator.");
  }

  const assignment = await findAccessAssignmentForUserInstitute(
    admin,
    profile.id,
    instituteId,
  );
  const roleRows = await listRolesForMemberships(admin, [membership.id]);
  const codes = roleRows.map((r) => r.role_code);
  const instituteWide = codes.some((c) => INSTITUTE_WIDE_ROLES.has(c));

  let requiresOtp = Boolean(assignment);
  if (!assignment && instituteWide && opts?.allowInstituteWide) {
    requiresOtp = false;
  }
  if (!assignment && !instituteWide) {
    throw AppError.notFound(
      "No Admin account found for this institute. Contact your administrator.",
    );
  }

  const authEmail = profile.email?.trim().toLowerCase();
  if (!authEmail) {
    throw AppError.validation("Account is missing a login email. Contact your administrator.");
  }

  return {
    userId: profile.id,
    displayName: profile.display_name,
    authEmail,
    channel,
    destination: channel === "email" ? authEmail : (profile.phone ?? trimmed),
    requiresOtp,
  };
}

export async function requestStaffLoginOtp(
  admin: SupabaseClient,
  input: RequestStaffOtpInput,
): Promise<RequestStaffOtpResult> {
  const resolved = await resolveStaffLoginUser(
    admin,
    input.instituteId.trim(),
    input.identifier,
  );
  if (!resolved.requiresOtp) {
    throw AppError.validation(
      "This account uses email and password only — continue without OTP.",
    );
  }

  const stored = storeStaffLoginOtp({
    instituteId: input.instituteId.trim(),
    identifier: input.identifier.trim(),
    channel: resolved.channel,
    userId: resolved.userId,
  });

  return {
    maskedDestination:
      stored.maskedDestination ||
      maskStaffIdentifier(resolved.destination, resolved.channel),
    channel: resolved.channel,
    displayName: resolved.displayName,
    devOtp: stored.devOtp,
  };
}

export type VerifyStaffLoginInput = {
  instituteId: string;
  identifier: string;
  otp: string;
  password: string;
};

export type VerifyStaffPasswordLoginInput = {
  instituteId: string;
  identifier: string;
  password: string;
};

export type StaffLoginSession = {
  accessToken: string;
  refreshToken: string;
  instituteId: string;
  displayName: string;
};

async function createAuthSessionForEmail(
  admin: SupabaseClient,
  email: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  const { data: linkData, error: linkError } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: email.trim().toLowerCase(),
  });

  if (linkError || !linkData.properties?.hashed_token) {
    throw AppError.internal("Unable to start staff session");
  }

  const { data: sessionData, error: verifyError } = await admin.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: "email",
  });

  if (verifyError || !sessionData.session) {
    throw AppError.internal("Unable to complete staff session");
  }

  return {
    accessToken: sessionData.session.access_token,
    refreshToken: sessionData.session.refresh_token,
  };
}

export async function verifyStaffPasswordLogin(
  admin: SupabaseClient,
  input: VerifyStaffPasswordLoginInput,
): Promise<StaffLoginSession> {
  if (!input.password || input.password.length < 1) {
    throw AppError.validation("password is required", { password: ["Required"] });
  }

  const resolved = await resolveStaffLoginUser(
    admin,
    input.instituteId.trim(),
    input.identifier,
    { allowInstituteWide: true },
  );
  if (resolved.requiresOtp) {
    throw AppError.validation(
      "This account requires OTP verification before password.",
    );
  }

  const { error: signInError } = await admin.auth.signInWithPassword({
    email: resolved.authEmail,
    password: input.password,
  });
  if (signInError) {
    throw AppError.validation("Incorrect password. Please try again.", {
      password: ["Invalid"],
    });
  }

  const session = await createAuthSessionForEmail(admin, resolved.authEmail);

  return {
    ...session,
    instituteId: input.instituteId.trim(),
    displayName: resolved.displayName,
  };
}

export async function verifyStaffLogin(
  admin: SupabaseClient,
  input: VerifyStaffLoginInput,
): Promise<StaffLoginSession> {
  if (!input.password || input.password.length < 1) {
    throw AppError.validation("password is required", { password: ["Required"] });
  }

  const verified = verifyStoredStaffLoginOtp({
    instituteId: input.instituteId,
    identifier: input.identifier,
    otp: input.otp,
  });
  if (!verified) {
    throw AppError.validation("Incorrect or expired code. Try again or request a new OTP.");
  }

  const resolved = await resolveStaffLoginUser(
    admin,
    input.instituteId.trim(),
    input.identifier,
  );
  if (resolved.userId !== verified.userId) {
    throw AppError.forbidden("Login challenge mismatch");
  }
  if (!resolved.requiresOtp) {
    throw AppError.validation("OTP is not required for this account.");
  }

  // Verify password against Auth without leaving a long-lived session from password grant.
  const { error: signInError } = await admin.auth.signInWithPassword({
    email: resolved.authEmail,
    password: input.password,
  });
  if (signInError) {
    throw AppError.validation("Incorrect password. Please try again.", {
      password: ["Invalid"],
    });
  }

  const session = await createAuthSessionForEmail(admin, resolved.authEmail);

  return {
    ...session,
    instituteId: input.instituteId.trim(),
    displayName: resolved.displayName,
  };
}
