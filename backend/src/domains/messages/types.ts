/** Messages foundation types (message_thread + message). */

export type MessageThreadStatus = "open" | "closed" | "archived";

export type MessageThreadRow = {
  id: string;
  institute_id: string;
  subject: string | null;
  student_id: string | null;
  created_by_user_id: string;
  counterpart_user_id: string;
  status: MessageThreadStatus;
  last_message_at: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
};

export type MessageThreadDto = {
  id: string;
  instituteId: string;
  subject: string | null;
  studentId: string | null;
  createdByUserId: string;
  counterpartUserId: string;
  status: MessageThreadStatus;
  lastMessageAt: string | null;
  createdAt: string;
  updatedAt: string;
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

export type UpdateThreadInput = {
  subject?: string | null;
  status?: MessageThreadStatus;
};

export type CreateMessageInput = {
  body: string;
};
