import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureDbOk } from "../../db/errors.js";
import type {
  MessageRow,
  MessageThreadRow,
  MessageThreadStatus,
} from "./types.js";

export const THREAD_COLS =
  "id, institute_id, subject, student_id, created_by_user_id, counterpart_user_id, status, last_message_at, created_at, updated_at, deleted_at";
export const MESSAGE_COLS =
  "id, institute_id, thread_id, sender_user_id, body, sent_at, read_at, created_at, updated_at, deleted_at";

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

export async function listThreads(
  admin: SupabaseClient,
  instituteId: string,
): Promise<MessageThreadRow[]> {
  const result = await admin
    .from("message_thread")
    .select(THREAD_COLS)
    .eq("institute_id", instituteId)
    .is("deleted_at", null);
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
    createdByUserId: string;
    counterpartUserId: string;
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

export async function listMessagesForThread(
  admin: SupabaseClient,
  threadId: string,
): Promise<MessageRow[]> {
  const result = await admin
    .from("message")
    .select(MESSAGE_COLS)
    .eq("thread_id", threadId)
    .is("deleted_at", null);
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
