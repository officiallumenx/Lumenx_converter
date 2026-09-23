import type {
  InboxItemDto,
  NotificationInboxListItem,
} from "./types";
import {
  backendCategoryToUiCategory,
  effectiveStoredPriority,
  presentationFromPriority,
} from "@lumenx/notifications";

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

/**
 * Presentation-only mapping. DTO identity fields are never used as authority.
 */
export function inboxItemDtoToListItem(
  dto: InboxItemDto,
): NotificationInboxListItem {
  const body = dto.notification.body?.trim() || "";
  const title = dto.notification.title?.trim() || "Notification";
  const createdAt = dto.notification.createdAt || dto.createdAt;
  const dueAt = dto.notification.dueAt ?? null;
  const stored = effectiveStoredPriority({
    stored: dto.notification.priority,
    dueAt,
  });
  const { type, priority } = presentationFromPriority(stored);
  const href = dto.notification.deepLink?.trim() || undefined;
  const templateId = dto.notification.templateId?.trim() || undefined;

  return {
    id: dto.id,
    title,
    desc: body,
    detail: body,
    time: relativeInboxTimeLabel(createdAt),
    type,
    category: backendCategoryToUiCategory(dto.notification.category),
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
