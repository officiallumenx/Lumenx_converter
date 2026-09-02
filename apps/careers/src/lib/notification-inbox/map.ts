import type { CareersNotification, CareersNotificationType } from "@/lib/careers/types";
import type { InboxItemDto } from "./types";

function relativeTime(iso: string): string {
  const ms = Date.now() - new Date(iso).getTime();
  if (!Number.isFinite(ms)) return iso;
  const mins = Math.floor(ms / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  return new Date(iso).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
  });
}

function careersTypeFromDto(dto: InboxItemDto): CareersNotificationType {
  const title = dto.notification.title.toLowerCase();
  const body = dto.notification.body.toLowerCase();
  if (title.includes("shortlist")) return "shortlisted";
  if (title.includes("interview")) return "interview";
  if (title.includes("selected") || title.includes("offer")) return "offer";
  if (title.includes("not selected") || title.includes("rejected")) return "selection";
  if (title.includes("document")) return "document";
  if (title.includes("submitted")) return "application";
  if (dto.notification.category === "careers") {
    if (body.includes("demo")) return "demo_class";
    return "general";
  }
  return "general";
}

export function inboxItemDtoToCareersNotification(
  dto: InboxItemDto,
  candidateId: string,
): CareersNotification {
  const applicationId =
    typeof dto.notification.payload.applicationId === "string"
      ? dto.notification.payload.applicationId
      : undefined;

  return {
    id: dto.id,
    candidateId,
    applicationId,
    templateId: dto.notification.templateId ?? undefined,
    title: dto.notification.title?.trim() || "Notification",
    body: dto.notification.body?.trim() || "",
    type: careersTypeFromDto(dto),
    read: dto.readAt != null,
    createdAt: dto.notification.createdAt || dto.createdAt,
  };
}

export function inboxItemDtosToCareersNotifications(
  dtos: InboxItemDto[],
  candidateId: string,
): CareersNotification[] {
  return dtos.map((dto) => inboxItemDtoToCareersNotification(dto, candidateId));
}

export function formatCareersNotificationTime(iso: string): string {
  return relativeTime(iso);
}
