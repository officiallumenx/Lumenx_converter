import type { ComplaintDto, ComplaintListItem } from "./types";

function formatRelativeWhen(iso: string): string {
  const then = Date.parse(iso);
  if (Number.isNaN(then)) return "—";
  const diffMs = Date.now() - then;
  if (diffMs < 0) return "Just now";
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

function mapPriority(priority: ComplaintDto["priority"]): ComplaintListItem["priority"] {
  if (priority === "high") return "High";
  if (priority === "medium") return "Medium";
  return "Low";
}

/**
 * Map backend status → kanban status used by the Admin complaints board.
 * Returns null for statuses not shown on the board (draft/archived).
 */
function mapBoardStatus(
  status: ComplaintDto["status"],
): ComplaintListItem["status"] | null {
  switch (status) {
    case "pending":
      return "pending";
    case "review":
    case "forwarded":
      return "review";
    case "resolved":
    case "closed":
      return "resolved";
    case "rejected":
      return "rejected";
    case "draft":
    case "archived":
      return null;
    default:
      return null;
  }
}

/**
 * Map backend DTO → existing Complaints UI item.
 * Presentation-only: never used as tenant/auth authority.
 */
export function complaintDtoToListItem(
  dto: ComplaintDto,
): ComplaintListItem | null {
  const status = mapBoardStatus(dto.status);
  if (!status) return null;

  const role = dto.category?.trim() || "Requester";
  const from =
    dto.studentId
      ? `Student ${dto.studentId.slice(0, 8)}`
      : dto.teacherId
        ? `Teacher ${dto.teacherId.slice(0, 8)}`
        : dto.requestedByUserId
          ? `User ${dto.requestedByUserId.slice(0, 8)}`
          : "Requester";

  return {
    id: dto.id,
    title: dto.title,
    from,
    role,
    destination: dto.destination ?? "principal_admin",
    priority: mapPriority(dto.priority),
    status,
    time: formatRelativeWhen(dto.createdAt),
    body: dto.body,
  };
}

export function complaintDtosToListItems(
  dtos: ComplaintDto[],
): ComplaintListItem[] {
  const items: ComplaintListItem[] = [];
  for (const dto of dtos) {
    const item = complaintDtoToListItem(dto);
    if (item) items.push(item);
  }
  return items;
}
