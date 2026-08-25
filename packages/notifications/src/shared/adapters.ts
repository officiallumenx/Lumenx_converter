import type { AppNotification, NotificationCategory } from "@lumenx/types";

import { fromAppNotificationPriority, toAppNotificationPriority, typeFromPriority } from "./priority";
import type {
  CreateLumenXNotificationInput,
  LumenXNotification,
  LumenXNotificationAudience,
  LumenXNotificationCategory,
} from "./types";

function newId(): string {
  return `lxn-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/** Build a shared notification with defaults (does not persist). */
export function createLumenXNotification(
  input: CreateLumenXNotificationInput,
): LumenXNotification {
  const priority = input.priority ?? "normal";
  return {
    id: input.id ?? newId(),
    category: input.category,
    type: input.type ?? typeFromPriority(priority),
    title: input.title,
    message: input.message,
    source: input.source,
    audience: input.audience,
    priority,
    timestamp: input.timestamp ?? new Date().toISOString(),
    href: input.href,
    metadata: input.metadata,
    unread: input.unread ?? true,
    starred: input.starred,
    templateId: input.templateId,
  };
}

/** Map AppNotification.category → shared category (best-effort). */
export function categoryFromAppNotificationCategory(
  category: NotificationCategory | undefined,
): LumenXNotificationCategory {
  switch (category) {
    case "attendance":
      return "attendance";
    case "assignments":
      return "homework";
    case "exams":
      return "exams";
    case "fees":
      return "fees";
    case "events":
    case "holidays":
      return "events";
    case "sports":
      return "events";
    case "emergency":
      return "system";
    case "circulars":
      return "announcements";
    case "academic":
      return "system";
    default:
      return "system";
  }
}

/** Map shared category → AppNotification.category for existing UIs. */
export function toAppNotificationCategory(
  category: LumenXNotificationCategory,
): NotificationCategory {
  switch (category) {
    case "attendance":
      return "attendance";
    case "homework":
      return "assignments";
    case "exams":
      return "exams";
    case "fees":
      return "fees";
    case "events":
      return "events";
    case "announcements":
    case "messages":
      return "circulars";
    case "transport":
    case "leave":
    case "complaints":
    case "admissions":
    case "careers":
    case "certificates":
    case "documents":
    case "timetable":
    case "system":
    case "nexus":
      return "circulars";
    default:
      return "circulars";
  }
}

function formatDisplayTime(iso: string): string {
  try {
    return new Date(iso).toLocaleString("en-IN", {
      day: "numeric",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

/**
 * Adapt shared contract → existing AppNotification for current inbox UIs.
 * Preserves href as deep link; does not write storage.
 */
export function toAppNotification(
  n: LumenXNotification,
  overrides?: Partial<AppNotification>,
): AppNotification {
  return {
    id: n.id,
    title: n.title,
    desc: n.message,
    time: formatDisplayTime(n.timestamp),
    type: n.type,
    category: toAppNotificationCategory(n.category),
    unread: n.unread,
    priority: toAppNotificationPriority(n.priority),
    detail: n.message,
    starred: n.starred,
    createdAt: n.timestamp,
    templateId: n.templateId,
    href: n.href,
    ...overrides,
  };
}

/**
 * Adapt existing AppNotification → shared contract.
 * Requires audience + source (not on AppNotification).
 */
export function fromAppNotification(
  n: AppNotification,
  input: {
    audience: LumenXNotificationAudience;
    source: string;
    category?: LumenXNotificationCategory;
    href?: string;
    metadata?: LumenXNotification["metadata"];
  },
): LumenXNotification {
  const timestamp = n.createdAt ?? new Date().toISOString();
  const priority = fromAppNotificationPriority(n.priority);
  return {
    id: n.id,
    category: input.category ?? categoryFromAppNotificationCategory(n.category),
    type: n.type,
    title: n.title,
    message: n.desc,
    source: input.source,
    audience: input.audience,
    priority: n.type === "positive" && priority === "normal" ? "success" : priority,
    timestamp,
    href: input.href ?? n.href,
    metadata: input.metadata,
    unread: n.unread,
    starred: n.starred,
    templateId: n.templateId,
  };
}
