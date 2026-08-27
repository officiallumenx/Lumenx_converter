import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureDbOk } from "../../db/errors.js";
import type {
  CreateGuardianLinkInput,
  CreateParentInput,
  GuardianLinkRow,
  ListParentsFilter,
  ParentRow,
  UpdateGuardianLinkInput,
  UpdateParentInput,
} from "./types.js";

const PARENT_COLS =
  "id, institute_id, user_profile_id, legacy_code, name, phone, email, address, invite_status, access_status, created_at, updated_at, deleted_at";

const LINK_COLS =
  "id, institute_id, student_id, parent_id, relationship, is_primary, is_emergency_contact, status, created_at, updated_at, deleted_at";

export async function findStudentInInstitute(
  admin: SupabaseClient,
  studentId: string,
  instituteId: string,
): Promise<{ id: string } | null> {
  const result = await admin
    .from("student")
    .select("id")
    .eq("id", studentId)
    .eq("institute_id", instituteId)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as { id: string } | null) ?? null;
}

export async function listParents(
  admin: SupabaseClient,
  filter: ListParentsFilter,
): Promise<ParentRow[]> {
  let query = admin
    .from("parent")
    .select(PARENT_COLS)
    .eq("institute_id", filter.instituteId)
    .is("deleted_at", null);

  if (filter.inviteStatus) query = query.eq("invite_status", filter.inviteStatus);
  if (filter.accessStatus) query = query.eq("access_status", filter.accessStatus);

  const result = await query;
  let rows = ensureDbOk(result) as ParentRow[];

  if (filter.q) {
    const q = filter.q.trim().toLowerCase();
    if (q) {
      rows = rows.filter((r) => {
        const hay = [r.name, r.phone, r.email, r.legacy_code]
          .filter(Boolean)
          .join(" ")
          .toLowerCase();
        return hay.includes(q);
      });
    }
  }

  return rows;
}

export async function findParentById(
  admin: SupabaseClient,
  id: string,
): Promise<ParentRow | null> {
  const result = await admin
    .from("parent")
    .select(PARENT_COLS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as ParentRow | null) ?? null;
}

export async function insertParent(
  admin: SupabaseClient,
  input: CreateParentInput,
): Promise<ParentRow> {
  const result = await admin
    .from("parent")
    .insert({
      institute_id: input.instituteId,
      user_profile_id: null,
      legacy_code: input.legacyCode ?? null,
      name: input.name,
      phone: input.phone,
      email: input.email ?? null,
      address: input.address ?? null,
      invite_status: input.inviteStatus ?? "pending",
      access_status: input.accessStatus ?? "active",
    })
    .select(PARENT_COLS)
    .single();
  return ensureDbOk(result) as ParentRow;
}

export async function updateParentFields(
  admin: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
): Promise<ParentRow | null> {
  const result = await admin
    .from("parent")
    .update(patch)
    .eq("id", id)
    .is("deleted_at", null)
    .select(PARENT_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as ParentRow | null) ?? null;
}

export async function softDeleteParent(
  admin: SupabaseClient,
  id: string,
): Promise<ParentRow | null> {
  const now = new Date().toISOString();
  const links = await admin
    .from("guardian_link")
    .update({ deleted_at: now })
    .eq("parent_id", id)
    .is("deleted_at", null);
  if (links.error) ensureDbOk(links);

  const result = await admin
    .from("parent")
    .update({ deleted_at: now })
    .eq("id", id)
    .is("deleted_at", null)
    .select(PARENT_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as ParentRow | null) ?? null;
}

export function toParentUpdatePatch(input: UpdateParentInput): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  if (input.name !== undefined) patch.name = input.name;
  if (input.phone !== undefined) patch.phone = input.phone;
  if (input.email !== undefined) patch.email = input.email;
  if (input.address !== undefined) patch.address = input.address;
  if (input.inviteStatus !== undefined) patch.invite_status = input.inviteStatus;
  if (input.accessStatus !== undefined) patch.access_status = input.accessStatus;
  if (input.legacyCode !== undefined) patch.legacy_code = input.legacyCode;
  return patch;
}

export async function listLinksForParent(
  admin: SupabaseClient,
  parentId: string,
  instituteId: string,
): Promise<GuardianLinkRow[]> {
  const result = await admin
    .from("guardian_link")
    .select(LINK_COLS)
    .eq("parent_id", parentId)
    .eq("institute_id", instituteId)
    .is("deleted_at", null);
  return ensureDbOk(result) as GuardianLinkRow[];
}

export async function listLinksForParentIds(
  admin: SupabaseClient,
  parentIds: string[],
  instituteId: string,
): Promise<GuardianLinkRow[]> {
  if (parentIds.length === 0) return [];
  const result = await admin
    .from("guardian_link")
    .select(LINK_COLS)
    .in("parent_id", parentIds)
    .eq("institute_id", instituteId)
    .is("deleted_at", null);
  return ensureDbOk(result) as GuardianLinkRow[];
}

export async function listLinksForStudent(
  admin: SupabaseClient,
  studentId: string,
  instituteId: string,
): Promise<GuardianLinkRow[]> {
  const result = await admin
    .from("guardian_link")
    .select(LINK_COLS)
    .eq("student_id", studentId)
    .eq("institute_id", instituteId)
    .eq("status", "active")
    .is("deleted_at", null);
  return ensureDbOk(result) as GuardianLinkRow[];
}

export async function findLinkById(
  admin: SupabaseClient,
  linkId: string,
): Promise<GuardianLinkRow | null> {
  const result = await admin
    .from("guardian_link")
    .select(LINK_COLS)
    .eq("id", linkId)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as GuardianLinkRow | null) ?? null;
}

export async function clearPrimaryForStudent(
  admin: SupabaseClient,
  studentId: string,
  instituteId: string,
): Promise<void> {
  const result = await admin
    .from("guardian_link")
    .update({ is_primary: false })
    .eq("student_id", studentId)
    .eq("institute_id", instituteId)
    .eq("is_primary", true)
    .is("deleted_at", null);
  if (result.error) ensureDbOk(result);
}

export async function insertGuardianLink(
  admin: SupabaseClient,
  input: CreateGuardianLinkInput & {
    instituteId: string;
    parentId: string;
  },
): Promise<GuardianLinkRow> {
  const result = await admin
    .from("guardian_link")
    .insert({
      institute_id: input.instituteId,
      student_id: input.studentId,
      parent_id: input.parentId,
      relationship: input.relationship,
      is_primary: input.isPrimary ?? false,
      is_emergency_contact: input.isEmergencyContact ?? false,
      status: input.status ?? "active",
    })
    .select(LINK_COLS)
    .single();
  return ensureDbOk(result) as GuardianLinkRow;
}

export async function updateGuardianLinkFields(
  admin: SupabaseClient,
  linkId: string,
  patch: Record<string, unknown>,
): Promise<GuardianLinkRow | null> {
  const result = await admin
    .from("guardian_link")
    .update(patch)
    .eq("id", linkId)
    .is("deleted_at", null)
    .select(LINK_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as GuardianLinkRow | null) ?? null;
}

export async function softDeleteGuardianLink(
  admin: SupabaseClient,
  linkId: string,
): Promise<GuardianLinkRow | null> {
  const result = await admin
    .from("guardian_link")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", linkId)
    .is("deleted_at", null)
    .select(LINK_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as GuardianLinkRow | null) ?? null;
}

export function toLinkUpdatePatch(
  input: UpdateGuardianLinkInput,
): Record<string, unknown> {
  const patch: Record<string, unknown> = {};
  if (input.relationship !== undefined) patch.relationship = input.relationship;
  if (input.isPrimary !== undefined) patch.is_primary = input.isPrimary;
  if (input.isEmergencyContact !== undefined) {
    patch.is_emergency_contact = input.isEmergencyContact;
  }
  if (input.status !== undefined) patch.status = input.status;
  return patch;
}
