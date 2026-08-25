/**
 * Broadcast / announcement notifications — wraps shared DemoBroadcast inbox.
 * Does not add read-receipt analytics.
 */
import { appendBroadcastInbox, type DemoBroadcast } from "@lumenx/utils";

import { buildAppNotification, buildNotification } from "../shared/api";
import { renderNotificationTemplate } from "../shared/registry";
import { NOTIFICATION_TEMPLATE_IDS as IDS } from "../shared/registry/ids";
import type { LumenXNotification } from "../shared/types";
import type { AppNotification } from "@lumenx/types";

export type BroadcastAudienceKind =
  | "everyone"
  | "parents"
  | "students"
  | "teachers"
  | "class_section"
  | "group";

export type PublishBroadcastInput = {
  id?: string;
  title: string;
  message: string;
  sender?: string;
  priority?: "normal" | "high" | "critical";
  /** Human-readable audience label (existing field). */
  audienceLabel: string;
  audienceKind?: BroadcastAudienceKind;
  classFilter?: string;
  section?: string;
  href?: string;
  attachmentName?: string | null;
  time?: string;
};

export type PublishBroadcastResult = {
  broadcast: DemoBroadcast;
  foundation: LumenXNotification;
  appNotification: AppNotification;
};

function priorityToShared(p: "normal" | "high" | "critical"): "normal" | "important" | "critical" {
  if (p === "critical") return "critical";
  if (p === "high") return "important";
  return "normal";
}

export function publishBroadcastNotification(input: PublishBroadcastInput): PublishBroadcastResult {
  const id = input.id ?? `bc-${Date.now()}`;
  const priority = input.priority ?? "normal";
  const sender = input.sender?.trim() || "Admin";
  const rendered = renderNotificationTemplate({
    templateId: IDS.announcements.audience.broadcast,
    variables: {
      headline: input.title.trim(),
      bodyPreview: input.message.trim() || input.title.trim(),
      sender,
      audience: input.audienceLabel,
      priority,
      attachmentName: input.attachmentName?.trim() || "none",
    },
  });

  const broadcast: DemoBroadcast = {
    id,
    title: input.title.trim(),
    message: input.message.trim(),
    audience: input.audienceLabel,
    priority,
    time: input.time ?? "Just now",
    sender,
    href: input.href ?? "/notifications",
    attachmentName: input.attachmentName?.trim() || null,
    audienceKind: input.audienceKind,
    classFilter: input.classFilter,
    section: input.section,
  };

  appendBroadcastInbox(broadcast);

  const foundation = buildNotification({
    id: `ann-${id}`,
    category: "announcements",
    title: rendered.title,
    message: rendered.body,
    source: "admin",
    audience: "institute",
    priority: priorityToShared(priority),
    href: broadcast.href,
    templateId: rendered.id,
    metadata: {
      broadcastId: id,
      sender,
      audience: input.audienceLabel,
      audienceKind: input.audienceKind ?? "",
      attachmentName: broadcast.attachmentName ?? "",
      classFilter: input.classFilter ?? "",
      section: input.section ?? "",
    },
  });

  const appNotification = buildAppNotification(
    {
      id: foundation.id,
      category: "announcements",
      title: foundation.title,
      message: foundation.message,
      source: "admin",
      audience: "institute",
      priority: foundation.priority,
      href: foundation.href,
      templateId: foundation.templateId,
      metadata: foundation.metadata,
    },
    { category: "circulars" },
  );

  return { broadcast, foundation, appNotification };
}
