import type { LeaveRequest, SchoolAlert } from "@lumenx/types";
import { alertStore } from "@/lib/alert-store";
import { formatLeaveRequestDates, leaveDayCount } from "@/lib/leave-utils";

type Listener = () => void;

const seedLeaveRequests: LeaveRequest[] = [
  {
    id: "lv-seed-1",
    childId: "C1",
    childName: "Aarav Sharma",
    className: "Class 10",
    section: "B",
    leaveStartDate: "2026-06-04",
    leaveEndDate: "2026-06-05",
    description: "Family wedding — will be out of town for two days.",
    status: "pending",
    appliedAt: "Today · 9:15 AM",
    updatedAt: "Today · 9:15 AM",
  },
  {
    id: "lv-seed-2",
    childId: "C2",
    childName: "Anaya Sharma",
    className: "Class 7",
    section: "A",
    leaveStartDate: "2026-06-10",
    leaveEndDate: "2026-06-10",
    description: "Dental procedure — half-day leave requested.",
    status: "approved",
    appliedAt: "28 May · 6:40 PM",
    updatedAt: "29 May · 10:20 AM",
    teacherNote: "Approved. Submit medical receipt if applicable.",
  },
];

let requests: LeaveRequest[] = seedLeaveRequests.map((r) => ({ ...r }));
let initialized = false;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((l) => l());
}

function nowLabel() {
  return `Today · ${new Date().toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" })}`;
}

function parentStatusAlert(
  req: LeaveRequest,
  title: string,
  summary: string,
  detail: string,
): SchoolAlert {
  const severity = req.status === "rejected" ? "emergency" : "mandatory";
  return {
    id: `al-leave-${req.id}-${req.status}-${Date.now()}`,
    title,
    summary,
    detail,
    severity,
    category: "leave",
    time: nowLabel(),
    source: "Class teacher · Ms. Ananya Iyer",
    childName: req.childName,
    childId: req.childId,
    unread: true,
    acknowledged: false,
    actionRequired: req.status === "pending",
    relatedLeaveId: req.id,
  };
}

function teacherNewLeaveAlert(req: LeaveRequest): SchoolAlert {
  const range = formatLeaveRequestDates(req);
  const days = leaveDayCount(req);
  return {
    id: `al-t-leave-${req.id}`,
    title: `Leave request — ${req.childName}`,
    summary: `${range}${days > 1 ? ` (${days} days)` : ""} · ${req.description.slice(0, 60)}${req.description.length > 60 ? "…" : ""}`,
    detail: `${req.childName} (${req.className}-${req.section}) has a leave request for ${range} (${days} day${days > 1 ? "s" : ""}).\n\nReason: ${req.description}\n\nReview and approve, reject, or dismiss this request.`,
    severity: "mandatory",
    category: "leave",
    time: req.appliedAt,
    source: "Parent portal",
    childName: req.childName,
    childId: req.childId,
    unread: true,
    acknowledged: false,
    actionRequired: true,
    actionLabel: "Review leave",
    relatedLeaveId: req.id,
  };
}

export const leaveStore = {
  init(seed: LeaveRequest[] = seedLeaveRequests) {
    if (initialized) return;
    requests = seed.map((r) => ({ ...r }));
    initialized = true;
    notify();
    for (const r of requests) {
      if (r.status === "approved") {
        void import("@/lib/teacher/repositories").then(({ teacherRepository }) =>
          teacherRepository.applyApprovedLeave(r),
        );
      }
      if (r.status === "pending") {
        alertStore.addAlert(teacherNewLeaveAlert(r));
      }
    }
  },
  getAll: (): LeaveRequest[] => requests,
  getForChild: (childId: string): LeaveRequest[] => requests.filter((r) => r.childId === childId),
  getPending: (): LeaveRequest[] => requests.filter((r) => r.status === "pending"),
  getById: (id: string): LeaveRequest | undefined => requests.find((r) => r.id === id),
  subscribe: (listener: Listener) => {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  applyLeave(input: {
    childId: string;
    childName: string;
    className: string;
    section: string;
    leaveStartDate: string;
    leaveEndDate: string;
    description: string;
  }): LeaveRequest {
    const id = `lv-${Date.now()}`;
    const appliedAt = nowLabel();
    const req: LeaveRequest = {
      id,
      ...input,
      status: "pending",
      appliedAt,
      updatedAt: appliedAt,
    };
    requests = [req, ...requests];
    notify();

    const range = formatLeaveRequestDates(req);
    alertStore.addAlert(
      parentStatusAlert(
        req,
        "Leave application submitted",
        `Pending class teacher approval for ${range}`,
        `Your leave request for ${req.childName} (${range}) has been sent to the class teacher.\n\nReason: ${req.description}\n\nYou will receive an alert when it is approved, rejected, or reviewed.`,
      ),
    );
    alertStore.addAlert(teacherNewLeaveAlert(req));

    return req;
  },

  approve(id: string, teacherNote?: string) {
    requests = requests.map((r) =>
      r.id === id
        ? {
            ...r,
            status: "approved" as const,
            updatedAt: nowLabel(),
            teacherNote: teacherNote?.trim() || "Approved by class teacher.",
          }
        : r,
    );
    notify();
    const req = requests.find((r) => r.id === id);
    if (!req) return;

    void import("@/lib/teacher/repositories").then(({ teacherRepository }) =>
      teacherRepository.applyApprovedLeave(req),
    );

    const range = formatLeaveRequestDates(req);
    const days = leaveDayCount(req);
    alertStore.addAlert(
      parentStatusAlert(
        req,
        "Leave approved",
        `${range} · Approved by class teacher`,
        `Leave for ${req.childName} (${range}, ${days} day${days > 1 ? "s" : ""}) has been approved.\n\n${req.teacherNote ?? ""}`,
      ),
    );
  },

  reject(id: string, teacherNote?: string) {
    requests = requests.map((r) =>
      r.id === id
        ? {
            ...r,
            status: "rejected" as const,
            updatedAt: nowLabel(),
            teacherNote: teacherNote?.trim() || "Rejected by class teacher.",
          }
        : r,
    );
    notify();
    const req = requests.find((r) => r.id === id);
    if (!req) return;
    const range = formatLeaveRequestDates(req);
    alertStore.addAlert(
      parentStatusAlert(
        req,
        "Leave rejected",
        `${range} · Not approved`,
        `Leave for ${req.childName} (${range}) was not approved.\n\nNote: ${req.teacherNote ?? "Contact the class teacher for details."}`,
      ),
    );
  },

  dismiss(id: string) {
    requests = requests.map((r) =>
      r.id === id
        ? {
            ...r,
            status: "dismissed" as const,
            updatedAt: nowLabel(),
            teacherNote: "Dismissed without approval — contact class teacher if needed.",
          }
        : r,
    );
    notify();
    const req = requests.find((r) => r.id === id);
    if (!req) return;
    const range = formatLeaveRequestDates(req);
    alertStore.addAlert(
      parentStatusAlert(
        req,
        "Leave request dismissed",
        `${range} · Reviewed, no approval`,
        `The class teacher reviewed the leave request for ${req.childName} (${range}) and dismissed it without approval.\n\nPlease contact the class teacher if you still need leave.`,
      ),
    );
  },
};

export function useLeaveStoreInit(seed?: LeaveRequest[]) {
  return seed;
}
