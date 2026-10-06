import { useState } from "react";
import { Button } from "@lumenx/ui";
import { toast } from "sonner";
import {
  createNotRidingToday,
  undoNotRidingToday,
  type TransportDailyExceptionDto,
  type TransportParticipationDto,
} from "@/lib/transport";

type Props = {
  instituteId: string;
  studentId: string;
  participation: TransportParticipationDto | null | undefined;
  onChanged: () => void;
};

export function NotRidingTodayCard({
  instituteId,
  studentId,
  participation,
  onChanged,
}: Props) {
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [optimisticActive, setOptimisticActive] = useState<boolean | null>(null);

  const exception = participation?.exception ?? null;
  const serverActive = Boolean(
    exception && exception.exceptionType === "NOT_RIDING" && !exception.cancelledAt,
  );
  const active = optimisticActive ?? serverActive;

  const markNotRiding = async () => {
    setBusy(true);
    setSyncing(true);
    setOptimisticActive(true);
    setConfirming(false);
    try {
      await createNotRidingToday({ instituteId, studentId });
      toast.success("Marked not riding today", {
        description: "Permanent bus assignment is unchanged. This applies only for today.",
      });
      onChanged();
    } catch (err) {
      setOptimisticActive(null);
      toast.error(err instanceof Error ? err.message : "Could not update transport");
    } finally {
      setBusy(false);
      setSyncing(false);
      setOptimisticActive(null);
    }
  };

  const undo = async () => {
    if (!exception?.id) return;
    if (!exception.canUndo) {
      toast.message("Undo window closed", {
        description:
          "Cutoff is based on school pickup time minus the pickup buffer. Contact transport office.",
      });
      return;
    }
    setBusy(true);
    setSyncing(true);
    setOptimisticActive(false);
    try {
      await undoNotRidingToday(exception.id);
      toast.success("Riding today again");
      onChanged();
    } catch (err) {
      setOptimisticActive(null);
      toast.error(err instanceof Error ? err.message : "Could not undo");
    } finally {
      setBusy(false);
      setSyncing(false);
      setOptimisticActive(null);
    }
  };

  return (
    <div className="rounded-xl border border-border bg-muted/20 px-4 py-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm font-medium text-foreground">Not riding today</p>
        {syncing ? (
          <span className="text-xs font-medium text-muted-foreground">Syncing…</span>
        ) : null}
      </div>
      <p className="mt-1 text-sm text-muted-foreground">
        {active
          ? "Not riding today — permanent assignment is unchanged."
          : "Tell the driver your child will not ride today. This does not remove the permanent assignment."}
      </p>

      {confirming && !active ? (
        <div className="mt-3 rounded-lg border border-border bg-background px-3 py-2">
          <p className="text-sm text-foreground">
            Confirm: mark as not riding for today only?
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button type="button" size="sm" disabled={busy} onClick={() => void markNotRiding()}>
              Confirm
            </Button>
            <Button
              type="button"
              size="sm"
              variant="ghost"
              disabled={busy}
              onClick={() => setConfirming(false)}
            >
              Cancel
            </Button>
          </div>
        </div>
      ) : (
        <div className="mt-3 flex flex-wrap gap-2">
          {active ? (
            <Button
              type="button"
              size="sm"
              variant="outline"
              disabled={busy || !exception?.canUndo}
              onClick={() => void undo()}
            >
              Undo Not Riding
            </Button>
          ) : (
            <Button
              type="button"
              size="sm"
              disabled={busy}
              onClick={() => setConfirming(true)}
            >
              Not Riding Today
            </Button>
          )}
        </div>
      )}

      {active && exception && !exception.canUndo ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Undo cutoff has passed. Contact the school transport office if this needs changing.
        </p>
      ) : null}
    </div>
  );
}

export type { TransportDailyExceptionDto };
