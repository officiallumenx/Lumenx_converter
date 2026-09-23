import type { AppNotification } from "@lumenx/types";

import type { LumenXNotificationPriority, LumenXNotificationType } from "./types";

/** Map legacy AppNotification.priority → shared priority. */
export function fromAppNotificationPriority(
  priority: AppNotification["priority"] | undefined,
): LumenXNotificationPriority {
  if (priority === "high") return "important";
  if (priority === "low") return "normal";
  return "normal";
}

/** Map shared priority → legacy AppNotification.priority. Only critical is "high". */
export function toAppNotificationPriority(
  priority: LumenXNotificationPriority,
): NonNullable<AppNotification["priority"]> {
  if (priority === "critical") return "high";
  return "normal";
}

/** Infer display type from priority when not provided. */
export function typeFromPriority(priority: LumenXNotificationPriority): LumenXNotificationType {
  if (priority === "critical" || priority === "important") return "warning";
  if (priority === "success") return "positive";
  return "info";
}
