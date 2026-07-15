/** ─────────────────────────────────────────────────────────────
 *  LumenX Admin — Pending Verification (demo status layer)
 *  Mock application status for the review screen.
 *  Replace with API integration in production.
 * ───────────────────────────────────────────────────────────── */

import { loadSubmittedRegistration } from "./institute-setup-store";

export type TimelineStatus = "completed" | "current" | "upcoming";

export interface ApplicationTimelineStep {
  id: string;
  label: string;
  description: string;
  status: TimelineStatus;
  timestamp?: string;
}

export interface DemoApplicationStatus {
  applicationId: string;
  instituteName: string;
  registrationDate: string;
  overallStatus: "under_review";
  overallLabel: string;
  estimatedReviewDays: string;
  timeline: ApplicationTimelineStep[];
  lastCheckedAt: string | null;
}

function formatDisplayDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
  } catch {
    return iso;
  }
}

function addHours(iso: string, hours: number): string {
  const d = new Date(iso);
  d.setHours(d.getHours() + hours);
  return d.toISOString();
}

function buildTimeline(submittedAt: string): ApplicationTimelineStep[] {
  return [
    {
      id: "submitted",
      label: "Application Submitted",
      description: "Your institute registration was received successfully.",
      status: "completed",
      timestamp: submittedAt,
    },
    {
      id: "profile",
      label: "Profile Validated",
      description: "Institute details, location, and principal information verified.",
      status: "completed",
      timestamp: addHours(submittedAt, 2),
    },
    {
      id: "review",
      label: "Institute Under Review",
      description: "Our onboarding team is reviewing your application and documents.",
      status: "current",
      timestamp: addHours(submittedAt, 4),
    },
    {
      id: "compliance",
      label: "Compliance Check",
      description: "Education board affiliation and institute credentials validation.",
      status: "upcoming",
    },
    {
      id: "activation",
      label: "Account Activation",
      description: "Dashboard access enabled and welcome email sent.",
      status: "upcoming",
    },
  ];
}

export function getDemoApplicationStatus(): DemoApplicationStatus {
  const submission = loadSubmittedRegistration();
  const submittedAt = submission?.submittedAt ?? new Date().toISOString();
  const instituteName =
    submission?.form.instituteName?.trim() || "Your Institute";

  return {
    applicationId: submission?.referenceId ?? `LX-APP-${Date.now().toString(36).toUpperCase().slice(-8)}`,
    instituteName,
    registrationDate: submittedAt,
    overallStatus: "under_review",
    overallLabel: "Institute Under Review",
    estimatedReviewDays: "2–3 business days",
    timeline: buildTimeline(submittedAt),
    lastCheckedAt: null,
  };
}

/** Simulated status refresh — no polling, returns updated check time only. */
export async function refreshDemoApplicationStatus(
  current: DemoApplicationStatus,
): Promise<DemoApplicationStatus> {
  await new Promise((r) => setTimeout(r, 850));
  return {
    ...current,
    lastCheckedAt: new Date().toISOString(),
  };
}

export function formatTimelineTime(iso?: string): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return null;
  }
}

export { formatDisplayDate };

export const SUPPORT_CONTACT = {
  email: "support@lumenx.app",
  phone: "+91 80 4567 8900",
  hours: "Mon – Fri, 9 AM – 6 PM IST",
  helpCenter: "help.lumenx.app",
} as const;
