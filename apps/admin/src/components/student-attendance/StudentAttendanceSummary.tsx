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
  toneClass: string;
}> = [
  { key: "total", label: "Total", toneClass: "text-foreground" },
  { key: "present", label: "P", toneClass: "text-success" },
  { key: "absent", label: "A", toneClass: "text-destructive" },
  { key: "leave", label: "L", toneClass: "text-warning" },
  { key: "unmarked", label: "U", toneClass: "text-muted-foreground" },
];

/** Compact single-line attendance counts. */
export function StudentAttendanceSummary({
  summary,
  placeholder = false,
  dateLabel,
  scopeLabel,
}: StudentAttendanceSummaryProps) {
  const hint = [scopeLabel, dateLabel].filter(Boolean).join(" · ");

  return (
    <div className="flex flex-wrap items-center gap-x-2.5 gap-y-1 px-0.5 py-0.5 text-[11px]">
      <span className="font-medium text-muted-foreground">
        Summary{placeholder ? " (preview)" : ""}
        {hint ? (
          <span className="font-normal text-muted-foreground/80"> · {hint}</span>
        ) : null}
      </span>
      <span className="text-border" aria-hidden>
        |
      </span>
      {STATS.map(({ key, label, toneClass }, i) => (
        <span key={key} className="inline-flex items-center gap-1">
          {i > 0 ? (
            <span className="mr-0.5 text-border" aria-hidden>
              ·
            </span>
          ) : null}
          <span className="text-muted-foreground">{label}</span>
          <span className={`font-semibold tabular-nums ${toneClass}`}>
            {summary[key]}
          </span>
        </span>
      ))}
    </div>
  );
}
