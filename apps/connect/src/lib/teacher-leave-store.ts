import type { SchoolAlert } from "@lumenx/types";
import type { TeacherLeaveRequest } from "@/lib/teacher/types";
import { teacherLeaveRequestsSeed } from "@/lib/teacher/mock-data";
import { alertStore } from "@/lib/alert-store";

type Listener = () => void;

let requests: TeacherLeaveRequest[] = teacherLeaveRequestsSeed.map((r) => ({ ...r }));
let initialized = false;
const listeners = new Set<Listener>();

function notify() {
  listeners.forEach((listener) => listener());
}

function nowLabel() {
  return new Date().toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function adminAlertFor(req: TeacherLeaveRequest): SchoolAlert {
  return {
    id: `al-teacher-leave-${req.id}`,
    title: `Teacher leave — ${req.teacherName}`,
    summary: `${req.type} leave ${req.fromDate}${req.fromDate !== req.toDate ? ` to ${req.toDate}` : ""} · Pending ${req.to === "admin" ? "admin" : "principal"} review`,
    detail: `${req.teacherName} requested ${req.type} leave from ${req.fromDate} to ${req.toDate}.\n\nReason: ${req.reason}\n\nSent to ${req.to === "admin" ? "school admin" : "principal"}.`,
    severity: "mandatory",
    category: "leave",
    time: req.submittedAt,
    source: "Teacher portal",
    unread: true,
    acknowledged: false,
    actionRequired: true,
    actionLabel: "Review leave",
  };
}

export const teacherLeaveStore = {
  init() {
    if (initialized) return;
    requests = teacherLeaveRequestsSeed.map((r) => ({ ...r }));
    initialized = true;
    notify();
  },

  reset() {
    requests = teacherLeaveRequestsSeed.map((r) => ({ ...r }));
    initialized = false;
    notify();
  },

  getAll(): TeacherLeaveRequest[] {
    return requests;
  },

  subscribe(listener: Listener) {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  submit(input: {
    teacherId: string;
    teacherName: string;
    type: TeacherLeaveRequest["type"];
    to: TeacherLeaveRequest["to"];
    fromDate: string;
    toDate: string;
    reason: string;
  }): TeacherLeaveRequest {
    const created: TeacherLeaveRequest = {
      id: `tlr-${Date.now()}`,
      teacherId: input.teacherId,
      teacherName: input.teacherName,
      type: input.type,
      to: input.to,
      fromDate: input.fromDate,
      toDate: input.toDate,
      reason: input.reason.trim(),
      status: "pending",
      submittedAt: nowLabel(),
    };
    requests = [created, ...requests];
    notify();

    alertStore.addAlert(adminAlertFor(created));
    alertStore.addAlert({
      id: `al-teacher-leave-self-${created.id}`,
      title: "Leave request submitted",
      summary: `Sent to ${input.to === "admin" ? "school admin" : "principal"} for approval`,
      detail: `Your ${input.type} leave request (${input.fromDate}${input.fromDate !== input.toDate ? ` – ${input.toDate}` : ""}) is pending review.`,
      severity: "mandatory",
      category: "leave",
      time: created.submittedAt,
      source: "Teacher portal",
      unread: true,
      acknowledged: false,
      actionRequired: false,
    });

    return created;
  },
};
