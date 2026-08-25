import type { LucideIcon } from "lucide-react";
import { cn } from "@lumenx/ui";
import { studentModuleIconStyle, type StudentModuleColor } from "@/lib/student/nav";

export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
  moduleColor,
}: {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
  className?: string;
  moduleColor?: StudentModuleColor;
}) {
  const iconStyle = moduleColor ? studentModuleIconStyle(moduleColor) : undefined;
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-2xl border border-dashed border-border bg-muted/20 px-6 py-10 text-center sm:py-12",
        className,
      )}
    >
      <div
        className={cn("mb-4 grid size-14 place-items-center rounded-2xl", !iconStyle && "bg-primary/10 text-primary")}
        style={iconStyle}
      >
        <Icon className="size-7" />
      </div>
      <h3 className="font-display text-lg font-semibold">{title}</h3>
      {description ? (
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action ? <div className="mt-5">{action}</div> : null}
    </div>
  );
}
