import type { SupabaseClient } from "@supabase/supabase-js";
import { ensureDbOk } from "../../db/errors.js";
import type {
  CreateSupportThreadInput,
  SupportAuthorRole,
  SupportMessageRow,
  SupportThreadRow,
} from "./types.js";

const THREAD_COLS =
  "id, institute_id, subject, category, status, priority, assignee_handle, assignee_user_id, created_by_user_id, last_message_at, created_at, updated_at, deleted_at";

const MESSAGE_COLS =
  "id, institute_id, thread_id, author_user_id, author_role, author_label, body, is_internal, sent_at, created_at, updated_at, deleted_at";

export async function listOpenSupportThreadsForPlatform(
  admin: SupabaseClient,
): Promise<SupportThreadRow[]> {
  const result = await admin
    .from("support_thread")
    .select(THREAD_COLS)
    .is("deleted_at", null)
    .in("status", ["open", "in_progress", "waiting"])
    .order("updated_at", { ascending: false });
  return ensureDbOk(result) as SupportThreadRow[];
}

export async function listThreadsByInstitute(
  admin: SupabaseClient,
  instituteId: string,
  status?: string,
): Promise<SupportThreadRow[]> {
  let q = admin
    .from("support_thread")
    .select(THREAD_COLS)
    .eq("institute_id", instituteId)
    .is("deleted_at", null)
    .order("updated_at", { ascending: false });
  if (status) q = q.eq("status", status);
  const result = await q;
  return ensureDbOk(result) as SupportThreadRow[];
}

export async function findThreadById(
  admin: SupabaseClient,
  id: string,
): Promise<SupportThreadRow | null> {
  const result = await admin
    .from("support_thread")
    .select(THREAD_COLS)
    .eq("id", id)
    .is("deleted_at", null)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as SupportThreadRow | null) ?? null;
}

export async function insertThread(
  admin: SupabaseClient,
  input: CreateSupportThreadInput & {
    createdByUserId: string;
    category: string;
    priority: string;
  },
): Promise<SupportThreadRow> {
  const now = new Date().toISOString();
  const result = await admin
    .from("support_thread")
    .insert({
      institute_id: input.instituteId,
      subject: input.subject,
      category: input.category,
      status: "open",
      priority: input.priority,
      assignee_handle: null,
      assignee_user_id: null,
      created_by_user_id: input.createdByUserId,
      last_message_at: now,
    })
    .select(THREAD_COLS)
    .single();
  return ensureDbOk(result) as SupportThreadRow;
}

export async function updateThreadFields(
  admin: SupabaseClient,
  id: string,
  patch: Record<string, unknown>,
): Promise<SupportThreadRow | null> {
  const result = await admin
    .from("support_thread")
    .update(patch)
    .eq("id", id)
    .is("deleted_at", null)
    .select(THREAD_COLS)
    .maybeSingle();
  if (result.error) ensureDbOk(result);
  return (result.data as SupportThreadRow | null) ?? null;
}

export async function softDeleteThread(
  admin: SupabaseClient,
  id: string,
): Promise<SupportThreadRow | null> {
  return updateThreadFields(admin, id, {
    deleted_at: new Date().toISOString(),
  });
}

export async function listMessagesForThread(
  admin: SupabaseClient,
  threadId: string,
  opts?: { includeInternal?: boolean },
): Promise<SupportMessageRow[]> {
  let q = admin
    .from("support_message")
    .select(MESSAGE_COLS)
    .eq("thread_id", threadId)
    .is("deleted_at", null)
    .order("sent_at", { ascending: true });
  if (!opts?.includeInternal) {
    q = q.eq("is_internal", false);
  }
  const result = await q;
  return ensureDbOk(result) as SupportMessageRow[];
}

export async function insertMessage(
  admin: SupabaseClient,
  input: {
    instituteId: string;
    threadId: string;
    authorUserId: string;
    authorRole: SupportAuthorRole;
    authorLabel: string;
    body: string;
    isInternal: boolean;
  },
): Promise<SupportMessageRow> {
  const result = await admin
    .from("support_message")
    .insert({
      institute_id: input.instituteId,
      thread_id: input.threadId,
      author_user_id: input.authorUserId,
      author_role: input.authorRole,
      author_label: input.authorLabel,
      body: input.body,
      is_internal: input.isInternal,
    })
    .select(MESSAGE_COLS)
    .single();
  return ensureDbOk(result) as SupportMessageRow;
}
