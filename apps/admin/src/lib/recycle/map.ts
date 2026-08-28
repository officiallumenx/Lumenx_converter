import type { RecycleItemDto, RecycleListItem } from "./types";

function shortId(id: string | null | undefined): string {
  if (!id) return "";
  return id.slice(0, 8);
}

function deletedByDisplay(userId: string | null | undefined): string {
  const prefix = shortId(userId);
  return prefix ? `User ${prefix}` : "User";
}

/**
 * Presentation-only mapping. DTO identity fields are never used as authority.
 */
export function recycleDtoToListItem(dto: RecycleItemDto): RecycleListItem {
  const subtitle = dto.subtitle?.trim();
  return {
    id: dto.id,
    module: dto.module,
    title: dto.title?.trim() || "Untitled item",
    subtitle: subtitle || undefined,
    deletedAt: dto.deletedAt || "",
    deletedBy: deletedByDisplay(dto.deletedByUserId),
  };
}

export function recycleDtosToListItems(dtos: RecycleItemDto[]): RecycleListItem[] {
  if (!Array.isArray(dtos)) {
    throw new TypeError("Recycle API response must be an array");
  }
  return dtos.map(recycleDtoToListItem);
}
