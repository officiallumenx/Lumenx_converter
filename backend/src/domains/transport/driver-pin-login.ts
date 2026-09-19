/**
 * Transport driver phone + app-account-PIN login (Admin flowchart).
 *
 * Account exists only when Admin has set an app PIN and assigned a vehicle.
 * Successful pair → provision Auth + driver membership → session.
 * Otherwise → "No Transport account found."
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../errors/app-error.js";
import { createServerAuthSessionForEmail } from "../../auth/create-server-session.js";
import {
  assertValidPin,
  verifyPinHash,
} from "../auth-credentials/repository.js";
import { findProfileById } from "../identity/repository.js";
import {
  insertMembership,
  listRolesForMemberships,
  replaceMembershipRoles,
} from "../identity/repository.js";
import {
  findActiveMembershipForUserInstitute,
  insertUserProfile,
} from "../registrations/repository.js";
import { provisionAuthUser, findAuthUserIdByEmail } from "../parents/provision.js";
import {
  listDriversByPhoneDigits,
  updateDriverFields,
} from "./repository.js";
import type { DriverRow } from "./types.js";
import {
  driverPortalAuthEmail,
  normalizeDriverPhoneDigits,
} from "./driver-portal-auth-email.js";

export const NO_TRANSPORT_ACCOUNT = "No Transport account found.";

export type DriverPinLoginInput = {
  phone: string;
  pin: string;
  instituteId?: string;
};

export type DriverPinLoginResult = {
  accessToken: string;
  refreshToken: string;
  instituteId: string;
  displayName: string;
  driverId: string;
  accountCreated: true;
};

function isEligibleDriverAccount(row: DriverRow): boolean {
  return (
    row.status === "active" &&
    Boolean(row.app_pin_hash && row.app_pin_salt) &&
    Boolean(row.assigned_vehicle_id)
  );
}

function pinMatches(row: DriverRow, pin: string): boolean {
  if (!row.app_pin_hash || !row.app_pin_salt) return false;
  return verifyPinHash(pin, row.app_pin_hash, row.app_pin_salt);
}

async function ensureDriverMembership(
  admin: SupabaseClient,
  userId: string,
  instituteId: string,
): Promise<void> {
  const existing = await findActiveMembershipForUserInstitute(
    admin,
    userId,
    instituteId,
  );
  if (existing) {
    const roles = await listRolesForMemberships(admin, [existing.id]);
    const codes = roles.map((r) => r.role_code);
    if (!codes.includes("driver")) {
      await replaceMembershipRoles(admin, existing.id, [
        ...new Set([...codes, "driver"]),
      ]);
    }
    return;
  }

  try {
    const membership = await insertMembership(admin, {
      userId,
      instituteId,
      status: "active",
      roles: ["driver"],
    });
    await replaceMembershipRoles(admin, membership.id, ["driver"]);
  } catch (err) {
    // Race / prior inactive row: re-read and attach driver role.
    if (!(err instanceof AppError) || err.code !== "CONFLICT") throw err;
    const again = await findActiveMembershipForUserInstitute(
      admin,
      userId,
      instituteId,
    );
    if (!again) throw err;
    const roles = await listRolesForMemberships(admin, [again.id]);
    const codes = roles.map((r) => r.role_code);
    if (!codes.includes("driver")) {
      await replaceMembershipRoles(admin, again.id, [
        ...new Set([...codes, "driver"]),
      ]);
    }
  }
}

async function ensureDriverProfile(
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
  // Do NOT set phone on user_profile — phone_digits is globally unique and the
  // same mobile is often already on a teacher/parent profile. Phone stays on driver.
  await insertUserProfile(admin, {
    id: input.userId,
    displayName: input.displayName,
    email: input.email,
    phone: null,
  });
}

/**
 * Ensure Supabase Auth user exists for a linked driver profile.
 * Blocks: profile row without Auth user → session create fails.
 * If the portal email is already on another Auth user, return that user id
 * so the caller can re-link the driver row.
 */
async function ensureAuthUserForProfile(
  admin: SupabaseClient,
  userId: string,
  authEmail: string,
): Promise<{ userId: string; authEmail: string }> {
  const existing = await admin.auth.admin.getUserById(userId);
  if (existing.data?.user?.id) {
    const email = existing.data.user.email?.trim().toLowerCase();
    if (email === authEmail) return { userId, authEmail };
    if (!email) {
      await admin.auth.admin.updateUserById(userId, { email: authEmail });
      return { userId, authEmail };
    }
    // Profile Auth user has a different email — keep this userId for session.
    return { userId, authEmail: email };
  }

  const created = await admin.auth.admin.createUser({
    id: userId,
    email: authEmail,
    email_confirm: true,
  });
  if (!created.error && created.data.user?.id) {
    return { userId, authEmail };
  }

  const message = created.error?.message?.toLowerCase() ?? "";
  if (
    message.includes("already") ||
    message.includes("registered") ||
    message.includes("exists")
  ) {
    // Email taken by an orphaned Auth user — reuse and re-link driver to it.
    const existingId = await findAuthUserIdByEmail(admin, authEmail);
    if (existingId) {
      return { userId: existingId, authEmail };
    }
    throw AppError.conflict(
      "A login account already exists for this driver phone. Contact support.",
    );
  }

  // Some projects reject custom ids — provision then align if ids match.
  const provisionedId = await provisionAuthUser(admin, authEmail);
  if (provisionedId !== userId) {
    return { userId: provisionedId, authEmail };
  }
  return { userId, authEmail };
}

async function linkDriverProfile(
  admin: SupabaseClient,
  driverId: string,
  userProfileId: string,
): Promise<void> {
  try {
    const updated = await updateDriverFields(admin, driverId, {
      user_profile_id: userProfileId,
    });
    if (!updated) throw AppError.notFound(NO_TRANSPORT_ACCOUNT);
  } catch (err) {
    if (err instanceof AppError && err.code === "CONFLICT") {
      // Another live driver already owns this profile in the institute.
      throw AppError.conflict(
        "This login is already linked to another driver. Ask Admin to clear the other driver’s app link, then try again.",
      );
    }
    throw err;
  }
}

async function ensureDriverLoginIdentity(
  admin: SupabaseClient,
  driver: DriverRow,
  phoneDigits: string,
): Promise<{ userId: string; authEmail: string }> {
  const authEmail = driverPortalAuthEmail(phoneDigits, driver.institute_id);

  if (driver.user_profile_id) {
    const profile = await findProfileById(admin, driver.user_profile_id);
    if (!profile || profile.status === "disabled") {
      throw AppError.notFound(NO_TRANSPORT_ACCOUNT);
    }
    const resolved = await ensureAuthUserForProfile(
      admin,
      driver.user_profile_id,
      authEmail,
    );
    if (resolved.userId !== driver.user_profile_id) {
      await ensureDriverProfile(admin, {
        userId: resolved.userId,
        displayName: driver.display_name.trim() || "Driver",
        email: authEmail,
        phone: phoneDigits,
      });
      await linkDriverProfile(admin, driver.id, resolved.userId);
    }
    await ensureDriverMembership(
      admin,
      resolved.userId,
      driver.institute_id,
    );
    return resolved;
  }

  // Create or reuse Auth user for this driver portal email, then link.
  const userId = await provisionAuthUser(admin, authEmail);
  await ensureDriverProfile(admin, {
    userId,
    displayName: driver.display_name.trim() || "Driver",
    email: authEmail,
    phone: phoneDigits,
  });
  await ensureDriverMembership(admin, userId, driver.institute_id);
  await linkDriverProfile(admin, driver.id, userId);

  return { userId, authEmail };
}

/**
 * Phone + PIN → Transport session when Admin assigned vehicle + set app PIN.
 */
export async function loginDriverWithAppPin(
  admin: SupabaseClient,
  input: DriverPinLoginInput,
): Promise<DriverPinLoginResult> {
  const phoneDigits = normalizeDriverPhoneDigits(input.phone);
  if (phoneDigits.length !== 10) {
    throw AppError.validation("phone must contain exactly 10 digits", {
      phone: ["Invalid"],
    });
  }

  let pin: string;
  try {
    pin = assertValidPin(input.pin);
  } catch {
    throw AppError.notFound(NO_TRANSPORT_ACCOUNT);
  }

  const instituteId = input.instituteId?.trim() || undefined;
  const candidates = await listDriversByPhoneDigits(
    admin,
    phoneDigits,
    instituteId,
  );
  const eligible = candidates.filter(isEligibleDriverAccount);
  if (eligible.length === 0) {
    throw AppError.notFound(NO_TRANSPORT_ACCOUNT);
  }

  const matched = eligible.filter((row) => pinMatches(row, pin));
  if (matched.length === 0) {
    throw AppError.notFound(NO_TRANSPORT_ACCOUNT);
  }
  if (matched.length > 1) {
    throw AppError.validation(
      "Multiple transport accounts match this phone. Provide institute_id.",
      { institute_id: ["Required"] },
    );
  }

  const driver = matched[0]!;
  const identity = await ensureDriverLoginIdentity(admin, driver, phoneDigits);
  const session = await createServerAuthSessionForEmail(
    admin,
    identity.authEmail,
    "Transport session",
    identity.userId,
  );

  return {
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
    instituteId: driver.institute_id,
    displayName: driver.display_name.trim() || "Driver",
    driverId: driver.id,
    accountCreated: true,
  };
}
