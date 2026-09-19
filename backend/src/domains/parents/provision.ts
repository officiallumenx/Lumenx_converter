import type { SupabaseClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { AppError } from "../../errors/app-error.js";
import { findProfileById } from "../identity/repository.js";
import {
  findActiveMembershipForUserInstitute,
  insertUserProfile,
} from "../registrations/repository.js";
import {
  insertMembership,
  listRolesForMemberships,
  replaceMembershipRoles,
} from "../identity/repository.js";
import {
  findParentById,
  findParentByPhoneInInstitute,
  updateParentFields,
} from "./repository.js";
import type { ParentRow } from "./types.js";
import {
  normalizeParentPhoneDigits,
  parentPortalAuthEmail,
} from "./portal-auth-email.js";

/**
 * Resolve an existing Auth user id by portal email (magic link metadata).
 * Used when createUser fails with "already registered".
 */
export async function findAuthUserIdByEmail(
  admin: SupabaseClient,
  email: string,
): Promise<string | null> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return null;
  const { data, error } = await admin.auth.admin.generateLink({
    type: "magiclink",
    email: normalized,
  });
  if (error || !data?.user?.id) return null;
  return data.user.id;
}

/**
 * Create a Supabase Auth user for a portal identity.
 *
 * Connect parent/teacher/student paths omit `password` (passwordless).
 * Admin/Nexus/staff assignees may pass an explicit password.
 *
 * When passwordless createUser is rejected by the Admin API, we fall back to an
 * unexposed random secret — never an app-level / client-supplied password path.
 *
 * If the email is already registered, returns the existing Auth user id
 * (so driver/parent/teacher re-login can link instead of failing).
 */
export async function provisionAuthUser(
  admin: SupabaseClient,
  email: string,
  password?: string,
): Promise<string> {
  const normalized = email.trim().toLowerCase();

  if (password) {
    const { data, error } = await admin.auth.admin.createUser({
      email: normalized,
      password,
      email_confirm: true,
    });
    if (!error && data.user?.id) return data.user.id;
    if (isAlreadyRegistered(error?.message)) {
      const existingId = await findAuthUserIdByEmail(admin, normalized);
      if (existingId) return existingId;
    }
    throw createUserConflictOrValidation(error?.message, Boolean(password));
  }

  const passwordless = await admin.auth.admin.createUser({
    email: normalized,
    email_confirm: true,
  });
  if (!passwordless.error && passwordless.data.user?.id) {
    return passwordless.data.user.id;
  }

  const message = passwordless.error?.message?.toLowerCase() ?? "";
  const needsPassword =
    message.includes("password") ||
    message.includes("credentials") ||
    message.includes("required");
  if (!needsPassword) {
    if (isAlreadyRegistered(passwordless.error?.message)) {
      const existingId = await findAuthUserIdByEmail(admin, normalized);
      if (existingId) return existingId;
    }
    throw createUserConflictOrValidation(passwordless.error?.message, false);
  }

  // Supabase project requires a password at create time — use a strong random
  // value that is never returned, logged, or exposed to clients.
  const hidden = randomBytes(32).toString("base64url");
  const withHidden = await admin.auth.admin.createUser({
    email: normalized,
    password: hidden,
    email_confirm: true,
  });
  if (!withHidden.error && withHidden.data.user?.id) {
    return withHidden.data.user.id;
  }
  if (isAlreadyRegistered(withHidden.error?.message)) {
    const existingId = await findAuthUserIdByEmail(admin, normalized);
    if (existingId) return existingId;
  }
  throw createUserConflictOrValidation(withHidden.error?.message, false);
}

function isAlreadyRegistered(rawMessage: string | undefined): boolean {
  const message = rawMessage?.toLowerCase() ?? "";
  return (
    message.includes("already") ||
    message.includes("registered") ||
    message.includes("exists")
  );
}

function createUserConflictOrValidation(
  rawMessage: string | undefined,
  hadAppPassword: boolean,
): AppError {
  if (isAlreadyRegistered(rawMessage)) {
    throw AppError.conflict(
      "A login account already exists for this phone in this institute.",
    );
  }
  return AppError.validation(
    hadAppPassword
      ? "Unable to create login. Check phone and password."
      : "Unable to create login. Check phone.",
  );
}

export async function ensureParentProfile(
  admin: SupabaseClient,
  input: {
    userId: string;
    displayName: string;
    email: string;
    phone: string;
  },
): Promise<void> {
  const existing = await findProfileById(admin, input.userId);
  if (existing) {
    if (existing.status === "disabled") {
      throw AppError.forbidden("Profile is unavailable");
    }
    return;
  }

  await insertUserProfile(admin, {
    id: input.userId,
    displayName: input.displayName,
    email: input.email,
    phone: input.phone,
  });
}

export async function ensureParentMembership(
  admin: SupabaseClient,
  userId: string,
  instituteId: string,
): Promise<void> {
  const existing = await findActiveMembershipForUserInstitute(admin, userId, instituteId);
  if (existing) {
    const roles = await listRolesForMemberships(admin, [existing.id]);
    const codes = roles.map((r) => r.role_code);
    if (!codes.includes("parent")) {
      await replaceMembershipRoles(admin, existing.id, [...new Set([...codes, "parent"])]);
    }
    return;
  }

  const membership = await insertMembership(admin, {
    userId,
    instituteId,
    status: "active",
    roles: ["parent"],
  });
  await replaceMembershipRoles(admin, membership.id, ["parent"]);
}

export type ProvisionParentAccessInput = {
  parentId: string;
};

/**
 * Ensure a Connect parent has a Supabase Auth identity (passwordless).
 * Does not accept or set an app-level password.
 */
export async function provisionParentAccess(
  admin: SupabaseClient,
  input: ProvisionParentAccessInput,
): Promise<ParentRow> {
  const parent = await findParentById(admin, input.parentId);
  if (!parent) throw AppError.notFound("Parent not found");

  const phone = normalizeParentPhoneDigits(parent.phone);
  if (phone.length !== 10) {
    throw AppError.validation("Parent phone must contain exactly 10 digits", {
      phone: ["Invalid"],
    });
  }

  const authEmail = parentPortalAuthEmail(phone, parent.institute_id);

  if (parent.user_profile_id) {
    const updated = await updateParentFields(admin, parent.id, {
      invite_status: "active",
    });
    if (!updated) throw AppError.notFound("Parent not found");
    return updated;
  }

  const userId = await provisionAuthUser(admin, authEmail);
  await ensureParentProfile(admin, {
    userId,
    displayName: parent.name.trim() || "Parent",
    email: authEmail,
    phone,
  });
  await ensureParentMembership(admin, userId, parent.institute_id);

  const updated = await updateParentFields(admin, parent.id, {
    user_profile_id: userId,
    invite_status: "active",
  });
  if (!updated) throw AppError.notFound("Parent not found");
  return updated;
}

export type ResolveParentLoginInput = {
  instituteId: string;
  phone: string;
};

export async function resolveParentLoginEmail(
  admin: SupabaseClient,
  input: ResolveParentLoginInput,
): Promise<{ email: string; displayName: string }> {
  const phone = normalizeParentPhoneDigits(input.phone);
  if (phone.length !== 10) {
    throw AppError.validation("phone must contain exactly 10 digits", {
      phone: ["Invalid"],
    });
  }

  const parent = await findParentByPhoneInInstitute(
    admin,
    phone,
    input.instituteId.trim(),
  );
  if (!parent) {
    throw AppError.notFound("No parent account for this mobile number");
  }
  if (parent.access_status !== "active") {
    throw AppError.forbidden("Parent account access is not active");
  }
  if (!parent.user_profile_id) {
    throw AppError.notFound("Parent login is not enabled yet — contact your institute");
  }

  return {
    email: parentPortalAuthEmail(phone, parent.institute_id),
    displayName: parent.name.trim() || "Parent",
  };
}
