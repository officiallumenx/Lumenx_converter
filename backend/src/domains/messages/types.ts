/** Messages foundation types (message_thread + message + group participants). */

export type MessageThreadKind = "direct" | "group";

export type MessageThreadStatus = "open" | "closed" | "archived";

export type MessageThreadRow = {
  id: string;
  institute_id: string;
  subject: string | null;
  student_id: string | null;
  thread_kind: MessageThreadKind;
  group_class_label: string | null;
  group_section_label: string | null;
  created_by_user_id: string;
  counterpart_user_id: string | null;
  status: MessageThreadStatus;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type MessageThreadParticipantRow = {
  id: string;
  institute_id: string;
  thread_id: string;
  user_profile_id: string;
  created_at: string;
};

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

export type MessageRecipientDto = {
  userId: string;
  displayName: string;
  role: "teacher" | "parent" | "student" | "staff";
};

export type MessageRow = {
  id: string;
  institute_id: string;
  thread_id: string;
  sender_user_id: string;
  body: string;
  sent_at: string;
  read_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
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

export type CreateThreadInput = {
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

export type CreateMessageInput = {
  body: string;
};
