/**
 * Careers lifecycle notifications → existing portal inbox key.
 */
import { createLumenXNotification } from "../shared/adapters";
import { getPublishedTemplate, renderNotificationTemplate } from "../shared/registry";
import { NOTIFICATION_TEMPLATE_IDS as IDS } from "../shared/registry/ids";
import type { LumenXNotification } from "../shared/types";

export const CAREERS_NOTIFICATIONS_KEY = "ues_careers_notifications";

export type CareersPortalNotifType =
  | "application"
  | "interview"
  | "selection"
  | "document"
  | "general"
  | "shortlisted"
  | "demo_class"
  | "offer"
  | "profile_viewed"
  | "job_alert";

export type CareersPortalNotification = {
  id: string;
  candidateId: string;
  applicationId?: string;
  templateId?: string;
  title: string;
  body: string;
  type: CareersPortalNotifType;
  read: boolean;
  createdAt: string;
};

export type CareersLifecycleEvent =
  | "application_received"
  | "shortlisted"
  | "interview"
  | "selected"
  | "rejected"
  | "onboarding"
  | "status_update";

function canUseStorage(): boolean {
  try {
    return typeof localStorage !== "undefined" && localStorage != null;
  } catch {
    return false;
  }
}

function loadAll(): CareersPortalNotification[] {
  if (!canUseStorage()) return [];
  try {
    const raw = localStorage.getItem(CAREERS_NOTIFICATIONS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as CareersPortalNotification[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveAll(items: CareersPortalNotification[]): void {
  if (!canUseStorage()) return;
  try {
    localStorage.setItem(CAREERS_NOTIFICATIONS_KEY, JSON.stringify(items.slice(0, 200)));
  } catch {
    /* ignore */
  }
}

export function pushCareersPortalNotification(
  input: Omit<CareersPortalNotification, "id" | "read" | "createdAt"> & { id?: string },
): CareersPortalNotification {
  const row: CareersPortalNotification = {
    ...input,
    id: input.id ?? `cn-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    read: false,
    createdAt: new Date().toISOString(),
  };
  saveAll([row, ...loadAll().filter((n) => n.id !== row.id)]);
  return row;
}

function mapEvent(event: CareersLifecycleEvent): {
  templateId: string;
  type: CareersPortalNotifType;
} {
  switch (event) {
    case "application_received":
      return { templateId: IDS.careers.student.applicationSubmitted, type: "application" };
    case "shortlisted":
      return { templateId: IDS.careers.student.shortlisted, type: "shortlisted" };
    case "interview":
      return { templateId: IDS.careers.student.interview, type: "interview" };
    case "selected":
      return { templateId: IDS.careers.student.selected, type: "selection" };
    case "rejected":
      return { templateId: IDS.careers.student.rejected, type: "general" };
    case "onboarding":
      return { templateId: IDS.careers.student.onboarding, type: "offer" };
    default:
      return { templateId: IDS.careers.student.statusUpdate, type: "general" };
  }
}

export function careersStatusToLifecycle(status: string): CareersLifecycleEvent {
  switch (status) {
    case "submitted":
      return "application_received";
    case "shortlisted":
    case "verification":
      return "shortlisted";
    case "interview":
    case "interview_scheduled":
    case "demo_class":
      return "interview";
    case "approved":
    case "offer":
    case "offer_accepted":
    case "selected":
      return "selected";
    case "rejected":
      return "rejected";
    case "onboarding":
    case "joined":
    case "on_hold":
    case "waitlist":
      return "onboarding";
    default:
      return "status_update";
  }
}

export function notifyCareersLifecycle(input: {
  event: CareersLifecycleEvent;
  candidateId: string;
  applicationId: string;
  jobTitle?: string;
  instituteName?: string;
  statusLabel?: string;
  detail?: string;
}): { portal: CareersPortalNotification; foundation: LumenXNotification } {
  const { templateId, type } = mapEvent(input.event);
  const rendered = renderNotificationTemplate({
    templateId,
    variables: {
      applicationId: input.applicationId,
      jobTitle: input.jobTitle ?? "the role",
      instituteName: input.instituteName ?? "the institute",
      statusLabel: input.statusLabel ?? input.event.replace(/_/g, " "),
      detail: input.detail ?? "Please open your application for the latest update",
    },
  });

  const portal = pushCareersPortalNotification({
    id: `car-${input.event}-${input.applicationId}`,
    candidateId: input.candidateId,
    applicationId: input.applicationId,
    templateId: rendered.id,
    title: rendered.title,
    body: rendered.body,
    type,
  });

  const foundation = createLumenXNotification({
    id: portal.id,
    category: "careers",
    title: portal.title,
    message: portal.body,
    source: "careers",
    audience: "student",
    priority: getPublishedTemplate(templateId)?.priority ?? "normal",
    href: "/careers/applications",
    templateId: rendered.id,
    metadata: {
      applicationId: input.applicationId,
      candidateId: input.candidateId,
      event: input.event,
    },
  });

  return { portal, foundation };
}
