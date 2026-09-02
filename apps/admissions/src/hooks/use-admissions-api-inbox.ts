import { useCallback, useEffect, useState } from "react";
import { isApiAuthMode } from "@/auth/auth-mode";
import type { AdmissionsNotification } from "@/lib/admissions/types";
import {
  listInboxNotifications,
  markInboxItemRead,
} from "@/lib/notification-inbox";
import type { InboxItemDto } from "@/lib/notification-inbox/types";

function admissionsTypeFromDto(dto: InboxItemDto): AdmissionsNotification["type"] {
  const title = dto.notification.title.toLowerCase();
  const body = dto.notification.body.toLowerCase();
  if (title.includes("reject")) return "rejection";
  if (title.includes("approv") || title.includes("admit")) return "approval";
  if (title.includes("confirm")) return "confirmation";
  if (title.includes("document")) return "document";
  if (title.includes("remind")) return "reminder";
  if (title.includes("submit") || body.includes("application")) return "application";
  return "general";
}

function inboxItemToAdmissionsNotification(
  dto: InboxItemDto,
  applicantId: string,
): AdmissionsNotification {
  const applicationId =
    typeof dto.notification.payload.applicationId === "string"
      ? dto.notification.payload.applicationId
      : undefined;

  return {
    id: dto.id,
    applicantId,
    applicationId,
    templateId: dto.notification.templateId ?? undefined,
    title: dto.notification.title?.trim() || "Notification",
    body: dto.notification.body?.trim() || "",
    type: admissionsTypeFromDto(dto),
    read: dto.readAt != null,
    createdAt: dto.notification.createdAt || dto.createdAt,
  };
}

export function useAdmissionsApiInbox(applicantId: string | null) {
  const [items, setItems] = useState<AdmissionsNotification[]>([]);
  const [loading, setLoading] = useState(isApiAuthMode());
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => {
    setReloadKey((k) => k + 1);
  }, []);

  useEffect(() => {
    if (!isApiAuthMode()) {
      setLoading(false);
      return;
    }
    if (!applicantId) {
      setItems([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    void listInboxNotifications()
      .then((rows) => {
        if (!cancelled) {
          setItems(rows.map((row) => inboxItemToAdmissionsNotification(row, applicantId)));
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load notifications");
          setItems([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [applicantId, reloadKey]);

  const markRead = useCallback(async (id: string) => {
    setItems((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    if (!isApiAuthMode()) return;
    try {
      await markInboxItemRead(id);
    } catch {
      // optimistic UI
    }
  }, []);

  const markAllRead = useCallback(async () => {
    const unread = items.filter((n) => !n.read);
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    if (!isApiAuthMode()) return;
    await Promise.all(unread.map((n) => markInboxItemRead(n.id).catch(() => undefined)));
  }, [items]);

  return { items, loading, error, markRead, markAllRead, reload };
}
