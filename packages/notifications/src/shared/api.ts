import type { AppNotification } from "@lumenx/types";

import { createLumenXNotification, toAppNotification } from "./adapters";
import type { CreateLumenXNotificationInput, LumenXNotification } from "./types";

/**
 * Shared helper API for modules adopting the foundation gradually.
 * Persistence stays in existing app/module stores (localStorage keys unchanged).
 */

/** Create a shared notification record (in-memory only). */
export function buildNotification(input: CreateLumenXNotificationInput): LumenXNotification {
  return createLumenXNotification(input);
}

/** Create a legacy AppNotification ready for existing inbox stores. */
export function buildAppNotification(
  input: CreateLumenXNotificationInput,
  overrides?: Partial<AppNotification>,
): AppNotification {
  return toAppNotification(createLumenXNotification(input), overrides);
}

/** Ensure required shared fields exist; fills defaults without inventing new models. */
export function normalizeLumenXNotification(
  partial: Partial<LumenXNotification> &
    Pick<LumenXNotification, "title" | "message" | "category" | "source" | "audience">,
): LumenXNotification {
  return createLumenXNotification({
    id: partial.id,
    category: partial.category,
    type: partial.type,
    title: partial.title,
    message: partial.message,
    source: partial.source,
    audience: partial.audience,
    priority: partial.priority,
    timestamp: partial.timestamp,
    href: partial.href,
    metadata: partial.metadata,
    unread: partial.unread,
    starred: partial.starred,
    templateId: partial.templateId,
  });
}
