import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { subscribeTransportRealtime } from "@lumenx/utils";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import { ADMIN_QUERY_SCOPE, adminQueryRoots } from "@/lib/admin-queries/keys";

/** Soft-invalidate all transport queries when realtime events arrive. */
export function useTransportRealtimeInvalidate(instituteId: string) {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!instituteId) return;
    try {
      const supabase = getSupabaseBrowserClient();
      return subscribeTransportRealtime(supabase, {
        instituteId,
        onChange: () => {
          void queryClient.invalidateQueries({
            queryKey: [ADMIN_QUERY_SCOPE, instituteId, adminQueryRoots.transport],
          });
        },
      });
    } catch {
      return undefined;
    }
  }, [instituteId, queryClient]);
}
