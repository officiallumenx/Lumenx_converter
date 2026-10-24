import type { ElementType, ReactNode } from "react";
import { cn } from "@lumenx/ui";

export function Container({
  as: Tag = "div",
  narrow = false,
  wide = false,
  className,
  children,
}: {
  as?: ElementType;
  narrow?: boolean;
  /** Product hero / wide marketing band (~76rem). */
  wide?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <Tag
      className={cn(
        "site-container",
        narrow && "site-container--narrow",
        wide && "site-container--product-wide",
        className,
      )}
    >
      {children}
    </Tag>
  );
}
