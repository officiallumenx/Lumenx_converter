/** Nexus support thread DTOs — mirror backend SupportThreadDto. */

export type SupportCategory =
  | "issue"
  | "feature_request"
  | "feedback"
  | "improvement_request";

export type SupportStatus = "open" | "in_progress" | "waiting" | "resolved";

export type SupportPriority = "low" | "medium" | "high";

export type SupportAuthorRole = "institute" | "nexus" | "internal";

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
