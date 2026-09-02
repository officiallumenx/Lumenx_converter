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
import {
  pushPhase7Inbox,
  type Phase7Audience,
} from "../shared/phase7-inbox";

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

export type AnnouncementAudienceScope =
  | "all"
  | "students"
  | "parents"
  | "teachers"
  | "classes";

const ALL_PORTAL_AUDIENCES: Phase7Audience[] = ["parent", "student", "teacher"];

function mapBroadcastAudienceKind(
  scope: AnnouncementAudienceScope | undefined,
  label: string,
): BroadcastAudienceKind {
  if (scope === "students") return "students";
  if (scope === "parents") return "parents";
  if (scope === "teachers") return "teachers";
  const t = label.toLowerCase();
  if (t.includes("student") && !t.includes("parent") && !t.includes("teacher")) {
    return "students";
  }
  if (t.includes("parent") && !t.includes("student") && !t.includes("teacher")) {
    return "parents";
  }
  if (t.includes("teacher") || t.includes("staff")) return "teachers";
  return "everyone";
}

function resolvePortalAudiences(
  scope: AnnouncementAudienceScope | undefined,
  label: string,
): Phase7Audience[] {
  if (scope === "students") return ["student"];
  if (scope === "parents") return ["parent"];
  if (scope === "teachers") return ["teacher"];
  if (scope === "classes") return ["parent", "student"];
  const t = label.toLowerCase();
  if (t.includes("student") && !t.includes("parent") && !t.includes("teacher")) {
    return ["student"];
  }
  if (t.includes("parent") && !t.includes("student") && !t.includes("teacher")) {
    return ["parent"];
  }
  if (t.includes("teacher") || t.includes("staff")) return ["teacher"];
  return ALL_PORTAL_AUDIENCES;
}

/** Institute announcement published — fan-out to Connect teacher / parent / student inboxes. */
export function notifyAnnouncementPublished(input: {
  id: string;
  title: string;
  body?: string | null;
  audienceLabel: string;
  audienceScope?: AnnouncementAudienceScope;
  sender?: string;
  priority?: "normal" | "high" | "critical";
  pinned?: boolean;
}): PublishBroadcastResult {
  const bodyPreview = (input.body ?? input.title).trim();
  const audiences = resolvePortalAudiences(input.audienceScope, input.audienceLabel);
  const result = publishBroadcastNotification({
    id: input.id,
    title: input.title.trim(),
    message: bodyPreview,
    audienceLabel: input.audienceLabel,
    audienceKind: mapBroadcastAudienceKind(input.audienceScope, input.audienceLabel),
    sender: input.sender ?? "Admin",
    priority: input.pinned ? "high" : (input.priority ?? "normal"),
    href: `/announcements/${input.id}`,
  });

  pushPhase7Inbox({
    ...result.appNotification,
    id: `ann-${input.id}`,
    audiences,
    audience: audiences[0],
    module: "announcements",
    category: "circulars",
    desc: bodyPreview,
    time: "Just now",
    unread: true,
    href: `/announcements/${input.id}`,
  });

  return result;
}
