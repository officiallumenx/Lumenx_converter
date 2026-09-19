/**
 * Firebase identity → existing LumenX user_profile mapping.
 *
 * Never creates people/users. Never changes membership / roles.
 * Links firebase_uid onto an existing profile; Actor is still loaded via loadActorByUserId.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../errors/app-error.js";
import type { Actor } from "../../auth/types.js";
import type { FirebaseIdentity } from "../../auth/firebase-identity.js";
import { loadActorByUserId } from "../session/repository.js";
import {
  findActiveMembershipForUserInstitute,
  findProfileByFirebaseUid,
  findProfileByIdForFirebaseLink,
  listProfilesByEmail,
  listProfilesByPhoneDigits,
  setProfileFirebaseUid,
} from "./repository.js";
import type {
  FirebaseIdentityMapping,
  FirebaseLinkedProfileRow,
  LinkFirebaseIdentityInput,
  ResolveFirebaseIdentityOptions,
} from "./types.js";

function toMapping(
  row: FirebaseLinkedProfileRow,
  firebaseUid: string,
  source: FirebaseIdentityMapping["source"],
): FirebaseIdentityMapping {
  return {
    userProfileId: row.id,
    firebaseUid,
    linkedAt: row.firebase_linked_at,
    displayName: row.display_name,
    email: row.email,
    phone: row.phone,
    status: row.status,
    source,
  };
}

function assertProfileUsable(row: FirebaseLinkedProfileRow): void {
  if (row.status === "disabled") {
    throw AppError.forbidden("Profile is unavailable");
  }
}

/**
 * Find the LumenX profile already bound to this Firebase UID.
 */
export async function findLumenXUserFromFirebaseUid(
  admin: SupabaseClient,
  firebaseUid: string,
): Promise<FirebaseIdentityMapping | null> {
  const row = await findProfileByFirebaseUid(admin, firebaseUid);
  if (!row) return null;
  assertProfileUsable(row);
  return toMapping(row, firebaseUid, "firebase_uid");
}

/**
 * Resolve candidate profiles for an unlinked Firebase identity.
 * Email (verified) preferred; phone only when exactly one match.
 * Throws CONFLICT when ambiguous.
 */
export async function findCandidateProfilesForFirebaseIdentity(
  admin: SupabaseClient,
  identity: Pick<FirebaseIdentity, "uid" | "email" | "emailVerified" | "phoneNumber">,
): Promise<{
  profiles: FirebaseLinkedProfileRow[];
  matchKind: "email" | "phone" | null;
}> {
  if (identity.email && identity.emailVerified) {
    const byEmail = await listProfilesByEmail(admin, identity.email);
    if (byEmail.length > 1) {
      throw AppError.conflict(
        "Ambiguous Firebase identity mapping: multiple profiles share this email",
      );
    }
    if (byEmail.length === 1) {
      const only = byEmail[0]!;
      if (only.firebase_uid && only.firebase_uid !== identity.uid) {
        throw AppError.conflict(
          "Email matches a profile already linked to a different Firebase user",
        );
      }
      return { profiles: byEmail, matchKind: "email" };
    }
  }

  if (identity.phoneNumber) {
    const byPhone = await listProfilesByPhoneDigits(admin, identity.phoneNumber);
    if (byPhone.length > 1) {
      throw AppError.conflict(
        "Ambiguous Firebase identity mapping: multiple profiles share this phone",
      );
    }
    if (byPhone.length === 1) {
      const only = byPhone[0]!;
      if (only.firebase_uid && only.firebase_uid !== identity.uid) {
        throw AppError.conflict(
          "Phone matches a profile already linked to a different Firebase user",
        );
      }
      return { profiles: byPhone, matchKind: "phone" };
    }
  }

  return { profiles: [], matchKind: null };
}

/**
 * Link Firebase UID to an existing LumenX user_profile.
 * Idempotent when the same UID is already on that profile.
 * Rejects duplicate UID on another profile and profile already linked to a different UID.
 */
export async function linkFirebaseIdentityToExistingUser(
  admin: SupabaseClient,
  input: LinkFirebaseIdentityInput,
): Promise<FirebaseIdentityMapping> {
  const firebaseUid = input.firebaseUid.trim();
  if (!firebaseUid || firebaseUid.length > 128) {
    throw AppError.validation("Invalid Firebase UID", { firebaseUid: ["Invalid"] });
  }

  const profile = await findProfileByIdForFirebaseLink(admin, input.userProfileId);
  if (!profile) {
    throw AppError.notFound("LumenX user profile not found");
  }
  assertProfileUsable(profile);

  if (profile.firebase_uid === firebaseUid) {
    return toMapping(profile, firebaseUid, "firebase_uid");
  }

  if (profile.firebase_uid && profile.firebase_uid !== firebaseUid) {
    throw AppError.conflict(
      "This LumenX user is already linked to a different Firebase identity",
    );
  }

  const existingOwner = await findProfileByFirebaseUid(admin, firebaseUid);
  if (existingOwner && existingOwner.id !== profile.id) {
    throw AppError.conflict(
      "This Firebase identity is already linked to another LumenX user",
    );
  }

  const linkedAt = new Date().toISOString();
  const updated = await setProfileFirebaseUid(
    admin,
    profile.id,
    firebaseUid,
    profile.firebase_linked_at ?? linkedAt,
  );

  return toMapping(updated, firebaseUid, "linked_now");
}

/**
 * Find (and optionally auto-link) LumenX user from a verified Firebase identity.
 * Does not create new user_profile / auth.users rows.
 */
export async function resolveLumenXUserFromFirebaseIdentity(
  admin: SupabaseClient,
  identity: FirebaseIdentity,
  options: ResolveFirebaseIdentityOptions = {},
): Promise<FirebaseIdentityMapping> {
  const byUid = await findLumenXUserFromFirebaseUid(admin, identity.uid);
  if (byUid) {
    if (options.requiredInstituteId) {
      await assertActiveMembershipInInstitute(
        admin,
        byUid.userProfileId,
        options.requiredInstituteId,
      );
    }
    return byUid;
  }

  if (!options.allowCandidateLookup && !options.autoLink) {
    throw AppError.notFound("No LumenX user linked to this Firebase identity");
  }

  const { profiles, matchKind } = await findCandidateProfilesForFirebaseIdentity(
    admin,
    identity,
  );

  if (profiles.length === 0) {
    throw AppError.notFound("No LumenX user linked to this Firebase identity");
  }

  const candidate = profiles[0]!;
  assertProfileUsable(candidate);

  if (options.autoLink) {
    const linked = await linkFirebaseIdentityToExistingUser(admin, {
      userProfileId: candidate.id,
      firebaseUid: identity.uid,
    });
    if (options.requiredInstituteId) {
      await assertActiveMembershipInInstitute(
        admin,
        linked.userProfileId,
        options.requiredInstituteId,
      );
    }
    return linked;
  }

  const source: FirebaseIdentityMapping["source"] =
    matchKind === "phone" ? "phone_candidate" : "email_candidate";
  const mapping = toMapping(candidate, identity.uid, source);

  if (options.requiredInstituteId) {
    await assertActiveMembershipInInstitute(
      admin,
      mapping.userProfileId,
      options.requiredInstituteId,
    );
  }

  return mapping;
}

/**
 * Tenant isolation: require an active membership in the given institute.
 * Does not grant cross-institute access.
 */
export async function assertActiveMembershipInInstitute(
  admin: SupabaseClient,
  userProfileId: string,
  instituteId: string,
): Promise<{ id: string; institute_id: string; status: string }> {
  const membership = await findActiveMembershipForUserInstitute(
    admin,
    userProfileId,
    instituteId,
  );
  if (!membership) {
    throw AppError.forbidden("No active membership in this institute", {
      instituteId,
    });
  }
  return membership;
}

/**
 * Resolve Firebase identity → LumenX Actor (memberships + roles preserved).
 * Optional instituteId enforces tenant isolation without altering RBAC rows.
 */
export async function resolveActorFromFirebaseIdentity(
  admin: SupabaseClient,
  identity: FirebaseIdentity,
  options: ResolveFirebaseIdentityOptions = {},
): Promise<{ mapping: FirebaseIdentityMapping; actor: Actor }> {
  const mapping = await resolveLumenXUserFromFirebaseIdentity(
    admin,
    identity,
    options,
  );
  const actor = await loadActorByUserId(admin, mapping.userProfileId);

  if (options.requiredInstituteId) {
    const has = actor.memberships.some(
      (m) => m.instituteId === options.requiredInstituteId && m.status === "active",
    );
    if (!has) {
      throw AppError.forbidden("No active membership in this institute", {
        instituteId: options.requiredInstituteId,
      });
    }
  }

  return { mapping, actor };
}

/** Public DTO — no secrets / raw claims. */
export function toFirebaseMappingDto(
  mapping: FirebaseIdentityMapping,
  actor?: Actor,
) {
  return {
    user_profile_id: mapping.userProfileId,
    firebase_uid: mapping.firebaseUid,
    linked_at: mapping.linkedAt,
    display_name: mapping.displayName,
    email: mapping.email,
    phone: mapping.phone,
    status: mapping.status,
    source: mapping.source,
    ...(actor
      ? {
          memberships: actor.memberships.map((m) => ({
            membership_id: m.membershipId,
            institute_id: m.instituteId,
            status: m.status,
            roles: m.roles,
          })),
          is_platform_operator: actor.isPlatformOperator,
          platform_role_code: actor.platformRoleCode,
        }
      : {}),
  };
}
