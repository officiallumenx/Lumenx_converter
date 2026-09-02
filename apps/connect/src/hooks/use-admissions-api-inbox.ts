import { useCallback, useEffect, useState } from "react";
import { isApiAuthMode } from "@/auth/auth-mode";
import type { AdmissionsNotification } from "@/lib/admissions/types";
import {
  getTransientParentConfirmationReminders,
} from "@/lib/admissions/repositories";
import {
  inboxItemDtoToAppNotification,
  listInboxNotifications,
  markInboxItemRead,
} from "@/lib/notification-inbox";

function admissionsTypeFromInbox(
  item: ReturnType<typeof inboxItemDtoToAppNotification>,
): AdmissionsNotification["type"] {
  const title = item.title.toLowerCase();
  if (title.includes("approved") || title.includes("selected")) return "approval";
  if (title.includes("not selected") || title.includes("rejected")) return "rejection";
  if (title.includes("document") || title.includes("correction")) return "document";
  if (title.includes("confirmation")) return "confirmation";
  return "general";
}

function inboxToAdmissionsNotification(
  dto: Parameters<typeof inboxItemDtoToAppNotification>[0],
  applicantId: string,
): AdmissionsNotification {
  const mapped = inboxItemDtoToAppNotification(dto);
  return {
    id: mapped.id,
    applicantId,
    applicationId:
      typeof dto.notification.payload.applicationId === "string"
        ? dto.notification.payload.applicationId
        : undefined,
    title: mapped.title,
    body: mapped.desc,
    type: admissionsTypeFromInbox(mapped),
    read: !mapped.unread,
    createdAt: mapped.createdAt ?? dto.createdAt,
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
          const admissionsRows = rows
            .filter((row) => row.notification.category === "admissions")
            .map((row) => inboxToAdmissionsNotification(row, applicantId));
          const transient = getTransientParentConfirmationReminders(applicantId);
          setItems(
            [...transient, ...admissionsRows].sort((a, b) =>
              b.createdAt.localeCompare(a.createdAt),
            ),
          );
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
    if (!isApiAuthMode() || id.startsWith("transient-reminder-")) return;
    try {
      await markInboxItemRead(id);
    } catch {
      // optimistic UI
    }
  }, []);

  const markAllRead = useCallback(async () => {
    const unread = items.filter((n) => !n.read && !n.id.startsWith("transient-reminder-"));
    setItems((prev) => prev.map((n) => ({ ...n, read: true })));
    if (!isApiAuthMode()) return;
    await Promise.all(unread.map((n) => markInboxItemRead(n.id).catch(() => undefined)));
  }, [items]);

  return { items, loading, error, markRead, markAllRead, reload };
}
