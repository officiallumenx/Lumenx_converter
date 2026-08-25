/**
 * Exam notifications — timetable publish, reminders, schedule changes, results, marks workflow.
 */
import type { AppNotification } from "@lumenx/types";

import { buildAppNotification, buildNotification } from "../shared/api";
import { getPublishedTemplate, renderNotificationTemplate } from "../shared/registry";
import { NOTIFICATION_TEMPLATE_IDS as IDS } from "../shared/registry/ids";
import type { LumenXNotification, LumenXNotificationAudience } from "../shared/types";
import {
  cancelPhase7Reminders,
  pushPhase7Inbox,
  type Phase7Audience,
} from "../shared/phase7-inbox";

export type ExamNotifyResult = {
  foundation: LumenXNotification;
  appNotification: AppNotification;
};

function deliver(
  audiences: Phase7Audience | Phase7Audience[],
  result: ExamNotifyResult,
): ExamNotifyResult {
  const list = Array.isArray(audiences) ? audiences : [audiences];
  pushPhase7Inbox({
    ...result.appNotification,
    audiences: list,
    audience: list[0],
    module: "exams",
  });
  return result;
}

function renderExam(input: {
  templateId: string;
  id: string;
  audience: LumenXNotificationAudience;
  variables: Record<string, string | number>;
  href?: string;
}): ExamNotifyResult {
  const rendered = renderNotificationTemplate({
    templateId: input.templateId,
    variables: input.variables,
  });
  const priority = getPublishedTemplate(input.templateId)?.priority ?? "normal";
  const href = input.href ?? "/exams";
  const foundation = buildNotification({
    id: input.id,
    category: "exams",
    title: rendered.title,
    message: rendered.body,
    source: "exams",
    audience: input.audience,
    priority,
    href,
    templateId: rendered.id,
  });
  return {
    foundation,
    appNotification: buildAppNotification(
      {
        id: foundation.id,
        category: "exams",
        title: foundation.title,
        message: foundation.message,
        source: "exams",
        audience: foundation.audience,
        priority: foundation.priority,
        href,
        templateId: foundation.templateId,
      },
      { category: "exams" },
    ),
  };
}

const emptyVars = {
  examName: "",
  studentName: "",
  subject: "",
  dateRange: "",
  time: "",
  venue: "",
  newValue: "",
  detail: "",
  classLabel: "",
  deadline: "",
  pendingCount: "",
  readyCount: "",
};

export function notifyExamTimetablePublished(input: {
  examId: string;
  examName: string;
  dateRange: string;
  classLabel?: string;
}): { parent: ExamNotifyResult; student: ExamNotifyResult; teacher: ExamNotifyResult } {
  const vars = {
    ...emptyVars,
    examName: input.examName,
    dateRange: input.dateRange,
    classLabel: input.classLabel ?? "assigned classes",
  };
  const result = deliver(
    ["parent", "student", "teacher"],
    renderExam({
      templateId: IDS.exams.parent.timetablePublished,
      id: `exam-tt-pub-${input.examId}`,
      audience: "parent",
      variables: vars,
    }),
  );
  return { parent: result, student: result, teacher: result };
}

export function notifyExamReminder(input: {
  examId: string;
  examName: string;
  subject: string;
  time: string;
  venue: string;
  kind: "1d" | "1h";
}): { parent: ExamNotifyResult; student: ExamNotifyResult } | null {
  const parentTpl =
    input.kind === "1d" ? IDS.exams.parent.reminder1d : IDS.exams.parent.reminder1h;
  const vars = {
    ...emptyVars,
    examName: input.examName,
    subject: input.subject,
    time: input.time,
    venue: input.venue || "TBA",
  };
  const result = deliver(
    ["parent", "student"],
    renderExam({
      templateId: parentTpl,
      id: `exam-reminder-${input.kind}-${input.examId}-${input.subject}`,
      audience: "parent",
      variables: vars,
    }),
  );
  return { parent: result, student: result };
}

export type ExamScheduleChangeKind =
  | "date"
  | "time"
  | "venue"
  | "postponed"
  | "cancelled";

export function notifyExamScheduleChange(input: {
  examId: string;
  examName: string;
  subject: string;
  kind: ExamScheduleChangeKind;
  newValue?: string;
  detail?: string;
}): { parent: ExamNotifyResult; student: ExamNotifyResult } {
  if (input.kind === "cancelled" || input.kind === "postponed") {
    cancelPhase7Reminders(input.examId);
  }
  const parentMap = {
    date: IDS.exams.parent.dateChanged,
    time: IDS.exams.parent.timeChanged,
    venue: IDS.exams.parent.venueChanged,
    postponed: IDS.exams.parent.postponed,
    cancelled: IDS.exams.parent.cancelled,
  } as const;
  const vars = {
    ...emptyVars,
    examName: input.examName,
    subject: input.subject,
    newValue: input.newValue ?? "",
    detail: input.detail ?? "",
  };
  const result = deliver(
    ["parent", "student"],
    renderExam({
      templateId: parentMap[input.kind],
      id: `exam-change-${input.kind}-${input.examId}-${input.subject}`,
      audience: "parent",
      variables: vars,
    }),
  );
  return { parent: result, student: result };
}

export function notifyExamResultsPublished(input: {
  examId: string;
  examName: string;
  studentName?: string;
  subject?: string;
  updated?: boolean;
}): { parent: ExamNotifyResult; student: ExamNotifyResult } {
  const vars = {
    ...emptyVars,
    examName: input.examName,
    studentName: input.studentName ?? "your child",
    subject: input.subject ?? "all subjects",
  };
  if (input.updated) {
    const result = deliver(
      ["parent", "student"],
      renderExam({
        templateId: IDS.exams.parent.resultUpdated,
        id: `exam-result-upd-${input.examId}-${input.subject ?? "all"}`,
        audience: "parent",
        variables: vars,
      }),
    );
    return { parent: result, student: result };
  }
  const result = deliver(
    ["parent", "student"],
    renderExam({
      templateId: IDS.exams.parent.marksPublished,
      id: `exam-marks-pub-${input.examId}`,
      audience: "parent",
      variables: vars,
    }),
  );
  return { parent: result, student: result };
}

export function notifyTeacherMarksPending(input: {
  examName: string;
  subject: string;
  classLabel: string;
  teacherKey?: string;
}): ExamNotifyResult {
  return deliver(
    "teacher",
    renderExam({
      templateId: IDS.exams.teacher.marksPending,
      id: `exam-marks-pending-teacher-${input.teacherKey ?? input.subject}-${input.examName}`,
      audience: "teacher",
      variables: {
        ...emptyVars,
        examName: input.examName,
        subject: input.subject,
        classLabel: input.classLabel,
      },
      href: "/marks",
    }),
  );
}

export function notifyTeacherMarksDeadline(input: {
  examName: string;
  deadline: string;
}): ExamNotifyResult {
  return deliver(
    "teacher",
    renderExam({
      templateId: IDS.exams.teacher.deadlineApproaching,
      id: `exam-deadline-teacher-${input.examName}-${input.deadline}`,
      audience: "teacher",
      variables: { ...emptyVars, examName: input.examName, deadline: input.deadline },
      href: "/marks",
    }),
  );
}

export function notifyTeacherMarksPublishPending(input: {
  examName: string;
  subject: string;
}): ExamNotifyResult {
  return deliver(
    "teacher",
    renderExam({
      templateId: IDS.exams.teacher.marksPublishPending,
      id: `exam-publish-pending-teacher-${input.examName}-${input.subject}`,
      audience: "teacher",
      variables: { ...emptyVars, examName: input.examName, subject: input.subject },
      href: "/marks",
    }),
  );
}

export function notifyAdminMarksPending(input: {
  examName: string;
  pendingCount: number;
}): ExamNotifyResult {
  return deliver(
    "admin",
    renderExam({
      templateId: IDS.exams.admin.marksPending,
      id: `exam-admin-pending-${input.examName}`,
      audience: "admin",
      variables: {
        ...emptyVars,
        examName: input.examName,
        pendingCount: String(input.pendingCount),
      },
      href: "/marks",
    }),
  );
}

export function notifyAdminResultsReady(input: {
  examName: string;
  readyCount: number;
}): ExamNotifyResult {
  return deliver(
    "admin",
    renderExam({
      templateId: IDS.exams.admin.resultsReady,
      id: `exam-admin-ready-${input.examName}-${input.readyCount}`,
      audience: "admin",
      variables: {
        ...emptyVars,
        examName: input.examName,
        readyCount: String(input.readyCount),
      },
      href: "/marks",
    }),
  );
}

/** Schedule 1d/1h reminders for published papers (demo: emit immediately as scheduled pointers). */
export function scheduleExamPaperReminders(input: {
  examId: string;
  examName: string;
  subject: string;
  time: string;
  venue: string;
}): void {
  notifyExamReminder({ ...input, kind: "1d" });
  notifyExamReminder({ ...input, kind: "1h" });
}
