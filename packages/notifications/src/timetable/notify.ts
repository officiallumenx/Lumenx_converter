/**
 * Class timetable notifications — publish / change (preserve existing Admin store).
 */
import type { AppNotification } from "@lumenx/types";

import { buildAppNotification, buildNotification } from "../shared/api";
import { getPublishedTemplate, renderNotificationTemplate } from "../shared/registry";
import { NOTIFICATION_TEMPLATE_IDS as IDS } from "../shared/registry/ids";
import type { LumenXNotification } from "../shared/types";
import { pushPhase7Inbox, type Phase7Audience } from "../shared/phase7-inbox";

export type TimetableNotifyResult = {
  foundation: LumenXNotification;
  appNotification: AppNotification;
};

const RELEVANT: Phase7Audience[] = ["parent", "student", "teacher"];

function renderTt(input: {
  templateId: string;
  id: string;
  variables: Record<string, string | number>;
}): TimetableNotifyResult {
  const rendered = renderNotificationTemplate({
    templateId: input.templateId,
    variables: input.variables,
  });
  const priority = getPublishedTemplate(input.templateId)?.priority ?? "normal";
  const foundation = buildNotification({
    id: input.id,
    category: "timetable",
    title: rendered.title,
    message: rendered.body,
    source: "timetable",
    audience: "institute",
    priority,
    href: "/timetable",
    templateId: rendered.id,
  });
  return {
    foundation,
    appNotification: buildAppNotification(
      {
        id: foundation.id,
        category: "timetable",
        title: foundation.title,
        message: foundation.message,
        source: "timetable",
        audience: "institute",
        priority: foundation.priority,
        href: "/timetable",
        templateId: foundation.templateId,
      },
      { category: "academic" },
    ),
  };
}

function fanOut(base: TimetableNotifyResult): Record<Phase7Audience, TimetableNotifyResult> {
  pushPhase7Inbox({
    ...base.appNotification,
    audiences: [...RELEVANT],
    audience: RELEVANT[0],
    module: "timetable",
  });
  const out = {} as Record<Phase7Audience, TimetableNotifyResult>;
  for (const audience of RELEVANT) {
    out[audience] = {
      foundation: { ...base.foundation, audience },
      appNotification: base.appNotification,
    };
  }
  return out;
}

export function notifyTimetablePublished(input: {
  timetableId: string;
  classLabel: string;
  termLabel?: string;
}): Record<Phase7Audience, TimetableNotifyResult> {
  const base = renderTt({
    templateId: IDS.timetable.audience.published,
    id: `tt-pub-${input.timetableId}`,
    variables: {
      classLabel: input.classLabel,
      termLabel: input.termLabel ?? "current term",
      changeSummary: "",
    },
  });
  return fanOut(base);
}

export function notifyTimetableChanged(input: {
  timetableId: string;
  classLabel: string;
  changeSummary: string;
  important?: boolean;
}): Record<Phase7Audience, TimetableNotifyResult> {
  const base = renderTt({
    templateId: input.important
      ? IDS.timetable.audience.importantChange
      : IDS.timetable.audience.changed,
    id: `tt-chg-${input.timetableId}-${Date.now()}`,
    variables: {
      classLabel: input.classLabel,
      termLabel: "",
      changeSummary: input.changeSummary,
    },
  });
  return fanOut(base);
}
