import { memo } from "react";
import { MapPin } from "lucide-react";
import { cn } from "@lumenx/ui";

import { Avatar } from "@/components/ui/avatar";
import { StatusChip } from "@/components/ui/status-chip";
import { getInitials } from "@/lib/initials";

import type { AttendanceStudentState, BoardingStatus, DroppingStatus } from "@/lib/transport";
import { useTapLongPress } from "./use-tap-long-press";

const boardingMeta: Record<
  BoardingStatus,
  { label: string; tone: "neutral" | "success" | "danger"; card: string }
> = {
  pending: {
    label: "Not marked",
    tone: "neutral",
    card: "border-border bg-card",
  },
  boarded: {
    label: "Boarded",
    tone: "success",
    card: "border-success/35 bg-success/5 transport-shadow-success",
  },
  not_boarded: {
    label: "Not boarded",
    tone: "danger",
    card: "border-destructive/35 bg-destructive/5 transport-shadow-danger",
  },
};

const droppingMeta: Record<
  DroppingStatus,
  { label: string; tone: "neutral" | "success" | "danger"; card: string }
> = {
  pending: {
    label: "Not marked",
    tone: "neutral",
    card: "border-border bg-card",
  },
  dropped: {
    label: "Dropped",
    tone: "success",
    card: "border-success/35 bg-success/5 transport-shadow-success",
  },
  not_dropped: {
    label: "Not dropped",
    tone: "danger",
    card: "border-destructive/35 bg-destructive/5 transport-shadow-danger",
  },
};

function formatStamp(iso: string | null): string | null {
  if (!iso) return null;
  try {
    return new Date(iso).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  } catch {
    return null;
  }
}

export const StudentAttendanceCard = memo(function StudentAttendanceCard({
  student,
  mode,
  currentStopName,
  hasRouteStops = false,
  onTap,
  onLongPress,
  onStudentTap,
  onStudentLongPress,
  disabled = false,
}: {
  student: AttendanceStudentState;
  mode: "boarding" | "dropping";
  currentStopName?: string | null;
  hasRouteStops?: boolean;
  onTap?: () => void;
  onLongPress?: () => void;
  onStudentTap?: (studentId: string) => void;
  onStudentLongPress?: (studentId: string) => void;
  disabled?: boolean;
}) {
  const meta =
    (mode === "boarding"
      ? boardingMeta[student.boarding]
      : droppingMeta[student.dropping]) ?? boardingMeta.pending;
  const stamp =
    mode === "boarding" ? formatStamp(student.boardedAt) : formatStamp(student.droppedAt);
  const syncing = student.syncStatus === "syncing";
  const hasAssignedStop = Boolean(
    (student.stopId && String(student.stopId).trim()) ||
      (student.dropStopId && String(student.dropStopId).trim()),
  );
  const canUseRouteStop = !hasAssignedStop && hasRouteStops;
  const stopMissing = !hasAssignedStop && !canUseRouteStop;
  const cardDisabled = disabled || syncing || stopMissing;

  const handleTap = () => {
    if (cardDisabled) return;
    if (onStudentTap) {
      onStudentTap(student.id);
    } else if (onTap) {
      onTap();
    }
  };

  const handleLongPress = () => {
    if (cardDisabled) return;
    if (onStudentLongPress) {
      onStudentLongPress(student.id);
    } else if (onLongPress) {
      onLongPress();
    }
  };

  const press = useTapLongPress(handleTap, handleLongPress);

  const hint = disabled
    ? "Location is off. Turn on GPS to mark attendance."
    : stopMissing
      ? "No route stops configured for this trip."
      : syncing
        ? "Saving mark to server."
        : mode === "boarding"
          ? canUseRouteStop
            ? `Tap to board at ${currentStopName ?? "current stop"}. Long press for not boarded.`
            : "Tap to board or undo. Long press for not boarded."
          : canUseRouteStop
            ? `Tap to drop at ${currentStopName ?? "current stop"}. Long press for not dropped.`
            : "Tap to drop or undo. Long press for not dropped.";

  return (
    <button
      type="button"
      disabled={cardDisabled}
      className={cn(
        "transport-pressable w-full rounded-2xl border p-4 text-left shadow-soft sm:p-4",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "select-none",
        meta.card,
        student.syncStatus === "error" && "border-destructive/50 bg-destructive/5",
        cardDisabled && "cursor-not-allowed opacity-60",
      )}
      aria-label={`${student.name}. ${meta.label}. ${hint}`}
      aria-busy={syncing || undefined}
      {...press}
      onKeyDown={(event) => {
        if (cardDisabled) return;
        if (event.key === "Enter" && event.shiftKey) {
          event.preventDefault();
          handleLongPress();
          return;
        }
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          handleTap();
        }
      }}
    >
      <div className="flex items-start gap-3">
        <Avatar size="lg" fallback={getInitials(student.name)} alt={student.name} />
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <p className="font-display text-base font-semibold tracking-tight text-foreground">
                {student.name}
              </p>
              <p className="mt-0.5 text-xs text-muted-foreground">
                {student.grade} · {student.rollNo}
              </p>
            </div>
            <StatusChip label={meta.label} tone={meta.tone} className="shrink-0" />
          </div>
          <p className="mt-2.5 flex items-center gap-1.5 text-sm text-muted-foreground">
            <MapPin className="size-3.5 shrink-0 text-transport" aria-hidden />
            <span className="truncate">
              {hasAssignedStop
                ? student.stopLocationLabel
                  ? `${student.stopName} · ${student.stopLocationLabel}`
                  : (student.stopName || student.dropStopName)
                : currentStopName
                  ? `Unassigned · ${mode === "boarding" ? "Boards" : "Drops"} at ${currentStopName}`
                  : `Unassigned · ${mode === "boarding" ? "Boards" : "Drops"} at current stop`}
            </span>
          </p>
          {stopMissing ? (
            <p className="mt-1 text-xs font-medium text-destructive" role="status">
              No stop assigned — configure in Route Setup
            </p>
          ) : null}
          {stamp ? (
            <p className="mt-1 text-xs tabular-nums text-muted-foreground">
              {mode === "boarding" ? "Boarded" : "Dropped"} at {stamp}
            </p>
          ) : !cardDisabled ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {mode === "boarding" ? "Tap = Boarded · Hold = Not boarded" : "Tap = Dropped · Hold = Not dropped"}
            </p>
          ) : null}
          {student.syncStatus === "syncing" ? (
            <p className="mt-1 text-xs font-medium text-transport" role="status">
              Saving…
            </p>
          ) : null}
          {student.syncStatus === "confirmed" ? (
            <p className="mt-1 text-xs font-medium text-success" role="status">
              Saved
            </p>
          ) : null}
          {student.syncStatus === "error" ? (
            <p className="mt-1 text-xs font-medium text-destructive" role="status">
              Failed — tap to retry
            </p>
          ) : null}
        </div>
      </div>
    </button>
  );
});
