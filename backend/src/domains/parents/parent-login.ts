import type { SupabaseClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { AppError } from "../../errors/app-error.js";
import { findParentById, findParentByPhoneInInstitute, updateParentFields } from "./repository.js";
import {
  normalizeParentPhoneDigits,
  parentPortalAuthEmail,
} from "./portal-auth-email.js";
import {
  maskParentPhone,
  storeParentLoginOtp,
  verifyStoredParentLoginOtp,
} from "./parent-otp.js";
import {
  ensureParentMembership,
  ensureParentProfile,
  provisionAuthUser,
} from "./provision.js";

export type RequestParentOtpInput = {
  instituteId: string;
  phone: string;
};

export type RequestParentOtpResult = {
  maskedPhone: string;
  displayName: string;
  devOtp?: string;
};

const PARENT_NOT_REGISTERED =
  "This mobile number is not registered with this school. Please contact your school administration.";

async function ensureParentLoginIdentity(
  admin: SupabaseClient,
  parentId: string,
): Promise<{ userId: string; authEmail: string }> {
  const parent = await findParentById(admin, parentId);
  if (!parent) throw AppError.notFound(PARENT_NOT_REGISTERED);

  const phone = normalizeParentPhoneDigits(parent.phone);
  if (phone.length !== 10) {
    throw AppError.validation("Parent phone must contain exactly 10 digits", {
      phone: ["Invalid"],
    });
  }

  const authEmail = parentPortalAuthEmail(phone, parent.institute_id);

  if (parent.user_profile_id) {
    return { userId: parent.user_profile_id, authEmail };
  }

  const randomPassword = randomBytes(24).toString("base64url");
  const userId = await provisionAuthUser(admin, authEmail, randomPassword);
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
  if (!updated) throw AppError.notFound(PARENT_NOT_REGISTERED);

  return { userId, authEmail };
}

export async function requestParentLoginOtp(
  admin: SupabaseClient,
  input: RequestParentOtpInput,
): Promise<RequestParentOtpResult> {
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
    throw AppError.notFound(PARENT_NOT_REGISTERED);
  }
  if (parent.access_status === "suspended") {
    throw AppError.forbidden("This parent account is suspended. Contact the institute.");
  }
  if (parent.access_status === "hold") {
    throw AppError.forbidden("This parent account is on hold. Contact the institute.");
  }

  await ensureParentLoginIdentity(admin, parent.id);

  const stored = storeParentLoginOtp({
    instituteId: parent.institute_id,
    phone,
    parentId: parent.id,
  });

  return {
    maskedPhone: stored.maskedPhone || maskParentPhone(phone),
    displayName: parent.name.trim() || "Parent",
    devOtp: stored.devOtp,
  };
}

export type VerifyParentOtpInput = {
  instituteId: string;
  phone: string;
  otp: string;
};

export type ParentLoginSession = {
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
    throw AppError.internal("Unable to start parent session");
  }

  const { data: sessionData, error: verifyError } = await admin.auth.verifyOtp({
    token_hash: linkData.properties.hashed_token,
    type: "email",
  });

  if (verifyError || !sessionData.session) {
    throw AppError.internal("Unable to complete parent session");
  }

  return {
    accessToken: sessionData.session.access_token,
    refreshToken: sessionData.session.refresh_token,
  };
}

export async function verifyParentLoginOtp(
  admin: SupabaseClient,
  input: VerifyParentOtpInput,
): Promise<ParentLoginSession> {
  const verified = verifyStoredParentLoginOtp(input);
  if (!verified) {
    throw AppError.validation("Incorrect or expired code. Try again or request a new OTP.");
  }

  const parent = await findParentById(admin, verified.parentId);
  if (!parent) {
    throw AppError.notFound(PARENT_NOT_REGISTERED);
  }

  const identity = await ensureParentLoginIdentity(admin, parent.id);
  const session = await createAuthSessionForEmail(admin, identity.authEmail);

  return {
    ...session,
    instituteId: parent.institute_id,
    displayName: parent.name.trim() || "Parent",
  };
}
