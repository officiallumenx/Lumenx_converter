import { Card, Pill } from "@lumenx/ui-admin";
import type { StudentAttendanceSummaryModel } from "./types";

export type StudentAttendanceSummaryProps = {
  summary: StudentAttendanceSummaryModel;
  /** When true, shows architecture placeholder copy (no live marks). */
  placeholder?: boolean;
  dateLabel?: string;
  scopeLabel?: string;
};

const STATS: Array<{
  key: keyof StudentAttendanceSummaryModel;
  label: string;
  tone: "neutral" | "success" | "danger" | "warning" | "info";
}> = [
  { key: "total", label: "Total", tone: "neutral" },
  { key: "present", label: "Present", tone: "success" },
  { key: "absent", label: "Absent", tone: "danger" },
  { key: "leave", label: "Leave", tone: "warning" },
  { key: "unmarked", label: "Unmarked", tone: "info" },
];

/** Compact attendance summary strip — sits above filters. */
export function StudentAttendanceSummary({
  summary,
  placeholder = false,
  dateLabel,
  scopeLabel,
}: StudentAttendanceSummaryProps) {
  const hintParts = [scopeLabel, dateLabel].filter(Boolean);

  return (
    <Card>
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-3 py-2 sm:px-4">
        <div className="min-w-0 shrink-0">
          <div className="flex items-center gap-1.5">
            <p className="text-xs font-semibold text-foreground">Attendance summary</p>
            {placeholder ? <Pill tone="neutral">UI only</Pill> : null}
          </div>
          <p className="truncate text-[10px] text-muted-foreground">
            {hintParts.length ? hintParts.join(" · ") : "Selected class & date"}
          </p>
        </div>
        <div className="flex min-w-0 flex-1 flex-wrap justify-end gap-1.5">
          {STATS.map(({ key, label, tone }) => (
            <span
              key={key}
              className="inline-flex items-center gap-1 rounded-md border border-border bg-muted/40 px-2 py-1"
            >
              <span className="text-[10px] font-medium uppercase tracking-wide text-muted-foreground">
                {label}
              </span>
              <Pill tone={tone}>{String(summary[key])}</Pill>
            </span>
          ))}
        </div>
      </div>
    </Card>
  );
}
