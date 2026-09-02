import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Button,
  Card,
  CardHeader,
  EmptyState,
  Pill,
  Textarea,
} from "@lumenx/ui-admin";
import { Check, ClipboardList, X } from "lucide-react";
import { subscribeTransportRealtime } from "@lumenx/utils";
import { getSupabaseBrowserClient } from "@/lib/supabase-browser";
import {
  approveTransportEnrollment,
  approveTransportRoute,
  approveTransportStop,
  rejectTransportEnrollment,
  rejectTransportRoute,
  rejectTransportStop,
} from "@/lib/transport/approval-mutations";
import { listTransportReviewQueue } from "@/lib/transport/approval-api";
import type { TransportReviewQueueItem } from "@/lib/transport/types";

type Props = {
  instituteId: string;
  writesEnabled?: boolean;
  onNotify?: (message: string) => void;
};

function itemLabel(item: TransportReviewQueueItem): string {
  if (item.kind === "route") return `Route: ${item.item.name}`;
  if (item.kind === "stop") return `Stop: ${item.item.name}`;
  return `Enrollment: ${item.item.studentId}`;
}

function itemId(item: TransportReviewQueueItem): string {
  return item.item.id;
}

export function TransportApprovalApiPanel({
  instituteId,
  writesEnabled = true,
  onNotify,
}: Props) {
  const [items, setItems] = useState<TransportReviewQueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectReasonById, setRejectReasonById] = useState<Record<string, string>>(
    {},
  );

  const reload = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await listTransportReviewQueue({ instituteId });
      setItems(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load review queue");
    } finally {
      setLoading(false);
    }
  }, [instituteId]);

  useEffect(() => {
    void reload();
  }, [reload]);

  useEffect(() => {
    try {
      const supabase = getSupabaseBrowserClient();
      return subscribeTransportRealtime(supabase, {
        instituteId,
        onChange: () => {
          void reload();
        },
      });
    } catch {
      return undefined;
    }
  }, [instituteId, reload]);

  const sorted = useMemo(
    () =>
      [...items].sort((a, b) =>
        itemLabel(a).localeCompare(itemLabel(b), undefined, { sensitivity: "base" }),
      ),
    [items],
  );

  async function handleApprove(item: TransportReviewQueueItem) {
    if (!writesEnabled) return;
    const id = itemId(item);
    setBusyId(id);
    try {
      if (item.kind === "route") await approveTransportRoute(id);
      else if (item.kind === "stop") await approveTransportStop(id);
      else await approveTransportEnrollment(id);
      onNotify?.("Approved");
      await reload();
    } catch (err) {
      onNotify?.(err instanceof Error ? err.message : "Approve failed");
    } finally {
      setBusyId(null);
    }
  }

  async function handleReject(item: TransportReviewQueueItem) {
    if (!writesEnabled) return;
    const id = itemId(item);
    const reason = (rejectReasonById[id] ?? "").trim();
    if (!reason) {
      onNotify?.("Enter a rejection reason");
      return;
    }
    setBusyId(id);
    try {
      if (item.kind === "route") await rejectTransportRoute(id, reason);
      else if (item.kind === "stop") await rejectTransportStop(id, reason);
      else await rejectTransportEnrollment(id, reason);
      onNotify?.("Rejected");
      await reload();
    } catch (err) {
      onNotify?.(err instanceof Error ? err.message : "Reject failed");
    } finally {
      setBusyId(null);
    }
  }

  if (loading) {
    return (
      <Card>
        <CardHeader title="Pending requests" />
        <p className="px-4 pb-4 text-sm text-muted-foreground">Loading…</p>
      </Card>
    );
  }

  if (error) {
    return (
      <Card>
        <CardHeader title="Pending requests" />
        <p className="px-4 pb-4 text-sm text-destructive">{error}</p>
      </Card>
    );
  }

  if (sorted.length === 0) {
    return (
      <EmptyState
        icon={ClipboardList}
        title="No pending requests"
        description="Driver-submitted routes, stops, and enrollments awaiting approval will appear here."
      />
    );
  }

  return (
    <div className="space-y-3">
      {sorted.map((item) => {
        const id = itemId(item);
        const busy = busyId === id;
        return (
          <Card key={`${item.kind}-${id}`}>
            <CardHeader
              title={itemLabel(item)}
              action={
                <Pill tone="warning" size="sm">
                  {item.kind}
                </Pill>
              }
            />
            <div className="space-y-3 px-4 pb-4">
              <Textarea
                rows={2}
                placeholder="Rejection reason (required to decline)"
                value={rejectReasonById[id] ?? ""}
                onChange={(e) =>
                  setRejectReasonById((prev) => ({
                    ...prev,
                    [id]: e.target.value,
                  }))
                }
                disabled={!writesEnabled || busy}
              />
              <div className="flex flex-wrap gap-2">
                <Button
                  size="sm"
                  variant="primary"
                  disabled={!writesEnabled || busy}
                  onClick={() => void handleApprove(item)}
                >
                  <Check className="size-4" />
                  Approve
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  disabled={!writesEnabled || busy}
                  onClick={() => void handleReject(item)}
                >
                  <X className="size-4" />
                  Decline
                </Button>
              </div>
            </div>
          </Card>
        );
      })}
    </div>
  );
}
