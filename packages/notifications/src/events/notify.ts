/**
 * Event notifications — Admin publish/change/cancel + reminders.
 * Deep link points at exact event details (`/events?id=`).
 */
import type { AppNotification } from "@lumenx/types";

import { buildAppNotification, buildNotification } from "../shared/api";
import { getPublishedTemplate, renderNotificationTemplate } from "../shared/registry";
import { NOTIFICATION_TEMPLATE_IDS as IDS } from "../shared/registry/ids";
import type { LumenXNotification } from "../shared/types";
import {
  cancelPhase7Reminders,
  pushPhase7Inbox,
  type Phase7Audience,
} from "../shared/phase7-inbox";

export type EventNotifyResult = {
  foundation: LumenXNotification;
  appNotification: AppNotification;
};

export type EventNotifyAudience = Phase7Audience;

const ALL_AUDIENCES: EventNotifyAudience[] = ["parent", "student", "teacher", "admin"];

function eventHref(eventId: string): string {
  return `/events?id=${encodeURIComponent(eventId)}`;
}

function renderEvent(input: {
  templateId: string;
  id: string;
  variables: Record<string, string | number>;
  eventId: string;
}): EventNotifyResult {
  const rendered = renderNotificationTemplate({
    templateId: input.templateId,
    variables: input.variables,
  });
  const priority = getPublishedTemplate(input.templateId)?.priority ?? "normal";
  const href = eventHref(input.eventId);
  const foundation = buildNotification({
    id: input.id,
    category: "events",
    title: rendered.title,
    message: rendered.body,
    source: "events",
    audience: "institute",
    priority,
    href,
    templateId: rendered.id,
    metadata: { eventId: input.eventId },
  });
  return {
    foundation,
    appNotification: buildAppNotification(
      {
        id: foundation.id,
        category: "events",
        title: foundation.title,
        message: foundation.message,
        source: "events",
        audience: "institute",
        priority: foundation.priority,
        href,
        templateId: foundation.templateId,
      },
      { category: "events" },
    ),
  };
}

function fanOut(
  audiences: EventNotifyAudience[],
  base: EventNotifyResult,
): Record<EventNotifyAudience, EventNotifyResult> {
  const unique = [...new Set(audiences)];
  pushPhase7Inbox({
    ...base.appNotification,
    audiences: unique,
    audience: unique[0],
    module: "events",
  });
  const out = {} as Record<EventNotifyAudience, EventNotifyResult>;
  for (const audience of unique) {
    out[audience] = {
      foundation: { ...base.foundation, audience },
      appNotification: base.appNotification,
    };
  }
  return out;
}

function parseAudiences(label?: string): EventNotifyAudience[] {
  const t = (label ?? "All").toLowerCase();
  if (t.includes("parent") && !t.includes("student") && !t.includes("teacher")) return ["parent"];
  if (t.includes("student") && !t.includes("parent") && !t.includes("teacher")) return ["student"];
  if (t.includes("teacher") || t.includes("staff") || t.includes("head")) return ["teacher", "admin"];
  if (t.includes("admin")) return ["admin"];
  return ALL_AUDIENCES;
}

export function notifyEventPublished(input: {
  eventId: string;
  title: string;
  when: string;
  venue?: string;
  description?: string;
  category?: string;
  audienceLabel?: string;
}): Record<EventNotifyAudience, EventNotifyResult> {
  const audiences = parseAudiences(input.audienceLabel);
  const base = renderEvent({
    templateId: IDS.events.audience.published,
    id: `evt-pub-${input.eventId}`,
    eventId: input.eventId,
    variables: {
      title: input.title,
      when: input.when,
      venue: input.venue ?? "TBA",
      descriptionPreview: (input.description ?? "").slice(0, 120) || input.title,
      category: input.category ?? "event",
      audience: input.audienceLabel ?? "Everyone",
      changeSummary: "",
      cancellationReason: "",
    },
  });
  // Schedule demo reminders (1d / 1h) for published events.
  scheduleEventReminders({
    eventId: input.eventId,
    title: input.title,
    when: input.when,
    venue: input.venue,
    audienceLabel: input.audienceLabel,
  });
  return fanOut(audiences, base);
}

export function notifyEventChanged(input: {
  eventId: string;
  title: string;
  when: string;
  venue?: string;
  changeSummary: string;
  audienceLabel?: string;
}): Record<EventNotifyAudience, EventNotifyResult> {
  const audiences = parseAudiences(input.audienceLabel);
  const base = renderEvent({
    templateId: IDS.events.audience.changed,
    id: `evt-chg-${input.eventId}-${Date.now()}`,
    eventId: input.eventId,
    variables: {
      title: input.title,
      when: input.when,
      venue: input.venue ?? "TBA",
      descriptionPreview: "",
      category: "",
      audience: input.audienceLabel ?? "Everyone",
      changeSummary: input.changeSummary,
      cancellationReason: "",
    },
  });
  return fanOut(audiences, base);
}

export function notifyEventCancelled(input: {
  eventId: string;
  title: string;
  cancellationReason: string;
  audienceLabel?: string;
}): Record<EventNotifyAudience, EventNotifyResult> {
  cancelPhase7Reminders(input.eventId);
  const audiences = parseAudiences(input.audienceLabel);
  const base = renderEvent({
    templateId: IDS.events.audience.cancelled,
    id: `evt-cancel-${input.eventId}`,
    eventId: input.eventId,
    variables: {
      title: input.title,
      when: "",
      venue: "",
      descriptionPreview: "",
      category: "",
      audience: input.audienceLabel ?? "Everyone",
      changeSummary: "",
      cancellationReason: input.cancellationReason.trim() || "This event has been cancelled.",
    },
  });
  return fanOut(audiences, base);
}

export function scheduleEventReminders(input: {
  eventId: string;
  title: string;
  when: string;
  venue?: string;
  audienceLabel?: string;
}): void {
  const audiences = parseAudiences(input.audienceLabel);
  for (const kind of ["1d", "1h"] as const) {
    const templateId =
      kind === "1d" ? IDS.events.audience.reminder1d : IDS.events.audience.reminder1h;
    const base = renderEvent({
      templateId,
      id: `evt-reminder-${kind}-${input.eventId}`,
      eventId: input.eventId,
      variables: {
        title: input.title,
        when: input.when,
        venue: input.venue ?? "TBA",
        descriptionPreview: "",
        category: "",
        audience: "",
        changeSummary: "",
        cancellationReason: "",
      },
    });
    fanOut(audiences, base);
  }
}
