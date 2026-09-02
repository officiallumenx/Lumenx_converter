import { isApiAuthMode } from "@/lib/auth/auth-mode";
import { listPublishedExams, type TransportExamDto } from "@/lib/transport-api";

export type DriverExamScheduleItem = {
  id: string;
  examId: string;
  examName: string;
  paperDate: string;
  time?: string;
  room?: string;
  startDate: string;
  endDate: string;
};

export function examDtosToDriverScheduleItems(
  exams: TransportExamDto[],
): DriverExamScheduleItem[] {
  const items: DriverExamScheduleItem[] = [];
  for (const exam of exams) {
    for (const paper of exam.subjectSchedules) {
      const start = paper.startsAt.trim().slice(0, 5);
      const end = paper.endsAt.trim().slice(0, 5);
      items.push({
        id: `${exam.id}:${paper.id}`,
        examId: exam.id,
        examName: exam.name,
        paperDate: paper.paperDate,
        time: start && end ? `${start} – ${end}` : undefined,
        room: paper.room?.trim() || undefined,
        startDate: exam.startDate,
        endDate: exam.endDate,
      });
    }
    if (exam.subjectSchedules.length === 0) {
      items.push({
        id: exam.id,
        examId: exam.id,
        examName: exam.name,
        paperDate: exam.startDate,
        startDate: exam.startDate,
        endDate: exam.endDate,
      });
    }
  }
  return items.sort((a, b) => a.paperDate.localeCompare(b.paperDate));
}

export async function loadDriverExamSchedule(input: {
  instituteId: string | null | undefined;
}): Promise<{
  status: "unavailable" | "needs_institute" | "ready" | "empty" | "error";
  items: DriverExamScheduleItem[];
  message?: string;
}> {
  if (!isApiAuthMode()) return { status: "unavailable", items: [] };
  if (!input.instituteId?.trim()) return { status: "needs_institute", items: [] };
  try {
    const exams = await listPublishedExams(input.instituteId.trim());
    const items = examDtosToDriverScheduleItems(exams);
    return items.length === 0
      ? { status: "empty", items: [] }
      : { status: "ready", items };
  } catch (err) {
    const message = err instanceof Error ? err.message : "Failed to load exam schedule";
    return { status: "error", items: [], message };
  }
}

export type { DriverExamScheduleItem as TransportExamScheduleItem };
