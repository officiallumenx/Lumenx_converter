import type { AppNotification } from "@lumenx/types";
import { relativeInboxTimeLabel } from "@/lib/notification-inbox/map";
import type { AnnouncementDto } from "./types";

export function announcementDtoToAppNotification(dto: AnnouncementDto): AppNotification {
  const body = (dto.body ?? dto.title).trim();
  const createdAt = dto.publishedAt ?? dto.createdAt;

  return {
    id: `ann-row-${dto.id}`,
    title: dto.title.trim(),
    desc: body,
    detail: body,
    time: relativeInboxTimeLabel(createdAt),
    type: dto.pinned ? "warning" : "info",
    category: "circulars",
    unread: true,
    priority: dto.pinned ? "high" : "normal",
    createdAt,
    href: `/announcements/${dto.id}`,
  };
}

export function announcementDtosToAppNotifications(dtos: AnnouncementDto[]): AppNotification[] {
  return dtos
    .filter((dto) => dto.status === "published")
    .map(announcementDtoToAppNotification);
}
