import type { TeacherExam } from "@/lib/teacher/types";
import type { ExamDto } from "./types";

export type TeacherExamPaperItem = TeacherExam & {
  examId: string;
  scheduleId: string;
  isInvigilator: boolean;
};

function paperStatus(
  paperDate: string,
  today: string,
): TeacherExam["status"] {
  if (paperDate > today) return "upcoming";
  if (paperDate === today) return "ongoing";
  return "completed";
}

function formatDuration(startsAt: string, endsAt: string): string | undefined {
  const start = startsAt.trim().slice(0, 5);
  const end = endsAt.trim().slice(0, 5);
  if (!start || !end) return undefined;
  return `${start} – ${end}`;
}

export function examDtosToTeacherExamPapers(input: {
  exams: ExamDto[];
  subjectLabels: Map<string, string>;
  teacherId: string | null;
  classLabels: Map<string, string>;
  defaultClassId: string;
}): TeacherExamPaperItem[] {
  const today = new Date().toISOString().slice(0, 10);
  const items: TeacherExamPaperItem[] = [];

  for (const exam of input.exams) {
    if (exam.scheduleStatus !== "published") continue;
    const classLabel =
      exam.audienceScope === "year"
        ? "All classes"
        : `${exam.targetSections.length} section(s)`;
    const classId = exam.targetSections[0]?.sectionId ?? input.defaultClassId;

    for (const schedule of exam.subjectSchedules) {
      const subject =
        input.subjectLabels.get(schedule.subjectId)?.trim() ||
        schedule.subjectId.slice(0, 8);
      items.push({
        id: `${exam.id}:${schedule.id}`,
        examId: exam.id,
        scheduleId: schedule.id,
        name: exam.name,
        subject,
        classId,
        classLabel: input.classLabels.get(classId) ?? classLabel,
        startDate: exam.startDate,
        endDate: exam.endDate,
        date: schedule.paperDate,
        description: exam.header,
        room: schedule.room?.trim() || undefined,
        duration: formatDuration(schedule.startsAt, schedule.endsAt),
        status: paperStatus(schedule.paperDate, today),
        publishStatus: "published",
        marksStatus: "draft",
        isInvigilator: Boolean(
          input.teacherId && schedule.invigilatorTeacherId === input.teacherId,
        ),
      });
    }
  }

  return items.sort((a, b) => a.date.localeCompare(b.date));
}

export function pickUpcomingExamPapers(
  items: TeacherExamPaperItem[],
  limit = 3,
): TeacherExamPaperItem[] {
  const today = new Date().toISOString().slice(0, 10);
  return items
    .filter((item) => item.date >= today)
    .slice(0, limit);
}

export function examScheduleCountUpcoming(
  exams: ExamDto[],
  classGrade?: string,
): number {
  const today = new Date().toISOString().slice(0, 10);
  let count = 0;
  for (const exam of exams) {
    if (exam.scheduleStatus !== "published") continue;
    if (exam.endDate < today) continue;
    if (classGrade && exam.audienceScope === "section") {
      const visible = exam.targetSections.some((t) =>
        t.classId.toLowerCase().includes(classGrade.toLowerCase()),
      );
      if (!visible) continue;
    }
    count += 1;
  }
  return count;
}
