/**
 * Document request / generation notifications (does not touch visual templates).
 */
import type { AppNotification } from "@lumenx/types";

import { buildAppNotification, buildNotification } from "../shared/api";
import { getPublishedTemplate, renderNotificationTemplate } from "../shared/registry";
import { NOTIFICATION_TEMPLATE_IDS as IDS } from "../shared/registry/ids";
import type { LumenXNotification } from "../shared/types";
import { pushPhase8Inbox, type Phase8Audience } from "../shared/phase8-inbox";

export type DocumentsNotifyResult = {
  foundation: LumenXNotification;
  appNotification: AppNotification;
};

function destinationHref(requestId: string, documentId?: string): string {
  if (documentId) return `/documents?id=${encodeURIComponent(documentId)}`;
  return `/documents?requestId=${encodeURIComponent(requestId)}`;
}

function renderDoc(input: {
  templateId: string;
  id: string;
  variables: Record<string, string | number>;
  href: string;
}): DocumentsNotifyResult {
  const rendered = renderNotificationTemplate({
    templateId: input.templateId,
    variables: input.variables,
  });
  const priority = getPublishedTemplate(input.templateId)?.priority ?? "normal";
  const foundation = buildNotification({
    id: input.id,
    category: "documents",
    title: rendered.title,
    message: rendered.body,
    source: "documents",
    audience: "parent",
    priority,
    href: input.href,
    templateId: rendered.id,
  });
  return {
    foundation,
    appNotification: buildAppNotification(
      {
        id: foundation.id,
        category: "documents",
        title: foundation.title,
        message: foundation.message,
        source: "documents",
        audience: "parent",
        priority: foundation.priority,
        href: input.href,
        templateId: foundation.templateId,
      },
      { category: "circulars" },
    ),
  };
}

function deliver(
  audiences: Phase8Audience[],
  base: DocumentsNotifyResult,
): DocumentsNotifyResult {
  const unique = [...new Set(audiences)];
  pushPhase8Inbox({
    ...base.appNotification,
    audiences: unique,
    audience: unique[0],
    module: "documents",
  });
  return base;
}

const requesterAudiences: Phase8Audience[] = ["parent", "student"];

export function notifyDocumentRequestReceived(input: {
  requestId: string;
  documentLabel: string;
  studentName?: string;
}): DocumentsNotifyResult {
  return deliver(
    requesterAudiences,
    renderDoc({
      templateId: IDS.documents.requester.requestReceived,
      id: `doc-req-recv-${input.requestId}`,
      href: destinationHref(input.requestId),
      variables: {
        requestId: input.requestId,
        documentLabel: input.documentLabel,
        studentName: input.studentName ?? "",
        reason: "",
      },
    }),
  );
}

export function notifyDocumentRequestApproved(input: {
  requestId: string;
  documentLabel: string;
  studentName?: string;
}): DocumentsNotifyResult {
  return deliver(
    requesterAudiences,
    renderDoc({
      templateId: IDS.documents.requester.requestApproved,
      id: `doc-req-appr-${input.requestId}`,
      href: destinationHref(input.requestId),
      variables: {
        requestId: input.requestId,
        documentLabel: input.documentLabel,
        studentName: input.studentName ?? "",
        reason: "",
      },
    }),
  );
}

export function notifyDocumentRequestRejected(input: {
  requestId: string;
  documentLabel: string;
  reason: string;
  studentName?: string;
}): DocumentsNotifyResult {
  return deliver(
    requesterAudiences,
    renderDoc({
      templateId: IDS.documents.requester.requestRejected,
      id: `doc-req-rej-${input.requestId}`,
      href: destinationHref(input.requestId),
      variables: {
        requestId: input.requestId,
        documentLabel: input.documentLabel,
        studentName: input.studentName ?? "",
        reason: input.reason.trim() || "No reason provided",
      },
    }),
  );
}

export function notifyDocumentGenerated(input: {
  requestId: string;
  documentLabel: string;
  studentName?: string;
  documentId?: string;
}): DocumentsNotifyResult {
  return deliver(
    requesterAudiences,
    renderDoc({
      templateId: IDS.documents.requester.documentGenerated,
      id: `doc-gen-${input.documentId ?? input.requestId}`,
      href: destinationHref(input.requestId, input.documentId),
      variables: {
        requestId: input.requestId,
        documentLabel: input.documentLabel,
        studentName: input.studentName ?? "",
        reason: "",
      },
    }),
  );
}

export function notifyDocumentReady(input: {
  requestId: string;
  documentLabel: string;
  studentName?: string;
  documentId?: string;
}): DocumentsNotifyResult {
  return deliver(
    requesterAudiences,
    renderDoc({
      templateId: IDS.documents.requester.documentReady,
      id: `doc-ready-${input.documentId ?? input.requestId}`,
      href: destinationHref(input.requestId, input.documentId),
      variables: {
        requestId: input.requestId,
        documentLabel: input.documentLabel,
        studentName: input.studentName ?? "",
        reason: "",
      },
    }),
  );
}
