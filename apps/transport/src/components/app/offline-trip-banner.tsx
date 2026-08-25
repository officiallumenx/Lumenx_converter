import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

import { cn } from "@lumenx/ui";

/** Shown during an active trip when the device reports offline. */
export function OfflineTripBanner({ className }: { className?: string }) {
  const [offline, setOffline] = useState(() =>
    typeof navigator !== "undefined" ? !navigator.onLine : false,
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

  if (!offline) return null;

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
        <p className="text-sm font-semibold text-foreground">No internet</p>
        <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">
          You can keep marking attendance on this phone. Changes sync when internet is back (same
          device demo).
        </p>
      </div>
    </div>
  );
}
