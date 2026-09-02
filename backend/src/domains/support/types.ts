/** Nexus support foundation: threads + messages (step 6.2). */

export type SupportCategory =
  | "issue"
  | "feature_request"
  | "feedback"
  | "improvement_request";

export type SupportStatus = "open" | "in_progress" | "waiting" | "resolved";

export type SupportPriority = "low" | "medium" | "high";

export type SupportAuthorRole = "institute" | "nexus" | "internal";

export type SupportThreadRow = {
  id: string;
  institute_id: string;
  subject: string;
  category: SupportCategory;
  status: SupportStatus;
  priority: SupportPriority;
  assignee_handle: string | null;
  assignee_user_id: string | null;
  created_by_user_id: string;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type SupportMessageRow = {
  id: string;
  institute_id: string;
  thread_id: string;
  author_user_id: string;
  author_role: SupportAuthorRole;
  author_label: string;
  body: string;
  is_internal: boolean;
  sent_at: string;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type SupportMessageDto = {
  id: string;
  instituteId: string;
  threadId: string;
  authorUserId: string;
  authorRole: SupportAuthorRole;
  authorLabel: string;
  body: string;
  isInternal: boolean;
  sentAt: string;
  createdAt: string;
  updatedAt: string;
};

export type SupportThreadDto = {
  id: string;
  instituteId: string;
  subject: string;
  category: SupportCategory;
  status: SupportStatus;
  priority: SupportPriority;
  assigneeHandle: string | null;
  assigneeUserId: string | null;
  createdByUserId: string;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
  messages?: SupportMessageDto[];
};

export type CreateSupportThreadInput = {
  instituteId: string;
  subject: string;
  category?: SupportCategory;
  priority?: SupportPriority;
  body: string;
  /** Platform-only: seed as institute or nexus. Institute actors always institute. */
  authorRole?: "institute" | "nexus";
  authorLabel?: string;
};

/** Product feedback from any LumenX app — lands in Nexus support inbox. */
export type CreateProductFeedbackInput = {
  instituteId: string;
  source: "admin" | "connect" | "transport" | "admissions" | "careers" | "nexus";
  kind: "bug" | "feature" | "experience";
  rating: number;
  message: string;
  screenshotFileName?: string | null;
};

export type UpdateSupportThreadInput = {
  status?: SupportStatus;
  priority?: SupportPriority;
  assigneeHandle?: string | null;
  assigneeUserId?: string | null;
};

export type CreateSupportMessageInput = {
  body: string;
  authorLabel?: string;
};

export type CreateInternalNoteInput = {
  body: string;
  authorLabel?: string;
};
