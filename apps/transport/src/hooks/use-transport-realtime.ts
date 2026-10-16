import { useEffect, useRef } from "react";
import { toast } from "sonner";
import { subscribeTransportRealtime } from "@lumenx/utils";
import { isApiAuthMode } from "@/lib/auth/auth-mode";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";

const TOAST_COOLDOWN_MS = 8_000;
const REFRESH_DEBOUNCE_MS = 400;

type Options = {
  /** Show a toast when remote transport data changes (default true). */
  notify?: boolean;
};

/**
 * Subscribe to Supabase transport realtime and call onRefresh (debounced).
 * Used for live API invalidation after Admin / ops changes.
 */
export function useTransportRealtimeRefresh(
  instituteId: string | undefined,
  onRefresh: () => void,
  options?: Options,
): void {
  const apiMode = isApiAuthMode();
  const notify = options?.notify !== false;
  const onRefreshRef = useRef(onRefresh);
  onRefreshRef.current = onRefresh;
  const lastToastAt = useRef(0);

  useEffect(() => {
    if (!apiMode || !instituteId) return;

    let debounceTimer: ReturnType<typeof setTimeout> | null = null;
    let unsub: (() => void) | undefined;

    try {
      const supabase = getSupabaseBrowserClient();
      unsub = subscribeTransportRealtime(supabase, {
        instituteId,
        onChange: () => {
          if (debounceTimer) clearTimeout(debounceTimer);
          debounceTimer = setTimeout(() => {
            onRefreshRef.current();
            if (!notify) return;
            const now = Date.now();
            if (now - lastToastAt.current < TOAST_COOLDOWN_MS) return;
            lastToastAt.current = now;
            toast.message("Transport updated", {
              description: "Refreshing assignment and trip data from the server.",
            });
          }, REFRESH_DEBOUNCE_MS);
        },
      });
    } catch {
      return undefined;
    }

    return () => {
      if (debounceTimer) clearTimeout(debounceTimer);
      unsub?.();
    };
  }, [apiMode, instituteId, notify]);
}
