/**
 * Admissions lifecycle notifications → existing portal inbox key.
 * Reuses registry templates; does not change storage key.
 */
import { createLumenXNotification } from "../shared/adapters";
import { getPublishedTemplate, renderNotificationTemplate } from "../shared/registry";
import { NOTIFICATION_TEMPLATE_IDS as IDS } from "../shared/registry/ids";
import type { LumenXNotification } from "../shared/types";

export const ADMISSIONS_NOTIFICATIONS_KEY = "ues_admissions_notifications";

export type AdmissionsPortalNotifType =
  | "application"
  | "document"
  | "confirmation"
  | "approval"
  | "rejection"
  | "reminder"
  | "general";

export type AdmissionsPortalNotification = {
  id: string;
  applicantId: string;
  applicationId?: string;
  templateId?: string;
  title: string;
  body: string;
  type: AdmissionsPortalNotifType;
  read: boolean;
  createdAt: string;
};

export type AdmissionsLifecycleEvent =
  | "application_received"
  | "status_update"
  | "interview"
  | "selected"
  | "rejected"
  | "admission_completed"
  | "missing_information"
  | "parent_confirmation"
  | "approved";

function canUseStorage(): boolean {
  try {
    return typeof localStorage !== "undefined" && localStorage != null;
  } catch {
    return false;
  }
}

function loadAll(): AdmissionsPortalNotification[] {
  if (!canUseStorage()) return [];
  try {
    const raw = localStorage.getItem(ADMISSIONS_NOTIFICATIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AdmissionsPortalNotification[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAll(items: AdmissionsPortalNotification[]): void {
  if (!canUseStorage()) return;
  try {
    localStorage.setItem(ADMISSIONS_NOTIFICATIONS_KEY, JSON.stringify(items.slice(0, 200)));
  } catch {
    /* ignore */
  }
}

export function pushAdmissionsPortalNotification(
  input: Omit<AdmissionsPortalNotification, "id" | "read" | "createdAt"> & { id?: string },
): AdmissionsPortalNotification {
  const row: AdmissionsPortalNotification = {
    ...input,
    id: input.id ?? `n-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    read: false,
    createdAt: new Date().toISOString(),
  };
  const all = loadAll().filter((n) => n.id !== row.id);
  saveAll([row, ...all]);
  return row;
}

function mapEvent(event: AdmissionsLifecycleEvent): {
  templateId: string;
  type: AdmissionsPortalNotifType;
} {
  switch (event) {
    case "application_received":
      return { templateId: IDS.admissions.parent.applicationSubmitted, type: "application" };
    case "interview":
      return { templateId: IDS.admissions.parent.interviewScheduled, type: "reminder" };
    case "selected":
      return { templateId: IDS.admissions.parent.selected, type: "approval" };
    case "rejected":
      return { templateId: IDS.admissions.parent.rejected, type: "rejection" };
    case "admission_completed":
      return { templateId: IDS.admissions.parent.admissionCompleted, type: "approval" };
    case "missing_information":
      return { templateId: IDS.admissions.parent.missingInformation, type: "document" };
    case "parent_confirmation":
      return { templateId: IDS.admissions.parent.parentConfirmationRequired, type: "confirmation" };
    case "approved":
      return { templateId: IDS.admissions.parent.applicationApproved, type: "approval" };
    default:
      return { templateId: IDS.admissions.parent.statusUpdate, type: "general" };
  }
}

/** Admin / Connect stage → lifecycle event. */
export function admissionsStageToLifecycle(
  stage: string,
): AdmissionsLifecycleEvent | null {
  switch (stage) {
    case "submitted":
      return "application_received";
    case "review":
    case "waitlisted":
    case "withdrawn":
      return "status_update";
    case "verification":
    case "interview_scheduled":
    case "interview_completed":
      return "interview";
    case "parent_confirmation":
      return "parent_confirmation";
    case "approved":
      return "admission_completed";
    case "rejected":
      return "rejected";
    case "documents_pending":
    case "documents_uploaded":
      return "missing_information";
    default:
      return "status_update";
  }
}

export function notifyAdmissionsLifecycle(input: {
  event: AdmissionsLifecycleEvent;
  applicantId: string;
  applicationId: string;
  studentName?: string;
  instituteName?: string;
  statusLabel?: string;
  detail?: string;
  reason?: string;
}): { portal: AdmissionsPortalNotification; foundation: LumenXNotification } {
  const { templateId, type } = mapEvent(input.event);
  const reasonSuffix = input.reason?.trim() ? ` — ${input.reason.trim()}` : "";
  const rendered = renderNotificationTemplate({
    templateId,
    variables: {
      applicationId: input.applicationId,
      studentName: input.studentName ?? "Applicant",
      instituteName: input.instituteName ?? "the institute",
      statusLabel: input.statusLabel ?? input.event.replace(/_/g, " "),
      detail: input.detail ?? "Please check your application for schedule details",
      reason: input.reason ?? "Additional information required",
      reasonSuffix,
      days: 7,
    },
  });

  const portal = pushAdmissionsPortalNotification({
    id: `adm-${input.event}-${input.applicationId}`,
    applicantId: input.applicantId,
    applicationId: input.applicationId,
    templateId: rendered.id,
    title: rendered.title,
    body: rendered.body,
    type,
  });

  const foundation = createLumenXNotification({
    id: portal.id,
    category: "admissions",
    title: portal.title,
    message: portal.body,
    source: "admissions",
    audience: "parent",
    priority: getPublishedTemplate(templateId)?.priority ?? "normal",
    href: "/admissions/applications",
    templateId: rendered.id,
    metadata: {
      applicationId: input.applicationId,
      applicantId: input.applicantId,
      event: input.event,
    },
  });

  return { portal, foundation };
}
