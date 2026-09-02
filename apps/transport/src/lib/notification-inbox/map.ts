import type { InboxItemDto } from "./types";
import type { TransportNotification } from "@/lib/transport/types";

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms)) return iso;
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function kindFromDto(dto: InboxItemDto): TransportNotification["kind"] {
  const payload = dto.notification.payload ?? {};
  if (payload.presentation === "alert" || dto.notification.priority === "critical") {
    return "urgent";
  }
  if (dto.notification.category === "transport") return "route";
  if (dto.notification.category === "system") return "school";
  return "reminder";
}

export function inboxItemDtoToTransportNotification(dto: InboxItemDto): TransportNotification {
  return {
    id: dto.id,
    title: dto.notification.title?.trim() || "Notification",
    message: dto.notification.body?.trim() || "",
    time: relativeTime(dto.notification.createdAt || dto.createdAt),
    kind: kindFromDto(dto),
    unread: dto.readAt == null,
    href: dto.notification.deepLink?.trim() || "/alerts",
  };
}

export function inboxItemDtosToTransportNotifications(dtos: InboxItemDto[]): TransportNotification[] {
  return dtos.map(inboxItemDtoToTransportNotification);
}
