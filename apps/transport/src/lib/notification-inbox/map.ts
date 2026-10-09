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

/**
 * Map category → kind (label/icon group).
 * Does NOT read priority — category and severity are separate concerns.
 */
function categoryKindFromDto(dto: InboxItemDto): TransportNotification["kind"] {
  const cat = dto.notification.category;
  if (cat === "transport") return "route";
  if (cat === "system" || cat === "nexus") return "school";
  // announcements, messages, events, homework, fees, etc. → reminder (general info)
  return "reminder";
}

/**
 * Map stored priority + payload → severity (color only).
 * INFO (normal/success) = blue, WARNING (important) = amber, CRITICAL = red.
 * Does NOT infer from category — reads metadata only.
 */
function severityFromDto(dto: InboxItemDto): TransportNotification["severity"] {
  const prio = dto.notification.priority;
  const payload = dto.notification.payload ?? {};
  // School-alert emergency or explicit critical priority → red
  if (
    prio === "critical" ||
    payload.presentation === "alert" ||
    payload.alertSeverity === "emergency"
  ) {
    return "critical";
  }
  // Attention-level (approaching, delayed, not-boarded) → amber
  if (
    prio === "important" ||
    payload.severity === "attention" ||
    payload.severity === "warning" ||
    payload.alertSeverity === "mandatory"
  ) {
    return "warning";
  }
  // INFO (trip started, boarded, dropped, reminder) → blue
  return "info";
}

export function inboxItemDtoToTransportNotification(dto: InboxItemDto): TransportNotification {
  return {
    id: dto.id,
    title: dto.notification.title?.trim() || "Notification",
    message: dto.notification.body?.trim() || "",
    time: relativeTime(dto.notification.createdAt || dto.createdAt),
    kind: categoryKindFromDto(dto),
    severity: severityFromDto(dto),
    unread: dto.readAt == null,
    href: dto.notification.deepLink?.trim() || "/alerts",
  };
}

export function inboxItemDtosToTransportNotifications(dtos: InboxItemDto[]): TransportNotification[] {
  return dtos.map(inboxItemDtoToTransportNotification);
}
