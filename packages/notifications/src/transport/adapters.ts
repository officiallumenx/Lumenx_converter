import { createLumenXNotification } from "../shared/adapters";
import type {
  LumenXNotification,
  LumenXNotificationAudience,
  LumenXNotificationPriority,
} from "../shared/types";

/** Mirror of TransportWorkflowNotification from @lumenx/utils (no package cycle). */
export type TransportWorkflowNotificationLike = {
  id: string;
  audience: "driver" | "admin" | "connect";
  category: string;
  title: string;
  message: string;
  reason: string | null;
  unread: boolean;
  createdAt: string;
  href?: string;
  meta?: Record<string, string>;
  priority?: "normal" | "important" | "critical" | "success";
  templateId?: string;
};

function mapAudience(audience: TransportWorkflowNotificationLike["audience"]): LumenXNotificationAudience {
  if (audience === "admin") return "admin";
  if (audience === "driver") return "teacher";
  return "parent";
}

function mapPriority(
  priority: TransportWorkflowNotificationLike["priority"],
  category: string,
): LumenXNotificationPriority {
  if (priority) return priority;
  if (category === "sos" || category === "emergency") return "critical";
  if (category === "boarding" || category === "approach" || category === "trip") return "important";
  return "normal";
}

/** Connect shared transport bridge rows to the LumenX notification foundation. */
export function transportWorkflowToLumenX(
  n: TransportWorkflowNotificationLike,
): LumenXNotification {
  return createLumenXNotification({
    id: n.id,
    category: "transport",
    title: n.title,
    message: n.reason ? `${n.message} Reason: ${n.reason}` : n.message,
    source: "transport",
    audience: mapAudience(n.audience),
    priority: mapPriority(n.priority, n.category),
    timestamp: n.createdAt,
    href: n.href,
    unread: n.unread,
    templateId: n.templateId,
    metadata: {
      transportCategory: n.category,
      ...n.meta,
    },
  });
}
