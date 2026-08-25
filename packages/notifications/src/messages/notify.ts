/**
 * Direct-message pointer notifications.
 * Message body stays in the messaging store — this only emits a lightweight inbox pointer.
 */
import type { AppNotification } from "@lumenx/types";

import { buildAppNotification, buildNotification } from "../shared/api";
import { renderNotificationTemplate } from "../shared/registry";
import { NOTIFICATION_TEMPLATE_IDS as IDS } from "../shared/registry/ids";
import type { LumenXNotification, LumenXNotificationAudience } from "../shared/types";

export type DirectMessageRecipientRole = "parent" | "student" | "teacher";

export type NotifyDirectMessageInput = {
  messageId: string;
  threadId: string;
  senderName: string;
  /** Subject / short preview only — never the full message body. */
  subjectPreview: string;
  recipientRole: DirectMessageRecipientRole;
  /** Optional stable id; defaults to msg-notif-{messageId}. */
  id?: string;
  href?: string;
};

export type NotifyDirectMessageResult = {
  foundation: LumenXNotification;
  appNotification: AppNotification;
};

function templateIdFor(role: DirectMessageRecipientRole): string {
  if (role === "parent") return IDS.messages.parent.newMessage;
  if (role === "teacher") return IDS.messages.teacher.newMessage;
  return IDS.messages.student.newMessage;
}

function audienceFor(role: DirectMessageRecipientRole): LumenXNotificationAudience {
  if (role === "parent") return "parent";
  if (role === "teacher") return "teacher";
  return "student";
}

/**
 * Build a notification pointing at an existing message.
 * Does not persist the message body.
 */
export function notifyDirectMessage(input: NotifyDirectMessageInput): NotifyDirectMessageResult {
  const templateId = templateIdFor(input.recipientRole);
  const preview = input.subjectPreview.trim() || "Open Messages to read";
  const rendered = renderNotificationTemplate({
    templateId,
    variables: {
      senderName: input.senderName.trim() || "Someone",
      subjectPreview: preview,
    },
  });

  const id = input.id ?? `msg-notif-${input.messageId}`;
  const href = input.href ?? "/messages";

  const foundation = buildNotification({
    id,
    category: "messages",
    title: rendered.title,
    message: rendered.body,
    source: "messages",
    audience: audienceFor(input.recipientRole),
    priority: "important",
    href,
    templateId: rendered.id,
    metadata: {
      messageId: input.messageId,
      threadId: input.threadId,
      recipientRole: input.recipientRole,
    },
  });

  const appNotification = buildAppNotification(
    {
      id: foundation.id,
      category: "messages",
      title: foundation.title,
      message: foundation.message,
      source: "messages",
      audience: foundation.audience,
      priority: foundation.priority,
      href,
      templateId: foundation.templateId,
      metadata: foundation.metadata,
    },
    { category: "academic" },
  );

  return { foundation, appNotification };
}
