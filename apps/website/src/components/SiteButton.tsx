import { cloneElement, isValidElement, type ButtonHTMLAttributes, type ReactElement, type ReactNode } from "react";
import { cn } from "@lumenx/ui";

type Variant = "primary" | "secondary" | "ghost" | "on-ink" | "invert";
type Size = "md" | "lg" | "icon";

export type SiteButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
  asChild?: boolean;
  children: ReactNode;
};

export function SiteButton({
  variant = "primary",
  size = "md",
  asChild = false,
  className,
  children,
  type = "button",
  ...props
}: SiteButtonProps) {
  const classes = cn(
    "site-btn",
    variant === "primary" && "site-btn--primary",
    variant === "secondary" && "site-btn--secondary",
    variant === "ghost" && "site-btn--ghost",
    variant === "on-ink" && "site-btn--on-ink",
    variant === "invert" && "site-btn--invert",
    size === "lg" && "site-btn--lg",
    size === "icon" && "site-btn--icon",
    className,
  );

  if (asChild && isValidElement(children)) {
    const child = children as ReactElement<{ className?: string }>;
    return cloneElement(child, {
      className: cn(classes, child.props.className),
    });
  }

  return (
    <button type={type} className={classes} {...props}>
      {children}
    </button>
  );
}
