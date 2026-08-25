/**
 * Homework notifications — assign, remind, submit, overdue.
 * Reminder cancellation persists so submitted work stops future pending reminders.
 */
import type { AppNotification } from "@lumenx/types";

import { buildAppNotification, buildNotification } from "../shared/api";
import { getPublishedTemplate, renderNotificationTemplate } from "../shared/registry";
import { NOTIFICATION_TEMPLATE_IDS as IDS } from "../shared/registry/ids";
import type { LumenXNotification } from "../shared/types";

export const HOMEWORK_REMINDER_CANCELLED_KEY = "lumenx.homework.reminder-cancelled.v1";

export type HomeworkNotifyResult = {
  foundation: LumenXNotification;
  appNotification: AppNotification;
};

function canUseStorage(): boolean {
  try {
    return typeof localStorage !== "undefined" && localStorage != null;
  } catch {
    return false;
  }
}

function cancelKey(assignmentId: string, studentId: string): string {
  return `${assignmentId}::${studentId}`;
}

function loadCancelled(): Set<string> {
  if (!canUseStorage()) return new Set();
  try {
    const raw = localStorage.getItem(HOMEWORK_REMINDER_CANCELLED_KEY);
    if (!raw) return new Set();
    const arr = JSON.parse(raw) as string[];
    return new Set(Array.isArray(arr) ? arr : []);
  } catch {
    return new Set();
  }
}

function saveCancelled(set: Set<string>): void {
  if (!canUseStorage()) return;
  try {
    localStorage.setItem(HOMEWORK_REMINDER_CANCELLED_KEY, JSON.stringify([...set].slice(0, 500)));
  } catch {
    /* ignore */
  }
}

/** Stop future pending reminders for this student + assignment after submit. */
export function cancelHomeworkReminders(assignmentId: string, studentId: string): void {
  const set = loadCancelled();
  set.add(cancelKey(assignmentId, studentId));
  saveCancelled(set);
}

export function isHomeworkReminderCancelled(assignmentId: string, studentId: string): boolean {
  return loadCancelled().has(cancelKey(assignmentId, studentId));
}

function renderPair(input: {
  templateId: string;
  id: string;
  audience: "parent" | "student";
  variables: Record<string, string | number>;
  metadata?: Record<string, string>;
}): HomeworkNotifyResult {
  const rendered = renderNotificationTemplate({
    templateId: input.templateId,
    variables: input.variables,
  });
  const priority = getPublishedTemplate(input.templateId)?.priority ?? "normal";
  const foundation = buildNotification({
    id: input.id,
    category: "homework",
    title: rendered.title,
    message: rendered.body,
    source: "homework",
    audience: input.audience,
    priority,
    href: "/homework",
    templateId: rendered.id,
    metadata: input.metadata,
  });
  return {
    foundation,
    appNotification: buildAppNotification(
      {
        id: foundation.id,
        category: "homework",
        title: foundation.title,
        message: foundation.message,
        source: "homework",
        audience: foundation.audience,
        priority: foundation.priority,
        href: "/homework",
        templateId: foundation.templateId,
        metadata: foundation.metadata,
      },
      { category: "assignments" },
    ),
  };
}

export function notifyHomeworkAssigned(input: {
  assignmentId: string;
  title: string;
  subject: string;
  dueDate: string;
  studentId?: string;
  studentName?: string;
}): { parent: HomeworkNotifyResult; student: HomeworkNotifyResult } {
  const studentName = input.studentName ?? "your child";
  const studentId = input.studentId ?? "class";
  const vars = {
    subject: input.subject,
    title: input.title,
    dueDate: input.dueDate,
    studentName,
  };
  const meta = {
    assignmentId: input.assignmentId,
    studentId,
  };
  return {
    parent: renderPair({
      templateId: IDS.homework.parent.assigned,
      id: `hw-assigned-parent-${input.assignmentId}-${studentId}`,
      audience: "parent",
      variables: vars,
      metadata: meta,
    }),
    student: renderPair({
      templateId: IDS.homework.student.assigned,
      id: `hw-assigned-student-${input.assignmentId}-${studentId}`,
      audience: "student",
      variables: vars,
      metadata: meta,
    }),
  };
}

export function notifyHomeworkReminder(input: {
  assignmentId: string;
  title: string;
  subject: string;
  dueDate: string;
  studentId: string;
  studentName?: string;
}): { parent: HomeworkNotifyResult; student: HomeworkNotifyResult } | null {
  if (isHomeworkReminderCancelled(input.assignmentId, input.studentId)) return null;
  const studentName = input.studentName ?? "your child";
  const vars = {
    subject: input.subject,
    title: input.title,
    dueDate: input.dueDate,
    studentName,
  };
  const meta = {
    assignmentId: input.assignmentId,
    studentId: input.studentId,
    kind: "reminder",
  };
  return {
    parent: renderPair({
      templateId: IDS.homework.parent.reminder,
      id: `hw-reminder-parent-${input.assignmentId}-${input.studentId}`,
      audience: "parent",
      variables: vars,
      metadata: meta,
    }),
    student: renderPair({
      templateId: IDS.homework.student.reminder,
      id: `hw-reminder-student-${input.assignmentId}-${input.studentId}`,
      audience: "student",
      variables: vars,
      metadata: meta,
    }),
  };
}

export function notifyHomeworkSubmitted(input: {
  assignmentId: string;
  title: string;
  subject: string;
  studentId: string;
  studentName: string;
}): HomeworkNotifyResult {
  cancelHomeworkReminders(input.assignmentId, input.studentId);
  return renderPair({
    templateId: IDS.homework.parent.submitted,
    id: `hw-submitted-parent-${input.assignmentId}-${input.studentId}`,
    audience: "parent",
    variables: {
      subject: input.subject,
      title: input.title,
      studentName: input.studentName,
      dueDate: "",
    },
    metadata: {
      assignmentId: input.assignmentId,
      studentId: input.studentId,
      kind: "submitted",
    },
  });
}

export function notifyHomeworkNotSubmitted(input: {
  assignmentId: string;
  title: string;
  subject: string;
  dueDate: string;
  studentId: string;
  studentName: string;
}): HomeworkNotifyResult {
  return renderPair({
    templateId: IDS.homework.parent.notSubmitted,
    id: `hw-not-submitted-parent-${input.assignmentId}-${input.studentId}-${Date.now()}`,
    audience: "parent",
    variables: {
      subject: input.subject,
      title: input.title,
      dueDate: input.dueDate,
      studentName: input.studentName,
    },
    metadata: {
      assignmentId: input.assignmentId,
      studentId: input.studentId,
      kind: "not_submitted",
    },
  });
}

export function notifyHomeworkDuePassed(input: {
  assignmentId: string;
  title: string;
  subject: string;
  dueDate: string;
  studentId: string;
  studentName?: string;
}): { parent: HomeworkNotifyResult; student: HomeworkNotifyResult } | null {
  if (isHomeworkReminderCancelled(input.assignmentId, input.studentId)) return null;
  const studentName = input.studentName ?? "your child";
  const vars = {
    subject: input.subject,
    title: input.title,
    dueDate: input.dueDate,
    studentName,
  };
  const meta = {
    assignmentId: input.assignmentId,
    studentId: input.studentId,
    kind: "due_passed",
  };
  return {
    parent: renderPair({
      templateId: IDS.homework.parent.duePassed,
      id: `hw-due-parent-${input.assignmentId}-${input.studentId}`,
      audience: "parent",
      variables: vars,
      metadata: meta,
    }),
    student: renderPair({
      templateId: IDS.homework.student.duePassed,
      id: `hw-due-student-${input.assignmentId}-${input.studentId}`,
      audience: "student",
      variables: vars,
      metadata: meta,
    }),
  };
}
