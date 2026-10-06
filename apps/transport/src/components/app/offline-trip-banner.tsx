import { useEffect, useState, useSyncExternalStore } from "react";
import { WifiOff } from "lucide-react";

import { cn } from "@lumenx/ui";
import {
  getOpsOutboxSnapshot,
  subscribeOpsOutbox,
} from "@/lib/transport/ops-outbox";

/** Shown when the device is offline or the ops outbox has pending work offline. */
export function OfflineTripBanner({ className }: { className?: string }) {
  const [offline, setOffline] = useState(() =>
    typeof navigator !== "undefined" ? !navigator.onLine : false,
  );
  const outbox = useSyncExternalStore(
    subscribeOpsOutbox,
    getOpsOutboxSnapshot,
    getOpsOutboxSnapshot,
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    const sync = () => setOffline(!navigator.onLine);
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    sync();
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);

  if (!offline && outbox.online) return null;

  return (
    <div
      className={cn(
        "flex items-start gap-2.5 rounded-2xl border border-warning/40 bg-warning/10 px-3.5 py-3",
        className,
      )}
      role="status"
    >
      <WifiOff className="mt-0.5 size-4 shrink-0 text-warning" aria-hidden />
      <div className="min-w-0">
        <p className="text-sm font-semibold text-foreground">Offline</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
          Offline — changes will sync when connection returns.
          {outbox.pendingCount > 0
            ? ` ${outbox.pendingCount} event${outbox.pendingCount === 1 ? "" : "s"} queued.`
            : ""}
        </p>
      </div>
    </div>
  );
}
