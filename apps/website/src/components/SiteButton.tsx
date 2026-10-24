import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Button, cn } from "@lumenx/ui";

type Variant = "primary" | "secondary" | "ghost" | "on-ink" | "invert";
type Size = "md" | "lg" | "icon";

export type SiteButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  asChild?: boolean;
  children: ReactNode;
};

const VARIANT_MAP = {
  primary: "default",
  secondary: "outline",
  ghost: "ghost",
  "on-ink": "outline",
  invert: "default",
} as const;

const SIZE_MAP = {
  md: "default",
  lg: "lg",
  icon: "icon",
} as const;

export function SiteButton({
  variant = "primary",
  size = "md",
  asChild = false,
  className,
  children,
  type = "button",
  ...props
}: SiteButtonProps) {
  return (
    <Button
      type={type}
      asChild={asChild}
      variant={VARIANT_MAP[variant]}
      size={SIZE_MAP[size]}
      className={cn(
        "min-h-11 font-semibold tracking-[var(--lx-tracking-button)]",
        size === "lg" && "min-h-12 px-6 text-base",
        size === "icon" && "size-11",
        variant === "on-ink" &&
          "border-white/30 bg-transparent text-white hover:bg-white/10 hover:text-white",
        variant === "invert" &&
          "bg-white text-[var(--site-brand)] shadow-sm hover:bg-white/90 hover:text-[var(--site-brand)]",
        className,
      )}
      {...props}
    >
      {children}
    </Button>
  );
}
