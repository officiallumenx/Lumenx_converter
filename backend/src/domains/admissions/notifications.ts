import type { SupabaseClient } from "@supabase/supabase-js";
import { findInstituteById } from "../identity/repository.js";
import { emitNotificationForInstituteSystem } from "../notifications/service.js";
import type {
  AdmissionApplicationRow,
  AdmissionApplicationStatus,
} from "./types.js";

const STATUS_LABELS: Record<AdmissionApplicationStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  review: "Under review",
  verification: "Verification",
  parent_confirmation: "Parent confirmation",
  waitlisted: "Waitlisted",
  approved: "Approved",
  rejected: "Not selected",
  withdrawn: "Withdrawn",
};

function shortApplicationId(id: string): string {
  return id.slice(0, 8).toUpperCase();
}

type TransitionNotice = {
  title: string;
  body: string;
  priority: "normal" | "important" | "success";
  deepLink: string;
  dedupeKey: string;
};

function buildTransitionNotice(
  application: AdmissionApplicationRow,
  previousStatus: AdmissionApplicationStatus,
  nextStatus: AdmissionApplicationStatus,
  instituteName: string,
): TransitionNotice | null {
  const applicationId = shortApplicationId(application.id);
  const studentName = application.student_display_name.trim() || "Student";
  const baseKey = `adm-app-${application.id}-${previousStatus}-${nextStatus}`;

  if (nextStatus === "submitted" && previousStatus === "draft") {
    return {
      title: "Application submitted",
      body: `${applicationId} for ${studentName} received.`,
      priority: "normal",
      deepLink: "/admissions/applications",
      dedupeKey: baseKey,
    };
  }
  if (nextStatus === "parent_confirmation") {
    return {
      title: "Parent confirmation required",
      body: `${applicationId} is ready. Please confirm or reject in the admissions portal.`,
      priority: "important",
      deepLink: "/admissions/applications",
      dedupeKey: baseKey,
    };
  }
  if (nextStatus === "approved") {
    return {
      title: "Application approved",
      body: `${applicationId} for ${studentName} has been approved.`,
      priority: "success",
      deepLink: "/admissions/applications",
      dedupeKey: baseKey,
    };
  }
  if (nextStatus === "rejected") {
    const note = application.decision_note?.trim();
    const reasonSuffix = note ? `: ${note}` : "";
    return {
      title: "Application not selected",
      body: `${applicationId} for ${studentName} was not selected${reasonSuffix}.`,
      priority: "important",
      deepLink: "/admissions/applications",
      dedupeKey: baseKey,
    };
  }
  if (nextStatus === "waitlisted") {
    return {
      title: "Added to waitlist",
      body: `${applicationId} joined the waitlist at ${instituteName}.`,
      priority: "normal",
      deepLink: "/admissions/applications",
      dedupeKey: baseKey,
    };
  }
  if (nextStatus === "withdrawn") {
    return {
      title: "Application withdrawn",
      body: `${applicationId} for ${studentName} was withdrawn.`,
      priority: "normal",
      deepLink: "/admissions/applications",
      dedupeKey: baseKey,
    };
  }

  const statusLabel = STATUS_LABELS[nextStatus] ?? nextStatus;
  return {
    title: "Application status update",
    body: `${applicationId} for ${studentName} is now ${statusLabel}.`,
    priority: "normal",
    deepLink: "/admissions/applications",
    dedupeKey: baseKey,
  };
}

async function emitAdmissionNotice(
  admin: SupabaseClient,
  actorUserId: string,
  application: AdmissionApplicationRow,
  notice: TransitionNotice,
): Promise<void> {
  const applicantId = application.applicant_user_id;
  if (!applicantId) return;
  try {
    await emitNotificationForInstituteSystem(admin, actorUserId, {
      instituteId: application.institute_id,
      recipientUserIds: [applicantId],
      category: "admissions",
      priority: notice.priority,
      title: notice.title,
      body: notice.body,
      deepLink: notice.deepLink,
      dedupeKey: notice.dedupeKey,
      payload: {
        applicationId: application.id,
        status: application.status,
      },
    });
  } catch {
    /* notification delivery must not block admissions writes */
  }
}

export async function emitAdmissionApplicationTransitionNotification(
  admin: SupabaseClient,
  actorUserId: string,
  input: {
    application: AdmissionApplicationRow;
    previousStatus: AdmissionApplicationStatus;
  },
): Promise<void> {
  if (input.application.status === input.previousStatus) return;

  const institute = await findInstituteById(admin, input.application.institute_id);
  const instituteName = institute?.name?.trim() || "the institute";
  const notice = buildTransitionNotice(
    input.application,
    input.previousStatus,
    input.application.status,
    instituteName,
  );
  if (!notice) return;
  await emitAdmissionNotice(admin, actorUserId, input.application, notice);
}

export async function emitAdmissionApplicationCreatedNotification(
  admin: SupabaseClient,
  actorUserId: string,
  application: AdmissionApplicationRow,
): Promise<void> {
  if (application.status !== "submitted") return;
  const institute = await findInstituteById(admin, application.institute_id);
  const instituteName = institute?.name?.trim() || "the institute";
  const notice = buildTransitionNotice(
    application,
    "draft",
    "submitted",
    instituteName,
  );
  if (!notice) return;
  await emitAdmissionNotice(admin, actorUserId, application, notice);
}
