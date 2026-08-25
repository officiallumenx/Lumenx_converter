import type { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@lumenx/ui";

const statusChipVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold tracking-wide uppercase",
  {
    variants: {
      tone: {
        neutral: "bg-muted text-muted-foreground",
        primary: "bg-primary/12 text-primary",
        transport: "bg-transport/12 text-transport",
        success: "bg-success/12 text-success",
        warning: "bg-warning/15 text-warning-foreground",
        danger: "bg-destructive/12 text-destructive",
      },
      withDot: {
        true: "",
        false: "",
      },
    },
    defaultVariants: {
      tone: "neutral",
      withDot: true,
    },
  },
);

const dotTone = {
  neutral: "bg-muted-foreground",
  primary: "bg-primary",
  transport: "bg-transport",
  success: "bg-success",
  warning: "bg-warning",
  danger: "bg-destructive",
} as const;

export interface StatusChipProps
  extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof statusChipVariants> {
  label: string;
}

export function StatusChip({
  label,
  tone = "neutral",
  withDot = true,
  className,
  ...props
}: StatusChipProps) {
  return (
    <span className={cn(statusChipVariants({ tone, withDot }), className)} {...props}>
      {withDot ? (
        <span className={cn("size-1.5 rounded-full", dotTone[tone ?? "neutral"])} aria-hidden />
      ) : null}
      {label}
    </span>
  );
}

export { statusChipVariants };
