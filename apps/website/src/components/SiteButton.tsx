import type { ButtonHTMLAttributes, ReactNode } from "react";
import { Slot } from "@radix-ui/react-slot";
import { cn } from "@lumenx/ui";

type Variant = "primary" | "secondary" | "ghost" | "on-ink" | "invert";
type Size = "md" | "lg" | "icon";

export type SiteButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  asChild?: boolean;
  children: ReactNode;
};

/** Marketing CTAs — site-btn styles keep placement and polish consistent. */
export function SiteButton({
  variant = "primary",
  size = "md",
  asChild = false,
  className,
  children,
  type = "button",
  ...props
}: SiteButtonProps) {
  const Comp = asChild ? Slot : "button";
  return (
    <Comp
      type={asChild ? undefined : type}
      className={cn(
        "site-btn",
        `site-btn--${variant}`,
        size === "lg" && "site-btn--lg",
        size === "icon" && "site-btn--icon",
        className,
      )}
      {...props}
    >
      {children}
    </Comp>
  );
}
