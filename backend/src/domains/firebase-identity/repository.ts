/**
 * Persistence for Firebase UID ↔ user_profile mapping.
 * user_profile.id remains the Supabase Auth UUID — firebase_uid is additive.
 */

import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureDbOk } from "../../db/errors.js";
import type { FirebaseLinkedProfileRow } from "./types.js";

const PROFILE_COLS =
  "id, display_name, email, phone, status, firebase_uid, firebase_linked_at, phone_verified_at, email_verified_at, deleted_at";

export function normalizePhoneDigits(value: string): string {
  const digits = value.replace(/\D/g, "");
  if (digits.length > 10) return digits.slice(-10);
  return digits;
}

export async function findProfileByFirebaseUid(
  admin: SupabaseClient,
  firebaseUid: string,
): Promise<FirebaseLinkedProfileRow | null> {
  const uid = firebaseUid.trim();
  if (!uid) return null;

  const result = await admin
    .from("user_profile")
    .select(PROFILE_COLS)
    .eq("firebase_uid", uid)
    .is("deleted_at", null)
    .maybeSingle();

  if (result.error) ensureDbOk(result);
  return (result.data as FirebaseLinkedProfileRow | null) ?? null;
}

export async function findProfileByIdForFirebaseLink(
  admin: SupabaseClient,
  userProfileId: string,
): Promise<FirebaseLinkedProfileRow | null> {
  const result = await admin
    .from("user_profile")
    .select(PROFILE_COLS)
    .eq("id", userProfileId)
    .is("deleted_at", null)
    .maybeSingle();

  if (result.error) ensureDbOk(result);
  return (result.data as FirebaseLinkedProfileRow | null) ?? null;
}

/**
 * Email lookup for candidate matching. Relies on unique lower(email) index;
 * still rejects if PostgREST returns unexpected multiples via list path.
 */
export async function listProfilesByEmail(
  admin: SupabaseClient,
  email: string,
): Promise<FirebaseLinkedProfileRow[]> {
  const normalized = email.trim().toLowerCase();
  if (!normalized) return [];

  const result = await admin
    .from("user_profile")
    .select(PROFILE_COLS)
    .ilike("email", normalized)
    .is("deleted_at", null);

  return ensureDbOk(result) as FirebaseLinkedProfileRow[];
}

/**
 * Phone is NOT globally unique in LumenX — callers must treat length > 1 as ambiguous.
 * Matches last-10 digits against stored phone digits.
 */
export async function listProfilesByPhoneDigits(
  admin: SupabaseClient,
  phoneOrDigits: string,
): Promise<FirebaseLinkedProfileRow[]> {
  const needle = normalizePhoneDigits(phoneOrDigits);
  if (needle.length < 10) return [];

  // Fetch active profiles with a phone; filter in process (phone formats vary).
  const result = await admin
    .from("user_profile")
    .select(PROFILE_COLS)
    .not("phone", "is", null)
    .is("deleted_at", null);

  const rows = ensureDbOk(result) as FirebaseLinkedProfileRow[];
  return rows.filter((row) => {
    if (!row.phone) return false;
    return normalizePhoneDigits(row.phone) === needle;
  });
}

export async function setProfileFirebaseUid(
  admin: SupabaseClient,
  userProfileId: string,
  firebaseUid: string,
  linkedAt: string,
): Promise<FirebaseLinkedProfileRow> {
  const result = await admin
    .from("user_profile")
    .update({
      firebase_uid: firebaseUid,
      firebase_linked_at: linkedAt,
    })
    .eq("id", userProfileId)
    .is("deleted_at", null)
    .select(PROFILE_COLS)
    .single();

  return ensureDbOk(result) as FirebaseLinkedProfileRow;
}

export async function findActiveMembershipForUserInstitute(
  admin: SupabaseClient,
  userProfileId: string,
  instituteId: string,
): Promise<{ id: string; institute_id: string; status: string } | null> {
  const result = await admin
    .from("membership")
    .select("id, institute_id, status")
    .eq("user_id", userProfileId)
    .eq("institute_id", instituteId)
    .eq("status", "active")
    .is("deleted_at", null)
    .maybeSingle();

  if (result.error) ensureDbOk(result);
  return (result.data as { id: string; institute_id: string; status: string } | null) ?? null;
}
