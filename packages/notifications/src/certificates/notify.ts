/**
 * Certificate issue/publish notifications — does not modify visual certificate templates.
 */
import type { AppNotification } from "@lumenx/types";

import { buildAppNotification, buildNotification } from "../shared/api";
import { getPublishedTemplate, renderNotificationTemplate } from "../shared/registry";
import { NOTIFICATION_TEMPLATE_IDS as IDS } from "../shared/registry/ids";
import type { LumenXNotification } from "../shared/types";
import { pushPhase8Inbox, type Phase8Audience } from "../shared/phase8-inbox";

export type CertificatesNotifyResult = {
  foundation: LumenXNotification;
  appNotification: AppNotification;
};

function certHref(certificateId: string): string {
  return `/certificates?id=${encodeURIComponent(certificateId)}`;
}

function renderCert(input: {
  templateId: string;
  id: string;
  variables: Record<string, string | number>;
  href: string;
}): CertificatesNotifyResult {
  const rendered = renderNotificationTemplate({
    templateId: input.templateId,
    variables: input.variables,
  });
  const priority = getPublishedTemplate(input.templateId)?.priority ?? "normal";
  const foundation = buildNotification({
    id: input.id,
    category: "certificates",
    title: rendered.title,
    message: rendered.body,
    source: "certificates",
    audience: "student",
    priority,
    href: input.href,
    templateId: rendered.id,
  });
  return {
    foundation,
    appNotification: buildAppNotification(
      {
        id: foundation.id,
        category: "certificates",
        title: foundation.title,
        message: foundation.message,
        source: "certificates",
        audience: "student",
        priority: foundation.priority,
        href: input.href,
        templateId: foundation.templateId,
      },
      { category: "circulars" },
    ),
  };
}

function fanOut(base: CertificatesNotifyResult): CertificatesNotifyResult {
  pushPhase8Inbox({
    ...base.appNotification,
    audiences: ["student", "parent"],
    audience: "student",
    module: "certificates",
  });
  return base;
}

export function notifyCertificateIssued(input: {
  certificateId: string;
  certificateName: string;
  studentName?: string;
  certificateNumber?: string;
}): CertificatesNotifyResult {
  const numberPart = input.certificateNumber ? ` (${input.certificateNumber})` : "";
  return fanOut(
    renderCert({
      templateId: IDS.certificates.recipient.issued,
      id: `cert-issued-${input.certificateId}`,
      href: certHref(input.certificateId),
      variables: {
        certificateName: input.certificateName,
        numberPart,
        studentName: input.studentName ?? "",
        certificateId: input.certificateId,
      },
    }),
  );
}

export function notifyCertificatePublished(input: {
  certificateId: string;
  certificateName: string;
  studentName?: string;
}): CertificatesNotifyResult {
  return fanOut(
    renderCert({
      templateId: IDS.certificates.recipient.published,
      id: `cert-pub-${input.certificateId}`,
      href: certHref(input.certificateId),
      variables: {
        certificateName: input.certificateName,
        numberPart: "",
        studentName: input.studentName ?? "the student",
        certificateId: input.certificateId,
      },
    }),
  );
}
