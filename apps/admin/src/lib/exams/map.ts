import type {
  ExamDto,
  ExamListItem,
  ExamListStatus,
  ExamTimetableListItem,
  ExamTimetableSlotItem,
  ExamsCatalog,
} from "./types";

function normalizeTime(value: string | null | undefined): string {
  const trimmed = value?.trim() ?? "";
  if (!trimmed) return "";
  return trimmed.length >= 5 ? trimmed.slice(0, 5) : trimmed;
}

function audienceGradeLabel(dto: ExamDto): string {
  if (dto.audienceScope === "year") {
    return "All classes";
  }
  const count = dto.targetSections.length;
  if (count === 0) return "Selected sections";
  if (count === 1) return "1 section";
  return `${count} sections`;
}

function mapExamStatus(dto: ExamDto, today: string): ExamListStatus {
  if (dto.scheduleStatus === "draft") return "scheduled";
  if (dto.lifecycleStatus === "closed") return "published";
  if (dto.startDate <= today && dto.endDate >= today) return "in-progress";
  if (dto.endDate < today) return "grading";
  return "scheduled";
}

function progressForStatus(status: ExamListStatus): number {
  switch (status) {
    case "scheduled":
      return 10;
    case "in-progress":
      return 50;
    case "grading":
      return 75;
    case "published":
      return 100;
  }
}

function scheduleToSlot(
  schedule: ExamDto["subjectSchedules"][number],
  index: number,
  subjectLabels?: Map<string, string>,
): ExamTimetableSlotItem {
  return {
    id: schedule.id,
    date: schedule.paperDate,
    dayNumber: index + 1,
    subject:
      subjectLabels?.get(schedule.subjectId)?.trim() ||
      schedule.subjectId.slice(0, 8),
    subjectId: schedule.subjectId,
    grade: "—",
    section: "All",
    startTime: normalizeTime(schedule.startsAt),
    endTime: normalizeTime(schedule.endsAt),
    room: schedule.room?.trim() || "",
    invigilator: "",
  };
}

export function examDtoToListItem(
  dto: ExamDto,
  today = new Date().toISOString().slice(0, 10),
): ExamListItem {
  const status = mapExamStatus(dto, today);
  const subjects = [
    ...new Set(dto.subjectSchedules.map((schedule) => schedule.subjectId)),
  ];
  return {
    id: dto.id,
    name: dto.name?.trim() || "Exam",
    header: dto.header?.trim() || dto.name?.trim() || "Exam",
    grade: audienceGradeLabel(dto),
    classScope: dto.audienceScope === "year" ? "all" : "selected",
    grades: [],
    section: "All",
    term: "—",
    startDate: dto.startDate,
    endDate: dto.endDate,
    startTime: normalizeTime(dto.defaultStartsAt),
    endTime: normalizeTime(dto.defaultEndsAt),
    status,
    progress: progressForStatus(status),
    subjects,
    totalMarks: dto.totalMarks,
    internalMarks: dto.internalMarks,
    externalMarks: dto.externalMarks,
  };
}

export function examDtoToTimetableListItem(
  dto: ExamDto,
  subjectLabels?: Map<string, string>,
): ExamTimetableListItem {
  const slots = dto.subjectSchedules.map((schedule, index) =>
    scheduleToSlot(schedule, index, subjectLabels),
  );
  return {
    id: `tt-${dto.id}`,
    examId: dto.id,
    examName: dto.name?.trim() || "Exam",
    header: dto.header?.trim() || dto.name?.trim() || "Exam",
    term: "—",
    grade: audienceGradeLabel(dto),
    section: "All",
    startTime: normalizeTime(dto.defaultStartsAt),
    endTime: normalizeTime(dto.defaultEndsAt),
    status: dto.scheduleStatus,
    slots,
    updatedAt: dto.updatedAt,
  };
}

export function examDtosToCatalog(
  rows: ExamDto[],
  today = new Date().toISOString().slice(0, 10),
  subjectLabels?: Map<string, string>,
): ExamsCatalog {
  if (!Array.isArray(rows)) {
    throw new TypeError("Exams API response must be an array");
  }
  const items = rows.map((dto) => examDtoToListItem(dto, today));
  const timetables = rows
    .filter((dto) => dto.subjectSchedules.length > 0)
    .map((dto) => examDtoToTimetableListItem(dto, subjectLabels));
  return { items, timetables };
}
