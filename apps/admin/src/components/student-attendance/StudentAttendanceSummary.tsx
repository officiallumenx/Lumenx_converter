import { Card, CardHeader, Kpi, Pill } from "@lumenx/ui-admin";
import type { StudentAttendanceSummaryModel } from "./types";

export type StudentAttendanceSummaryProps = {
  summary: StudentAttendanceSummaryModel;
  /** When true, shows architecture placeholder copy (no live marks). */
  placeholder?: boolean;
  dateLabel?: string;
  scopeLabel?: string;
};

/** Reusable attendance summary strip — data via props only. */
export function StudentAttendanceSummary({
  summary,
  placeholder = false,
  dateLabel,
  scopeLabel,
}: StudentAttendanceSummaryProps) {
  const hintParts = [scopeLabel, dateLabel].filter(Boolean);

  return (
    <Card>
      <CardHeader
        title="Attendance summary"
        hint={hintParts.length ? hintParts.join(" · ") : "Selected class & date"}
        action={placeholder ? <Pill tone="neutral">UI only</Pill> : undefined}
      />
      <div className="px-4 pb-5 sm:px-5">
        {placeholder ? (
          <p className="mb-3 text-xs text-muted-foreground">
            Summary counts will bind to attendance logic later. Layout is ready for live totals.
          </p>
        ) : null}
        <div className="lx-kpi-grid">
          <Kpi label="Total" value={String(summary.total)} />
          <Kpi label="Present" value={String(summary.present)} />
          <Kpi label="Absent" value={String(summary.absent)} />
          <Kpi label="Leave" value={String(summary.leave)} />
          <Kpi label="Unmarked" value={String(summary.unmarked)} />
        </div>
      </div>
    </Card>
  );
}
