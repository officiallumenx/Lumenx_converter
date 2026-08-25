/**
 * Attendance notification flow (demo, no backend).
 *
 * Mark / event → config gate → queue or deliver → outbox + Connect inbox keys.
 * Wired to `@lumenx/notifications` templates + shared contract (Phase 3).
 *
 * Daily Summary: queued events auto-flush for past dates, and for today after
 * the demo end-of-day hour. True clock-scheduled delivery needs a backend cron —
 * see docs/ATTENDANCE_NOTIFICATION_WORKFLOW.md.
 */

import {
  createLumenXNotification,
  getTemplateDeepLink,
  NOTIFICATION_TEMPLATE_IDS,
  renderNotificationTemplate,
  toAppNotificationPriority,
} from "@lumenx/notifications";
import { toLocalIsoDate } from "@lumenx/utils";

import { normalizeAttendanceSectionKey } from "./identity";
import {
  attendanceNotificationTriggerLabel,
  loadAttendanceNotificationConfig,
} from "./notification-config-store";
import {
  ATTENDANCE_INBOX_CHANGED_EVENT,
  ATTENDANCE_NOTIFICATION_INBOX_KEY,
  ATTENDANCE_NOTIFICATION_OUTBOX_KEY,
  ATTENDANCE_NOTIFICATION_SUMMARY_QUEUE_KEY,
  loadInbox,
  loadOutbox,
  loadQueue,
  saveInbox,
  saveOutbox,
  saveQueue,
} from "./notification-storage";
import {
  type AttendanceNotificationEvent,
  type AttendanceNotificationInboxItem,
  type AttendanceNotificationMessage,
  type AttendanceNotificationRecipient,
  type AttendanceNotificationTrigger,
} from "./notification-types";

export {
  ATTENDANCE_NOTIFICATION_OUTBOX_KEY,
  ATTENDANCE_NOTIFICATION_SUMMARY_QUEUE_KEY,
  ATTENDANCE_NOTIFICATION_INBOX_KEY,
  ATTENDANCE_INBOX_CHANGED_EVENT,
};

export type { AttendanceNotificationInboxItem };

/** Connect deep link preserved through inbox → AppNotification → UI. */
export const ATTENDANCE_NOTIFICATION_DEEP_LINK = "/attendance" as const;

/** Demo end-of-day hour (local) after which today's Daily Summary auto-flushes. */
export const ATTENDANCE_DAILY_SUMMARY_AUTO_FLUSH_HOUR = 16;

function localIsoDate(d = new Date()): string {
  return toLocalIsoDate(d);
}

function sanitizeIdPart(value: string): string {
  return (value ?? "").trim().replace(/[^a-zA-Z0-9:_-]+/g, "_");
}

function attendanceDeepLink(templateId?: string): "/attendance" {
  const fromRegistry = templateId ? getTemplateDeepLink(templateId) : undefined;
  if (fromRegistry === "/attendance") return "/attendance";
  return ATTENDANCE_NOTIFICATION_DEEP_LINK;
}

/**
 * Absence alerts are parent-only.
 * Students may still receive percentage-info notifications via a separate API.
 */
function recipientsForAbsenceTrigger(
  configured: AttendanceNotificationRecipient[],
): AttendanceNotificationRecipient[] {
  return configured.filter((r) => r === "parent");
}

/** Stable event id — same mark re-emit does not invent a new identity. */
export function buildAttendanceNotificationEventId(input: {
  date: string;
  sectionKey: string;
  slotId: string;
  studentId: string;
  trigger: AttendanceNotificationTrigger;
}): string {
  return [
    "att-evt",
    sanitizeIdPart(input.date),
    sanitizeIdPart(normalizeAttendanceSectionKey(input.sectionKey)),
    sanitizeIdPart(input.slotId),
    sanitizeIdPart(input.studentId),
    input.trigger,
  ].join(":");
}

export function buildAttendanceNotificationMessageId(
  eventId: string,
  recipient: AttendanceNotificationRecipient,
): string {
  return `att-msg:${sanitizeIdPart(eventId)}:${recipient}`;
}

export function buildAttendanceDailySummaryMessageId(input: {
  date: string;
  recipient: AttendanceNotificationRecipient;
  studentId: string;
}): string {
  return [
    "att-msg-sum",
    sanitizeIdPart(input.date),
    input.recipient,
    sanitizeIdPart(input.studentId),
  ].join(":");
}

export function buildAttendancePercentageMessageId(input: {
  date: string;
  studentId: string;
  recipient: AttendanceNotificationRecipient;
}): string {
  return [
    "att-msg-pct",
    sanitizeIdPart(input.date),
    sanitizeIdPart(input.studentId),
    input.recipient,
  ].join(":");
}

function triggerCopy(trigger: AttendanceNotificationTrigger): string {
  return attendanceNotificationTriggerLabel(trigger);
}

function absenceTemplateId(
  trigger: AttendanceNotificationTrigger,
  recipient: AttendanceNotificationRecipient,
): string {
  if (trigger === "daily_absence") {
    return recipient === "parent"
      ? NOTIFICATION_TEMPLATE_IDS.attendance.parent.dailyAbsence
      : NOTIFICATION_TEMPLATE_IDS.attendance.student.dailyAbsence;
  }
  if (trigger === "period_absence") {
    return recipient === "parent"
      ? NOTIFICATION_TEMPLATE_IDS.attendance.parent.periodAbsence
      : NOTIFICATION_TEMPLATE_IDS.attendance.student.periodAbsence;
  }
  return NOTIFICATION_TEMPLATE_IDS.attendance.parent.dailyAbsence;
}

function buildMessageContent(
  event: AttendanceNotificationEvent,
  recipient: AttendanceNotificationRecipient,
): { title: string; body: string; templateId: string } {
  const templateId = absenceTemplateId(event.trigger, recipient);
  const rendered = renderNotificationTemplate({
    templateId,
    variables: {
      studentName: event.studentName,
      slotLabel: event.slotLabel,
      date: event.date,
      classLabel: event.classLabel,
      section: event.section,
      message: `Attendance update for ${event.studentName} on ${event.date}.`,
    },
  });
  return { title: rendered.title, body: rendered.body, templateId };
}

function deliverMessage(
  message: AttendanceNotificationMessage,
  templateId?: string,
): AttendanceNotificationMessage {
  const href = attendanceDeepLink(templateId);
  const shared = createLumenXNotification({
    id: message.id,
    category: "attendance",
    title: message.title,
    message: message.body,
    source: "attendance.flow",
    audience: message.recipient === "parent" ? "parent" : "student",
    priority: "important",
    href,
    timestamp: message.deliveredAt ?? new Date().toISOString(),
    unread: true,
    templateId,
    metadata: {
      studentId: message.studentId,
      trigger: message.trigger,
      date: message.date,
    },
  });

  const delivered: AttendanceNotificationMessage = {
    ...message,
    status: "delivered",
    deliveredAt: message.deliveredAt ?? shared.timestamp,
  };
  const inbox = loadInbox().filter((i) => i.id !== delivered.id);
  inbox.unshift({
    id: delivered.id,
    recipient: delivered.recipient,
    studentId: delivered.studentId,
    title: delivered.title,
    body: delivered.body,
    createdAt: delivered.deliveredAt!,
    unread: true,
    href,
    trigger: delivered.trigger,
    date: delivered.date,
    templateId,
    priority: shared.priority,
  });
  saveInbox(inbox.slice(0, 200));
  return delivered;
}

function createMessagesForEvent(
  event: AttendanceNotificationEvent,
): AttendanceNotificationMessage[] {
  const config = loadAttendanceNotificationConfig();
  if (config.timing === "no_notification") return [];
  if (!config.triggers.includes(event.trigger)) return [];

  const recipients = recipientsForAbsenceTrigger(config.recipients);
  if (recipients.length === 0) return [];

  return recipients.map((recipient) => {
    const { title, body, templateId } = buildMessageContent(event, recipient);
    const base: AttendanceNotificationMessage = {
      id: buildAttendanceNotificationMessageId(event.id, recipient),
      eventId: event.id,
      recipient,
      timing: config.timing,
      trigger: event.trigger,
      title,
      body,
      studentId: event.studentId,
      studentName: event.studentName,
      date: event.date,
      sectionKey: event.sectionKey,
      status: "queued",
      createdAt: new Date().toISOString(),
    };
    return config.timing === "immediate" ? deliverMessage(base, templateId) : base;
  });
}

export type EmitAttendanceNotificationInput = {
  trigger: AttendanceNotificationTrigger;
  date: string;
  sectionKey: string;
  classLabel: string;
  section: string;
  slotId: string;
  slotLabel: string;
  /** Students must use canonical attendance ids (`stu:…`). */
  students: { id: string; name: string }[];
};

/**
 * Core flow entry: emit one or more student events through configured timing/triggers/recipients.
 * Absence alerts deliver to Parent only (students are not sent parent-only absent alerts).
 */
export function emitAttendanceNotifications(
  input: EmitAttendanceNotificationInput,
): AttendanceNotificationMessage[] {
  const config = loadAttendanceNotificationConfig();
  if (config.timing === "no_notification") return [];
  if (!config.triggers.includes(input.trigger)) return [];
  if (!input.students.length) return [];

  const recipients = recipientsForAbsenceTrigger(config.recipients);
  if (recipients.length === 0) return [];

  const sectionKey = normalizeAttendanceSectionKey(input.sectionKey);
  const created: AttendanceNotificationMessage[] = [];
  const outbox = loadOutbox().filter((m) => {
    return !input.students.some((s) => {
      const eid = buildAttendanceNotificationEventId({
        date: input.date,
        sectionKey,
        slotId: input.slotId,
        studentId: s.id,
        trigger: input.trigger,
      });
      return recipients.some(
        (r) => m.id === buildAttendanceNotificationMessageId(eid, r),
      );
    });
  });
  const queue = loadQueue().filter((e) => {
    return !input.students.some(
      (s) =>
        e.id ===
        buildAttendanceNotificationEventId({
          date: input.date,
          sectionKey,
          slotId: input.slotId,
          studentId: s.id,
          trigger: input.trigger,
        }),
    );
  });

  for (const student of input.students) {
    const event: AttendanceNotificationEvent = {
      id: buildAttendanceNotificationEventId({
        date: input.date,
        sectionKey,
        slotId: input.slotId,
        studentId: student.id,
        trigger: input.trigger,
      }),
      trigger: input.trigger,
      date: input.date.slice(0, 10),
      sectionKey,
      classLabel: input.classLabel,
      section: input.section,
      slotId: input.slotId,
      slotLabel: input.slotLabel,
      studentId: student.id,
      studentName: student.name,
      occurredAt: new Date().toISOString(),
    };

    if (config.timing === "daily_summary") {
      queue.push(event);
      for (const recipient of recipients) {
        const { title, body } = buildMessageContent(event, recipient);
        created.push({
          id: buildAttendanceNotificationMessageId(event.id, recipient),
          eventId: event.id,
          recipient,
          timing: "daily_summary",
          trigger: event.trigger,
          title: `[Queued] ${title}`,
          body,
          studentId: event.studentId,
          studentName: event.studentName,
          date: event.date,
          sectionKey: event.sectionKey,
          status: "queued",
          createdAt: event.occurredAt,
        });
      }
      continue;
    }

    const messages = createMessagesForEvent(event);
    created.push(...messages);
  }

  if (config.timing === "daily_summary") {
    saveQueue(queue);
  }
  saveOutbox([...created, ...outbox].slice(0, 300));

  ensureDailyAttendanceSummariesFlushed();

  return created;
}

/**
 * After slot attendance submit — map slot kind to absence triggers.
 */
export function notifyFromAttendanceSubmit(input: {
  date: string;
  sectionKey: string;
  classLabel: string;
  section: string;
  slotId: string;
  slotLabel: string;
  slotKind: "day" | "morning" | "afternoon" | "period";
  absentStudents: { id: string; name: string }[];
}): AttendanceNotificationMessage[] {
  if (!input.absentStudents.length) return [];
  const trigger: AttendanceNotificationTrigger =
    input.slotKind === "period" ? "period_absence" : "daily_absence";
  return emitAttendanceNotifications({
    trigger,
    date: input.date,
    sectionKey: input.sectionKey,
    classLabel: input.classLabel,
    section: input.section,
    slotId: input.slotId,
    slotLabel: input.slotLabel,
    students: input.absentStudents,
  });
}

/**
 * Attendance % below configured threshold → Parent (important) + optional Student info.
 * Does not emit absence alerts. Deduped by date + student + recipient.
 */
export function notifyAttendancePercentageWarning(input: {
  studentId: string;
  studentName: string;
  attendancePct: number;
  thresholdPct: number;
  date?: string;
  /** When false, only parent is notified (default true). */
  notifyStudent?: boolean;
}): AttendanceNotificationMessage[] {
  const date = (input.date ?? localIsoDate()).slice(0, 10);
  const created: AttendanceNotificationMessage[] = [];

  const parentTemplate = NOTIFICATION_TEMPLATE_IDS.attendance.parent.percentageWarning;
  const parentRendered = renderNotificationTemplate({
    templateId: parentTemplate,
    variables: {
      studentName: input.studentName,
      attendancePct: input.attendancePct,
      thresholdPct: input.thresholdPct,
    },
  });
  const parentMsg: AttendanceNotificationMessage = {
    id: buildAttendancePercentageMessageId({
      date,
      studentId: input.studentId,
      recipient: "parent",
    }),
    eventId: `att-evt-pct:${sanitizeIdPart(date)}:${sanitizeIdPart(input.studentId)}`,
    recipient: "parent",
    timing: "immediate",
    trigger: "percentage_warning",
    title: parentRendered.title,
    body: parentRendered.body,
    studentId: input.studentId,
    studentName: input.studentName,
    date,
    sectionKey: "",
    status: "queued",
    createdAt: new Date().toISOString(),
  };
  created.push(deliverMessage(parentMsg, parentTemplate));

  if (input.notifyStudent !== false) {
    const studentTemplate = NOTIFICATION_TEMPLATE_IDS.attendance.student.percentageInfo;
    const studentRendered = renderNotificationTemplate({
      templateId: studentTemplate,
      variables: {
        studentName: input.studentName,
        attendancePct: input.attendancePct,
        thresholdPct: input.thresholdPct,
      },
    });
    const studentMsg: AttendanceNotificationMessage = {
      id: buildAttendancePercentageMessageId({
        date,
        studentId: input.studentId,
        recipient: "student",
      }),
      eventId: `att-evt-pct:${sanitizeIdPart(date)}:${sanitizeIdPart(input.studentId)}`,
      recipient: "student",
      timing: "immediate",
      trigger: "percentage_warning",
      title: studentRendered.title,
      body: studentRendered.body,
      studentId: input.studentId,
      studentName: input.studentName,
      date,
      sectionKey: "",
      status: "queued",
      createdAt: new Date().toISOString(),
    };
    created.push(deliverMessage(studentMsg, studentTemplate));
  }

  const ids = new Set(created.map((m) => m.id));
  const outbox = loadOutbox().filter((m) => !ids.has(m.id));
  saveOutbox([...created, ...outbox].slice(0, 300));
  return created;
}

function shouldAutoFlushDate(date: string, now = new Date()): boolean {
  const today = localIsoDate(now);
  if (date < today) return true;
  if (date > today) return false;
  return now.getHours() >= ATTENDANCE_DAILY_SUMMARY_AUTO_FLUSH_HOUR;
}

/**
 * Flush queued daily summary events into delivered inbox messages.
 * Prefer `ensureDailyAttendanceSummariesFlushed` — this remains for tests / forced flush.
 */
export function flushDailyAttendanceSummary(
  date?: string,
): AttendanceNotificationMessage[] {
  const config = loadAttendanceNotificationConfig();
  const queue = loadQueue();
  const targetDate = (date ?? localIsoDate()).slice(0, 10);
  const due = queue.filter((e) => e.date === targetDate);
  const remaining = queue.filter((e) => e.date !== targetDate);
  saveQueue(remaining);

  if (config.timing === "no_notification" || due.length === 0) {
    return [];
  }

  type Key = string;
  const groups = new Map<
    Key,
    { recipient: AttendanceNotificationRecipient; events: AttendanceNotificationEvent[] }
  >();

  const recipients = recipientsForAbsenceTrigger(config.recipients);

  for (const event of due) {
    if (!config.triggers.includes(event.trigger)) continue;
    for (const recipient of recipients) {
      const key = `${recipient}::${event.studentId}`;
      const row = groups.get(key) ?? { recipient, events: [] };
      row.events.push(event);
      groups.set(key, row);
    }
  }

  const delivered: AttendanceNotificationMessage[] = [];
  for (const [, group] of groups) {
    const first = group.events[0]!;
    const lines = group.events.map(
      (e) => `· ${triggerCopy(e.trigger)} — ${e.slotLabel}`,
    );
    const templateId = NOTIFICATION_TEMPLATE_IDS.attendance.parent.dailySummary;
    const renderedSummary = renderNotificationTemplate({
      templateId,
      variables: {
        studentName: first.studentName,
        date: first.date,
        count: group.events.length,
      },
    });
    const base: AttendanceNotificationMessage = {
      id: buildAttendanceDailySummaryMessageId({
        date: first.date,
        recipient: group.recipient,
        studentId: first.studentId,
      }),
      eventId: first.id,
      recipient: group.recipient,
      timing: "daily_summary",
      trigger: first.trigger,
      title: renderedSummary.title,
      body: `${renderedSummary.body}\n${first.studentName} — ${first.date} (${first.classLabel}-${first.section}):\n${lines.join("\n")}`,
      studentId: first.studentId,
      studentName: first.studentName,
      date: first.date,
      sectionKey: first.sectionKey,
      status: "queued",
      createdAt: new Date().toISOString(),
    };
    delivered.push(deliverMessage(base, templateId));
  }

  const outbox = loadOutbox().filter((m) => !delivered.some((d) => d.id === m.id));
  saveOutbox([...delivered, ...outbox].slice(0, 300));
  return delivered;
}

/**
 * Auto-flush Daily Summary without a manual Admin button.
 * Past dates always; today after {@link ATTENDANCE_DAILY_SUMMARY_AUTO_FLUSH_HOUR}.
 */
export function ensureDailyAttendanceSummariesFlushed(
  now = new Date(),
): AttendanceNotificationMessage[] {
  const config = loadAttendanceNotificationConfig();
  if (config.timing !== "daily_summary") return [];
  const queue = loadQueue();
  if (!queue.length) return [];

  const dates = [...new Set(queue.map((e) => e.date))].filter((d) =>
    shouldAutoFlushDate(d, now),
  );
  const delivered: AttendanceNotificationMessage[] = [];
  for (const date of dates) {
    delivered.push(...flushDailyAttendanceSummary(date));
  }
  return delivered;
}

export function listAttendanceNotificationOutbox(): AttendanceNotificationMessage[] {
  return loadOutbox();
}

export function listAttendanceNotificationQueue(): AttendanceNotificationEvent[] {
  return loadQueue();
}

export function listAttendanceNotificationInbox(
  recipient?: AttendanceNotificationRecipient,
): AttendanceNotificationInboxItem[] {
  ensureDailyAttendanceSummariesFlushed();
  const items = loadInbox();
  return recipient ? items.filter((i) => i.recipient === recipient) : items;
}

export function clearAttendanceNotificationOutboxForTests(): void {
  saveOutbox([]);
  saveQueue([]);
  saveInbox([]);
}

/** Re-export for callers that map AppNotification.priority. */
export { toAppNotificationPriority };
