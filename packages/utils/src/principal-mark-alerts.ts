/**
 * Principal → teachers: remind pending mark submissions.
 * Stored in localStorage so Connect teacher inbox can pick them up (same-origin).
 */

export const PRINCIPAL_MARK_ALERTS_KEY = "lumenx.principal-mark-alerts.v1";

export type MarkAlertRecipient = {
  teacherId: string;
  teacherName: string;
  pendingCount: number;
};

export type PrincipalMarkAlert = {
  id: string;
  createdAt: string;
  title: string;
  body: string;
  recipients: MarkAlertRecipient[];
};

export function loadPrincipalMarkAlerts(): PrincipalMarkAlert[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(PRINCIPAL_MARK_ALERTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as PrincipalMarkAlert[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function savePrincipalMarkAlerts(alerts: PrincipalMarkAlert[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(PRINCIPAL_MARK_ALERTS_KEY, JSON.stringify(alerts.slice(0, 50)));
  } catch {
    // Ignore quota / private mode.
  }
}

export function pushPrincipalMarkAlert(input: {
  recipients: MarkAlertRecipient[];
  title?: string;
  body?: string;
}): PrincipalMarkAlert | null {
  if (input.recipients.length === 0) return null;
  const names = input.recipients.map((r) => r.teacherName).join(", ");
  const totalPending = input.recipients.reduce((a, r) => a + r.pendingCount, 0);
  const alert: PrincipalMarkAlert = {
    id: `pma-${Date.now()}`,
    createdAt: new Date().toISOString(),
    title: input.title ?? "Action required: submit pending marks",
    body:
      input.body ??
      `The principal has requested that you update and submit your pending exam marks (${totalPending} paper${totalPending === 1 ? "" : "s"} still waiting). Please enter marks in Connect → Marks and submit them for review.`,
    recipients: input.recipients,
  };
  // Keep newest first
  const next = [alert, ...loadPrincipalMarkAlerts()];
  savePrincipalMarkAlerts(next);
  void names;
  return alert;
}

function normName(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/** Alerts addressed to this teacher (by id or name). */
export function principalMarkAlertsForTeacher(
  teacherId: string | null | undefined,
  teacherName: string | null | undefined,
): PrincipalMarkAlert[] {
  const id = (teacherId ?? "").trim();
  const name = normName(teacherName ?? "");
  if (!id && !name) return [];
  return loadPrincipalMarkAlerts().filter((alert) =>
    alert.recipients.some((r) => {
      if (id && r.teacherId === id) return true;
      if (name && normName(r.teacherName) === name) return true;
      return false;
    }),
  );
}

export function pendingCountForTeacherInAlert(
  alert: PrincipalMarkAlert,
  teacherId: string | null | undefined,
  teacherName: string | null | undefined,
): number {
  const id = (teacherId ?? "").trim();
  const name = normName(teacherName ?? "");
  const hit = alert.recipients.find(
    (r) => (id && r.teacherId === id) || (name && normName(r.teacherName) === name),
  );
  return hit?.pendingCount ?? 0;
}
