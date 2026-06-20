import { BellRing, CheckCheck } from "lucide-react";
import { SectionCard } from "@/components/app/SectionCard";
import type { TransportAlert } from "@/lib/transport/types";
import {
  sortTransportAlerts,
  TRANSPORT_EVENT_LABELS,
  TRANSPORT_EVENT_TONE,
  unreadTransportAlertCount,
} from "@/lib/transport-utils";
import { Badge, Button, cn } from "@lumenx/ui";

export function TransportAlertsList({
  alerts,
  onMarkRead,
  onMarkAllRead,
}: {
  alerts: TransportAlert[];
  onMarkRead: (id: string) => void;
  onMarkAllRead: () => void;
}) {
  const sorted = sortTransportAlerts(alerts);
  const unread = unreadTransportAlertCount(alerts);

  return (
    <SectionCard
      title="Transport alerts"
      action={
        unread > 0 ? (
          <Button variant="ghost" size="sm" className="h-8 rounded-lg gap-1.5 text-xs" onClick={onMarkAllRead}>
            <CheckCheck className="size-3.5" /> Mark all read
          </Button>
        ) : undefined
      }
    >
      <div className="mb-3 flex flex-wrap gap-2">
        {(["eta_10min", "eta_5min", "arrived_stop", "picked_up", "reached_school", "dropped_school"] as const).map(
          (type) => (
            <Badge key={type} variant="outline" className="text-[10px] font-normal">
              {TRANSPORT_EVENT_LABELS[type]}
            </Badge>
          ),
        )}
      </div>

      {sorted.length === 0 ? (
        <p className="py-8 text-center text-sm text-muted-foreground">No transport alerts yet.</p>
      ) : (
        <ul className="space-y-2">
          {sorted.map((alert) => (
            <li
              key={alert.id}
              className={cn(
                "rounded-xl border px-3 py-2.5 text-sm transition-colors",
                alert.read ? "border-border bg-card" : "border-primary/25 bg-primary/5",
              )}
            >
              <div className="flex items-start gap-2">
                <BellRing
                  className={cn(
                    "size-4 shrink-0 mt-0.5",
                    alert.read ? "text-muted-foreground" : "text-primary",
                  )}
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">{alert.title}</p>
                    <Badge
                      variant="outline"
                      className={cn(
                        "text-[10px]",
                        TRANSPORT_EVENT_TONE[alert.type] === "warning" && "border-warning/40",
                        TRANSPORT_EVENT_TONE[alert.type] === "success" && "border-success/40",
                      )}
                    >
                      {TRANSPORT_EVENT_LABELS[alert.type]}
                    </Badge>
                  </div>
                  <p className="mt-0.5 text-xs text-muted-foreground">{alert.message}</p>
                  <p className="mt-1 text-[10px] text-muted-foreground">{alert.time}</p>
                </div>
                {!alert.read && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 shrink-0 rounded-lg text-[10px]"
                    onClick={() => onMarkRead(alert.id)}
                  >
                    Read
                  </Button>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </SectionCard>
  );
}
