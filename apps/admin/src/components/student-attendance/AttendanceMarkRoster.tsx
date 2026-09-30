import type { ReactNode } from "react";
import { Button } from "@lumenx/ui-admin";
import { Badge } from "@lumenx/ui";
import { RotateCcw, UserCheck, UserX } from "lucide-react";
import { AttendanceRosterRow } from "./AttendanceRosterRow";

export type AttendanceMarkRosterItem = {
  id: string;
  name: string;
  roll: string;
  status: "present" | "absent" | "leave";
};

export function AttendanceMarkRoster({
  title,
  items,
  canMark,
  onToggle,
  onAllPresent,
  onAllAbsent,
  onClear,
  footer,
  emptyHint = "No students match your filters.",
}: {
  title?: string;
  items: AttendanceMarkRosterItem[];
  canMark: boolean;
  onToggle: (id: string) => void;
  onAllPresent: () => void;
  onAllAbsent: () => void;
  onClear: () => void;
  footer?: ReactNode;
  emptyHint?: string;
}) {
  const presentCount = items.filter((row) => row.status === "present").length;
  const absentCount = items.filter((row) => row.status === "absent").length;
  const leaveCount = items.filter((row) => row.status === "leave").length;

  return (
    <div className="space-y-3 px-4 pb-5 sm:px-5">
      {canMark ? (
        <div className="flex flex-wrap gap-2">
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl gap-1.5"
            onClick={onAllPresent}
          >
            <UserCheck className="size-4" /> All present
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="rounded-xl gap-1.5 border-destructive/40 text-destructive"
            onClick={onAllAbsent}
          >
            <UserX className="size-4" /> All absent
          </Button>
          <Button size="sm" variant="ghost" className="rounded-xl gap-1.5" onClick={onClear}>
            <RotateCcw className="size-4" /> Clear
          </Button>
        </div>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-border bg-card shadow-sm">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border bg-muted/40 px-4 py-3">
          <span className="text-sm font-semibold">{title ?? "Roster"}</span>
          <div className="flex flex-wrap gap-1.5">
            <Badge className="border-0 bg-success text-success-foreground">
              {presentCount} present
            </Badge>
            {leaveCount > 0 ? (
              <Badge className="border-0 bg-warning text-warning-foreground">
                {leaveCount} on leave
              </Badge>
            ) : null}
            <Badge className="border-0 bg-destructive text-destructive-foreground">
              {absentCount} absent
            </Badge>
          </div>
        </div>

        {items.length === 0 ? (
          <div className="px-4 py-10 text-center text-sm text-muted-foreground">{emptyHint}</div>
        ) : (
          <ul className="divide-y divide-border">
            {items.map((row) => (
              <li key={row.id}>
                <AttendanceRosterRow
                  name={row.name}
                  roll={row.roll}
                  isAbsent={row.status === "absent"}
                  isOnLeave={row.status === "leave"}
                  disabled={!canMark}
                  onToggle={() => {
                    if (!canMark || row.status === "leave") return;
                    onToggle(row.id);
                  }}
                />
              </li>
            ))}
          </ul>
        )}

        {footer ? (
          <div className="border-t border-border bg-primary/[0.04] px-4 py-4 sm:px-5">
            <p className="mb-3 text-center text-xs text-muted-foreground sm:text-left">
              <span className="font-semibold text-foreground">{presentCount}</span> present
              <span className="mx-1.5 text-border">·</span>
              <span className="font-semibold text-destructive">{absentCount}</span> absent
              {leaveCount > 0 ? (
                <>
                  <span className="mx-1.5 text-border">·</span>
                  <span className="font-semibold text-warning-foreground">{leaveCount}</span> on
                  leave
                </>
              ) : null}
              <span className="mx-1.5 text-border">·</span>
              {items.length} total
            </p>
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}
