/** Attendance notification configuration & demo outbox (no backend). */

export type AttendanceNotificationTiming =
  | "immediate"
  | "daily_summary"
  | "no_notification";

/**
 * Triggers that Attendance marking can actually emit.
 * Late Entry / Early Exit were removed — mark sheet only supports present / absent / leave.
 * `percentage_warning` is emitted by alert evaluation (not mark submit).
 */
export type AttendanceNotificationTrigger =
  | "daily_absence"
  | "period_absence"
  | "percentage_warning";

export type AttendanceNotificationRecipient = "parent" | "student";

export type AttendanceNotificationConfig = {
  timing: AttendanceNotificationTiming;
  /** Enabled triggers */
  triggers: AttendanceNotificationTrigger[];
  recipients: AttendanceNotificationRecipient[];
  updatedAt: string;
  updatedBy: string;
};

export type AttendanceNotificationEvent = {
  id: string;
  trigger: AttendanceNotificationTrigger;
  date: string;
  sectionKey: string;
  classLabel: string;
  section: string;
  slotId: string;
  slotLabel: string;
  /** Canonical attendance student id (`stu:10:B:14`). */
  studentId: string;
  studentName: string;
  occurredAt: string;
};

export type AttendanceNotificationMessage = {
  id: string;
  eventId: string;
  recipient: AttendanceNotificationRecipient;
  timing: AttendanceNotificationTiming;
  trigger: AttendanceNotificationTrigger;
  title: string;
  body: string;
  /** Canonical attendance student id — used for Parent/Student inbox routing. */
  studentId: string;
  studentName: string;
  date: string;
  sectionKey: string;
  status: "queued" | "delivered" | "skipped";
  createdAt: string;
  deliveredAt?: string;
};

/** Connect parent/student inbox row (demo bridge). */
export type AttendanceNotificationInboxItem = {
  id: string;
  recipient: AttendanceNotificationRecipient;
  /** Canonical attendance student id (`stu:…`). */
  studentId: string;
  title: string;
  body: string;
  createdAt: string;
  unread: boolean;
  /** Deep-link hint for Connect routing. */
  href: "/attendance";
  trigger?: AttendanceNotificationTrigger;
  date?: string;
  templateId?: string;
  /** Shared foundation priority when present. */
  priority?: "normal" | "important" | "critical" | "success";
};

export const ATTENDANCE_NOTIFICATION_TIMING_OPTIONS: {
  value: AttendanceNotificationTiming;
  label: string;
  description: string;
}[] = [
  {
    value: "immediate",
    label: "Immediate",
    description: "Send as soon as the attendance event is recorded",
  },
  {
    value: "daily_summary",
    label: "Daily Summary",
    description:
      "Batch events into one summary per recipient per day (auto-flushed in demo; scheduled delivery needs backend)",
  },
  {
    value: "no_notification",
    label: "Disabled",
    description: "Do not notify parents or students",
  },
];

export const ATTENDANCE_NOTIFICATION_TRIGGER_OPTIONS: {
  value: AttendanceNotificationTrigger;
  label: string;
  description: string;
}[] = [
  {
    value: "daily_absence",
    label: "Daily Absent",
    description: "Student marked absent for the full day or session",
  },
  {
    value: "period_absence",
    label: "Period Absent",
    description: "Student marked absent for a timetable period",
  },
];

export const ATTENDANCE_NOTIFICATION_RECIPIENT_OPTIONS: {
  value: AttendanceNotificationRecipient;
  label: string;
  description: string;
}[] = [
  {
    value: "parent",
    label: "Parent",
    description: "Notify the linked parent / guardian",
  },
  {
    value: "student",
    label: "Student",
    description: "Notify the student in Connect",
  },
];
