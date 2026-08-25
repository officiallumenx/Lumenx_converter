/** ─────────────────────────────────────────────────────────────
 *  LumenX Admin — Pending Verification status (shared registration store)
 * ───────────────────────────────────────────────────────────── */

import {
  findInstituteRegistrationByEmail,
  type InstituteRegistrationApplication,
} from "@lumenx/utils";
import { loadSubmittedRegistration } from "./institute-setup-store";

export type TimelineStatus = "completed" | "current" | "upcoming";

export interface ApplicationTimelineStep {
  id: string;
  label: string;
  description: string;
  status: TimelineStatus;
  timestamp?: string;
}

export type OverallApplicationStatus =
  | "under_review"
  | "approved"
  | "rejected";

export interface DemoApplicationStatus {
  applicationId: string;
  instituteName: string;
  registrationDate: string;
  overallStatus: OverallApplicationStatus;
  overallLabel: string;
  estimatedReviewDays: string;
  timeline: ApplicationTimelineStep[];
  lastCheckedAt: string | null;
  rejectionReason?: string;
  approvedInstituteId?: string;
  application: InstituteRegistrationApplication | null;
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

function buildTimeline(
  application: InstituteRegistrationApplication | null,
  submittedAt: string,
): ApplicationTimelineStep[] {
  const status = application?.status ?? "pending";

  if (status === "approved") {
    return [
      {
        id: "submitted",
        label: "Application Submitted",
        description: "Your institute registration was received successfully.",
        status: "completed",
        timestamp: submittedAt,
      },
      {
        id: "review",
        label: "Platform Review",
        description: "Nexus reviewed your institute profile and contacts.",
        status: "completed",
        timestamp: application?.reviewedAt,
      },
      {
        id: "activation",
        label: "Account Activated",
        description: "Dashboard access is unlocked. You can enter Admin now.",
        status: "completed",
        timestamp: application?.reviewedAt,
      },
    ];
  }

  if (status === "rejected") {
    return [
      {
        id: "submitted",
        label: "Application Submitted",
        description: "Your institute registration was received successfully.",
        status: "completed",
        timestamp: submittedAt,
      },
      {
        id: "review",
        label: "Platform Review",
        description:
          application?.rejectionReason?.trim() ||
          "Your application was declined by the Nexus onboarding team.",
        status: "completed",
        timestamp: application?.reviewedAt,
      },
      {
        id: "activation",
        label: "Account Activation",
        description: "Dashboard access was not granted for this application.",
        status: "upcoming",
      },
    ];
  }

  return [
    {
      id: "submitted",
      label: "Application Submitted",
      description: "Your institute registration was received successfully.",
      status: "completed",
      timestamp: submittedAt,
    },
    {
      id: "otp",
      label: "Email & Mobile Verified",
      description: "Contact OTPs were completed before submission.",
      status: "completed",
      timestamp: submittedAt,
    },
    {
      id: "review",
      label: "Institute Under Review",
      description: "Nexus is reviewing your application. Dashboard stays locked until approval.",
      status: "current",
      timestamp: submittedAt,
    },
    {
      id: "activation",
      label: "Account Activation",
      description: "Dashboard access enabled after Nexus Approve.",
      status: "upcoming",
    },
  ];
}

export function getApplicationStatusForEmail(
  email: string | undefined | null,
): DemoApplicationStatus {
  const application = email ? findInstituteRegistrationByEmail(email) : null;
  const submission = loadSubmittedRegistration();
  const submittedAt =
    application?.submittedAt ??
    submission?.submittedAt ??
    new Date().toISOString();
  const instituteName =
    application?.payload.instituteName?.trim() ||
    submission?.form.instituteName?.trim() ||
    "Your Institute";
  const applicationId =
    application?.referenceId ??
    submission?.referenceId ??
    `LX-APP-${Date.now().toString(36).toUpperCase().slice(-8)}`;

  if (application?.status === "approved") {
    return {
      applicationId,
      instituteName,
      registrationDate: submittedAt,
      overallStatus: "approved",
      overallLabel: "Approved — Admin unlocked",
      estimatedReviewDays: "Complete",
      timeline: buildTimeline(application, submittedAt),
      lastCheckedAt: null,
      approvedInstituteId: application.approvedInstituteId,
      application,
    };
  }

  if (application?.status === "rejected") {
    return {
      applicationId,
      instituteName,
      registrationDate: submittedAt,
      overallStatus: "rejected",
      overallLabel: "Application declined",
      estimatedReviewDays: "—",
      timeline: buildTimeline(application, submittedAt),
      lastCheckedAt: null,
      rejectionReason: application.rejectionReason,
      application,
    };
  }

  return {
    applicationId,
    instituteName,
    registrationDate: submittedAt,
    overallStatus: "under_review",
    overallLabel: "Institute Under Review",
    estimatedReviewDays: "1–2 business days",
    timeline: buildTimeline(application, submittedAt),
    lastCheckedAt: null,
    application,
  };
}

/** Refresh from shared store (Admin ↔ Nexus same-origin localStorage). */
export async function refreshApplicationStatus(
  email: string | undefined | null,
): Promise<DemoApplicationStatus> {
  await new Promise((r) => setTimeout(r, 400));
  const next = getApplicationStatusForEmail(email);
  return {
    ...next,
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
