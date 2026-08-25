import type { SchoolAlert } from "@lumenx/types";
import {
  notifyAdminOfTeacherLeave,
  notifyTeacherLeaveDecision,
  notifyTeacherLeavePending,
} from "@lumenx/module-notifications";
import type { TeacherLeaveRequest } from "@/lib/teacher/types";
import { teacherLeaveRequestsSeed } from "@/lib/teacher/mock-data";
import { alertStore } from "@/lib/alert-store";
import { assertTeacherCanWrite } from "@/lib/teacher/portal-access-guard";
import { loadLeaveDecisions, listenDemoSync, saveLeaveDecision } from "@lumenx/utils";

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

function applyDecisions() {
  const decisions = loadLeaveDecisions();
  requests = requests.map((r) => {
    const d = decisions[r.id];
    if (!d) return r;
    return {
      ...r,
      status: d.status,
      reviewedNote: d.note ?? r.reviewedNote,
    };
  });
}

export const teacherLeaveStore = {
  init() {
    if (initialized) return;
    requests = teacherLeaveRequestsSeed.map((r) => ({ ...r }));
    applyDecisions();
    initialized = true;
    if (typeof window !== "undefined") {
      listenDemoSync("leave", () => {
        applyDecisions();
        notify();
      });
    }
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
    assertTeacherCanWrite();
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

    try {
      const dateRange =
        created.fromDate !== created.toDate
          ? `${created.fromDate} – ${created.toDate}`
          : created.fromDate;
      notifyAdminOfTeacherLeave({
        leaveId: created.id,
        teacherName: created.teacherName,
        leaveType: created.type,
        dateRange,
        reason: created.reason,
      });
      const pending = notifyTeacherLeavePending({
        leaveId: created.id,
        dateRange,
        reviewer: created.to === "admin" ? "admin" : "principal",
      });
      void import("@/lib/teacher/repositories").then(({ teacherRepository }) => {
        teacherRepository.pushInboxNotification({
          id: pending.appNotification.id,
          title: pending.appNotification.title,
          body: pending.appNotification.desc,
          category: "staff_notices",
          href: "/leave",
        });
      });
    } catch {
      /* best-effort */
    }

    return created;
  },

  /** Admin / principal decision (mock) — note required for reject / ignore. */
  decide(
    id: string,
    status: "approved" | "rejected" | "ignored",
    reviewedNote?: string,
  ): TeacherLeaveRequest | undefined {
    const note = reviewedNote?.trim();
    if ((status === "rejected" || status === "ignored") && (!note || note.length < 4)) {
      return undefined;
    }
    requests = requests.map((r) =>
      r.id === id
        ? {
            ...r,
            status,
            reviewedNote:
              note ||
              (status === "approved" ? "Approved by school office." : r.reviewedNote),
          }
        : r,
    );
    notify();
    const req = requests.find((r) => r.id === id);
    if (req && (status === "approved" || status === "rejected" || status === "ignored")) {
      saveLeaveDecision(id, {
        status,
        note: note || undefined,
        decidedAt: new Date().toISOString().slice(0, 10),
      });
    }
    if (req) {
      alertStore.addAlert({
        id: `al-teacher-leave-decision-${req.id}-${Date.now()}`,
        title:
          status === "approved"
            ? "Leave approved"
            : status === "rejected"
              ? "Leave rejected"
              : "Leave ignored",
        summary:
          status === "approved"
            ? "Your leave request was approved"
            : status === "rejected"
              ? "Your leave request was not approved"
              : "Your leave request was ignored",
        detail: `${req.type} leave (${req.fromDate}${req.fromDate !== req.toDate ? ` – ${req.toDate}` : ""}).\n\n${req.reviewedNote ?? ""}`,
        severity: status === "rejected" ? "emergency" : "mandatory",
        category: "leave",
        time: nowLabel(),
        source: "School Admin",
        unread: true,
        acknowledged: false,
        actionRequired: false,
      });
      try {
        const dateRange =
          req.fromDate !== req.toDate ? `${req.fromDate} – ${req.toDate}` : req.fromDate;
        const decision = notifyTeacherLeaveDecision({
          leaveId: req.id,
          dateRange,
          decision: status,
          reason: req.reviewedNote,
        });
        void import("@/lib/teacher/repositories").then(({ teacherRepository }) => {
          teacherRepository.pushInboxNotification({
            id: decision.appNotification.id,
            title: decision.appNotification.title,
            body: decision.appNotification.desc,
            category: status === "rejected" ? "urgent" : "staff_notices",
            href: "/leave",
          });
        });
      } catch {
        /* best-effort */
      }
    }
    return req;
  },
};
