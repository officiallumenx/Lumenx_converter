import { useEffect, useState, useSyncExternalStore } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { isApiAuthMode } from "@/auth/auth-mode";
import { recordAnnouncementView } from "@/lib/announcements/api";
import {
  findDemoAnnouncement,
  listDemoAnnouncements,
  subscribeDemoAnnouncements,
  type ConnectAnnouncementPortalRole,
} from "@/lib/announcements/demo-load";
import type { AnnouncementDto } from "@/lib/announcements/types";
import {
  useAnnouncementDetailQuery,
  useAnnouncementsListQuery,
} from "@/lib/connect-queries/hooks";
import { connectQueryKeys } from "@/lib/connect-queries/keys";

export function useConnectAnnouncementsList(
  instituteId: string | null,
  role: ConnectAnnouncementPortalRole,
) {
  const apiMode = isApiAuthMode();
  const query = useAnnouncementsListQuery(instituteId, apiMode);

  const demoEpoch = useSyncExternalStore(
    apiMode ? () => () => undefined : subscribeDemoAnnouncements,
    () => (apiMode ? "" : listDemoAnnouncements(role).map((r) => r.id).join(",")),
    () => "",
  );

  if (!apiMode) {
    void demoEpoch;
    return {
      items: listDemoAnnouncements(role),
      loading: false,
      error: null as string | null,
      reload: () => undefined,
    };
  }

  const loading = query.isLoading && !query.data;
  const items = query.data ?? [];
  const error =
    query.isError
      ? query.error instanceof Error
        ? query.error.message
        : "Failed to load announcements"
      : null;

  return { items, loading, error, reload: query.refresh };
}

export function useConnectAnnouncementDetail(
  id: string,
  instituteId: string | null,
  role: ConnectAnnouncementPortalRole,
) {
  const apiMode = isApiAuthMode();
  const queryClient = useQueryClient();
  const query = useAnnouncementDetailQuery(instituteId, id, apiMode && Boolean(id));

  const [demoItem, setDemoItem] = useState<AnnouncementDto | null>(null);
  const [demoLoading, setDemoLoading] = useState(!apiMode && Boolean(id));

  useEffect(() => {
    if (apiMode || !id) {
      setDemoItem(null);
      setDemoLoading(false);
      return;
    }
    const refresh = () => {
      setDemoItem(findDemoAnnouncement(role, id));
      setDemoLoading(false);
    };
    refresh();
    return subscribeDemoAnnouncements(refresh);
  }, [apiMode, id, role]);

  useEffect(() => {
    if (!apiMode || !id || !query.data || query.data.status !== "published") return;
    void recordAnnouncementView(id)
      .then((row) => {
        queryClient.setQueryData(
          connectQueryKeys.announcement(instituteId ?? "_", id),
          row,
        );
      })
      .catch(() => undefined);
  }, [apiMode, id, instituteId, query.data?.id, query.data?.status, queryClient]);

  if (!apiMode) {
    return {
      item: demoItem,
      loading: demoLoading,
      error: null as string | null,
    };
  }

  const loading = Boolean(id) && query.isLoading && !query.data;
  const error =
    query.isError
      ? query.error instanceof Error
        ? query.error.message
        : "Failed to load announcement"
      : null;

  return { item: query.data ?? null, loading, error };
}
