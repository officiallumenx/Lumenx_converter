import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../errors/app-error.js";
import type { Actor } from "../../auth/types.js";
import {
  assertInstituteAccess,
  assertPlatformRoles,
  actorHasInstituteRole,
} from "../../authorization/index.js";
import { findInstituteById } from "../identity/repository.js";
import { NEXUS_SUPPORT_WRITE_ROLES } from "../nexus/service.js";
import {
  findThreadById,
  insertMessage,
  insertThread,
  listAllThreadsForPlatform,
  listMessagesForThread,
  listThreadsByInstitute,
  softDeleteThread,
  updateThreadFields,
} from "./repository.js";
import type {
  CreateInternalNoteInput,
  CreateProductFeedbackInput,
  CreateSupportMessageInput,
  CreateSupportThreadInput,
  SupportAuthorRole,
  SupportCategory,
  SupportMessageDto,
  SupportMessageRow,
  SupportPriority,
  SupportStatus,
  SupportThreadDto,
  SupportThreadRow,
  UpdateSupportThreadInput,
} from "./types.js";

export const SUPPORT_STAFF_READ_ROLES = [
  "institute_admin",
  "principal",
  "vice_principal",
  "coordinator",
  "it_admin",
  "staff",
] as const;

export const SUPPORT_STAFF_WRITE_ROLES = [
  "institute_admin",
  "principal",
  "vice_principal",
  "coordinator",
  "it_admin",
] as const;

const CATEGORIES = [
  "issue",
  "feature_request",
  "feedback",
  "improvement_request",
] as const;

const STATUSES: SupportStatus[] = [
  "open",
  "in_progress",
  "waiting",
  "resolved",
];

const PRIORITIES: SupportPriority[] = ["low", "medium", "high"];

function isPlatform(actor: Actor): boolean {
  return Boolean(actor.isPlatformOperator);
}

function canViewInternalNotes(actor: Actor): boolean {
  if (!isPlatform(actor)) return false;
  const code = actor.platformRoleCode;
  return Boolean(code && NEXUS_SUPPORT_WRITE_ROLES.includes(code as never));
}

function staffHasAnyRole(
  actor: Actor,
  instituteId: string,
  roles: readonly string[],
): boolean {
  return roles.some((r) => actorHasInstituteRole(actor, instituteId, r));
}

/** True if actor may see threads for this institute. */
export function canReadSupport(
  actor: Actor,
  instituteId: string,
): boolean {
  if (isPlatform(actor)) return true;
  const membership = actor.memberships.find((m) => m.instituteId === instituteId);
  if (!membership) return false;
  return staffHasAnyRole(actor, instituteId, SUPPORT_STAFF_READ_ROLES);
}

function assertSupportWriterPlatform(actor: Actor): void {
  assertPlatformRoles(actor, [...NEXUS_SUPPORT_WRITE_ROLES]);
}

function assertInstituteSupportWriter(
  actor: Actor,
  instituteId: string,
): void {
  assertInstituteAccess(actor, instituteId);
  if (!staffHasAnyRole(actor, instituteId, SUPPORT_STAFF_WRITE_ROLES)) {
    throw AppError.forbidden("Insufficient institute role");
  }
}

function defaultAuthorLabel(actor: Actor, role: SupportAuthorRole): string {
  if (role === "institute") return "Institute Admin";
  return actor.displayName?.trim() || actor.platformRoleCode || "Nexus";
}

export function toMessageDto(row: SupportMessageRow): SupportMessageDto {
  return {
    id: row.id,
    instituteId: row.institute_id,
    threadId: row.thread_id,
    authorUserId: row.author_user_id,
    authorRole: row.author_role,
    authorLabel: row.author_label,
    body: row.body,
    isInternal: row.is_internal,
    sentAt: row.sent_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

export function toThreadDto(
  row: SupportThreadRow,
  messages?: SupportMessageDto[],
): SupportThreadDto {
  return {
    id: row.id,
    instituteId: row.institute_id,
    subject: row.subject,
    category: row.category,
    status: row.status,
    priority: row.priority,
    assigneeHandle: row.assignee_handle,
    assigneeUserId: row.assignee_user_id,
    createdByUserId: row.created_by_user_id,
    lastMessageAt: row.last_message_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    ...(messages ? { messages } : {}),
  };
}

async function requireReadableThread(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
): Promise<SupportThreadRow> {
  const row = await findThreadById(admin, id);
  if (!row || !canReadSupport(actor, row.institute_id)) {
    throw AppError.notFound("Support thread not found");
  }
  return row;
}

function nextStatusAfterPublicMessage(
  current: SupportStatus,
  authorRole: "institute" | "nexus",
): SupportStatus {
  if (authorRole === "nexus") {
    if (current === "open" || current === "resolved") return "in_progress";
    return current;
  }
  // institute follow-up
  if (current === "waiting") return "open";
  if (current === "resolved") return "open";
  return current;
}

export async function listThreadsForActor(
  admin: SupabaseClient,
  actor: Actor,
  instituteId: string | null | undefined,
  status?: string,
  category?: string,
): Promise<SupportThreadDto[]> {
  if (status && !STATUSES.includes(status as SupportStatus)) {
    throw AppError.validation("Invalid status filter");
  }
  if (category && !CATEGORIES.includes(category as SupportCategory)) {
    throw AppError.validation("Invalid category filter");
  }

  // Platform operators may omit institute_id to load the full inbox.
  if (!instituteId) {
    if (!isPlatform(actor)) {
      throw AppError.validation("institute_id is required");
    }
    const rows = await listAllThreadsForPlatform(admin, {
      status,
      category,
      limit: 200,
    });
    return rows.map((r) => toThreadDto(r));
  }

  if (!canReadSupport(actor, instituteId)) {
    throw AppError.notFound("Support thread not found");
  }
  const rows = await listThreadsByInstitute(admin, instituteId, status);
  const filtered = category
    ? rows.filter((r) => r.category === category)
    : rows;
  return filtered.map((r) => toThreadDto(r));
}

function actorLinkedToInstitute(actor: Actor, instituteId: string): boolean {
  if (isPlatform(actor)) return true;
  if (
    actor.memberships.some(
      (m) => m.instituteId === instituteId && m.status === "active",
    )
  ) {
    return true;
  }
  if (actor.teachers.some((t) => t.instituteId === instituteId)) return true;
  if (actor.students.some((s) => s.instituteId === instituteId)) return true;
  if (actor.parents.some((p) => p.instituteId === instituteId)) return true;
  if (actor.staff.some((s) => s.instituteId === instituteId)) return true;
  return false;
}

function feedbackCategory(kind: CreateProductFeedbackInput["kind"]): SupportCategory {
  if (kind === "bug") return "issue";
  if (kind === "feature") return "feature_request";
  return "feedback";
}

function feedbackSubject(input: CreateProductFeedbackInput): string {
  const kindLabel =
    input.kind === "bug"
      ? "Bug"
      : input.kind === "feature"
        ? "Feature request"
        : "Experience";
  return `[${input.source}] ${kindLabel} · ${input.rating}/5`;
}

/**
 * Any authenticated user linked to the institute (or platform operator)
 * can submit product feedback. Creates a support_thread for the Nexus inbox.
 */
export async function createProductFeedbackForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: CreateProductFeedbackInput,
): Promise<SupportThreadDto> {
  const message = input.message.trim();
  if (message.length < 12) {
    throw AppError.validation("message must be at least 12 characters");
  }
  if (!Number.isFinite(input.rating) || input.rating < 1 || input.rating > 5) {
    throw AppError.validation("rating must be 1–5");
  }

  const institute = await findInstituteById(admin, input.instituteId);
  if (!institute || institute.deleted_at) {
    throw AppError.notFound("Institute not found");
  }
  if (!actorLinkedToInstitute(actor, input.instituteId)) {
    throw AppError.forbidden("Not linked to this institute");
  }

  const category = feedbackCategory(input.kind);
  const screenshotLine = input.screenshotFileName?.trim()
    ? `\n\nScreenshot: ${input.screenshotFileName.trim()}`
    : "";
  const body = [
    `Source app: ${input.source}`,
    `Type: ${input.kind}`,
    `Rating: ${input.rating}/5`,
    "",
    message,
    screenshotLine,
  ]
    .join("\n")
    .trim();

  const authorLabel =
    actor.displayName?.trim() ||
    actor.email?.trim() ||
    (isPlatform(actor) ? "Platform operator" : "LumenX user");

  const thread = await insertThread(admin, {
    instituteId: input.instituteId,
    subject: feedbackSubject(input),
    category,
    priority: "medium",
    body,
    createdByUserId: actor.userId,
  });

  const msg = await insertMessage(admin, {
    instituteId: thread.institute_id,
    threadId: thread.id,
    authorUserId: actor.userId,
    authorRole: "institute",
    authorLabel,
    body,
    isInternal: false,
  });

  return toThreadDto(thread, [toMessageDto(msg)]);
}

export async function getThreadForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
): Promise<SupportThreadDto> {
  const row = await requireReadableThread(admin, actor, id);
  const includeInternal = canViewInternalNotes(actor);
  const messages = await listMessagesForThread(admin, row.id, {
    includeInternal,
  });
  return toThreadDto(row, messages.map(toMessageDto));
}

export async function createThreadForActor(
  admin: SupabaseClient,
  actor: Actor,
  input: CreateSupportThreadInput,
): Promise<SupportThreadDto> {
  const subject = input.subject.trim();
  const body = input.body.trim();
  if (!subject) throw AppError.validation("subject is required");
  if (!body) throw AppError.validation("body is required");

  const institute = await findInstituteById(admin, input.instituteId);
  if (!institute || institute.deleted_at) {
    throw AppError.notFound("Institute not found");
  }

  let authorRole: "institute" | "nexus" = "institute";
  let authorLabel: string;

  if (isPlatform(actor)) {
    assertSupportWriterPlatform(actor);
    authorRole = input.authorRole === "nexus" ? "nexus" : "institute";
    authorLabel =
      input.authorLabel?.trim() || defaultAuthorLabel(actor, authorRole);
  } else {
    assertInstituteSupportWriter(actor, input.instituteId);
    authorRole = "institute";
    authorLabel =
      input.authorLabel?.trim() || defaultAuthorLabel(actor, "institute");
  }

  const category = input.category ?? "issue";
  if (!CATEGORIES.includes(category)) {
    throw AppError.validation("Invalid category");
  }
  // Priority triage is platform-only; institute creates always land as medium.
  let priority: SupportPriority = "medium";
  if (isPlatform(actor)) {
    priority = input.priority ?? "medium";
  } else if (input.priority !== undefined && input.priority !== "medium") {
    throw AppError.forbidden("Institute cannot set support priority");
  }
  if (!PRIORITIES.includes(priority)) {
    throw AppError.validation("Invalid priority");
  }

  const thread = await insertThread(admin, {
    ...input,
    subject,
    category,
    priority,
    createdByUserId: actor.userId,
  });

  const message = await insertMessage(admin, {
    instituteId: thread.institute_id,
    threadId: thread.id,
    authorUserId: actor.userId,
    authorRole,
    authorLabel,
    body,
    isInternal: false,
  });

  let status = thread.status;
  if (authorRole === "nexus" && status === "open") {
    const updated = await updateThreadFields(admin, thread.id, {
      status: "in_progress",
      last_message_at: message.sent_at,
    });
    if (updated) {
      return toThreadDto(updated, [toMessageDto(message)]);
    }
  }

  return toThreadDto(thread, [toMessageDto(message)]);
}

export async function updateThreadForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
  input: UpdateSupportThreadInput,
): Promise<SupportThreadDto> {
  const row = await requireReadableThread(admin, actor, id);

  if (!isPlatform(actor)) {
    // Institute may only reopen / set waiting-adjacent public statuses — keep narrow:
    // allow status open|waiting only (no assign/priority). Prefer 404 for non-writers.
    if (!staffHasAnyRole(actor, row.institute_id, SUPPORT_STAFF_WRITE_ROLES)) {
      throw AppError.notFound("Support thread not found");
    }
    if (
      input.assigneeHandle !== undefined ||
      input.assigneeUserId !== undefined ||
      input.priority !== undefined
    ) {
      throw AppError.forbidden("Insufficient platform role");
    }
    if (input.status !== undefined && input.status !== "open") {
      throw AppError.forbidden("Institute may only reopen threads");
    }
  } else {
    assertSupportWriterPlatform(actor);
  }

  const patch: Record<string, unknown> = {};
  if (input.status !== undefined) {
    if (!STATUSES.includes(input.status)) {
      throw AppError.validation("Invalid status");
    }
    patch.status = input.status;
  }
  if (input.priority !== undefined) {
    if (!PRIORITIES.includes(input.priority)) {
      throw AppError.validation("Invalid priority");
    }
    patch.priority = input.priority;
  }
  if (input.assigneeHandle !== undefined) {
    const handle = input.assigneeHandle?.trim() || null;
    patch.assignee_handle = handle;
    if (handle && row.status === "open" && input.status === undefined) {
      patch.status = "in_progress";
    }
  }
  if (input.assigneeUserId !== undefined) {
    patch.assignee_user_id = input.assigneeUserId;
  }

  if (Object.keys(patch).length === 0) {
    throw AppError.validation("At least one field is required");
  }

  const updated = await updateThreadFields(admin, id, patch);
  if (!updated) throw AppError.notFound("Support thread not found");
  return toThreadDto(updated);
}

export async function postMessageForActor(
  admin: SupabaseClient,
  actor: Actor,
  threadId: string,
  input: CreateSupportMessageInput,
): Promise<SupportThreadDto> {
  const body = input.body.trim();
  if (!body) throw AppError.validation("body is required");

  const row = await requireReadableThread(admin, actor, threadId);

  let authorRole: "institute" | "nexus";
  let authorLabel: string;

  if (isPlatform(actor)) {
    assertSupportWriterPlatform(actor);
    authorRole = "nexus";
    authorLabel =
      input.authorLabel?.trim() || defaultAuthorLabel(actor, "nexus");
  } else {
    assertInstituteSupportWriter(actor, row.institute_id);
    authorRole = "institute";
    authorLabel =
      input.authorLabel?.trim() || defaultAuthorLabel(actor, "institute");
  }

  const message = await insertMessage(admin, {
    instituteId: row.institute_id,
    threadId: row.id,
    authorUserId: actor.userId,
    authorRole,
    authorLabel,
    body,
    isInternal: false,
  });

  const nextStatus = nextStatusAfterPublicMessage(row.status, authorRole);
  const updated = await updateThreadFields(admin, row.id, {
    status: nextStatus,
    last_message_at: message.sent_at,
  });

  return getThreadForActor(admin, actor, (updated ?? row).id);
}

export async function postInternalNoteForActor(
  admin: SupabaseClient,
  actor: Actor,
  threadId: string,
  input: CreateInternalNoteInput,
): Promise<SupportThreadDto> {
  assertSupportWriterPlatform(actor);

  const body = input.body.trim();
  if (!body) throw AppError.validation("body is required");

  const row = await requireReadableThread(admin, actor, threadId);

  await insertMessage(admin, {
    instituteId: row.institute_id,
    threadId: row.id,
    authorUserId: actor.userId,
    authorRole: "internal",
    authorLabel:
      input.authorLabel?.trim() || defaultAuthorLabel(actor, "internal"),
    body,
    isInternal: true,
  });

  // Do not bump last_message_at — that field is visible to institute readers
  // and would leak that an internal note was added.
  return getThreadForActor(admin, actor, row.id);
}

export async function deleteThreadForActor(
  admin: SupabaseClient,
  actor: Actor,
  id: string,
): Promise<void> {
  const row = await requireReadableThread(admin, actor, id);
  if (!isPlatform(actor)) {
    throw AppError.notFound("Support thread not found");
  }
  assertSupportWriterPlatform(actor);
  const deleted = await softDeleteThread(admin, row.id);
  if (!deleted) throw AppError.notFound("Support thread not found");
}
