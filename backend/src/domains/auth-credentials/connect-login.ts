/**
 * Connect passwordless login (teacher / parent / student).
 * First login: Firebase phone OTP + choose PIN.
 * Returning login: institute + role + mobile + PIN.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import type { FirebaseIdentity } from "../../auth/firebase-identity.js";
import { AppError } from "../../errors/app-error.js";
import { ensureDbOk } from "../../db/errors.js";
import { assertValidPin, hashPin } from "./repository.js";
import {
  normalizeParentPhoneDigits,
  parentPortalAuthEmail,
} from "../parents/portal-auth-email.js";
import { canonicalPhoneDigits } from "../identity/phone.js";
import {
  findParentByPhoneInInstitute,
  findParentById,
  updateParentFields,
} from "../parents/repository.js";
import {
  ensureParentMembership,
  ensureParentProfile,
  provisionAuthUser,
} from "../parents/provision.js";
import {
  findInstituteById,
  insertMembership,
  listMemberships,
  listRolesForMemberships,
  replaceMembershipRoles,
} from "../identity/repository.js";
import { insertUserProfile } from "../registrations/repository.js";
import {
  linkFirebaseIdentityToExistingUser,
} from "../firebase-identity/service.js";
import { createSupabaseSessionForUserId } from "../firebase-identity/session.js";
import { deliverLoginOtp, isOtpDemoMode } from "../otp-delivery/index.js";
import {
  maskWorkflowDestination,
  storeWorkflowOtp,
  verifyWorkflowOtp,
} from "./workflow-otp.js";
import {
  consumeAuthVerificationGrant,
  issueAuthVerificationGrant,
} from "./verification-grant.js";

export type ConnectPortalRole = "teacher" | "parent" | "student";

type ProfileRow = {
  id: string;
  display_name: string;
  email: string | null;
  phone: string | null;
  phone_digits: string | null;
  status: string;
};

type ConnectCredentialRow = {
  user_profile_id: string;
  institute_id: string;
  role: ConnectPortalRole;
  phone_digits: string;
  pin_hash: string;
  pin_salt: string;
  phone_verified_at: string;
  first_login_completed_at: string;
  failed_attempts: number;
  locked_until: string | null;
};

type TeacherLoginRow = {
  id: string;
  user_profile_id: string | null;
  display_name: string;
  phone: string | null;
};

const CREDENTIAL_COLS =
  "user_profile_id, institute_id, role, phone_digits, pin_hash, pin_salt, phone_verified_at, first_login_completed_at, failed_attempts, locked_until";
const GENERIC_LOGIN_ERROR = "Unable to sign in with those details.";

function genericLoginError(): AppError {
  return AppError.validation(GENERIC_LOGIN_ERROR);
}

function normalizePhone(value: string): string {
  return canonicalPhoneDigits(value) ?? normalizeParentPhoneDigits(value);
}

function teacherPortalAuthEmail(phone: string, instituteId: string): string {
  return `teacher.${phone}.${instituteId.replace(/-/g, "")}@connect.lumenx.invalid`;
}

async function createPasswordlessAuthUser(
  admin: SupabaseClient,
  email: string,
): Promise<string> {
  try {
    return await provisionAuthUser(admin, email);
  } catch {
    throw genericLoginError();
  }
}

async function findTeacherByInstitutePhone(
  admin: SupabaseClient,
  instituteId: string,
  phone: string,
): Promise<TeacherLoginRow | null> {
  const teacherResult = await admin
    .from("teacher")
    .select("id, user_profile_id, display_name, phone")
    .eq("institute_id", instituteId)
    .is("deleted_at", null);
  if (teacherResult.error) ensureDbOk(teacherResult);
  const rows = (teacherResult.data ?? []) as TeacherLoginRow[];
  return (
    rows.find((row) => canonicalPhoneDigits(row.phone ?? "") === phone) ?? null
  );
}

/**
 * Ensure auth.users.id === user_profile.id and return the Auth email used for
 * magic-link sessions. Profile.email alone is unsafe — it may belong to a
 * different auth user (which caused "Profile is unavailable" after Connect login).
 */
async function ensureAuthUserForConnectProfile(
  admin: SupabaseClient,
  profileId: string,
  preferredEmail: string,
): Promise<string> {
  const preferred = preferredEmail.trim().toLowerCase();
  const { data: byId, error } = await admin.auth.admin.getUserById(profileId);
  if (!error && byId.user) {
    const current = byId.user.email?.trim().toLowerCase() ?? "";
    if (!current) {
      const updated = await admin.auth.admin.updateUserById(profileId, {
        email: preferred,
        email_confirm: true,
      });
      if (updated.error) throw genericLoginError();
      return preferred;
    }
    return current;
  }

  const created = await admin.auth.admin.createUser({
    id: profileId,
    email: preferred,
    email_confirm: true,
  });
  if (!created.error && created.data.user?.id === profileId) {
    await admin
      .from("user_profile")
      .update({ email: preferred })
      .eq("id", profileId)
      .is("deleted_at", null);
    return preferred;
  }

  const message = created.error?.message?.toLowerCase() ?? "";
  const emailTaken =
    message.includes("already") ||
    message.includes("registered") ||
    message.includes("exists") ||
    message.includes("duplicate");

  if (emailTaken && preferred.endsWith("@connect.lumenx.invalid")) {
    const { data: linkData } = await admin.auth.admin.generateLink({
      type: "magiclink",
      email: preferred,
    });
    const conflictingId = linkData?.user?.id;
    if (conflictingId && conflictingId !== profileId) {
      const parked = `parked.${conflictingId.replace(/-/g, "")}.${Date.now()}@connect.lumenx.invalid`;
      const moved = await admin.auth.admin.updateUserById(conflictingId, {
        email: parked,
        email_confirm: true,
      });
      if (moved.error) throw genericLoginError();
      const retry = await admin.auth.admin.createUser({
        id: profileId,
        email: preferred,
        email_confirm: true,
      });
      if (retry.error || retry.data.user?.id !== profileId) {
        throw genericLoginError();
      }
      await admin
        .from("user_profile")
        .update({ email: preferred })
        .eq("id", profileId)
        .is("deleted_at", null);
      return preferred;
    }
  }

  throw genericLoginError();
}

async function ensureTeacherMembership(
  admin: SupabaseClient,
  instituteId: string,
  userId: string,
): Promise<void> {
  const memberships = await listMemberships(admin, { instituteId, userId });
  const existingMembership =
    memberships.find((item) => item.status === "active") ?? memberships[0];
  if (existingMembership) {
    const roles = await listRolesForMemberships(admin, [existingMembership.id]);
    const roleCodes = roles.map((item) => item.role_code);
    if (!roleCodes.includes("teacher")) {
      await replaceMembershipRoles(admin, existingMembership.id, [
        ...new Set([...roleCodes, "teacher"]),
      ]);
    }
    return;
  }
  const membership = await insertMembership(admin, {
    instituteId,
    userId,
    status: "active",
    roles: ["teacher"],
  });
  await replaceMembershipRoles(admin, membership.id, ["teacher"]);
}

/** Link a teacher row to a Connect auth profile when missing (idempotent). */
export async function ensureTeacherConnectIdentity(
  admin: SupabaseClient,
  instituteId: string,
  phone: string,
): Promise<void> {
  const teacher = await findTeacherByInstitutePhone(admin, instituteId, phone);
  if (!teacher) return;

  const authEmail = teacherPortalAuthEmail(phone, instituteId);

  if (teacher.user_profile_id) {
    await ensureAuthUserForConnectProfile(
      admin,
      teacher.user_profile_id,
      authEmail,
    );
    await ensureTeacherMembership(admin, instituteId, teacher.user_profile_id);
    return;
  }

  const profileResult = await admin
    .from("user_profile")
    .select("id")
    .eq("phone_digits", phone)
    .is("deleted_at", null)
    .maybeSingle();
  if (profileResult.error) ensureDbOk(profileResult);

  let userId = (profileResult.data as { id: string } | null)?.id ?? null;

  if (!userId) {
    userId = await createPasswordlessAuthUser(admin, authEmail);
    await insertUserProfile(admin, {
      id: userId,
      displayName: teacher.display_name,
      email: authEmail,
      phone,
    });
  }

  await ensureAuthUserForConnectProfile(admin, userId, authEmail);
  await ensureTeacherMembership(admin, instituteId, userId);

  const linked = await admin
    .from("teacher")
    .update({ user_profile_id: userId, status: "active" })
    .eq("id", teacher.id)
    .is("deleted_at", null);
  if (linked.error) ensureDbOk(linked);
}

async function createAuthSessionForUserId(
  admin: SupabaseClient,
  userId: string,
): Promise<{ accessToken: string; refreshToken: string }> {
  return createSupabaseSessionForUserId(admin, userId);
}

async function ensureParentIdentity(
  admin: SupabaseClient,
  parentId: string,
): Promise<{ userId: string; authEmail: string; displayName: string; phone: string }> {
  const parent = await findParentById(admin, parentId);
  if (!parent) throw genericLoginError();
  const phone = normalizePhone(parent.phone);
  const authEmail = parentPortalAuthEmail(phone, parent.institute_id);
  if (parent.user_profile_id) {
    return {
      userId: parent.user_profile_id,
      authEmail,
      displayName: parent.name.trim() || "Parent",
      phone,
    };
  }

  const userId = await createPasswordlessAuthUser(admin, authEmail);
  await ensureParentProfile(admin, {
    userId,
    displayName: parent.name.trim() || "Parent",
    email: authEmail,
    phone,
  });
  await ensureParentMembership(admin, userId, parent.institute_id);
  await updateParentFields(admin, parent.id, {
    user_profile_id: userId,
    invite_status: "active",
  });
  return {
    userId,
    authEmail,
    displayName: parent.name.trim() || "Parent",
    phone,
  };
}

async function resolveStaffByPhoneRole(
  admin: SupabaseClient,
  instituteId: string,
  phone: string,
  role: "teacher" | "student",
): Promise<{ profile: ProfileRow; authEmail: string }> {
  const { data, error } = await admin
    .from("user_profile")
    .select("id, display_name, email, phone, phone_digits, status")
    .eq("phone_digits", phone)
    .is("deleted_at", null)
    .maybeSingle();
  if (error) ensureDbOk({ data, error });
  const profile = data as ProfileRow | null;
  if (!profile || profile.status === "disabled") throw genericLoginError();

  const memberships = await listMemberships(admin, {
    instituteId,
    userId: profile.id,
  });
  const membership = memberships.find((m) => m.status === "active") ?? null;
  if (!membership) throw genericLoginError();

  const roles = await listRolesForMemberships(admin, [membership.id]);
  const codes = new Set(roles.map((r) => r.role_code));
  const allowed =
    role === "teacher"
      ? codes.has("teacher") || codes.has("class_teacher") || codes.has("staff")
      : codes.has("student") || codes.has("learner");
  if (!allowed) throw genericLoginError();

  const authEmail = profile.email?.trim().toLowerCase();
  if (!authEmail) throw genericLoginError();
  return { profile, authEmail };
}

async function resolveConnectSubject(
  admin: SupabaseClient,
  input: { instituteId: string; phone: string; role: ConnectPortalRole },
): Promise<{
  userId: string;
  authEmail: string;
  displayName: string;
  phone: string;
  portalRole: ConnectPortalRole;
}> {
  const instituteId = input.instituteId.trim();
  const institute = await findInstituteById(admin, instituteId);
  if (!institute || institute.status !== "active") throw genericLoginError();

  const phone = normalizePhone(input.phone);
  if (phone.length !== 10) throw genericLoginError();

  if (input.role === "parent") {
    const parent = await findParentByPhoneInInstitute(admin, phone, instituteId);
    if (
      !parent ||
      parent.access_status === "suspended" ||
      parent.access_status === "hold"
    ) {
      throw genericLoginError();
    }
    const identity = await ensureParentIdentity(admin, parent.id);
    return { ...identity, portalRole: "parent" };
  }

  if (input.role === "teacher") {
    const teacher = await findTeacherByInstitutePhone(admin, instituteId, phone);
    if (!teacher?.user_profile_id) throw genericLoginError();

    const profileResult = await admin
      .from("user_profile")
      .select("id, display_name, email, phone, phone_digits, status")
      .eq("id", teacher.user_profile_id)
      .is("deleted_at", null)
      .maybeSingle();
    if (profileResult.error) ensureDbOk(profileResult);
    const profile = profileResult.data as ProfileRow | null;
    if (!profile || profile.status === "disabled") throw genericLoginError();

    const memberships = await listMemberships(admin, {
      instituteId,
      userId: profile.id,
    });
    const membership = memberships.find((m) => m.status === "active") ?? null;
    if (!membership) throw genericLoginError();

    const roles = await listRolesForMemberships(admin, [membership.id]);
    const codes = new Set(roles.map((r) => r.role_code));
    if (
      !codes.has("teacher") &&
      !codes.has("class_teacher") &&
      !codes.has("staff")
    ) {
      throw genericLoginError();
    }

    // Link Auth user only — never elevate membership roles during login.
    const authEmail = await ensureAuthUserForConnectProfile(
      admin,
      profile.id,
      teacherPortalAuthEmail(phone, instituteId),
    );
    return {
      userId: profile.id,
      authEmail,
      displayName: profile.display_name,
      phone,
      portalRole: "teacher",
    };
  }

  const { profile, authEmail } = await resolveStaffByPhoneRole(
    admin,
    instituteId,
    phone,
    input.role,
  );
  return {
    userId: profile.id,
    authEmail,
    displayName: profile.display_name,
    phone,
    portalRole: input.role,
  };
}

async function findConnectCredential(
  admin: SupabaseClient,
  userProfileId: string,
  instituteId: string,
  role: ConnectPortalRole,
): Promise<ConnectCredentialRow | null> {
  const result = await admin
    .from("connect_login_credential")
    .select(CREDENTIAL_COLS)
    .eq("user_profile_id", userProfileId)
    .eq("institute_id", instituteId)
    .eq("role", role)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return result.data as ConnectCredentialRow | null;
}

async function setFirstLoginPin(
  admin: SupabaseClient,
  subject: { userId: string; phone: string; portalRole: ConnectPortalRole },
  instituteId: string,
  pin: string,
): Promise<void> {
  const { hash, salt } = hashPin(assertValidPin(pin));
  const now = new Date().toISOString();
  const result = await admin.rpc("set_connect_login_pin", {
    p_user_profile_id: subject.userId,
    p_institute_id: instituteId,
    p_role: subject.portalRole,
    p_phone_digits: subject.phone,
    p_pin_hash: hash,
    p_pin_salt: salt,
    p_now: now,
  });
  if (result.error) ensureDbOk(result);
  if (result.data !== true) throw genericLoginError();
}

async function verifyReturningPin(
  admin: SupabaseClient,
  credential: ConnectCredentialRow,
  pin: string | undefined,
): Promise<void> {
  let candidateHash = "";
  try {
    candidateHash = hashPin(assertValidPin(pin ?? ""), credential.pin_salt).hash;
  } catch {
    throw genericLoginError();
  }
  const now = new Date().toISOString();
  const result = await admin.rpc("verify_connect_login_pin", {
    p_user_profile_id: credential.user_profile_id,
    p_institute_id: credential.institute_id,
    p_role: credential.role,
    p_pin_hash: candidateHash,
    p_now: now,
    p_max_attempts: 5,
    p_lock_seconds: 900,
  });
  if (result.error) ensureDbOk(result);
  const row = (Array.isArray(result.data) ? result.data[0] : null) as
    | { outcome?: string }
    | undefined;
  if (row?.outcome === "authenticated") return;
  if (row?.outcome === "locked") {
    throw AppError.rateLimited(GENERIC_LOGIN_ERROR);
  }
  throw genericLoginError();
}

export async function resolveConnectLoginMode(
  admin: SupabaseClient,
  input: { instituteId: string; phone: string; role: ConnectPortalRole },
) {
  const subject = await resolveConnectSubject(admin, input);
  const credential = await findConnectCredential(
    admin,
    subject.userId,
    input.instituteId.trim(),
    input.role,
  );
  const firstLogin = !credential;
  return {
    mode: firstLogin ? ("first_login_otp" as const) : ("returning_pin" as const),
    role: subject.portalRole,
    firstLogin,
    requiresOtp: firstLogin,
    requiresPin: true,
  };
}

export async function completeConnectLogin(
  admin: SupabaseClient,
  input: {
    instituteId: string;
    phone: string;
    role: ConnectPortalRole;
    pin?: string;
  },
) {
  const subject = await resolveConnectSubject(admin, input);
  const credential = await findConnectCredential(
    admin,
    subject.userId,
    input.instituteId.trim(),
    input.role,
  );
  if (!credential) throw genericLoginError();
  await verifyReturningPin(admin, credential, input.pin);

  const session = await createAuthSessionForUserId(admin, subject.userId);
  return {
    ...session,
    instituteId: input.instituteId.trim(),
    displayName: subject.displayName,
    role: subject.portalRole,
  };
}

function firebaseSignInProvider(identity: FirebaseIdentity): string {
  const firebase = identity.claims.firebase;
  return firebase && typeof firebase.sign_in_provider === "string"
    ? firebase.sign_in_provider
    : "";
}

export async function completeConnectFirebaseLogin(
  admin: SupabaseClient,
  identity: FirebaseIdentity,
  input: {
    instituteId: string;
    role: ConnectPortalRole;
    pin?: string;
  },
) {
  if (
    firebaseSignInProvider(identity) !== "phone" ||
    !identity.phoneNumber ||
    !input.pin
  ) {
    throw genericLoginError();
  }

  const phone = normalizePhone(identity.phoneNumber);
  const subject = await resolveConnectSubject(admin, {
    instituteId: input.instituteId,
    role: input.role,
    phone,
  });
  if (normalizePhone(subject.phone) !== phone) throw genericLoginError();

  const existing = await findConnectCredential(
    admin,
    subject.userId,
    input.instituteId.trim(),
    input.role,
  );
  if (existing) throw genericLoginError();

  await setFirstLoginPin(admin, subject, input.instituteId.trim(), input.pin);
  await linkFirebaseIdentityToExistingUser(admin, {
    userProfileId: subject.userId,
    firebaseUid: identity.uid,
  });
  const session = await createAuthSessionForUserId(admin, subject.userId);
  return {
    ...session,
    instituteId: input.instituteId.trim(),
    displayName: subject.displayName,
    role: subject.portalRole,
  };
}

/**
 * Forgotten Login PIN: Firebase phone OTP proved, replace Connect PIN, sign in.
 * Chart path: forgotten pin → mobile → OTP → set new pin → dashboard.
 */
export async function completeConnectForgotPin(
  admin: SupabaseClient,
  identity: FirebaseIdentity,
  input: {
    instituteId: string;
    role: ConnectPortalRole;
    pin?: string;
  },
) {
  if (
    firebaseSignInProvider(identity) !== "phone" ||
    !identity.phoneNumber ||
    !input.pin
  ) {
    throw genericLoginError();
  }

  const phone = normalizePhone(identity.phoneNumber);
  const subject = await resolveConnectSubject(admin, {
    instituteId: input.instituteId,
    role: input.role,
    phone,
  });
  if (normalizePhone(subject.phone) !== phone) throw genericLoginError();

  const instituteId = input.instituteId.trim();
  const existing = await findConnectCredential(
    admin,
    subject.userId,
    instituteId,
    input.role,
  );
  if (!existing) throw genericLoginError();

  const cleared = await admin
    .from("connect_login_credential")
    .delete()
    .eq("user_profile_id", subject.userId)
    .eq("institute_id", instituteId)
    .eq("role", input.role);
  if (cleared.error) ensureDbOk(cleared);

  await setFirstLoginPin(admin, subject, instituteId, input.pin);
  await linkFirebaseIdentityToExistingUser(admin, {
    userProfileId: subject.userId,
    firebaseUid: identity.uid,
  });
  const session = await createAuthSessionForUserId(admin, subject.userId);
  return {
    ...session,
    instituteId,
    displayName: subject.displayName,
    role: subject.portalRole,
  };
}

function connectOtpChallengeKey(
  instituteId: string,
  role: ConnectPortalRole,
  phone: string,
): string {
  return `connect:${role}:${instituteId.trim()}:${phone}`;
}

/**
 * Server SMS OTP for Connect first-login / forgotten-PIN (no Firebase required).
 * Demo mode returns code `123456` via `devOtp`.
 */
export async function requestConnectMobileOtp(
  admin: SupabaseClient,
  input: { instituteId: string; phone: string; role: ConnectPortalRole },
) {
  const subject = await resolveConnectSubject(admin, input);
  const phone = subject.phone;
  const stored = await storeWorkflowOtp(admin, {
    purpose: "connect_login",
    challengeKey: connectOtpChallengeKey(input.instituteId, input.role, phone),
    instituteId: input.instituteId.trim(),
    channel: "mobile",
    destination: phone,
    subjectId: subject.userId,
  });

  if (stored.shouldDeliver && stored.otp) {
    await deliverLoginOtp({
      channel: "sms",
      destination: phone,
      otp: stored.otp,
      purpose: "connect_login",
    });
  }

  return {
    maskedDestination:
      stored.maskedDestination || maskWorkflowDestination(phone, "mobile"),
    displayName: subject.displayName,
    role: subject.portalRole,
    devOtp: stored.devOtp ?? (isOtpDemoMode() ? stored.otp : undefined),
  };
}

export async function verifyConnectMobileOtp(
  admin: SupabaseClient,
  input: {
    instituteId: string;
    phone: string;
    role: ConnectPortalRole;
    otp: string;
  },
) {
  const subject = await resolveConnectSubject(admin, input);
  const phone = subject.phone;
  const verified = await verifyWorkflowOtp(admin, {
    purpose: "connect_login",
    challengeKey: connectOtpChallengeKey(input.instituteId, input.role, phone),
    otp: input.otp,
  });
  if (!verified || verified.subjectId !== subject.userId) {
    throw AppError.validation("Invalid or expired OTP.");
  }

  const issued = await issueAuthVerificationGrant(admin, {
    purpose: "pin_reset",
    subjectId: subject.userId,
    destination: phone,
    metadata: {
      channel: "mobile",
      flow: "connect_pin",
      role: input.role,
      instituteId: input.instituteId.trim(),
      phone,
    },
  });

  return {
    otpGrant: issued.grant,
    expiresAt: issued.expiresAt,
    displayName: subject.displayName,
    role: subject.portalRole,
  };
}

/**
 * After server OTP grant: set or replace Connect PIN and open a session.
 * - No credential → first login
 * - Existing credential → forgotten PIN reset
 */
export async function completeConnectPinWithOtpGrant(
  admin: SupabaseClient,
  input: {
    instituteId: string;
    phone: string;
    role: ConnectPortalRole;
    pin: string;
    otpGrant: string;
  },
) {
  const pin = assertValidPin(input.pin ?? "");

  const subject = await resolveConnectSubject(admin, input);
  const phone = subject.phone;
  const instituteId = input.instituteId.trim();

  await consumeAuthVerificationGrant(admin, {
    purpose: "pin_reset",
    grant: input.otpGrant,
    subjectId: subject.userId,
    metadata: {
      channel: "mobile",
      flow: "connect_pin",
      role: input.role,
      instituteId,
      phone,
    },
  });

  const existing = await findConnectCredential(
    admin,
    subject.userId,
    instituteId,
    input.role,
  );
  if (existing) {
    const cleared = await admin
      .from("connect_login_credential")
      .delete()
      .eq("user_profile_id", subject.userId)
      .eq("institute_id", instituteId)
      .eq("role", input.role);
    if (cleared.error) ensureDbOk(cleared);
  }

  await setFirstLoginPin(admin, subject, instituteId, pin);
  const session = await createAuthSessionForUserId(admin, subject.userId);
  return {
    ...session,
    instituteId,
    displayName: subject.displayName,
    role: subject.portalRole,
  };
}
