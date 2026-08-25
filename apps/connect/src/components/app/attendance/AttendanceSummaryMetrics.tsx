import type { LucideIcon } from "lucide-react";
import { Briefcase, CalendarDays, Palmtree, UserCheck, UserX } from "lucide-react";
import { cn } from "@lumenx/ui";
import type { AttendancePeriodSummary } from "@/lib/attendance/types";

type MetricTone = "default" | "primary" | "success" | "warning";

type Metric = {
  icon: LucideIcon;
  label: string;
  value: string;
  tone?: MetricTone;
};

const toneStyles: Record<MetricTone, { cell: string; icon: string; value: string }> = {
  default: {
    cell: "",
    icon: "bg-muted/60 text-muted-foreground",
    value: "",
  },
  primary: {
    cell: "bg-primary/[0.04]",
    icon: "bg-primary/12 text-primary",
    value: "text-primary",
  },
  success: {
    cell: "bg-success/[0.05]",
    icon: "bg-success/12 text-success",
    value: "text-success",
  },
  warning: {
    cell: "bg-warning/[0.06]",
    icon: "bg-warning/15 text-warning-foreground",
    value: "text-warning-foreground",
  },
};

function MetricCell({ icon: Icon, label, value, tone = "default" }: Metric) {
  const styles = toneStyles[tone];

  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-2.5 px-3 py-2.5 sm:gap-3 sm:px-3.5 sm:py-3",
        styles.cell,
      )}
    >
      <div
        className={cn("grid size-7 shrink-0 place-items-center rounded-lg sm:size-8", styles.icon)}
      >
        <Icon className="size-3.5 sm:size-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-[10px] font-medium leading-tight text-muted-foreground sm:text-[11px]">
          {label}
        </p>
        <p
          className={cn(
            "mt-0.5 truncate text-base font-semibold tabular-nums leading-none tracking-tight sm:text-lg",
            styles.value,
          )}
        >
          {value}
        </p>
      </div>
    </div>
  );
}

export function AttendanceSummaryMetrics({ summary }: { summary: AttendancePeriodSummary }) {
  const metrics: Metric[] = [
    {
      icon: Briefcase,
      label: "Working days",
      value: String(summary.workingDays),
      tone: "primary",
    },
    {
      icon: UserCheck,
      label: "Present",
      value: String(summary.present),
      tone: "success",
    },
    {
      icon: UserX,
      label: "Absent",
      value: String(summary.absent),
      tone: "warning",
    },
    {
      icon: CalendarDays,
      label: "Leave",
      value: String(summary.leave),
    },
    {
      icon: Palmtree,
      label: "Holidays",
      value: String(summary.holidays),
    },
    {
      icon: UserCheck,
      label: "Overall attendance",
      value: `${summary.attendancePct}%`,
      tone: "success",
    },
  ];

  return (
    <div className="mb-5 overflow-hidden rounded-2xl border border-border bg-card shadow-soft">
      <div className="grid grid-cols-2 divide-x divide-y divide-border sm:grid-cols-3 lg:grid-cols-6 lg:divide-y-0">
        {metrics.map((metric) => (
          <MetricCell key={metric.label} {...metric} />
        ))}
      </div>
    </div>
  );
}
