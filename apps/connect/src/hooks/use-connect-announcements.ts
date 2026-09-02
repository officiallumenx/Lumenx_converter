import { useCallback, useEffect, useState } from "react";
import { isApiAuthMode } from "@/auth/auth-mode";
import {
  getAnnouncement,
  listAnnouncements,
  recordAnnouncementView,
} from "@/lib/announcements/api";
import {
  findDemoAnnouncement,
  listDemoAnnouncements,
  subscribeDemoAnnouncements,
  type ConnectAnnouncementPortalRole,
} from "@/lib/announcements/demo-load";
import type { AnnouncementDto } from "@/lib/announcements/types";

export function useConnectAnnouncementsList(
  instituteId: string | null,
  role: ConnectAnnouncementPortalRole,
) {
  const apiMode = isApiAuthMode();
  const [items, setItems] = useState<AnnouncementDto[]>([]);
  const [loading, setLoading] = useState(apiMode);
  const [error, setError] = useState<string | null>(null);
  const [reloadKey, setReloadKey] = useState(0);

  const reload = useCallback(() => setReloadKey((k) => k + 1), []);

  useEffect(() => {
    if (!apiMode) {
      const refresh = () => setItems(listDemoAnnouncements(role));
      refresh();
      return subscribeDemoAnnouncements(refresh);
    }

    if (!instituteId) {
      setItems([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    void listAnnouncements({ instituteId })
      .then((rows) => {
        if (!cancelled) {
          setItems(rows.filter((row) => row.status === "published"));
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load announcements");
          setItems([]);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [apiMode, instituteId, role, reloadKey]);

  return { items, loading, error, reload };
}

export function useConnectAnnouncementDetail(
  id: string,
  instituteId: string | null,
  role: ConnectAnnouncementPortalRole,
) {
  const apiMode = isApiAuthMode();
  const [item, setItem] = useState<AnnouncementDto | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!id) {
      setItem(null);
      setLoading(false);
      return;
    }

    if (!apiMode) {
      const refresh = () => {
        setItem(findDemoAnnouncement(role, id));
        setLoading(false);
      };
      refresh();
      return subscribeDemoAnnouncements(refresh);
    }

    let cancelled = false;
    setLoading(true);
    void getAnnouncement(id)
      .then((row) => {
        if (!cancelled) {
          setItem(row);
          setError(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : "Failed to load announcement");
          setItem(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [apiMode, id, role]);

  useEffect(() => {
    if (!apiMode || !id || !item || item.status !== "published") return;
    void recordAnnouncementView(id).then(setItem).catch(() => undefined);
  }, [apiMode, id, item?.id, item?.status]);

  return { item, loading, error };
}
