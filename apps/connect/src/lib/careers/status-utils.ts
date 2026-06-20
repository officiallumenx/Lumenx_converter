import type { ApplicationStatus, DocumentVerificationStatus, InterviewMode } from "./types";

export const STATUS_ORDER: ApplicationStatus[] = [
  "draft",
  "submitted",
  "under_review",
  "shortlisted",
  "assessment",
  "demo_class",
  "interview_scheduled",
  "interview_completed",
  "offer_sent",
  "offer_accepted",
  "selected",
  "on_hold",
  "rejected",
];

const LEGACY_STATUS_MAP: Record<string, ApplicationStatus> = {
  selected: "offer_accepted",
};

export function normalizeApplicationStatus(status: ApplicationStatus | string): ApplicationStatus {
  return (LEGACY_STATUS_MAP[status] ?? status) as ApplicationStatus;
}

export function statusLabel(status: ApplicationStatus | string): string {
  const s = normalizeApplicationStatus(status);
  const labels: Partial<Record<ApplicationStatus, string>> = {
    under_review: "Under Review",
    shortlisted: "Shortlisted",
    assessment: "Assessment",
    demo_class: "Demo Class",
    interview_scheduled: "Interview Scheduled",
    interview_completed: "Interview Completed",
    offer_sent: "Offer Sent",
    offer_accepted: "Offer Accepted",
    on_hold: "On Hold",
  };
  if (labels[s]) return labels[s]!;
  return s.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function statusTone(
  status: ApplicationStatus | string,
): "default" | "secondary" | "destructive" | "outline" {
  const s = normalizeApplicationStatus(status);
  switch (s) {
    case "offer_accepted":
    case "selected":
      return "default";
    case "rejected":
      return "destructive";
    case "draft":
    case "on_hold":
      return "secondary";
    case "interview_scheduled":
    case "shortlisted":
    case "assessment":
    case "demo_class":
    case "offer_sent":
      return "outline";
    default:
      return "default";
  }
}

export function documentStatusLabel(status: DocumentVerificationStatus): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function interviewModeLabel(mode: InterviewMode): string {
  switch (mode) {
    case "in_person":
      return "In person";
    case "phone":
      return "Phone";
    case "video":
      return "Video";
  }
}

export function isTerminalStatus(status: ApplicationStatus | string): boolean {
  const s = normalizeApplicationStatus(status);
  return s === "offer_accepted" || s === "selected" || s === "rejected";
}

export function getStatusProgress(status: ApplicationStatus | string): number {
  const s = normalizeApplicationStatus(status);
  const idx = STATUS_ORDER.indexOf(s);
  if (idx < 0) return 0;
  const activeIdx = s === "rejected" || s === "on_hold" ? idx : idx;
  return Math.round(((activeIdx + 1) / (STATUS_ORDER.length - 1)) * 100);
}

export function getActivePipelineStatuses(): ApplicationStatus[] {
  return STATUS_ORDER.filter((s) => s !== "draft" && s !== "rejected" && s !== "on_hold");
}
