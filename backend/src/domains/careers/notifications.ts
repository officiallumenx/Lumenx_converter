import type { SupabaseClient } from "@supabase/supabase-js";
import { findInstituteById } from "../identity/repository.js";
import { emitNotificationForInstituteSystem } from "../notifications/service.js";
import { findJobById } from "./repository.js";
import type {
  CareerApplicationRow,
  CareerApplicationStatus,
} from "./types.js";

const STATUS_LABELS: Record<CareerApplicationStatus, string> = {
  draft: "Draft",
  submitted: "Submitted",
  under_review: "Under review",
  shortlisted: "Shortlisted",
  assessment: "Assessment",
  demo_class: "Demo class",
  interview_scheduled: "Interview scheduled",
  interview_completed: "Interview completed",
  offer_sent: "Offer sent",
  offer_accepted: "Offer accepted",
  selected: "Selected",
  rejected: "Not selected",
  on_hold: "On hold",
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
  application: CareerApplicationRow,
  previousStatus: CareerApplicationStatus,
  nextStatus: CareerApplicationStatus,
  jobTitle: string,
  instituteName: string,
): TransitionNotice | null {
  const applicationId = shortApplicationId(application.id);
  const baseKey = `career-app-${application.id}-${previousStatus}-${nextStatus}`;

  if (nextStatus === "submitted" && previousStatus === "draft") {
    return {
      title: "Application submitted",
      body: `Your application ${applicationId} for ${jobTitle} at ${instituteName} has been submitted.`,
      priority: "success",
      deepLink: "/applications",
      dedupeKey: baseKey,
    };
  }
  if (nextStatus === "shortlisted") {
    return {
      title: "Shortlisted",
      body: `You have been shortlisted for ${jobTitle} at ${instituteName} (${applicationId}).`,
      priority: "important",
      deepLink: "/applications",
      dedupeKey: baseKey,
    };
  }
  if (
    nextStatus === "interview_scheduled" ||
    nextStatus === "interview_completed"
  ) {
    const detail =
      nextStatus === "interview_scheduled"
        ? "Interview scheduled"
        : "Interview completed";
    return {
      title: "Interview update",
      body: `${jobTitle} at ${instituteName}: ${detail} (${applicationId}).`,
      priority: "important",
      deepLink: "/applications",
      dedupeKey: baseKey,
    };
  }
  if (nextStatus === "selected" || nextStatus === "offer_accepted") {
    return {
      title: "Selected",
      body: `Congratulations — selected for ${jobTitle} at ${instituteName} (${applicationId}).`,
      priority: "success",
      deepLink: "/applications",
      dedupeKey: baseKey,
    };
  }
  if (nextStatus === "offer_sent") {
    return {
      title: "Onboarding / joining update",
      body: `${jobTitle} at ${instituteName}: Offer sent (${applicationId}).`,
      priority: "important",
      deepLink: "/applications",
      dedupeKey: baseKey,
    };
  }
  if (nextStatus === "rejected") {
    const note = application.decision_note?.trim();
    const suffix = note ? ` — ${note}` : "";
    return {
      title: "Application not selected",
      body: `${jobTitle} at ${instituteName}: your application was not selected (${applicationId})${suffix}.`,
      priority: "important",
      deepLink: "/applications",
      dedupeKey: baseKey,
    };
  }
  if (nextStatus === "withdrawn") {
    return {
      title: "Application withdrawn",
      body: `${applicationId} for ${jobTitle} at ${instituteName} was withdrawn.`,
      priority: "normal",
      deepLink: "/applications",
      dedupeKey: baseKey,
    };
  }

  const statusLabel = STATUS_LABELS[nextStatus] ?? nextStatus;
  return {
    title: "Application status update",
    body: `${applicationId} for ${jobTitle} is now ${statusLabel}.`,
    priority: "normal",
    deepLink: "/applications",
    dedupeKey: baseKey,
  };
}

async function emitCareerNotice(
  admin: SupabaseClient,
  actorUserId: string,
  application: CareerApplicationRow,
  notice: TransitionNotice,
): Promise<void> {
  const applicantId = application.applicant_user_id;
  if (!applicantId) return;
  try {
    await emitNotificationForInstituteSystem(admin, actorUserId, {
      instituteId: application.institute_id,
      recipientUserIds: [applicantId],
      category: "careers",
      priority: notice.priority,
      title: notice.title,
      body: notice.body,
      deepLink: notice.deepLink,
      dedupeKey: notice.dedupeKey,
      payload: {
        applicationId: application.id,
        jobId: application.job_id,
      },
    });
  } catch {
    /* notification delivery must not block careers writes */
  }
}

export async function emitCareerApplicationTransitionNotification(
  admin: SupabaseClient,
  actorUserId: string,
  input: {
    application: CareerApplicationRow;
    previousStatus: CareerApplicationStatus;
  },
): Promise<void> {
  if (input.application.status === input.previousStatus) return;

  const [job, institute] = await Promise.all([
    findJobById(admin, input.application.job_id),
    findInstituteById(admin, input.application.institute_id),
  ]);
  const jobTitle = job?.title?.trim() || "the role";
  const instituteName = institute?.name?.trim() || "the institute";
  const notice = buildTransitionNotice(
    input.application,
    input.previousStatus,
    input.application.status,
    jobTitle,
    instituteName,
  );
  if (!notice) return;
  await emitCareerNotice(admin, actorUserId, input.application, notice);
}

export async function emitCareerApplicationCreatedNotification(
  admin: SupabaseClient,
  actorUserId: string,
  application: CareerApplicationRow,
): Promise<void> {
  if (application.status !== "submitted") return;
  await emitCareerApplicationTransitionNotification(admin, actorUserId, {
    application,
    previousStatus: "draft",
  });
}
