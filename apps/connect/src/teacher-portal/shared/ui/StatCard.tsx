import type { CSSProperties } from "react";
import { Link } from "@tanstack/react-router";
import type { LucideIcon } from "lucide-react";
import { cn } from "@lumenx/ui";
import {
  studentModuleCardStyle,
  studentModuleLightChip,
  type StudentModuleColor,
} from "@/lib/student/nav";

const VALUE_TONES = {
  default: "text-foreground",
  primary: "text-foreground",
  alert: "text-foreground",
} as const;

export function StatCard({
  icon: Icon,
  label,
  value,
  hint,
  tone = "default",
  moduleColor,
  className,
  labelClassName = "font-medium uppercase tracking-wide text-muted-foreground",
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
  tone?: keyof typeof VALUE_TONES;
  moduleColor?: StudentModuleColor;
  className?: string;
  labelClassName?: string;
}) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col rounded-lg border border-border bg-card px-2 py-1.5 shadow-soft",
        moduleColor && "motion-safe:hover:border-[color:var(--module-hover-border)]",
        className,
      )}
      style={
        moduleColor
          ? ({
              ...studentModuleCardStyle(moduleColor),
              ["--module-hover-border" as string]: moduleColor.primary,
            } as CSSProperties)
          : undefined
      }
    >
      <div className="mb-0.5 flex items-center gap-1">
        <div
          className={cn(
            "grid size-5 shrink-0 place-items-center rounded-md",
            !moduleColor && "bg-primary/10 text-primary",
          )}
          style={
            moduleColor
              ? {
                  color: moduleColor.primary,
                  backgroundColor: studentModuleLightChip(moduleColor),
                }
              : undefined
          }
        >
          <Icon className="size-3" />
        </div>
        <span className={cn("truncate text-[10px] leading-tight", labelClassName)}>{label}</span>
      </div>
      <div
        className={cn(
          "font-display text-base font-semibold tabular-nums leading-none",
          VALUE_TONES[tone],
        )}
      >
        {value}
      </div>
      {hint ? (
        <p className="mt-0.5 truncate text-[10px] leading-tight text-muted-foreground">{hint}</p>
      ) : null}
    </div>
  );
}

export function QuickActionLink({
  icon: Icon,
  label,
  to,
  search,
  moduleColor,
  className = "teacher-quick-link",
}: {
  icon: LucideIcon;
  label: string;
  to: string;
  search?: Record<string, string>;
  moduleColor?: StudentModuleColor;
  className?: string;
}) {
  return (
    <Link
      to={to}
      search={search}
      className={cn(className, "text-foreground")}
      style={moduleColor ? studentModuleCardStyle(moduleColor) : undefined}
    >
      <div
        className={cn(
          "grid size-8 place-items-center rounded-lg",
          !moduleColor && "bg-primary/10 text-primary",
        )}
        style={
          moduleColor
            ? {
                color: moduleColor.primary,
                backgroundColor: studentModuleLightChip(moduleColor),
              }
            : undefined
        }
      >
        <Icon className="size-4" />
      </div>
      <span className="line-clamp-2 text-xs font-medium leading-tight text-foreground">{label}</span>
    </Link>
  );
}
