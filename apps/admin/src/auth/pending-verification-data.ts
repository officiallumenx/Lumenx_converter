/** ─────────────────────────────────────────────────────────────
 *  LumenX Admin — Pending Verification status (shared registration store)
 * ───────────────────────────────────────────────────────────── */

import {
  findInstituteRegistrationByEmail,
  type InstituteRegistrationApplication,
} from "@lumenx/utils";
import { isApiAuthMode } from "./auth-mode";
import {
  getApiRegistrationView,
  syncApiRegistrationFromBackend,
} from "./api-registration-state";
import type { InstituteRegistrationDto } from "@/lib/registrations/types";
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

export type ApplicationStatusLoadState = "loading" | "ready" | "error";

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
  loadState: ApplicationStatusLoadState;
  errorMessage?: string;
}

function loadingApplicationStatus(): DemoApplicationStatus {
  return {
    applicationId: "—",
    instituteName: "Your Institute",
    registrationDate: new Date().toISOString(),
    overallStatus: "under_review",
    overallLabel: "Institute Registration Under Review",
    estimatedReviewDays: "1–2 business days",
    timeline: [],
    lastCheckedAt: null,
    application: null,
    loadState: "loading",
  };
}

function errorApplicationStatus(message: string): DemoApplicationStatus {
  return {
    applicationId: "—",
    instituteName: "Your Institute",
    registrationDate: new Date().toISOString(),
    overallStatus: "under_review",
    overallLabel: "Unable to load registration status",
    estimatedReviewDays: "—",
    timeline: [],
    lastCheckedAt: null,
    application: null,
    loadState: "error",
    errorMessage: message,
  };
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

function buildTimelineFromApiRegistration(
  registration: InstituteRegistrationDto,
): ApplicationTimelineStep[] {
  const submittedAt = registration.createdAt;
  if (registration.status === "approved") {
    return buildTimeline(
      {
        status: "approved",
        reviewedAt: registration.reviewedAt ?? undefined,
      } as InstituteRegistrationApplication,
      submittedAt,
    );
  }
  if (registration.status === "rejected") {
    return buildTimeline(
      {
        status: "rejected",
        reviewedAt: registration.reviewedAt ?? undefined,
        rejectionReason: registration.rejectionReason ?? undefined,
      } as InstituteRegistrationApplication,
      submittedAt,
    );
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

function getApplicationStatusFromApiRegistration(
  registration: InstituteRegistrationDto,
): DemoApplicationStatus {
  const submittedAt = registration.createdAt;
  const instituteName =
    registration.payload.instituteName?.trim() || "Your Institute";
  const applicationId = registration.id;

  if (registration.status === "approved") {
    return {
      applicationId,
      instituteName,
      registrationDate: submittedAt,
      overallStatus: "approved",
      overallLabel: "Approved — Admin unlocked",
      estimatedReviewDays: "Complete",
      timeline: buildTimelineFromApiRegistration(registration),
      lastCheckedAt: null,
      approvedInstituteId: registration.instituteId ?? undefined,
      application: null,
      loadState: "ready",
    };
  }

  if (registration.status === "rejected") {
    return {
      applicationId,
      instituteName,
      registrationDate: submittedAt,
      overallStatus: "rejected",
      overallLabel: "Application declined",
      estimatedReviewDays: "—",
      timeline: buildTimelineFromApiRegistration(registration),
      lastCheckedAt: null,
      rejectionReason: registration.rejectionReason ?? undefined,
      application: null,
      loadState: "ready",
    };
  }

  return {
    applicationId,
    instituteName,
    registrationDate: submittedAt,
    overallStatus: "under_review",
    overallLabel: "Institute Registration Under Review",
    estimatedReviewDays: "1–2 business days",
    timeline: buildTimelineFromApiRegistration(registration),
    lastCheckedAt: null,
    application: null,
    loadState: "ready",
  };
}

function getApiApplicationStatus(): DemoApplicationStatus {
  const { snapshot, syncError, loaded, syncing } = getApiRegistrationView();

  if (!loaded || syncing || snapshot === undefined) {
    return loadingApplicationStatus();
  }

  if (syncError && !snapshot) {
    return errorApplicationStatus(syncError);
  }

  if (snapshot) {
    return getApplicationStatusFromApiRegistration(snapshot);
  }

  return errorApplicationStatus("Registration not found for this account.");
}

export function getApplicationStatusForEmail(
  email: string | undefined | null,
): DemoApplicationStatus {
  if (isApiAuthMode()) {
    void email;
    return getApiApplicationStatus();
  }

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
      loadState: "ready",
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
      loadState: "ready",
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
    loadState: "ready",
  };
}

/** Refresh from shared store (demo) or backend (API mode). */
export async function refreshApplicationStatus(
  email: string | undefined | null,
): Promise<DemoApplicationStatus> {
  if (isApiAuthMode()) {
    void email;
    try {
      const registration = await syncApiRegistrationFromBackend();
      if (registration) {
        return {
          ...getApplicationStatusFromApiRegistration(registration),
          lastCheckedAt: new Date().toISOString(),
        };
      }
      const { syncError } = getApiRegistrationView();
      if (syncError) {
        return {
          ...errorApplicationStatus(syncError),
          lastCheckedAt: new Date().toISOString(),
        };
      }
      return {
        ...errorApplicationStatus("Registration not found for this account."),
        lastCheckedAt: new Date().toISOString(),
      };
    } catch {
      const { syncError } = getApiRegistrationView();
      return {
        ...errorApplicationStatus(syncError ?? "Unable to load registration status."),
        lastCheckedAt: new Date().toISOString(),
      };
    }
  }

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
  email: "official.lumenx@gmail.com",
  phone: "+91 80 4567 8900",
  hours: "Mon – Fri, 9 AM – 6 PM IST",
  helpCenter: "help.lumenx.app",
} as const;
