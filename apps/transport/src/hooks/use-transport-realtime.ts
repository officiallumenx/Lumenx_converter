import { useEffect } from "react";
import { toast } from "sonner";
import { subscribeTransportRealtime } from "@lumenx/utils";
import { isApiAuthMode } from "@/lib/auth/auth-mode";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

/** Refresh driver route-setup when admin approves/rejects transport submissions. */
export function useTransportRealtimeRefresh(
  instituteId: string | undefined,
  onRefresh: () => void,
): void {
  const apiMode = isApiAuthMode();

  useEffect(() => {
    if (!apiMode || !instituteId) return;
    try {
      const supabase = getSupabaseBrowserClient();
      return subscribeTransportRealtime(supabase, {
        instituteId,
        onChange: () => {
          onRefresh();
          toast.message("Transport updated", {
            description: "Refreshing your pending stops and assignments.",
          });
        },
      });
    } catch {
      return undefined;
    }
  }, [apiMode, instituteId, onRefresh]);
}
