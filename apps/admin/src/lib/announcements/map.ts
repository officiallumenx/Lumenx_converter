import type { AnnouncementDto, AnnouncementListItem } from "./types";

const SCOPE_LABEL: Record<AnnouncementDto["audienceScope"], string> = {
  all: "All",
  students: "Students",
  parents: "Parents",
  teachers: "Teachers",
  classes: "Classes",
};

function formatRelativeWhen(iso: string | null | undefined): string {
  if (!iso) return "—";
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "—";
  const diffMs = Date.now() - then;
  if (diffMs < 0) {
    // Future (scheduled)
    try {
      return `Scheduled · ${new Date(iso).toLocaleString()}`;
    } catch {
      return "Scheduled";
    }
  }
  const mins = Math.floor(diffMs / 60_000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "yesterday";
  if (days < 7) return `${days}d ago`;
  try {
    return new Date(iso).toLocaleDateString();
  } catch {
    return "—";
  }
}

/**
 * Map backend DTO → existing Announcements UI item.
 * Returns null for archived (not shown in current UI status union).
 */
export function announcementDtoToListItem(
  dto: AnnouncementDto,
): AnnouncementListItem | null {
  if (dto.status === "archived") return null;

  const audience =
    dto.audienceLabel?.trim() ||
    SCOPE_LABEL[dto.audienceScope] ||
    "All";

  const whenSource =
    dto.status === "scheduled"
      ? dto.scheduledAt
      : dto.status === "published"
        ? dto.publishedAt ?? dto.createdAt
        : null;

  return {
    id: dto.id,
    title: dto.title,
    body: dto.body ?? undefined,
    audience,
    author: "Admin",
    views: dto.views,
    when: formatRelativeWhen(whenSource),
    pinned: dto.pinned,
    status: dto.status,
  };
}

export function announcementDtosToListItems(
  dtos: AnnouncementDto[],
): AnnouncementListItem[] {
  const items: AnnouncementListItem[] = [];
  for (const dto of dtos) {
    const item = announcementDtoToListItem(dto);
    if (item) items.push(item);
  }
  return items;
}
