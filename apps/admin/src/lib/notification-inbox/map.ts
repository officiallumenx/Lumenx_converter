import type { NotificationCategory } from "@lumenx/types";
import type {
  BackendNotificationCategory,
  BackendNotificationPriority,
  InboxItemDto,
  NotificationInboxListItem,
} from "./types";

const BACKEND_TO_UI_CATEGORY: Record<
  BackendNotificationCategory,
  NotificationCategory
> = {
  attendance: "attendance",
  homework: "assignments",
  fees: "fees",
  exams: "exams",
  events: "events",
  transport: "circulars",
  leave: "circulars",
  announcements: "circulars",
  messages: "circulars",
  complaints: "circulars",
  admissions: "academic",
  careers: "circulars",
  certificates: "academic",
  documents: "academic",
  timetable: "academic",
  system: "emergency",
  nexus: "circulars",
};

export function relativeInboxTimeLabel(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms)) return iso;
  const mins = Math.floor(ms / 60_000);
  if (mins < 60) return mins <= 1 ? "Just now" : `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function uiCategory(category: BackendNotificationCategory): NotificationCategory {
  return BACKEND_TO_UI_CATEGORY[category] ?? "circulars";
}

function presentationType(priority: BackendNotificationPriority): {
  type: NotificationInboxListItem["type"];
  priority: NotificationInboxListItem["priority"];
} {
  if (priority === "critical" || priority === "important") {
    return { type: "warning", priority: "high" };
  }
  if (priority === "success") {
    return { type: "positive", priority: "normal" };
  }
  return { type: "info", priority: "normal" };
}

/**
 * Presentation-only mapping. DTO identity fields are never used as authority.
 */
export function inboxItemDtoToListItem(
  dto: InboxItemDto,
): NotificationInboxListItem {
  const body = dto.notification.body?.trim() || "";
  const title = dto.notification.title?.trim() || "Notification";
  const createdAt = dto.notification.createdAt || dto.createdAt;
  const { type, priority } = presentationType(dto.notification.priority);
  const href = dto.notification.deepLink?.trim() || undefined;
  const templateId = dto.notification.templateId?.trim() || undefined;

  return {
    id: dto.id,
    title,
    desc: body,
    detail: body,
    time: relativeInboxTimeLabel(createdAt),
    type,
    category: uiCategory(dto.notification.category),
    unread: dto.readAt == null,
    priority,
    createdAt,
    href,
    templateId,
    payload: dto.notification.payload ?? undefined,
  };
}

export function inboxItemDtosToListItems(
  dtos: InboxItemDto[],
): NotificationInboxListItem[] {
  if (!Array.isArray(dtos)) {
    throw new TypeError("Notification inbox API response must be an array");
  }
  return dtos.map(inboxItemDtoToListItem);
}
