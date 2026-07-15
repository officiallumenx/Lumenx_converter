/** ─────────────────────────────────────────────────────────────
 *  LumenX Admin — AuthInfoCallout
 *  Icon + message callout for trust tips and guidance.
 * ───────────────────────────────────────────────────────────── */

import type { LucideIcon } from "lucide-react";
import { IconChip } from "@/components/IconChip";

interface AuthInfoCalloutProps {
  icon: LucideIcon;
  title?: string;
  children: React.ReactNode;
  variant?: "neutral" | "primary";
  className?: string;
}

export function AuthInfoCallout({
  icon: Icon,
  title,
  children,
  variant = "neutral",
  className = "",
}: AuthInfoCalloutProps) {
  const styles =
    variant === "primary"
      ? "border-primary/20 bg-primary/[0.04]"
      : "border-border/60 bg-muted/30";

  return (
    <div className={`flex items-start gap-3 rounded-xl border px-4 py-3.5 ${styles} ${className}`}>
      <div
        className={[
          "shrink-0",
          variant === "primary" ? "" : "size-9 rounded-lg bg-muted flex items-center justify-center text-muted-foreground",
        ].join(" ")}
      >
        {variant === "primary" ? (
          <IconChip icon={Icon} size="sm" />
        ) : (
          <Icon className="size-4" aria-hidden />
        )}
      </div>
      <div className="min-w-0 text-[11px] text-muted-foreground leading-relaxed">
        {title && <p className="text-xs font-semibold text-foreground mb-0.5">{title}</p>}
        {children}
      </div>
    </div>
  );
}
