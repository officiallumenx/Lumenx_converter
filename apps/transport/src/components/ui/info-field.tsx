import type { LucideIcon } from "lucide-react";
import { cn } from "@lumenx/ui";

import type { ModuleColor } from "@/theme/colors";

import { Card, CardContent } from "./card";
import { IconWell } from "./icon-well";

export function InfoField({
  icon,
  label,
  value,
  hint,
  color,
  iconClassName,
  className,
}: {
  icon: LucideIcon;
  label: string;
  value: string;
  hint?: string;
  color?: ModuleColor;
  iconClassName?: string;
  className?: string;
}) {
  return (
    <Card className={cn("min-w-0", className)}>
      <CardContent className="flex items-start gap-3 p-4 sm:p-5">
        <IconWell icon={icon} size="lg" color={color} className={iconClassName} />
        <div className="min-w-0">
          <p className="transport-stat-label">{label}</p>
          <p className="mt-0.5 font-display text-base font-semibold tracking-tight text-foreground sm:text-lg">
            {value}
          </p>
          {hint ? <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{hint}</p> : null}
        </div>
      </CardContent>
    </Card>
  );
}
