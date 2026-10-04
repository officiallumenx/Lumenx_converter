import { useMemo, useState } from "react";
import {
  Button,
  Card,
  CardHeader,
  EmptyState,
  Pill,
  TextArea,
} from "@lumenx/ui-admin";
import { Check, ClipboardList, X } from "lucide-react";
import { useQueryClient } from "@tanstack/react-query";
import { useTransportReviewQueueQuery } from "@/lib/admin-queries";
import { adminQueryKeys } from "@/lib/admin-queries/keys";
import {
  approveTransportEnrollment,
  approveTransportRoute,
  approveTransportStop,
  rejectTransportEnrollment,
  rejectTransportRoute,
  rejectTransportStop,
} from "@/lib/transport/approval-mutations";
import { useTransportRealtimeInvalidate } from "@/lib/transport/use-transport-realtime-invalidate";
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
  const queryClient = useQueryClient();
  const queueQuery = useTransportReviewQueueQuery(instituteId);
  useTransportRealtimeInvalidate(instituteId);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [rejectReasonById, setRejectReasonById] = useState<Record<string, string>>(
    {},
  );

  const items = queueQuery.data ?? [];
  const sorted = useMemo(
    () =>
      [...items].sort((a, b) =>
        itemLabel(a).localeCompare(itemLabel(b), undefined, { sensitivity: "base" }),
      ),
    [items],
  );

  const refresh = () =>
    queryClient.invalidateQueries({
      queryKey: adminQueryKeys.transport(instituteId, "review-queue"),
    });

  async function handleApprove(item: TransportReviewQueueItem) {
    if (!writesEnabled) return;
    const id = itemId(item);
    setBusyId(id);
    try {
      if (item.kind === "route") await approveTransportRoute(id);
      else if (item.kind === "stop") await approveTransportStop(id);
      else await approveTransportEnrollment(id);
      onNotify?.(item.kind === "stop" ? "Stop published" : "Approved");
      await refresh();
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
      await refresh();
    } catch (err) {
      onNotify?.(err instanceof Error ? err.message : "Reject failed");
    } finally {
      setBusyId(null);
    }
  }

  if (queueQuery.isLoading && items.length === 0) {
    return (
      <Card>
        <CardHeader title="Publish queue" />
        <p className="px-4 pb-4 text-sm text-muted-foreground">Loading…</p>
      </Card>
    );
  }

  if (queueQuery.isError && items.length === 0) {
    return (
      <Card>
        <CardHeader title="Publish queue" />
        <p className="px-4 pb-4 text-sm text-destructive">
          {queueQuery.error instanceof Error
            ? queueQuery.error.message
            : "Failed to load review queue"}
        </p>
      </Card>
    );
  }

  if (sorted.length === 0) {
    return (
      <EmptyState
        icon={<ClipboardList className="size-5" />}
        title="Nothing to publish"
        hint="Driver-submitted routes, stops, and enrollments awaiting approval will appear here."
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
                <Pill tone="warning">
                  {item.kind}
                </Pill>
              }
            />
            <div className="space-y-3 px-4 pb-4">
              <TextArea
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
                  {item.kind === "stop" ? "Publish" : "Approve"}
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
