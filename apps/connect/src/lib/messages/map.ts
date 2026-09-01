import type { MessageRecipientDto, MessageThreadDto, MessageThreadListItem } from "./types";

function shortUserId(userId: string): string {
  return userId.slice(0, 8);
}

export function resolveThreadCounterpartLabel(
  thread: MessageThreadDto,
  recipientByUserId: Map<string, MessageRecipientDto>,
  currentUserId: string,
): string {
  if (thread.threadKind === "group") {
    const cls = thread.groupClassLabel?.trim() || "Class";
    const sec = thread.groupSectionLabel?.trim() || "";
    return sec ? `${cls} ${sec}` : cls;
  }

  const otherUserId =
    thread.createdByUserId === currentUserId
      ? thread.counterpartUserId
      : thread.createdByUserId;

  if (otherUserId && recipientByUserId.has(otherUserId)) {
    return recipientByUserId.get(otherUserId)!.displayName;
  }
  if (otherUserId) return `User ${shortUserId(otherUserId)}`;
  return "Direct message";
}

export function threadDtosToListItems(
  dtos: MessageThreadDto[],
  recipientByUserId: Map<string, MessageRecipientDto>,
  currentUserId: string,
): MessageThreadListItem[] {
  return dtos.map((dto) => {
    const counterpartLabel = resolveThreadCounterpartLabel(
      dto,
      recipientByUserId,
      currentUserId,
    );
    const preview = dto.subject?.trim() || counterpartLabel;
    return { ...dto, counterpartLabel, preview };
  });
}
