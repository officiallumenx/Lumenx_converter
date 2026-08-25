/** Per-student academic timeline — assembled from real local records at read time. */

import {
  classLabelForGrade,
  parseClassSection,
} from "@/lib/class-section-filter";
import {
  GRADUATION_YEAR_OPTIONS,
  PROMOTION_YEAR_OPTIONS,
  graduationResultLabel,
  loadAcademicYears,
  type GraduationResult,
} from "@/lib/academic-management-data";
import {
  loadGraduationSnapshotsForStudent,
  loadPromotionHistoryForStudent,
} from "@/lib/academic-progression";
import {
  loadStudentDirectory,
  type StudentDirectoryRecord,
} from "@/lib/student-directory-store";
import { formatTimelineDate } from "@/lib/student-academic-timeline-dates";
import {
  loadTimelineMeta,
  subscribeTimelineMeta,
  type StudentTimelineMeta,
} from "@/lib/student-timeline-meta";

export type AcademicYearTimelineStatus = "Completed" | "Active" | "Upcoming";

export type AcademicTimelineEventKind =
  | "admission"
  | "promotion"
  | "graduation"
  | "transfer"
  | "dropout";

export type AcademicTimelineEntry = {
  id: string;
  eventDate?: string;
  eventAt?: string;
  academicYear: string;
  classLabel: string;
  section?: string;
  status: AcademicYearTimelineStatus;
  eventKind: AcademicTimelineEventKind;
  graduationResult?: GraduationResult;
};

export type StudentAcademicTimeline = {
  studentId: string;
  admissionDate: string;
  promotionDate?: string;
  graduationDate?: string;
  transferDate?: string;
  dropoutDate?: string;
  /** Chronological order — oldest first. */
  entries: AcademicTimelineEntry[];
};

export type TimelineYearGroup = {
  yearKey: string;
  yearLabel: string;
  entries: AcademicTimelineEntry[];
};

export const TIMELINE_EMPTY_MESSAGE = "No academic history available yet.";

export {
  formatTimelineDate,
  activeAcademicYearLabel,
} from "@/lib/student-academic-timeline-dates";
export {
  recordAdmissionOnTimeline,
  recordDropoutOnTimeline,
  recordTransferOnTimeline,
  TIMELINE_META_CHANGED_EVENT,
} from "@/lib/student-timeline-meta";
export { classLabelForGrade };

function yearLabelFromAcademicYearId(yearId: string): string {
  const fromGraduation = GRADUATION_YEAR_OPTIONS.find((year) => year.id === yearId);
  if (fromGraduation) return fromGraduation.label;
  const fromPromotion = PROMOTION_YEAR_OPTIONS.find((year) => year.id === yearId);
  if (fromPromotion) return fromPromotion.label;
  const fromAcademicYears = loadAcademicYears().find((year) => year.id === yearId);
  return fromAcademicYears?.label ?? yearId;
}

function ordinalClassLabel(label: string): string {
  const num = label.replace(/(st|nd|rd|th)$/i, "").trim();
  if (!num) return label;
  const parsed = Number.parseInt(num, 10);
  if (Number.isFinite(parsed)) return `Class ${parsed}`;
  return label.startsWith("Class") ? label : `Class ${label}`;
}

export function timelineEntrySortValue(entry: AcademicTimelineEntry): number {
  if (entry.eventAt) {
    const iso = Date.parse(entry.eventAt);
    if (Number.isFinite(iso)) return iso;
  }
  if (entry.eventDate) {
    const parsed = Date.parse(entry.eventDate);
    if (Number.isFinite(parsed)) return parsed;
  }
  return 0;
}

export function compareTimelineEntriesOldestFirst(
  left: AcademicTimelineEntry,
  right: AcademicTimelineEntry,
): number {
  const byTime = timelineEntrySortValue(left) - timelineEntrySortValue(right);
  if (byTime !== 0) return byTime;
  return left.id.localeCompare(right.id);
}

export function compareTimelineEntriesNewestFirst(
  left: AcademicTimelineEntry,
  right: AcademicTimelineEntry,
): number {
  return compareTimelineEntriesOldestFirst(right, left);
}

function timelineEntryDedupeKey(entry: AcademicTimelineEntry): string {
  return [
    entry.eventKind,
    entry.academicYear.trim(),
    entry.classLabel.trim(),
    entry.section?.trim() ?? "",
    entry.eventAt ?? entry.eventDate ?? "",
    entry.graduationResult ?? "",
  ].join("|");
}

function pushUniqueEntry(
  entries: AcademicTimelineEntry[],
  seen: Set<string>,
  entry: AcademicTimelineEntry,
  dedupeKey: string,
): void {
  const semanticKey = timelineEntryDedupeKey(entry);
  if (seen.has(dedupeKey) || seen.has(semanticKey)) return;
  seen.add(dedupeKey);
  seen.add(semanticKey);
  entries.push(entry);
}

function buildTimelineEntries(
  studentId: string,
  meta: StudentTimelineMeta,
  student: StudentDirectoryRecord | undefined,
): AcademicTimelineEntry[] {
  const entries: AcademicTimelineEntry[] = [];
  const seen = new Set<string>();

  if (meta.admission) {
    const parsed = parseClassSection(meta.admission.grade);
    pushUniqueEntry(
      entries,
      seen,
      {
        id: `admission:${studentId}`,
        eventDate: meta.admission.displayDate,
        eventAt: meta.admission.recordedAt,
        academicYear: meta.admission.academicYear,
        classLabel: classLabelForGrade(meta.admission.grade),
        section: parsed?.section,
        status: "Completed",
        eventKind: "admission",
      },
      `admission:${studentId}`,
    );
  }

  for (const record of loadPromotionHistoryForStudent(studentId)) {
    const parsed = parseClassSection(record.toGrade);
    pushUniqueEntry(
      entries,
      seen,
      {
        id: `promotion:${record.targetYearId}:${record.toGrade}:${record.promotedAt}`,
        eventDate: formatTimelineDate(new Date(record.promotedAt)),
        eventAt: record.promotedAt,
        academicYear: record.targetYearLabel,
        classLabel: classLabelForGrade(record.toGrade),
        section: parsed?.section,
        status: "Completed",
        eventKind: "promotion",
      },
      `promotion:${record.targetYearId}:${record.toGrade}:${record.promotedAt}`,
    );
  }

  for (const snapshot of loadGraduationSnapshotsForStudent(studentId)) {
    pushUniqueEntry(
      entries,
      seen,
      {
        id: `graduation:${snapshot.academicYearId}:${snapshot.id}`,
        eventDate: snapshot.graduatedAt
          ? formatTimelineDate(new Date(snapshot.graduatedAt))
          : undefined,
        eventAt: snapshot.graduatedAt,
        academicYear: yearLabelFromAcademicYearId(snapshot.academicYearId),
        classLabel: ordinalClassLabel(snapshot.class),
        section: snapshot.section,
        status: "Completed",
        eventKind: "graduation",
        graduationResult: snapshot.result,
      },
      `graduation:${snapshot.academicYearId}:${snapshot.id}`,
    );
  }

  if (meta.transfer) {
    pushUniqueEntry(
      entries,
      seen,
      {
        id: `transfer:${studentId}`,
        eventDate: meta.transfer.displayDate,
        eventAt: meta.transfer.recordedAt,
        academicYear: "",
        classLabel: "",
        status: "Completed",
        eventKind: "transfer",
      },
      `transfer:${studentId}`,
    );
  }

  if (meta.dropout) {
    pushUniqueEntry(
      entries,
      seen,
      {
        id: `dropout:${studentId}`,
        eventDate: meta.dropout.displayDate,
        eventAt: meta.dropout.recordedAt,
        academicYear: "",
        classLabel: "",
        status: "Completed",
        eventKind: "dropout",
      },
      `dropout:${studentId}`,
    );
  }

  entries.sort(compareTimelineEntriesOldestFirst);

  if (
    student &&
    student.status !== "graduated" &&
    student.status !== "inactive" &&
    entries.length > 0
  ) {
    const latest = [...entries]
      .reverse()
      .find((entry) => entry.eventKind === "admission" || entry.eventKind === "promotion");
    if (latest) {
      latest.status = "Active";
      const parsed = parseClassSection(student.grade);
      if (parsed) {
        latest.classLabel = classLabelForGrade(student.grade);
        latest.section = parsed.section;
      }
    }
  }

  return entries;
}

/** Read-only: assembles timeline from admission meta, promotion history, and graduation history. */
export function getStudentAcademicTimeline(studentId: string): StudentAcademicTimeline {
  const student = loadStudentDirectory().find((row) => row.id === studentId);
  const meta = loadTimelineMeta(studentId);
  const entries = buildTimelineEntries(studentId, meta, student);

  const promotions = [...loadPromotionHistoryForStudent(studentId)].sort((left, right) =>
    left.promotedAt.localeCompare(right.promotedAt),
  );
  const graduations = [...loadGraduationSnapshotsForStudent(studentId)].sort((left, right) =>
    (left.graduatedAt ?? "").localeCompare(right.graduatedAt ?? ""),
  );
  const latestPromotion = promotions.at(-1);
  const latestGraduation = graduations.at(-1);

  return {
    studentId,
    admissionDate: meta.admission?.displayDate ?? "",
    promotionDate: latestPromotion
      ? formatTimelineDate(new Date(latestPromotion.promotedAt))
      : undefined,
    graduationDate: latestGraduation?.graduatedAt
      ? formatTimelineDate(new Date(latestGraduation.graduatedAt))
      : undefined,
    transferDate: meta.transfer?.displayDate,
    dropoutDate: meta.dropout?.displayDate,
    entries,
  };
}

/** Newest events first — matches the profile timeline convention. */
export function getTimelineEntriesNewestFirst(
  timeline: StudentAcademicTimeline,
): AcademicTimelineEntry[] {
  return [...timeline.entries].sort(compareTimelineEntriesNewestFirst);
}

/** Groups timeline entries by academic year for display (newest year first). */
export function groupTimelineEntriesByAcademicYear(
  timeline: StudentAcademicTimeline,
): TimelineYearGroup[] {
  const newestFirst = getTimelineEntriesNewestFirst(timeline);
  const groups: TimelineYearGroup[] = [];
  const groupIndex = new Map<string, number>();

  for (const entry of newestFirst) {
    const yearLabel = formatTimelineYearDisplay(entry, timeline.admissionDate);
    const yearKey = yearLabel === "—" ? `event:${entry.eventKind}:${entry.id}` : yearLabel;
    const existingIndex = groupIndex.get(yearKey);
    if (existingIndex === undefined) {
      groupIndex.set(yearKey, groups.length);
      groups.push({ yearKey, yearLabel, entries: [entry] });
      continue;
    }
    groups[existingIndex]!.entries.push(entry);
  }

  for (const group of groups) {
    group.entries.sort(compareTimelineEntriesNewestFirst);
  }

  return groups;
}

export function subscribeStudentAcademicTimelines(listener: () => void): () => void {
  return subscribeTimelineMeta(listener);
}

export function formatTimelineYearDisplay(
  entry: AcademicTimelineEntry,
  admissionDate?: string,
): string {
  if (entry.eventKind === "admission") {
    const normalizedYear = entry.academicYear.replace(/\u2013/g, "-").trim();
    const yearMatch = normalizedYear.match(/^(\d{4})-(\d{2,4})$/);
    if (yearMatch) return yearMatch[1]!;
    const fromDate = (entry.eventDate ?? admissionDate)?.match(/\b(19|20)\d{2}\b/)?.[0];
    if (fromDate) return fromDate;
  }
  if (!entry.academicYear.trim()) return "—";
  const normalized = entry.academicYear.replace(/\u2013/g, "-").trim();
  const match = normalized.match(/^(\d{4})-(\d{2,4})$/);
  if (!match) return entry.academicYear;
  const end = match[2]!.length === 4 ? match[2]!.slice(-2) : match[2];
  return `${match[1]}\u2013${end}`;
}

export function timelineEntryEventLabel(entry: AcademicTimelineEntry): string {
  switch (entry.eventKind) {
    case "admission":
      return "Joined Institute";
    case "promotion":
      return entry.classLabel ? `Promoted to ${entry.classLabel}` : "Promoted";
    case "graduation":
      return entry.graduationResult
        ? `Graduated · ${entry.classLabel} (${graduationResultLabel(entry.graduationResult)})`
        : `Graduated · ${entry.classLabel}`;
    case "transfer":
      return "Transferred out";
    case "dropout":
      return "Dropped out";
    default:
      return entry.classLabel;
  }
}

export function timelineEntryDetailLine(entry: AcademicTimelineEntry): string {
  const parts = [
    entry.classLabel || null,
    entry.section ? `Section ${entry.section}` : null,
  ].filter(Boolean);
  return parts.join(" · ");
}

export function academicTimelineStatusTone(
  status: AcademicYearTimelineStatus,
): "success" | "info" | "neutral" {
  if (status === "Active") return "success";
  if (status === "Upcoming") return "info";
  return "neutral";
}
