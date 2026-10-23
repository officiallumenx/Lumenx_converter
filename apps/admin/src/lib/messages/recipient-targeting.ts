/**
 * Pure helpers for Messages compose — multi-select, class/section filters, dedupe.
 */

import type { MessageRecipientDto } from "./types";

export type RecipientAudienceType = "teacher" | "parent" | "student" | "all";

export function dedupeRecipientsByUserId(
  recipients: MessageRecipientDto[],
): MessageRecipientDto[] {
  const seen = new Set<string>();
  const out: MessageRecipientDto[] = [];
  for (const row of recipients) {
    const id = row.userId.trim();
    if (!id || seen.has(id)) continue;
    seen.add(id);
    out.push(row);
  }
  return out;
}

export function mergeRecipientSelections(
  ...lists: MessageRecipientDto[][]
): MessageRecipientDto[] {
  return dedupeRecipientsByUserId(lists.flat());
}

/** Parents linked to students that match class/section (API parents lack class labels). */
export function parentsLinkedToFilteredStudents(
  allRecipients: MessageRecipientDto[],
  students: MessageRecipientDto[],
): MessageRecipientDto[] {
  const parentIds = new Set<string>();
  for (const s of students) {
    for (const id of s.linkedParentUserIds ?? []) {
      if (id.trim()) parentIds.add(id.trim());
    }
  }
  return allRecipients.filter(
    (r) => r.role === "parent" && parentIds.has(r.userId.trim()),
  );
}

function matchesClassSection(
  row: MessageRecipientDto,
  classNeedle: string,
  sectionNeedle: string,
): boolean {
  if (classNeedle) {
    const cls = (row.classLabel ?? "").trim().toLowerCase();
    if (cls !== classNeedle) return false;
  }
  if (sectionNeedle) {
    const sec = (row.sectionLabel ?? "").trim().toLowerCase();
    if (sec !== sectionNeedle) return false;
  }
  return true;
}

/**
 * Filter recipients. For parents with class/section filters, resolve via linked students
 * (server recipient list only attaches class/section on student rows).
 */
export function filterRecipients(opts: {
  recipients: MessageRecipientDto[];
  query: string;
  audience: RecipientAudienceType;
  classLabel?: string | null;
  sectionLabel?: string | null;
  /** When filtering parents by class, also match via student links. Default true. */
  resolveParentsViaStudents?: boolean;
}): MessageRecipientDto[] {
  const q = opts.query.trim().toLowerCase();
  const classNeedle = opts.classLabel?.trim().toLowerCase() || "";
  const sectionNeedle = opts.sectionLabel?.trim().toLowerCase() || "";
  const resolveParents = opts.resolveParentsViaStudents !== false;
  const hasClassFilter = Boolean(classNeedle || sectionNeedle);

  const studentsMatchingClass = opts.recipients.filter(
    (r) =>
      r.role === "student" && matchesClassSection(r, classNeedle, sectionNeedle),
  );
  const linkedParentIds = new Set(
    studentsMatchingClass.flatMap((s) =>
      (s.linkedParentUserIds ?? []).map((id) => id.trim()).filter(Boolean),
    ),
  );

  return opts.recipients.filter((row) => {
    if (opts.audience !== "all" && row.role !== opts.audience) return false;

    if (hasClassFilter) {
      if (row.role === "student") {
        if (!matchesClassSection(row, classNeedle, sectionNeedle)) return false;
      } else if (row.role === "parent" && resolveParents) {
        if (!linkedParentIds.has(row.userId.trim())) return false;
      } else if (row.role === "teacher" || row.role === "staff") {
        // Teachers are not class-scoped in the recipients API — exclude when class filter set
        // unless audience is explicitly all without class (handled above).
        return false;
      } else if (!matchesClassSection(row, classNeedle, sectionNeedle)) {
        return false;
      }
    }

    if (!q) return true;
    const hay =
      `${row.displayName} ${row.role} ${row.classLabel ?? ""} ${row.sectionLabel ?? ""}`.toLowerCase();
    return hay.includes(q);
  });
}

/**
 * Resolve a multi-class/section selection into recipients of an explicit audience type.
 * Does not mix students and parents unless audience is "all".
 */
export function resolveClassSectionAudience(opts: {
  recipients: MessageRecipientDto[];
  /** Pairs of class + optional section (empty section = whole class). */
  selections: Array<{ classLabel: string; sectionLabel?: string | null }>;
  audience: "student" | "parent" | "all";
}): MessageRecipientDto[] {
  const buckets: MessageRecipientDto[][] = [];
  for (const sel of opts.selections) {
    const classLabel = sel.classLabel.trim();
    if (!classLabel) continue;
    const sectionLabel = sel.sectionLabel?.trim() || null;
    if (opts.audience === "student" || opts.audience === "all") {
      buckets.push(
        filterRecipients({
          recipients: opts.recipients,
          query: "",
          audience: "student",
          classLabel,
          sectionLabel,
        }),
      );
    }
    if (opts.audience === "parent" || opts.audience === "all") {
      buckets.push(
        filterRecipients({
          recipients: opts.recipients,
          query: "",
          audience: "parent",
          classLabel,
          sectionLabel,
        }),
      );
    }
  }
  return mergeRecipientSelections(...buckets);
}

export function uniqueClassLabels(recipients: MessageRecipientDto[]): string[] {
  return [
    ...new Set(
      recipients
        .map((r) => r.classLabel?.trim())
        .filter((v): v is string => Boolean(v)),
    ),
  ].sort((a, b) => a.localeCompare(b));
}

export function uniqueSectionLabels(
  recipients: MessageRecipientDto[],
  classLabel?: string | null,
): string[] {
  const needle = classLabel?.trim().toLowerCase() || "";
  return [
    ...new Set(
      recipients
        .filter((r) => {
          if (!needle) return true;
          return (r.classLabel ?? "").trim().toLowerCase() === needle;
        })
        .map((r) => r.sectionLabel?.trim())
        .filter((v): v is string => Boolean(v)),
    ),
  ].sort((a, b) => a.localeCompare(b));
}

export function toggleRecipientSelection(
  selected: MessageRecipientDto[],
  candidate: MessageRecipientDto,
): MessageRecipientDto[] {
  const id = candidate.userId.trim();
  if (selected.some((r) => r.userId === id)) {
    return selected.filter((r) => r.userId !== id);
  }
  return dedupeRecipientsByUserId([...selected, candidate]);
}

export function selectAllFiltered(
  selected: MessageRecipientDto[],
  filtered: MessageRecipientDto[],
): MessageRecipientDto[] {
  return mergeRecipientSelections(selected, filtered);
}

export function removeRecipient(
  selected: MessageRecipientDto[],
  userId: string,
): MessageRecipientDto[] {
  const id = userId.trim();
  return selected.filter((r) => r.userId !== id);
}

export function resolvedRecipientCount(selected: MessageRecipientDto[]): number {
  return dedupeRecipientsByUserId(selected).length;
}
