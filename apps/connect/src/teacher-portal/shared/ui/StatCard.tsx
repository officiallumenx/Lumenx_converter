import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { cn } from "@lumenx/ui";

const TONES = {
  default: "bg-card",
  primary: "bg-primary/10 text-primary",
  success: "bg-success/10 text-success",
  warning: "bg-warning/10 text-warning-foreground",
} as const;

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "default",
  className,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
  tone?: keyof typeof TONES;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col rounded-2xl border border-border p-4 shadow-soft sm:p-5",
        TONES[tone],
        className,
      )}
    >
      <div className="mb-2 flex items-center gap-2">
        <Icon className="size-4 shrink-0 opacity-70" />
        <span className="truncate text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          {label}
        </span>
      </div>
      <div className="font-display text-2xl font-semibold tabular-nums sm:text-3xl">{value}</div>
      {hint ? <p className="mt-1 truncate text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

const quickActionCls =
  "flex flex-col items-center gap-2 rounded-2xl border border-border bg-card p-4 text-center shadow-soft transition-all hover:border-primary/30 hover:bg-muted/30 active:scale-[0.97] touch-manipulation min-w-0";

export function QuickActionLink({
  icon: Icon,
  label,
  to,
}: {
  icon: LucideIcon;
  label: string;
  to: string;
}) {
  return (
    <Link to={to} className={quickActionCls}>
      <div className="grid size-11 place-items-center rounded-xl bg-primary/10 text-primary">
        <Icon className="size-5" />
      </div>
      <span className="text-xs font-medium leading-tight">{label}</span>
    </Link>
  );
}
