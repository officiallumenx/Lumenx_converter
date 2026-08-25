import type { CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";
import { cn } from "@lumenx/ui";

import { moduleIconStyle, type ModuleColor } from "@/theme/colors";

const sizeClass = {
  sm: "size-9 rounded-xl",
  md: "size-10 rounded-xl",
  lg: "size-11 rounded-2xl",
  xl: "size-12 rounded-2xl",
} as const;

const iconSizeClass = {
  sm: "size-4",
  md: "size-5",
  lg: "size-5",
  xl: "size-6",
} as const;

export function IconWell({
  icon: Icon,
  size = "lg",
  color,
  className,
  iconClassName,
  style,
}: {
  icon: LucideIcon;
  size?: keyof typeof sizeClass;
  /** From theme `MODULE_COLORS` — colors the logo chip. */
  color?: ModuleColor;
  className?: string;
  iconClassName?: string;
  style?: CSSProperties;
}) {
  return (
    <span
      className={cn(
        "flex shrink-0 items-center justify-center",
        !color && "bg-primary/10 text-primary",
        sizeClass[size],
        className,
      )}
      style={color ? { ...moduleIconStyle(color), ...style } : style}
    >
      <Icon className={cn(iconSizeClass[size], iconClassName)} aria-hidden />
    </span>
  );
}
