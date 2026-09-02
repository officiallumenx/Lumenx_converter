import { useCallback, useEffect, useState } from "react";
import { isApiAuthMode } from "@/auth/auth-mode";
import type { CareersNotification } from "@/lib/careers/types";
import {
  inboxItemDtosToCareersNotifications,
  listInboxNotifications,
  markInboxItemRead,
} from "@/lib/notification-inbox";

export function useCareersApiInbox(candidateId: string | null) {
  const [items, setItems] = useState<CareersNotification[]>([]);
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
    if (!candidateId) {
      setItems([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    void listInboxNotifications()
      .then((rows) => {
        if (!cancelled) {
          setItems(inboxItemDtosToCareersNotifications(rows, candidateId));
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
  }, [candidateId, reloadKey]);

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
