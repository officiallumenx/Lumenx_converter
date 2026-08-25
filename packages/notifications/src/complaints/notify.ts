/**
 * Complaint lifecycle notifications for the requester.
 */
import type { AppNotification } from "@lumenx/types";

import { buildAppNotification, buildNotification } from "../shared/api";
import { getPublishedTemplate, renderNotificationTemplate } from "../shared/registry";
import { NOTIFICATION_TEMPLATE_IDS as IDS } from "../shared/registry/ids";
import type { LumenXNotification, LumenXNotificationAudience } from "../shared/types";
import { pushPhase8Inbox, type Phase8Audience } from "../shared/phase8-inbox";

export type ComplaintNotifyResult = {
  foundation: LumenXNotification;
  appNotification: AppNotification;
};

export type ComplaintLifecycleStage =
  | "submitted"
  | "received"
  | "under_review"
  | "resolved"
  | "rejected";

function mapRequesterAudience(role?: string): Phase8Audience {
  const r = (role ?? "").toLowerCase();
  if (r.includes("teacher") || r.includes("staff")) return "teacher";
  if (r.includes("student")) return "student";
  return "parent";
}

function templateFor(stage: ComplaintLifecycleStage): string {
  switch (stage) {
    case "submitted":
      return IDS.complaints.requester.submitted;
    case "received":
      return IDS.complaints.requester.received;
    case "under_review":
      return IDS.complaints.requester.underReview;
    case "resolved":
      return IDS.complaints.requester.resolved;
    case "rejected":
      return IDS.complaints.requester.rejected;
  }
}

function renderComplaint(input: {
  templateId: string;
  id: string;
  audience: LumenXNotificationAudience;
  variables: Record<string, string | number>;
}): ComplaintNotifyResult {
  const rendered = renderNotificationTemplate({
    templateId: input.templateId,
    variables: input.variables,
  });
  const priority = getPublishedTemplate(input.templateId)?.priority ?? "normal";
  const href = `/complaints?id=${encodeURIComponent(String(input.variables.complaintId ?? ""))}`;
  const foundation = buildNotification({
    id: input.id,
    category: "complaints",
    title: rendered.title,
    message: rendered.body,
    source: "complaints",
    audience: input.audience,
    priority,
    href,
    templateId: rendered.id,
  });
  return {
    foundation,
    appNotification: buildAppNotification(
      {
        id: foundation.id,
        category: "complaints",
        title: foundation.title,
        message: foundation.message,
        source: "complaints",
        audience: foundation.audience,
        priority: foundation.priority,
        href,
        templateId: foundation.templateId,
      },
      { category: "circulars" },
    ),
  };
}

export function notifyComplaintLifecycle(input: {
  complaintId: string;
  title: string;
  stage: ComplaintLifecycleStage;
  requesterRole?: string;
  reason?: string;
}): ComplaintNotifyResult {
  const audience = mapRequesterAudience(input.requesterRole);
  const result = renderComplaint({
    templateId: templateFor(input.stage),
    id: `complaint-${input.stage}-${input.complaintId}`,
    audience,
    variables: {
      title: input.title,
      complaintId: input.complaintId,
      reason: input.reason?.trim() || "No reason provided",
    },
  });
  pushPhase8Inbox({ ...result.appNotification, audience, module: "complaints" });
  return result;
}

/** On submit: submitted + received acknowledgment for the requester. */
export function notifyComplaintSubmitted(input: {
  complaintId: string;
  title: string;
  requesterRole?: string;
}): { submitted: ComplaintNotifyResult; received: ComplaintNotifyResult } {
  return {
    submitted: notifyComplaintLifecycle({ ...input, stage: "submitted" }),
    received: notifyComplaintLifecycle({ ...input, stage: "received" }),
  };
}
