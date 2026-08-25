/**
 * Minimal system / security notifications (not Sonner/toasts).
 */
import type { AppNotification } from "@lumenx/types";

import { buildAppNotification, buildNotification } from "../shared/api";
import { getPublishedTemplate, renderNotificationTemplate } from "../shared/registry";
import { NOTIFICATION_TEMPLATE_IDS as IDS } from "../shared/registry/ids";
import type { LumenXNotification, LumenXNotificationAudience } from "../shared/types";
import { pushPhase8Inbox, type Phase8Audience } from "../shared/phase8-inbox";

export type SystemNotifyResult = {
  foundation: LumenXNotification;
  appNotification: AppNotification;
};

function renderSystem(input: {
  templateId: string;
  id: string;
  audience: LumenXNotificationAudience;
  variables: Record<string, string | number>;
}): SystemNotifyResult {
  const rendered = renderNotificationTemplate({
    templateId: input.templateId,
    variables: input.variables,
  });
  const priority = getPublishedTemplate(input.templateId)?.priority ?? "important";
  const foundation = buildNotification({
    id: input.id,
    category: "system",
    title: rendered.title,
    message: rendered.body,
    source: "system",
    audience: input.audience,
    priority,
    href: "/notifications",
    templateId: rendered.id,
  });
  return {
    foundation,
    appNotification: buildAppNotification(
      {
        id: foundation.id,
        category: "system",
        title: foundation.title,
        message: foundation.message,
        source: "system",
        audience: foundation.audience,
        priority: foundation.priority,
        href: "/notifications",
        templateId: foundation.templateId,
      },
      { category: "emergency" },
    ),
  };
}

function deliver(
  audiences: Phase8Audience[],
  result: SystemNotifyResult,
): SystemNotifyResult {
  const unique = [...new Set(audiences)];
  pushPhase8Inbox({
    ...result.appNotification,
    audiences: unique,
    audience: unique[0],
    module: "system",
  });
  return result;
}

export function notifySystemOpsCritical(input: {
  id?: string;
  title: string;
  message: string;
}): SystemNotifyResult {
  return deliver(
    ["parent", "student", "teacher", "admin", "institute"],
    renderSystem({
      templateId: IDS.system.institute.opsCritical,
      id: input.id ?? `sys-ops-${Date.now()}`,
      audience: "institute",
      variables: { title: input.title, message: input.message },
    }),
  );
}

export function notifySecurityEvent(input: {
  id?: string;
  message: string;
}): SystemNotifyResult {
  return deliver(
    ["admin"],
    renderSystem({
      templateId: IDS.system.institute.securityEvent,
      id: input.id ?? `sys-sec-${Date.now()}`,
      audience: "admin",
      variables: { title: "Security", message: input.message },
    }),
  );
}

export function notifyAccountSecurityChange(input: {
  id?: string;
  message: string;
}): SystemNotifyResult {
  return deliver(
    ["admin"],
    renderSystem({
      templateId: IDS.system.institute.accountSecurityChange,
      id: input.id ?? `sys-acct-${Date.now()}`,
      audience: "admin",
      variables: { title: "Account", message: input.message },
    }),
  );
}

export function notifyMaintenance(input: {
  id?: string;
  title: string;
  message: string;
}): SystemNotifyResult {
  return deliver(
    ["parent", "student", "teacher", "admin", "institute"],
    renderSystem({
      templateId: IDS.system.institute.maintenance,
      id: input.id ?? `sys-maint-${Date.now()}`,
      audience: "institute",
      variables: { title: input.title, message: input.message },
    }),
  );
}

export function notifySystemWarning(input: {
  id?: string;
  title: string;
  message: string;
}): SystemNotifyResult {
  return deliver(
    ["admin", "institute"],
    renderSystem({
      templateId: IDS.system.institute.systemWarning,
      id: input.id ?? `sys-warn-${Date.now()}`,
      audience: "institute",
      variables: { title: input.title, message: input.message },
    }),
  );
}
