import type { SupabaseClient } from "@supabase/supabase-js";
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

export async function provisionAuthUser(
  admin: SupabaseClient,
  email: string,
  password: string,
): Promise<string> {
  const normalized = email.trim().toLowerCase();
  const { data, error } = await admin.auth.admin.createUser({
    email: normalized,
    password,
    email_confirm: true,
  });

  if (error || !data.user?.id) {
    const message = error?.message?.toLowerCase() ?? "";
    if (
      message.includes("already") ||
      message.includes("registered") ||
      message.includes("exists")
    ) {
      throw AppError.conflict(
        "A login account already exists for this parent phone in this institute.",
      );
    }
    throw AppError.validation("Unable to create parent login. Check phone and password.");
  }

  return data.user.id;
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
  });
  await replaceMembershipRoles(admin, membership.id, ["parent"]);
}

export type ProvisionParentAccessInput = {
  parentId: string;
  password: string;
};

export async function provisionParentAccess(
  admin: SupabaseClient,
  input: ProvisionParentAccessInput,
): Promise<ParentRow> {
  const password = input.password;
  if (!password || password.length < 8) {
    throw AppError.validation("password must be at least 8 characters", {
      password: ["Too short"],
    });
  }

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
    const { error } = await admin.auth.admin.updateUserById(parent.user_profile_id, {
      password,
      email: authEmail,
    });
    if (error) {
      throw AppError.validation("Unable to update parent login password.");
    }
    const updated = await updateParentFields(admin, parent.id, {
      invite_status: "active",
    });
    if (!updated) throw AppError.notFound("Parent not found");
    return updated;
  }

  const userId = await provisionAuthUser(admin, authEmail, password);
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
