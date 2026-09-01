import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureDbOk } from "../../db/errors.js";
import type {
  MessageRow,
  MessageThreadParticipantRow,
  MessageThreadRow,
  MessageThreadStatus,
  MessageThreadKind,
} from "./types.js";

export const THREAD_COLS =
  "id, institute_id, subject, student_id, thread_kind, group_class_label, group_section_label, created_by_user_id, counterpart_user_id, status, last_message_at, created_at, updated_at, deleted_at";
export const MESSAGE_COLS =
  "id, institute_id, thread_id, sender_user_id, body, sent_at, read_at, created_at, updated_at, deleted_at";
export const PARTICIPANT_COLS =
  "id, institute_id, thread_id, user_profile_id, created_at";

export async function findActiveMembershipId(
  admin: SupabaseClient,
  userId: string,
  instituteId: string,
): Promise<string | null> {
  const result = await admin
    .from("membership")
    .select("id")
    .eq("user_id", userId)
    .eq("institute_id", instituteId)
    .eq("status", "active")
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  const row = result.data as { id: string } | null;
  return row?.id ?? null;
}

export async function findMemberRoleCodes(
  admin: SupabaseClient,
  userId: string,
  instituteId: string,
): Promise<string[]> {
  const membershipId = await findActiveMembershipId(admin, userId, instituteId);
  if (!membershipId) return [];
  const result = await admin
    .from("membership_role")
    .select("role_code")
    .eq("membership_id", membershipId);
  const rows = ensureDbOk(result) as Array<{ role_code: string }>;
  return rows.map((r) => r.role_code);
}

export async function findProfileDisplayNames(
  admin: SupabaseClient,
  ids: string[],
): Promise<Map<string, string>> {
  if (ids.length === 0) return new Map();
  const result = await admin
    .from("user_profile")
    .select("id, display_name")
    .in("id", ids)
    .is("deleted_at", null);
  const rows = ensureDbOk(result) as Array<{
    id: string;
    display_name: string | null;
  }>;
  return new Map(
    rows.map((r) => [r.id, r.display_name?.trim() || "Someone"]),
  );
}

export async function listThreads(
  admin: SupabaseClient,
  instituteId: string,
): Promise<MessageThreadRow[]> {
  const result = await admin
    .from("message_thread")
    .select(THREAD_COLS)
    .eq("institute_id", instituteId)
    .is("deleted_at", null)
    .order("last_message_at", { ascending: false, nullsFirst: false });
  return ensureDbOk(result) as MessageThreadRow[];
}

export async function findThreadById(
  admin: SupabaseClient,
  id: string,
): Promise<MessageThreadRow | null> {
  const result = await admin
    .from("message_thread")
    .select(THREAD_COLS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as MessageThreadRow | null) ?? null;
}

export async function insertThread(
  admin: SupabaseClient,
  input: {
    instituteId: string;
    subject: string | null;
    studentId: string | null;
    threadKind: MessageThreadKind;
    groupClassLabel?: string | null;
    groupSectionLabel?: string | null;
    createdByUserId: string;
    counterpartUserId: string | null;
    status: MessageThreadStatus;
    lastMessageAt: string | null;
  },
): Promise<MessageThreadRow> {
  const result = await admin
    .from("message_thread")
    .insert({
      institute_id: input.instituteId,
      subject: input.subject,
      student_id: input.studentId,
      thread_kind: input.threadKind,
      group_class_label: input.groupClassLabel ?? null,
      group_section_label: input.groupSectionLabel ?? null,
      created_by_user_id: input.createdByUserId,
      counterpart_user_id: input.counterpartUserId,
      status: input.status,
      last_message_at: input.lastMessageAt,
    })
    .select(THREAD_COLS)
    .single();
  return ensureDbOk(result) as MessageThreadRow;
}

export async function updateThreadFields(
  admin: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
): Promise<MessageThreadRow | null> {
  const result = await admin
    .from("message_thread")
    .update(patch)
    .eq("id", id)
    .is("deleted_at", null)
    .select(THREAD_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as MessageThreadRow | null) ?? null;
}

export async function insertThreadParticipants(
  admin: SupabaseClient,
  rows: Array<{
    instituteId: string;
    threadId: string;
    userProfileId: string;
  }>,
): Promise<void> {
  if (rows.length === 0) return;
  const result = await admin.from("message_thread_participant").insert(
    rows.map((r) => ({
      institute_id: r.instituteId,
      thread_id: r.threadId,
      user_profile_id: r.userProfileId,
    })),
  );
  ensureDbOk(result);
}

export async function listParticipantsForThread(
  admin: SupabaseClient,
  threadId: string,
): Promise<MessageThreadParticipantRow[]> {
  const result = await admin
    .from("message_thread_participant")
    .select(PARTICIPANT_COLS)
    .eq("thread_id", threadId);
  return ensureDbOk(result) as MessageThreadParticipantRow[];
}

export async function listThreadIdsForParticipant(
  admin: SupabaseClient,
  userId: string,
  instituteId: string,
): Promise<Set<string>> {
  const result = await admin
    .from("message_thread_participant")
    .select("thread_id")
    .eq("institute_id", instituteId)
    .eq("user_profile_id", userId);
  const rows = ensureDbOk(result) as Array<{ thread_id: string }>;
  return new Set(rows.map((r) => r.thread_id));
}

export async function listMessagesForThread(
  admin: SupabaseClient,
  threadId: string,
): Promise<MessageRow[]> {
  const result = await admin
    .from("message")
    .select(MESSAGE_COLS)
    .eq("thread_id", threadId)
    .is("deleted_at", null)
    .order("sent_at", { ascending: true });
  return ensureDbOk(result) as MessageRow[];
}

export async function findMessageById(
  admin: SupabaseClient,
  id: string,
): Promise<MessageRow | null> {
  const result = await admin
    .from("message")
    .select(MESSAGE_COLS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as MessageRow | null) ?? null;
}

export async function insertMessage(
  admin: SupabaseClient,
  input: {
    instituteId: string;
    threadId: string;
    senderUserId: string;
    body: string;
    sentAt: string;
  },
): Promise<MessageRow> {
  const result = await admin
    .from("message")
    .insert({
      institute_id: input.instituteId,
      thread_id: input.threadId,
      sender_user_id: input.senderUserId,
      body: input.body,
      sent_at: input.sentAt,
      read_at: null,
    })
    .select(MESSAGE_COLS)
    .single();
  return ensureDbOk(result) as MessageRow;
}

export async function updateMessageFields(
  admin: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
): Promise<MessageRow | null> {
  const result = await admin
    .from("message")
    .update(patch)
    .eq("id", id)
    .is("deleted_at", null)
    .select(MESSAGE_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as MessageRow | null) ?? null;
}

export async function softDeleteMessage(
  admin: SupabaseClient,
  id: string,
): Promise<MessageRow | null> {
  const result = await admin
    .from("message")
    .update({ deleted_at: new Date().toISOString() })
    .eq("id", id)
    .is("deleted_at", null)
    .select(MESSAGE_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as MessageRow | null) ?? null;
}
