import { useMemo, useState } from "react";
import {
  Button,
  Card,
  CardHeader,
  Pill,
  TextArea,
} from "@lumenx/ui-admin";
import { Check, MapPin, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTransportReviewQueueQuery } from "@/lib/admin-queries";
import { adminQueryKeys } from "@/lib/admin-queries/keys";
import {
  approveTransportStop,
  rejectTransportStop,
} from "@/lib/transport/approval-mutations";
import { useTransportRealtimeInvalidate } from "@/lib/transport/use-transport-realtime-invalidate";
import type { StopDto } from "@/lib/transport/types";

type Props = {
  instituteId: string;
  writesEnabled?: boolean;
  /** Cap listed rows; rest stay in Reviews. */
  maxItems?: number;
  onNotify?: (message: string) => void;
  onOpenReviews?: () => void;
  /** Hide the card entirely when the queue is empty (Home). */
  hideWhenEmpty?: boolean;
};

/**
 * Compact accept/decline list for driver-created stops — Transport dashboard + Home.
 */
export function TransportPendingStopsActionCard({
  instituteId,
  writesEnabled = true,
  maxItems = 5,
  onNotify,
  onOpenReviews,
  hideWhenEmpty = false,
}: Props) {
  const queryClient = useQueryClient();
  const queueQuery = useTransportReviewQueueQuery(instituteId);
  useTransportRealtimeInvalidate(instituteId);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [reasonById, setReasonById] = useState<Record<string, string>>({});

  const stops = useMemo(() => {
    const items = queueQuery.data ?? [];
    return items
      .filter((row): row is { kind: "stop"; item: StopDto } => row.kind === "stop")
      .map((row) => row.item);
  }, [queueQuery.data]);

  const visible = stops.slice(0, maxItems);
  const overflow = Math.max(0, stops.length - visible.length);

  const refresh = () =>
    queryClient.invalidateQueries({
      queryKey: adminQueryKeys.transport(instituteId, "review-queue"),
    });

  async function accept(stop: StopDto) {
    if (!writesEnabled) return;
    setBusyId(stop.id);
    try {
      await approveTransportStop(stop.id);
      onNotify?.(`Accepted stop · ${stop.name}`);
      await refresh();
    } catch (err) {
      onNotify?.(err instanceof Error ? err.message : "Could not accept stop");
    } finally {
      setBusyId(null);
    }
  }

  async function decline(stop: StopDto) {
    if (!writesEnabled) return;
    const reason = (reasonById[stop.id] ?? "").trim();
    if (!reason) {
      onNotify?.("Enter a reason to decline");
      return;
    }
    setBusyId(stop.id);
    try {
      await rejectTransportStop(stop.id, reason);
      onNotify?.(`Declined stop · ${stop.name}`);
      await refresh();
    } catch (err) {
      onNotify?.(err instanceof Error ? err.message : "Could not decline stop");
    } finally {
      setBusyId(null);
    }
  }

  if (queueQuery.isLoading && stops.length === 0) {
    return (
      <Card>
        <CardHeader title="Driver stops to accept" hint="Loading…" />
        <p className="px-4 pb-4 text-sm text-muted-foreground sm:px-5">
          Checking for driver-submitted stops…
        </p>
      </Card>
    );
  }

  if (hideWhenEmpty && stops.length === 0 && !queueQuery.isError) {
    return null;
  }

  return (
    <Card>
      <CardHeader
        title="Driver stops to accept"
        hint={
          stops.length > 0
            ? `${stops.length} waiting · accept to publish on the route`
            : "Stops drivers create appear here for a quick accept"
        }
        action={
          <div className="flex items-center gap-2">
            {stops.length > 0 ? (
              <Pill tone="warning">{stops.length}</Pill>
            ) : (
              <Pill tone="neutral">0</Pill>
            )}
            {onOpenReviews ? (
              <Button size="sm" variant="outline" onClick={onOpenReviews}>
                Reviews
              </Button>
            ) : null}
          </div>
        }
      />
      <div className="space-y-3 px-4 pb-4 sm:px-5">
        {queueQuery.isError ? (
          <p className="text-sm text-destructive">
            {queueQuery.error instanceof Error
              ? queueQuery.error.message
              : "Could not load pending stops"}
          </p>
        ) : null}

        {stops.length === 0 && !queueQuery.isError ? (
          <p className="text-sm text-muted-foreground">
            No driver stops waiting. New submissions show up here for accept or decline.
          </p>
        ) : null}

        {visible.map((stop) => {
          const busy = busyId === stop.id;
          return (
            <div
              key={stop.id}
              className="rounded-lg border border-border bg-background/50 px-3 py-2.5 space-y-2"
            >
              <div className="flex items-start gap-2">
                <MapPin className="size-3.5 mt-0.5 shrink-0 text-muted-foreground" aria-hidden />
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-semibold leading-snug">{stop.name}</p>
                  <p className="text-[11px] text-muted-foreground truncate">
                    {stop.locationLabel || "No location label"}
                  </p>
                </div>
              </div>
              <TextArea
                rows={1}
                placeholder="Decline reason (required to decline)"
                value={reasonById[stop.id] ?? ""}
                onChange={(e) =>
                  setReasonById((prev) => ({ ...prev, [stop.id]: e.target.value }))
                }
                disabled={!writesEnabled || busy}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  disabled={!writesEnabled || busy}
                  onClick={() => void accept(stop)}
                >
                  <Check className="size-3.5" /> Accept
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!writesEnabled || busy}
                  onClick={() => void decline(stop)}
                >
                  <X className="size-3.5" /> Decline
                </Button>
              </div>
            </div>
          );
        })}

        {overflow > 0 ? (
          <p className="text-[11px] text-muted-foreground">
            +{overflow} more in Reviews
          </p>
        ) : null}
      </div>
    </Card>
  );
}
