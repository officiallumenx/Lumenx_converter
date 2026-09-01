import type { ParentDto } from "@/lib/parents/types";
import type { StudentDto } from "@/lib/students/types";
import type { TeacherDto } from "@/lib/teachers/types";
import type { MessageThreadDto, MessageThreadListItem } from "./types";

export type UserNameLookup = Map<string, string>;

export function buildUserNameLookup(
  teachers: TeacherDto[],
  parents: ParentDto[],
  students: StudentDto[],
): UserNameLookup {
  const map = new Map<string, string>();
  for (const t of teachers) {
    if (t.userProfileId) map.set(t.userProfileId, t.displayName);
  }
  for (const p of parents) {
    if (p.userProfileId) map.set(p.userProfileId, p.name);
  }
  for (const s of students) {
    if (s.userProfileId) map.set(s.userProfileId, s.displayName);
  }
  return map;
}

export function resolveThreadCounterpartLabel(
  thread: MessageThreadDto,
  lookup: UserNameLookup,
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

  if (otherUserId && lookup.has(otherUserId)) {
    return lookup.get(otherUserId)!;
  }
  if (otherUserId) {
    return `User ${otherUserId.slice(0, 8)}`;
  }
  return "Direct message";
}

export function enrichThreadListItems(
  dtos: MessageThreadDto[],
  lookup: UserNameLookup,
  currentUserId: string,
): MessageThreadListItem[] {
  return dtos.map((dto) => {
    const counterpartLabel = resolveThreadCounterpartLabel(dto, lookup, currentUserId);
    const preview = dto.subject?.trim() || counterpartLabel;
    return { ...dto, counterpartLabel, preview };
  });
}
