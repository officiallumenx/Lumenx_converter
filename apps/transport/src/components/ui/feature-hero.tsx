import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@lumenx/ui";

import { MODULE_COLORS, type ModuleColor } from "@/theme/colors";

import { Card, CardContent } from "./card";
import { IconWell } from "./icon-well";

const TONE_TO_COLOR: Record<"primary" | "transport" | "danger", ModuleColor> = {
  primary: MODULE_COLORS.primary,
  transport: MODULE_COLORS.transport,
  danger: MODULE_COLORS.danger,
};

export function FeatureHero({
  icon,
  title,
  subtitle,
  action,
  tone = "primary",
  moduleColor,
  children,
  className,
  align = "start",
}: {
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  action?: ReactNode;
  tone?: "primary" | "transport" | "danger";
  /** Overrides tone — prefer assigning from nav / MODULE_COLORS. */
  moduleColor?: ModuleColor;
  children?: ReactNode;
  className?: string;
  align?: "start" | "center";
}) {
  const color = moduleColor ?? TONE_TO_COLOR[tone];

  return (
    <Card
      className={cn(
        "overflow-hidden",
        tone === "danger" && !moduleColor
          ? "border-destructive/25 bg-gradient-to-br from-destructive/[0.08] via-card to-transport/[0.05]"
          : "border-border/80",
        className,
      )}
      style={
        tone === "danger" && !moduleColor
          ? undefined
          : {
              borderColor: `color-mix(in srgb, ${color.primary} 22%, var(--border))`,
              background: `linear-gradient(135deg, color-mix(in srgb, ${color.primary} 10%, var(--card)) 0%, var(--card) 55%, color-mix(in srgb, ${MODULE_COLORS.transport.primary} 6%, var(--card)) 100%)`,
            }
      }
    >
      <CardContent
        className={cn(
          "flex gap-3 p-4 sm:p-5",
          align === "center" ? "flex-col items-center text-center" : "items-center",
        )}
      >
        {icon ? (
          <IconWell
            icon={icon}
            size="xl"
            color={color}
            className={cn(align === "center" && "size-16 rounded-3xl")}
          />
        ) : null}
        <div className={cn("min-w-0", align === "start" && "flex-1")}>
          <p className="font-display text-base font-semibold tracking-tight text-foreground sm:text-lg">
            {title}
          </p>
          {subtitle ? (
            <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground sm:text-sm">
              {subtitle}
            </p>
          ) : null}
          {children}
        </div>
        {action ? <div className="shrink-0">{action}</div> : null}
      </CardContent>
    </Card>
  );
}
