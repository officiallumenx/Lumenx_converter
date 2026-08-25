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

export function StudentAttendanceCard({
  student,
  mode,
  onTap,
  onLongPress,
  disabled = false,
}: {
  student: AttendanceStudentState;
  mode: "boarding" | "dropping";
  onTap: () => void;
  onLongPress: () => void;
  disabled?: boolean;
}) {
  const meta = mode === "boarding" ? boardingMeta[student.boarding] : droppingMeta[student.dropping];
  const stamp =
    mode === "boarding" ? formatStamp(student.boardedAt) : formatStamp(student.droppedAt);
  const press = useTapLongPress(
    () => {
      if (!disabled) onTap();
    },
    () => {
      if (!disabled) onLongPress();
    },
  );
  const hint = disabled
    ? "Location is off. Turn on GPS to mark attendance."
    : mode === "boarding"
      ? "Tap to board or undo. Long press for not boarded."
      : "Tap to drop or undo. Long press for not dropped.";

  return (
    <button
      type="button"
      disabled={disabled}
      className={cn(
        "transport-pressable w-full rounded-2xl border p-4 text-left shadow-soft sm:p-4",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
        "select-none",
        meta.card,
        disabled && "cursor-not-allowed opacity-60",
      )}
      aria-label={`${student.name}. ${meta.label}. ${hint}`}
      {...press}
      onKeyDown={(event) => {
        if (disabled) return;
        if (event.key === "Enter" && event.shiftKey) {
          event.preventDefault();
          onLongPress();
          return;
        }
        if (event.key === "Enter" || event.key === " ") {
          event.preventDefault();
          onTap();
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
            <span className="truncate">{student.stopName}</span>
          </p>
          {stamp ? (
            <p className="mt-1 text-xs tabular-nums text-muted-foreground">
              {mode === "boarding" ? "Boarded" : "Dropped"} at {stamp}
            </p>
          ) : !disabled ? (
            <p className="mt-1 text-xs text-muted-foreground">
              {mode === "boarding" ? "Tap = Boarded · Hold = Not boarded" : "Tap = Dropped · Hold = Not dropped"}
            </p>
          ) : null}
        </div>
      </div>
    </button>
  );
}
