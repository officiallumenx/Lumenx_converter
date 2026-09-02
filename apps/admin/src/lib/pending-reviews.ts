/**
 * Admin Home — Pending Reviews aggregation.
 * Actionable items requiring Admin review/decision (not operational alerts).
 */

import { ADMISSION_APPLICATIONS, CAREER_CANDIDATES } from "@/lib/admin-module-data";
import { peekAdminSyncRows, subscribeAdmissionsSync } from "@/lib/admissions-sync";
import { DEMO_COMPLAINTS_SEED } from "@/lib/complaints-data";
import {
  getAdminComplaintsPendingCount,
  refreshAdminComplaintsPendingCount,
  subscribeAdminComplaintsPendingCount,
} from "@/lib/complaints/pending-count-store";
import {
  getPendingReviewsApiCounts,
  refreshPendingReviewsApi,
  subscribePendingReviewsApi,
  syncPendingReviewsApi,
} from "@/lib/pending-reviews-api-store";
import { isApiAuthMode } from "@/auth/auth-mode";
import {
  readAdminCareerSyncRows,
  subscribeCareersSync,
  type AdminCareerStage,
  type AdminCareerSyncRow,
} from "@/lib/careers-sync";
import { getInitialTeacherLeave, type TeacherLeave } from "@/lib/leave-data";
import {
  getMarkEntriesSnapshot,
  subscribeMarkEntries,
  type MarkEntry,
} from "@/lib/marks-entry-store";
import {
  loadPendingAssignments,
  loadPendingStops,
  TRANSPORT_APPROVAL_CHANGED_EVENT,
} from "@/lib/transport-approval-store";
import {
  listenDemoSync,
  loadDemoComplaints,
  loadTeacherLeaveSnapshot,
  type DemoComplaint,
} from "@lumenx/utils";

export type PendingReviewItem = {
  id: string;
  label: string;
  detail: string;
  to: string;
  search?: Record<string, string>;
  count: number;
};

const ROUTE_SETUP_KEY = "lumenx.transport.route-setup.v1";

export function countSubmittedMarks(entries: MarkEntry[]): number {
  return entries.filter((e) => e.status === "submitted").length;
}

export function countPendingTeacherLeave(rows: TeacherLeave[]): number {
  return rows.filter((r) => r.status === "pending").length;
}

/** Principal/Admin queue — pending or under review, not resolved. */
export function countAdminComplaints(complaints: DemoComplaint[]): number {
  return complaints.filter(
    (c) =>
      c.destination === "principal_admin" &&
      (c.status === "pending" || c.status === "review"),
  ).length;
}

export function countPendingAdmissionConverts(): number {
  return peekAdminSyncRows(ADMISSION_APPLICATIONS).filter((row) => row.stage === "approved").length;
}

export function countPendingCareerHires(): number {
  return readAdminCareerSyncRows(
    CAREER_CANDIDATES.map((row) => ({
      id: row.id,
      name: row.name,
      role: row.role,
      stage: row.stage as AdminCareerStage,
      applied: row.applied,
      docs: row.docs,
    })) as AdminCareerSyncRow[],
  ).filter((row) => row.stage === "approved").length;
}

export function buildPendingReviews(input: {
  submittedMarks: number;
  pendingTeacherLeave: number;
  adminComplaints: number;
  pendingAdmissionConverts: number;
  pendingCareerHires: number;
  pendingTransportStops: number;
  pendingTransportAssignments: number;
}): PendingReviewItem[] {
  const rows: PendingReviewItem[] = [];

  if (input.submittedMarks > 0) {
    rows.push({
      id: "marks-review",
      label: "Marks ready for review",
      detail: "Approve, Reject, or Return — Admin cannot edit scores",
      to: "/marks",
      count: input.submittedMarks,
    });
  }

  if (input.pendingTeacherLeave > 0) {
    rows.push({
      id: "teacher-leave",
      label: "Teacher leave requests",
      detail: "Accept, reject, or ignore pending teacher leave",
      to: "/leave",
      count: input.pendingTeacherLeave,
    });
  }

  if (input.adminComplaints > 0) {
    rows.push({
      id: "complaints-admin",
      label: "Complaints for Admin",
      detail: "Principal/Admin queue · pending or under review",
      to: "/complaints",
      count: input.adminComplaints,
    });
  }

  if (input.pendingAdmissionConverts > 0) {
    rows.push({
      id: "admissions-convert",
      label: "Approved admissions",
      detail: "Convert approved applicants into the student directory",
      to: "/admissions",
      count: input.pendingAdmissionConverts,
    });
  }

  if (input.pendingCareerHires > 0) {
    rows.push({
      id: "careers-hire",
      label: "Approved careers",
      detail: "Hire approved applicants into the teacher directory",
      to: "/careers",
      count: input.pendingCareerHires,
    });
  }

  if (input.pendingTransportStops > 0) {
    rows.push({
      id: "transport-stops",
      label: "Pending transport stops",
      detail: "Driver-submitted stops awaiting individual approval",
      to: "/transport",
      search: { view: "reviews" },
      count: input.pendingTransportStops,
    });
  }

  if (input.pendingTransportAssignments > 0) {
    rows.push({
      id: "transport-assignments",
      label: "Pending student assignments",
      detail: "Driver-submitted stop assignments awaiting approval",
      to: "/transport",
      search: { view: "reviews" },
      count: input.pendingTransportAssignments,
    });
  }

  return rows;
}

let pendingReviewsSnapshot: PendingReviewItem[] | null = null;
let pendingReviewsFingerprint: string | null = null;

function invalidatePendingReviewsSnapshot(): void {
  pendingReviewsSnapshot = null;
  pendingReviewsFingerprint = null;
}

function readPendingReviewInputs() {
  const teacherLeave = loadTeacherLeaveSnapshot(getInitialTeacherLeave());
  const complaints = loadDemoComplaints(DEMO_COMPLAINTS_SEED);
  if (isApiAuthMode()) {
    const apiCounts = getPendingReviewsApiCounts();
    return {
      submittedMarks: apiCounts.submittedMarks,
      pendingTeacherLeave: apiCounts.pendingTeacherLeave,
      adminComplaints: getAdminComplaintsPendingCount(),
      pendingAdmissionConverts: apiCounts.pendingAdmissionConverts,
      pendingCareerHires: apiCounts.pendingCareerHires,
      pendingTransportStops: apiCounts.pendingTransportStops,
      pendingTransportAssignments: apiCounts.pendingTransportAssignments,
    };
  }
  return {
    submittedMarks: countSubmittedMarks(getMarkEntriesSnapshot()),
    pendingTeacherLeave: countPendingTeacherLeave(teacherLeave),
    adminComplaints: countAdminComplaints(complaints),
    pendingAdmissionConverts: countPendingAdmissionConverts(),
    pendingCareerHires: countPendingCareerHires(),
    pendingTransportStops: loadPendingStops().length,
    pendingTransportAssignments: loadPendingAssignments().length,
  };
}

/** Call when institute context is ready in API mode. */
export function syncPendingReviewsComplaintsApi(
  instituteId: string | null,
  pendingLeaveFromAnalytics = 0,
): void {
  if (!isApiAuthMode()) return;
  void refreshAdminComplaintsPendingCount(instituteId);
  syncPendingReviewsApi(instituteId, pendingLeaveFromAnalytics);
}

export function loadPendingReviews(): PendingReviewItem[] {
  const input = readPendingReviewInputs();
  const fingerprint = JSON.stringify(input);
  if (pendingReviewsSnapshot && pendingReviewsFingerprint === fingerprint) {
    return pendingReviewsSnapshot;
  }
  pendingReviewsFingerprint = fingerprint;
  pendingReviewsSnapshot = buildPendingReviews(input);
  return pendingReviewsSnapshot;
}

export function subscribePendingReviews(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};

  const notify = () => {
    invalidatePendingReviewsSnapshot();
    listener();
  };

  const onStorage = (event: StorageEvent) => {
    if (
      event.key === ROUTE_SETUP_KEY ||
      event.key === "lumenx.demo.complaints.v1" ||
      event.key === "lumenx.demo.teacher-leave.v1" ||
      event.key === null
    ) {
      notify();
    }
  };

  const onTransportApproval = () => notify();

  window.addEventListener("storage", onStorage);
  window.addEventListener(TRANSPORT_APPROVAL_CHANGED_EVENT, onTransportApproval);

  const unsubs = [
    subscribeMarkEntries(notify),
    subscribeAdmissionsSync(notify),
    subscribeCareersSync(notify),
    listenDemoSync("leave", notify),
    listenDemoSync("complaints", notify),
    subscribeAdminComplaintsPendingCount(notify),
    subscribePendingReviewsApi(notify),
  ];

  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener(TRANSPORT_APPROVAL_CHANGED_EVENT, onTransportApproval);
    for (const unsub of unsubs) unsub();
  };
}
