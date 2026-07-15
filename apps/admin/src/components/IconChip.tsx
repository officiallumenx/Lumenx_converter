/** ─────────────────────────────────────────────────────────────
 *  LumenX Admin — IconChip
 *  White icon on professional brand-blue background.
 * ───────────────────────────────────────────────────────────── */

import type { LucideIcon } from "lucide-react";

type IconChipSize = "xs" | "sm" | "md" | "lg";
type IconChipVariant = "brand" | "soft" | "disabled" | "danger";

interface IconChipProps {
  icon: LucideIcon;
  size?: IconChipSize;
  variant?: IconChipVariant;
  className?: string;
  active?: boolean;
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
};

export function IconChip({
  icon: Icon,
  size = "md",
  variant = "brand",
  className = "",
  active = false,
}: IconChipProps) {
  const vClass =
    variant === "brand" && active ? "lx-icon-chip--active" : variantClass[variant];

  return (
    <span
      className={["lx-icon-chip", sizeClass[size], vClass, className].filter(Boolean).join(" ")}
      aria-hidden
    >
      <Icon strokeWidth={2} />
    </span>
  );
}
