import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureDbOk } from "../../db/errors.js";
import type {
  CreateInstituteInput,
  CreateMembershipInput,
  InstituteRow,
  InstituteSettingsRow,
  ListMembershipsFilter,
  MembershipRoleRow,
  MembershipRow,
  RoleCatalogRow,
  UpdateInstituteInput,
  UpdateInstituteSettingsInput,
  UpdateProfileInput,
  UserProfileRow,
} from "./types.js";

const INSTITUTE_COLS =
  "id, code, name, kind, status, created_at, updated_at, deleted_at";

const SETTINGS_COLS =
  "institute_id, timezone, locale, settings, created_at, updated_at";

const PROFILE_COLS =
  "id, display_name, email, phone, avatar_url, status, created_at, updated_at, deleted_at";

const MEMBERSHIP_COLS =
  "id, user_id, institute_id, status, created_at, updated_at, deleted_at";

export async function listInstitutes(
  admin: SupabaseClient,
  ids?: string[],
): Promise<InstituteRow[]> {
  let query = admin.from("institute").select(INSTITUTE_COLS).is("deleted_at", null);
  if (ids) {
    if (ids.length === 0) return [];
    query = query.in("id", ids);
  }
  const result = await query;
  return ensureDbOk(result) as InstituteRow[];
}

export async function findInstituteById(
  admin: SupabaseClient,
  id: string,
): Promise<InstituteRow | null> {
  const result = await admin
    .from("institute")
    .select(INSTITUTE_COLS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as InstituteRow | null) ?? null;
}

export async function insertInstitute(
  admin: SupabaseClient,
  input: CreateInstituteInput,
): Promise<InstituteRow> {
  const result = await admin
    .from("institute")
    .insert({
      code: input.code,
      name: input.name,
      kind: input.kind,
      status: input.status ?? "active",
    })
    .select(INSTITUTE_COLS)
    .single();
  return ensureDbOk(result) as InstituteRow;
}

export async function updateInstituteFields(
  admin: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
): Promise<InstituteRow | null> {
  const result = await admin
    .from("institute")
    .update(patch)
    .eq("id", id)
    .is("deleted_at", null)
    .select(INSTITUTE_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as InstituteRow | null) ?? null;
}

export async function softDeleteInstitute(
  admin: SupabaseClient,
  id: string,
): Promise<InstituteRow | null> {
  const result = await admin
    .from("institute")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null)
    .select(INSTITUTE_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as InstituteRow | null) ?? null;
}

export function toInstituteUpdatePatch(
  input: UpdateInstituteInput,
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.kind !== undefined) patch.kind = input.kind;
  if (input.status !== undefined) patch.status = input.status;
  if (input.code !== undefined) patch.code = input.code;
  return patch;
}

export async function findInstituteSettings(
  admin: SupabaseClient,
  instituteId: string,
): Promise<InstituteSettingsRow | null> {
  const result = await admin
    .from("institute_settings")
    .select(SETTINGS_COLS)
    .eq("institute_id", instituteId)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as InstituteSettingsRow | null) ?? null;
}

export async function insertInstituteSettings(
  admin: SupabaseClient,
  input: {
    instituteId: string;
    timezone?: string;
    locale?: string;
  },
): Promise<InstituteSettingsRow> {
  const result = await admin
    .from("institute_settings")
    .insert({
      institute_id: input.instituteId,
      timezone: input.timezone ?? "Asia/Kolkata",
      locale: input.locale ?? "en-IN",
      settings: {},
    })
    .select(SETTINGS_COLS)
    .single();
  return ensureDbOk(result) as InstituteSettingsRow;
}

export async function updateInstituteSettingsFields(
  admin: SupabaseClient,
  instituteId: string,
  patch: Record<string, unknown>,
): Promise<InstituteSettingsRow | null> {
  const result = await admin
    .from("institute_settings")
    .update(patch)
    .eq("institute_id", instituteId)
    .select(SETTINGS_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as InstituteSettingsRow | null) ?? null;
}

export function toSettingsUpdatePatch(
  input: UpdateInstituteSettingsInput,
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  if (input.timezone !== undefined) patch.timezone = input.timezone;
  if (input.locale !== undefined) patch.locale = input.locale;
  if (input.settings !== undefined) patch.settings = input.settings;
  return patch;
}

export async function findProfileById(
  admin: SupabaseClient,
  id: string,
): Promise<UserProfileRow | null> {
  const result = await admin
    .from("user_profile")
    .select(PROFILE_COLS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as UserProfileRow | null) ?? null;
}

/** Batch-load profiles for membership enrichment (ids already institute-scoped). */
export async function listProfilesByIds(
  admin: SupabaseClient,
  ids: string[],
): Promise<UserProfileRow[]> {
  const unique = [...new Set(ids.filter(Boolean))];
  if (unique.length === 0) return [];
  const chunkSize = 100;
  const out: UserProfileRow[] = [];
  for (let i = 0; i < unique.length; i += chunkSize) {
    const chunk = unique.slice(i, i + chunkSize);
    const result = await admin
      .from("user_profile")
      .select(PROFILE_COLS)
      .in("id", chunk)
      .is("deleted_at", null);
    out.push(...(ensureDbOk(result) as UserProfileRow[]));
  }
  return out;
}

export async function updateProfileFields(
  admin: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
): Promise<UserProfileRow | null> {
  const result = await admin
    .from("user_profile")
    .update(patch)
    .eq("id", id)
    .is("deleted_at", null)
    .select(PROFILE_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as UserProfileRow | null) ?? null;
}

export function toProfileUpdatePatch(
  input: UpdateProfileInput,
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  if (input.displayName !== undefined) patch.display_name = input.displayName;
  if (input.phone !== undefined) patch.phone = input.phone;
  if (input.avatarUrl !== undefined) patch.avatar_url = input.avatarUrl;
  return patch;
}

export async function listMemberships(
  admin: SupabaseClient,
  filter: ListMembershipsFilter,
): Promise<MembershipRow[]> {
  let query = admin
    .from("membership")
    .select(MEMBERSHIP_COLS)
    .eq("institute_id", filter.instituteId)
    .is("deleted_at", null);

  if (filter.status) query = query.eq("status", filter.status);
  if (filter.userId) query = query.eq("user_id", filter.userId);

  const result = await query;
  return ensureDbOk(result) as MembershipRow[];
}

export async function findMembershipById(
  admin: SupabaseClient,
  id: string,
): Promise<MembershipRow | null> {
  const result = await admin
    .from("membership")
    .select(MEMBERSHIP_COLS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as MembershipRow | null) ?? null;
}

export async function insertMembership(
  admin: SupabaseClient,
  input: CreateMembershipInput,
): Promise<MembershipRow> {
  const result = await admin
    .from("membership")
    .insert({
      user_id: input.userId,
      institute_id: input.instituteId,
      status: input.status ?? "active",
    })
    .select(MEMBERSHIP_COLS)
    .single();
  return ensureDbOk(result) as MembershipRow;
}

export async function updateMembershipFields(
  admin: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
): Promise<MembershipRow | null> {
  const result = await admin
    .from("membership")
    .update(patch)
    .eq("id", id)
    .is("deleted_at", null)
    .select(MEMBERSHIP_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as MembershipRow | null) ?? null;
}

export async function softDeleteMembership(
  admin: SupabaseClient,
  id: string,
): Promise<MembershipRow | null> {
  const result = await admin
    .from("membership")
    .update({ deleted_at: new Date().toISOString(), status: "ended" })
    .eq("id", id)
    .is("deleted_at", null)
    .select(MEMBERSHIP_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as MembershipRow | null) ?? null;
}

export async function softDeleteMembershipsForInstitute(
  admin: SupabaseClient,
  instituteId: string,
): Promise<number> {
  const result = await admin
    .from("membership")
    .update({ deleted_at: new Date().toISOString(), status: "ended" })
    .eq("institute_id", instituteId)
    .is("deleted_at", null)
    .select(MEMBERSHIP_COLS);
  const rows = ensureDbOk(result) as MembershipRow[];
  return rows.length;
}

export async function listRolesForMemberships(
  admin: SupabaseClient,
  membershipIds: string[],
): Promise<MembershipRoleRow[]> {
  if (membershipIds.length === 0) return [];
  const result = await admin
    .from("membership_role")
    .select("membership_id, role_code, created_at")
    .in("membership_id", membershipIds);
  return ensureDbOk(result) as MembershipRoleRow[];
}

export async function replaceMembershipRoles(
  admin: SupabaseClient,
  membershipId: string,
  roles: string[],
): Promise<void> {
  const del = await admin
    .from("membership_role")
    .delete()
    .eq("membership_id", membershipId);
  if (del.error) ensureDbOk(del);

  if (roles.length === 0) return;

  const insert = await admin.from("membership_role").insert(
    roles.map((role_code) => ({
      membership_id: membershipId,
      role_code,
    })),
  );
  ensureDbOk(insert);
}

export async function listAssignableRoles(
  admin: SupabaseClient,
): Promise<RoleCatalogRow[]> {
  const result = await admin
    .from("role")
    .select("code, label, description, is_assignable")
    .eq("is_assignable", true);
  return ensureDbOk(result) as RoleCatalogRow[];
}

export async function listAssignableRoleCodes(
  admin: SupabaseClient,
): Promise<Set<string>> {
  const rows = await listAssignableRoles(admin);
  return new Set(rows.map((r) => r.code));
}

export async function listRoleCodes(
  admin: SupabaseClient,
): Promise<Set<string>> {
  const result = await admin.from("role").select("code");
  const rows = ensureDbOk(result) as Array<{ code: string }>;
  return new Set(rows.map((r) => r.code));
}
