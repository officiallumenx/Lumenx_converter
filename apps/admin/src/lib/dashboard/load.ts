/**
 * Home dashboard summary — API mode counts from existing read APIs.
 */
import { isApiAuthMode } from "@/auth/auth-mode";
import { ApiClientError } from "@/lib/api";
import { isInstituteUuid } from "@/lib/active-institute";
import { listStudents } from "@/lib/students/api";
import { listTeachers } from "@/lib/teachers/api";
import { listParents } from "@/lib/parents/api";
import { listComplaints } from "@/lib/complaints/api";
import { listLeaveRequests } from "@/lib/leave/api";
import { listHomework } from "@/lib/homework/api";

export type DashboardSummary = {
  students: number;
  teachers: number;
  parents: number;
  openComplaints: number;
  pendingLeave: number;
  homeworkItems: number;
};

export type DashboardLoadStatus =
  | "demo"
  | "loading"
  | "ready"
  | "needs_institute"
  | "forbidden"
  | "error";

export type DashboardSummaryState = {
  status: DashboardLoadStatus;
  summary: DashboardSummary | null;
  errorMessage: string | null;
};

export async function loadDashboardSummary(
  activeInstituteId: string | null,
): Promise<DashboardSummaryState> {
  if (!isApiAuthMode()) {
    return { status: "demo", summary: null, errorMessage: null };
  }
  if (!activeInstituteId || !isInstituteUuid(activeInstituteId)) {
    return { status: "needs_institute", summary: null, errorMessage: null };
  }
  try {
    const instituteId = activeInstituteId;
    const [students, teachers, parents, complaints, leave, homework] = await Promise.all([
      listStudents({ instituteId }),
      listTeachers({ instituteId }),
      listParents({ instituteId }),
      listComplaints({ instituteId }),
      listLeaveRequests({ instituteId }),
      listHomework({ instituteId }),
    ]);
    const openComplaints = complaints.filter(
      (c) => c.status === "pending" || c.status === "review" || c.status === "forwarded",
    ).length;
    const pendingLeave = leave.filter((r) => r.status === "pending").length;
    return {
      status: "ready",
      summary: {
        students: students.length,
        teachers: teachers.length,
        parents: parents.length,
        openComplaints,
        pendingLeave,
        homeworkItems: homework.length,
      },
      errorMessage: null,
    };
  } catch (err) {
    const status =
      err instanceof ApiClientError
        ? err.status
        : err &&
            typeof err === "object" &&
            "status" in err &&
            typeof (err as { status: unknown }).status === "number"
          ? (err as { status: number }).status
          : null;
    const message = err instanceof Error ? err.message : "Failed to load dashboard";
    if (status === 403) {
      return { status: "forbidden", summary: null, errorMessage: message };
    }
    return { status: "error", summary: null, errorMessage: message };
  }
}
