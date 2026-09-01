/** Admin messages — mirrors backend message_thread + message DTOs. */

export type MessageThreadKind = "direct" | "group";
export type MessageThreadStatus = "open" | "closed" | "archived";

export type MessageThreadDto = {
  id: string;
  instituteId: string;
  subject: string | null;
  studentId: string | null;
  threadKind: MessageThreadKind;
  groupClassLabel: string | null;
  groupSectionLabel: string | null;
  createdByUserId: string;
  counterpartUserId: string | null;
  status: MessageThreadStatus;
  lastMessageAt: string | null;
  participantUserIds?: string[];
  createdAt: string;
  updatedAt: string;
};

export type MessageDto = {
  id: string;
  instituteId: string;
  threadId: string;
  senderUserId: string;
  body: string;
  sentAt: string;
  readAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type MessageRecipientDto = {
  userId: string;
  displayName: string;
  role: "teacher" | "parent" | "student" | "staff";
};

export type MessageThreadListItem = MessageThreadDto & {
  counterpartLabel: string;
  preview: string;
};

export type ListMessageThreadsParams = {
  instituteId: string;
};

export type CreateDirectThreadInput = {
  instituteId: string;
  counterpartUserId: string;
  subject?: string | null;
  studentId?: string | null;
  body?: string | null;
};

export type CreateGroupThreadInput = {
  instituteId: string;
  subject?: string | null;
  classLabel: string;
  sectionLabel: string;
  body?: string | null;
};

export type UpdateThreadInput = {
  subject?: string | null;
  status?: MessageThreadStatus;
};

export type ListRecipientsParams = {
  instituteId: string;
  studentId?: string | null;
};
