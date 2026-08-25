import type { ReactNode } from "react";
import { cn } from "@lumenx/ui";

export function SplitSection({
  reverse = false,
  className,
  children,
}: {
  reverse?: boolean;
  className?: string;
  children: ReactNode;
}) {
  return (
    <div
      className={cn(
        "grid items-center gap-12 lg:grid-cols-2",
        reverse && "lg:[&>*:first-child]:order-2",
        className,
      )}
    >
      {children}
    </div>
  );
}
