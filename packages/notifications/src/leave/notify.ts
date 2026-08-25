/**
 * Leave notifications — student/parent ↔ teacher; teacher ↔ admin/head.
 * Decisions notify only the relevant requester; rejections include reason.
 */
import type { AppNotification } from "@lumenx/types";

import { buildAppNotification, buildNotification } from "../shared/api";
import { getPublishedTemplate, renderNotificationTemplate } from "../shared/registry";
import { NOTIFICATION_TEMPLATE_IDS as IDS } from "../shared/registry/ids";
import type { LumenXNotification, LumenXNotificationAudience } from "../shared/types";

export type LeaveNotifyResult = {
  foundation: LumenXNotification;
  appNotification: AppNotification;
};

function renderLeave(input: {
  templateId: string;
  id: string;
  audience: LumenXNotificationAudience;
  variables: Record<string, string | number>;
  metadata?: Record<string, string>;
  href?: string;
}): LeaveNotifyResult {
  const rendered = renderNotificationTemplate({
    templateId: input.templateId,
    variables: input.variables,
  });
  const priority = getPublishedTemplate(input.templateId)?.priority ?? "normal";
  const href = input.href ?? "/leave";
  const foundation = buildNotification({
    id: input.id,
    category: "leave",
    title: rendered.title,
    message: rendered.body,
    source: "leave",
    audience: input.audience,
    priority,
    href,
    templateId: rendered.id,
    metadata: input.metadata,
  });
  return {
    foundation,
    appNotification: buildAppNotification(
      {
        id: foundation.id,
        category: "leave",
        title: foundation.title,
        message: foundation.message,
        source: "leave",
        audience: foundation.audience,
        priority: foundation.priority,
        href,
        templateId: foundation.templateId,
        metadata: foundation.metadata,
      },
      { category: "academic" },
    ),
  };
}

function reasonSuffix(reason?: string | null): string {
  const t = reason?.trim();
  return t ? `Reason: ${t}` : "";
}

/** Parent/student leave submitted → teacher. */
export function notifyTeacherOfStudentLeave(input: {
  leaveId: string;
  studentName: string;
  dateRange: string;
  reason: string;
}): LeaveNotifyResult {
  const preview =
    input.reason.length > 80 ? `${input.reason.slice(0, 80)}…` : input.reason;
  return renderLeave({
    templateId: IDS.leave.teacher.studentRequest,
    id: `leave-teacher-req-${input.leaveId}`,
    audience: "teacher",
    variables: {
      studentName: input.studentName,
      dateRange: input.dateRange,
      reasonPreview: preview,
      decisionLabel: "pending",
      reasonSuffix: "",
      reviewer: "teacher",
      teacherName: "",
      leaveType: "",
    },
    metadata: { leaveId: input.leaveId, kind: "student_request" },
  });
}

/** Parent confirmation that leave is pending. */
export function notifyParentLeavePending(input: {
  leaveId: string;
  studentName: string;
  dateRange: string;
}): LeaveNotifyResult {
  return renderLeave({
    templateId: IDS.leave.parent.pending,
    id: `leave-parent-pending-${input.leaveId}`,
    audience: "parent",
    variables: {
      studentName: input.studentName,
      dateRange: input.dateRange,
      reasonPreview: "",
      decisionLabel: "pending",
      reasonSuffix: "",
      reviewer: "teacher",
      teacherName: "",
      leaveType: "",
    },
    metadata: { leaveId: input.leaveId, kind: "parent_pending" },
  });
}

/** Teacher decision → parent only. */
export function notifyParentLeaveDecision(input: {
  leaveId: string;
  studentName: string;
  dateRange: string;
  decision: "approved" | "rejected" | "pending";
  reason?: string | null;
}): LeaveNotifyResult {
  const decisionLabel =
    input.decision === "approved"
      ? "approved"
      : input.decision === "rejected"
        ? "rejected"
        : "pending";
  return renderLeave({
    templateId: IDS.leave.parent.decision,
    id: `leave-parent-decision-${input.leaveId}-${input.decision}`,
    audience: "parent",
    variables: {
      studentName: input.studentName,
      dateRange: input.dateRange,
      decisionLabel,
      reasonSuffix: input.decision === "rejected" ? reasonSuffix(input.reason) : reasonSuffix(input.reason) || "Approved by class teacher.",
      reasonPreview: "",
      reviewer: "teacher",
      teacherName: "",
      leaveType: "",
    },
    metadata: {
      leaveId: input.leaveId,
      kind: "parent_decision",
      decision: input.decision,
    },
  });
}

/** Teacher leave submitted → admin/head. */
export function notifyAdminOfTeacherLeave(input: {
  leaveId: string;
  teacherName: string;
  leaveType: string;
  dateRange: string;
  reason: string;
}): LeaveNotifyResult {
  const preview =
    input.reason.length > 80 ? `${input.reason.slice(0, 80)}…` : input.reason;
  return renderLeave({
    templateId: IDS.leave.admin.teacherRequest,
    id: `leave-admin-req-${input.leaveId}`,
    audience: "admin",
    variables: {
      teacherName: input.teacherName,
      leaveType: input.leaveType,
      dateRange: input.dateRange,
      reasonPreview: preview,
      studentName: "",
      decisionLabel: "",
      reasonSuffix: "",
      reviewer: "admin",
    },
    href: "/leave",
    metadata: { leaveId: input.leaveId, kind: "teacher_request" },
  });
}

/** Teacher leave pending self-ack. */
export function notifyTeacherLeavePending(input: {
  leaveId: string;
  dateRange: string;
  reviewer: "admin" | "principal";
}): LeaveNotifyResult {
  return renderLeave({
    templateId: IDS.leave.teacher.pending,
    id: `leave-teacher-pending-${input.leaveId}`,
    audience: "teacher",
    variables: {
      dateRange: input.dateRange,
      reviewer: input.reviewer === "admin" ? "admin" : "principal",
      studentName: "",
      reasonPreview: "",
      decisionLabel: "pending",
      reasonSuffix: "",
      teacherName: "",
      leaveType: "",
    },
    metadata: { leaveId: input.leaveId, kind: "teacher_pending" },
  });
}

/** Admin/head decision → teacher only. */
export function notifyTeacherLeaveDecision(input: {
  leaveId: string;
  dateRange: string;
  decision: "approved" | "rejected" | "ignored";
  reason?: string | null;
}): LeaveNotifyResult {
  const decisionLabel =
    input.decision === "approved"
      ? "approved"
      : input.decision === "rejected"
        ? "rejected"
        : "ignored";
  return renderLeave({
    templateId: IDS.leave.teacher.decision,
    id: `leave-teacher-decision-${input.leaveId}-${input.decision}`,
    audience: "teacher",
    variables: {
      dateRange: input.dateRange,
      decisionLabel,
      reasonSuffix:
        input.decision === "rejected" || input.decision === "ignored"
          ? reasonSuffix(input.reason) || "See school office for details."
          : reasonSuffix(input.reason) || "Approved by school office.",
      studentName: "",
      reasonPreview: "",
      reviewer: "admin",
      teacherName: "",
      leaveType: "",
    },
    metadata: {
      leaveId: input.leaveId,
      kind: "teacher_decision",
      decision: input.decision,
    },
  });
}
