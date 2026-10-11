/** ─────────────────────────────────────────────────────────────
 *  LumenX Admin — IconChip
 *  Solid module-accent chips (readable in light and dark).
 * ───────────────────────────────────────────────────────────── */

import type { CSSProperties } from "react";
import type { LucideIcon } from "lucide-react";
import type { AdminModuleColor } from "@/lib/admin-module-colors";

type IconChipSize = "xs" | "sm" | "md" | "lg";
type IconChipVariant = "brand" | "soft" | "disabled" | "danger" | "module";

interface IconChipProps {
  icon: LucideIcon;
  size?: IconChipSize;
  variant?: IconChipVariant;
  className?: string;
  active?: boolean;
  accent?: AdminModuleColor;
}

const sizeClass: Record<IconChipSize, string> = {
  xs: "lx-icon-chip--xs",
  sm: "lx-icon-chip--sm",
  md: "lx-icon-chip--md",
  lg: "lx-icon-chip--lg",
};

const variantClass: Record<IconChipVariant, string> = {
  brand: "",
  soft: "lx-icon-chip--soft",
  disabled: "lx-icon-chip--disabled",
  danger: "lx-icon-chip--danger",
  module: "lx-icon-chip--module",
};

export function IconChip({
  icon: Icon,
  size = "md",
  variant = "brand",
  className = "",
  active = false,
  accent,
}: IconChipProps) {
  const useModule = Boolean(accent) || variant === "module";
  const vClass = useModule
    ? "lx-icon-chip--module"
    : variant === "brand" && active
      ? "lx-icon-chip--active"
      : variantClass[variant];

  const style: CSSProperties | undefined = accent
    ? {
        // Active uses brand blue; inactive keeps the module accent solid (no pastel wash).
        backgroundColor: active ? "#2563EB" : accent.primary,
        color: "#FFFFFF",
      }
    : undefined;

  return (
    <span
      className={["lx-icon-chip", sizeClass[size], vClass, className].filter(Boolean).join(" ")}
      style={style}
      aria-hidden
    >
      <Icon strokeWidth={active ? 2.4 : 2} />
    </span>
  );
}
