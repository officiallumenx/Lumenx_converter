import { classLabelForSection } from "@/lib/classes/map";
import type { ClassDto, SectionDto } from "@/lib/classes/types";
import type { SubjectDto } from "@/lib/subjects/types";
import type { TeacherListItem } from "@/lib/teachers/types";
import type {
  TeacherAssignmentDto,
  TeacherAssignmentListItem,
  TimetableReadBundle,
  TimetableSectionSummary,
  TimetableSlotDto,
  TimetableSlotListItem,
} from "./types";

const DAY_LABELS = ["", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"] as const;

function dayLabel(dayOfWeek: number): string {
  if (dayOfWeek >= 1 && dayOfWeek <= 7) return DAY_LABELS[dayOfWeek]!;
  return `Day ${dayOfWeek}`;
}

function formatTime(value: string): string {
  return value.length >= 5 ? value.slice(0, 5) : value;
}

function sectionLabel(section: SectionDto | undefined): string {
  if (!section) return "—";
  return section.code?.trim() || section.name?.trim() || "—";
}

export function timetableSlotDtoToListItem(
  dto: TimetableSlotDto,
  sectionsById: Map<string, SectionDto>,
  classesById: Map<string, ClassDto>,
): TimetableSlotListItem {
  const section = sectionsById.get(dto.sectionId);
  const classLabel = section
    ? classLabelForSection(section, classesById)
    : shortRef(dto.classId, "Class");
  return {
    id: dto.id,
    sectionId: dto.sectionId,
    classId: dto.classId,
    classLabel,
    sectionLabel: sectionLabel(section),
    dayOfWeek: dto.dayOfWeek,
    dayLabel: dayLabel(dto.dayOfWeek),
    periodIndex: dto.periodIndex,
    startsAt: formatTime(dto.startsAt),
    endsAt: formatTime(dto.endsAt),
    room: dto.room,
    status: dto.status,
    teacherAssignmentId: dto.teacherAssignmentId,
    academicYearId: dto.academicYearId,
  };
}

function shortRef(id: string, prefix: string): string {
  const token = id?.trim().slice(0, 8) || "—";
  return `${prefix} · ${token}`;
}

export function timetableSlotDtosToListItems(
  rows: TimetableSlotDto[],
  sections: SectionDto[],
  classes: ClassDto[],
): TimetableSlotListItem[] {
  if (!Array.isArray(rows)) {
    throw new TypeError("Timetable API response must be an array");
  }
  const sectionsById = new Map(sections.map((section) => [section.id, section]));
  const classesById = new Map(classes.map((cls) => [cls.id, cls]));
  return rows.map((dto) => timetableSlotDtoToListItem(dto, sectionsById, classesById));
}

export function teacherAssignmentDtoToListItem(
  dto: TeacherAssignmentDto,
  teachersById?: Map<string, TeacherListItem>,
  subjectsById?: Map<string, SubjectDto>,
): TeacherAssignmentListItem {
  const teacherName =
    teachersById?.get(dto.teacherId)?.name ??
    shortRef(dto.teacherId, "Teacher");
  const subject = subjectsById?.get(dto.subjectId);
  const subjectName =
    subject?.name?.trim() ||
    subject?.code?.trim() ||
    shortRef(dto.subjectId, "Subject");
  return {
    id: dto.id,
    instituteId: dto.instituteId,
    academicYearId: dto.academicYearId,
    classId: dto.classId,
    sectionId: dto.sectionId,
    subjectId: dto.subjectId,
    teacherId: dto.teacherId,
    status: dto.status,
    label: `${subjectName} · ${teacherName}`,
  };
}

export function teacherAssignmentDtosToListItems(
  rows: TeacherAssignmentDto[],
  teachersById?: Map<string, TeacherListItem>,
  subjectsById?: Map<string, SubjectDto>,
): TeacherAssignmentListItem[] {
  if (!Array.isArray(rows)) {
    throw new TypeError("Teacher assignment API response must be an array");
  }
  return rows.map((dto) =>
    teacherAssignmentDtoToListItem(dto, teachersById, subjectsById),
  );
}

export function buildTimetableSectionSummaries(
  slots: TimetableSlotListItem[],
): TimetableSectionSummary[] {
  const bySection = new Map<string, TimetableSectionSummary>();
  for (const slot of slots) {
    const existing = bySection.get(slot.sectionId);
    if (!existing) {
      bySection.set(slot.sectionId, {
        sectionId: slot.sectionId,
        classLabel: slot.classLabel,
        sectionLabel: slot.sectionLabel,
        slotCount: 1,
        activeCount: slot.status === "active" ? 1 : 0,
      });
      continue;
    }
    existing.slotCount += 1;
    if (slot.status === "active") existing.activeCount += 1;
  }
  return [...bySection.values()].sort((a, b) =>
    `${a.classLabel}-${a.sectionLabel}`.localeCompare(`${b.classLabel}-${b.sectionLabel}`),
  );
}

export function buildTimetableReadBundle(
  rows: TimetableSlotDto[],
  sections: SectionDto[],
  classes: ClassDto[],
): TimetableReadBundle {
  const slots = timetableSlotDtosToListItems(rows, sections, classes);
  return {
    slots,
    sections: buildTimetableSectionSummaries(slots),
  };
}
