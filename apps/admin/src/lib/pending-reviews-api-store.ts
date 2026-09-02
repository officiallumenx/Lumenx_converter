/**
 * API-mode pending review counts for Admin Home — fetched from existing list APIs.
 */
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/active-institute";
import { listAdmissionApplications } from "@/lib/admissions/api";
import { listCareerApplications } from "@/lib/careers/api";
import { listMarkEntries } from "@/lib/marks/api";
import { listTransportReviewQueue } from "@/lib/transport/approval-api";
import { mapCareerStatusToStage } from "@/lib/careers/map";

export type PendingReviewsApiCounts = {
  submittedMarks: number;
  pendingTeacherLeave: number;
  pendingAdmissionConverts: number;
  pendingCareerHires: number;
  pendingTransportStops: number;
  pendingTransportAssignments: number;
};

const EMPTY_COUNTS: PendingReviewsApiCounts = {
  submittedMarks: 0,
  pendingTeacherLeave: 0,
  pendingAdmissionConverts: 0,
  pendingCareerHires: 0,
  pendingTransportStops: 0,
  pendingTransportAssignments: 0,
};

let counts: PendingReviewsApiCounts = { ...EMPTY_COUNTS };
let instituteId: string | null = null;
const listeners = new Set<() => void>();

function notify(): void {
  for (const listener of listeners) {
    listener();
  }
}

export function getPendingReviewsApiCounts(): PendingReviewsApiCounts {
  return counts;
}

export function getPendingReviewsApiInstituteId(): string | null {
  return instituteId;
}

export function subscribePendingReviewsApi(listener: () => void): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export async function refreshPendingReviewsApi(
  activeInstituteId: string | null,
  pendingLeaveFromAnalytics = 0,
): Promise<void> {
  if (!isApiAuthMode() || !activeInstituteId || !isInstituteUuid(activeInstituteId)) {
    instituteId = null;
    counts = { ...EMPTY_COUNTS };
    notify();
    return;
  }

  try {
    const [markEntries, admissions, careers, transportQueue] = await Promise.all([
      listMarkEntries({ instituteId: activeInstituteId, status: "submitted" }),
      listAdmissionApplications({ instituteId: activeInstituteId }),
      listCareerApplications({ instituteId: activeInstituteId }),
      listTransportReviewQueue({ instituteId: activeInstituteId }),
    ]);

    instituteId = activeInstituteId;
    counts = {
      submittedMarks: markEntries.length,
      pendingTeacherLeave: pendingLeaveFromAnalytics,
      pendingAdmissionConverts: admissions.filter(
        (row) => row.status === "approved" && !row.convertedStudentId,
      ).length,
      pendingCareerHires: careers.filter(
        (row) => mapCareerStatusToStage(row.status) === "approved" && !row.convertedTeacherId,
      ).length,
      pendingTransportStops: transportQueue.filter(
        (item) => item.kind === "stop" && item.item.approvalStatus === "pending",
      ).length,
      pendingTransportAssignments: transportQueue.filter(
        (item) => item.kind === "enrollment" && item.item.approvalStatus === "pending",
      ).length,
    };
    notify();
  } catch {
    instituteId = activeInstituteId;
    counts = {
      ...EMPTY_COUNTS,
      pendingTeacherLeave: pendingLeaveFromAnalytics,
    };
    notify();
  }
}

export function syncPendingReviewsApi(
  activeInstituteId: string | null,
  pendingLeaveFromAnalytics = 0,
): void {
  if (!isApiAuthMode()) return;
  void refreshPendingReviewsApi(activeInstituteId, pendingLeaveFromAnalytics);
}
