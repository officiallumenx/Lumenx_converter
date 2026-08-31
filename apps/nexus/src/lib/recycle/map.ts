import type { RecycleItemDto, RecycleListItem } from "./types";

export function recycleDtoToListItem(dto: RecycleItemDto): RecycleListItem {
  return {
    id: dto.id,
    instituteId: dto.instituteId,
    module: dto.module,
    title: dto.title,
    subtitle: dto.subtitle ?? undefined,
    deletedAt: dto.deletedAt,
  };
}

export function recycleDtosToListItems(dtos: RecycleItemDto[]): RecycleListItem[] {
  return dtos.map(recycleDtoToListItem);
}
