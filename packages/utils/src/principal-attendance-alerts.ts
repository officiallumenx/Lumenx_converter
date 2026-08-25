/**
 * Principal → teachers: remind attendance not submitted.
 * Stored in localStorage so Connect teacher inbox can pick them up (same-origin).
 * Reminders auto-stop once the teacher is no longer in the pending set.
 */

export const PRINCIPAL_ATTENDANCE_ALERTS_KEY = "lumenx.principal-attendance-alerts.v1";

export type AttendanceAlertRecipient = {
  teacherId: string;
  teacherName: string;
  pendingCount: number;
  classLabels?: string[];
};

export type PrincipalAttendanceAlert = {
  id: string;
  createdAt: string;
  title: string;
  body: string;
  recipients: AttendanceAlertRecipient[];
  /** Connect deep link. */
  href?: string;
  templateId?: string;
};

export function loadPrincipalAttendanceAlerts(): PrincipalAttendanceAlert[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(PRINCIPAL_ATTENDANCE_ALERTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PrincipalAttendanceAlert[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function savePrincipalAttendanceAlerts(alerts: PrincipalAttendanceAlert[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(PRINCIPAL_ATTENDANCE_ALERTS_KEY, JSON.stringify(alerts.slice(0, 50)));
  } catch {
    // Ignore quota / private mode.
  }
}

export function pushPrincipalAttendanceAlert(input: {
  recipients: AttendanceAlertRecipient[];
  title?: string;
  body?: string;
  href?: string;
  templateId?: string;
}): PrincipalAttendanceAlert | null {
  if (input.recipients.length === 0) return null;
  const totalPending = input.recipients.reduce((a, r) => a + r.pendingCount, 0);
  const alert: PrincipalAttendanceAlert = {
    id: `paa-${Date.now()}`,
    createdAt: new Date().toISOString(),
    title: input.title ?? "Attendance not submitted",
    body:
      input.body ??
      `Please submit today’s class attendance (${totalPending} class${totalPending === 1 ? "" : "es"} waiting). Open Connect → Attendance and submit.`,
    recipients: input.recipients,
    href: input.href ?? "/attendance",
    templateId: input.templateId,
  };
  const next = [alert, ...loadPrincipalAttendanceAlerts()];
  savePrincipalAttendanceAlerts(next);
  return alert;
}

function normName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

export function principalAttendanceAlertsForTeacher(
  teacherId: string | null | undefined,
  teacherName: string | null | undefined,
): PrincipalAttendanceAlert[] {
  const id = (teacherId ?? "").trim();
  const name = normName(teacherName ?? "");
  if (!id && !name) return [];
  return loadPrincipalAttendanceAlerts().filter((alert) =>
    alert.recipients.some((r) => {
      if (id && r.teacherId === id) return true;
      if (name && normName(r.teacherName) === name) return true;
      return false;
    }),
  );
}

export function pendingCountForTeacherInAttendanceAlert(
  alert: PrincipalAttendanceAlert,
  teacherId: string | null | undefined,
  teacherName: string | null | undefined,
): number {
  const id = (teacherId ?? "").trim();
  const name = normName(teacherName ?? "");
  let max = 0;
  for (const r of alert.recipients) {
    const match =
      (id && r.teacherId === id) || (name && normName(r.teacherName) === name);
    if (match) max = Math.max(max, r.pendingCount);
  }
  return max;
}

/**
 * Remove a teacher from all pending-attendance reminders (after they submit).
 * Empty alerts are deleted.
 */
export function removeTeacherFromPrincipalAttendanceAlerts(
  teacherId: string | null | undefined,
  teacherName: string | null | undefined,
): void {
  const id = (teacherId ?? "").trim();
  const name = normName(teacherName ?? "");
  if (!id && !name) return;
  const next = loadPrincipalAttendanceAlerts()
    .map((alert) => ({
      ...alert,
      recipients: alert.recipients.filter((r) => {
        if (id && r.teacherId === id) return false;
        if (name && normName(r.teacherName) === name) return false;
        return true;
      }),
    }))
    .filter((alert) => alert.recipients.length > 0);
  savePrincipalAttendanceAlerts(next);
}
