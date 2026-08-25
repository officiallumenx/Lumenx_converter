import type { ElementType, ReactNode } from "react";
import { cn } from "@lumenx/ui";

export function Container({
  as: Tag = "div",
  narrow = false,
  className,
  children,
}: {
  as?: ElementType;
  narrow?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return <Tag className={cn("site-container", narrow && "site-container--narrow", className)}>{children}</Tag>;
}
