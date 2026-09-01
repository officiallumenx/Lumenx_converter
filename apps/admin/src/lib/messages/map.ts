import type { MessageThreadDto, MessageThreadListItem } from "./types";

function shortUserId(userId: string): string {
  return userId.slice(0, 8);
}

/** Fallback mapping when roster names are unavailable. */
export function threadDtoToListItem(dto: MessageThreadDto): MessageThreadListItem {
  const counterpartLabel =
    dto.threadKind === "group"
      ? `${dto.groupClassLabel ?? "Class"} ${dto.groupSectionLabel ?? ""}`.trim()
      : dto.counterpartUserId
        ? `User ${shortUserId(dto.counterpartUserId)}`
        : "Direct message";
  const preview = dto.subject?.trim() || counterpartLabel;
  return {
    ...dto,
    counterpartLabel,
    preview,
  };
}

export function threadDtosToListItems(dtos: MessageThreadDto[]): MessageThreadListItem[] {
  return dtos.map(threadDtoToListItem);
}
