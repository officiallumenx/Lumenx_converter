import type { ReactNode } from "react";
import { cn } from "@lumenx/ui";
import { contentMaxWidth } from "@/theme";

export function PageContainer({
  children,
  className,
  maxWidth = contentMaxWidth,
}: {
  children: ReactNode;
  className?: string;
  maxWidth?: number;
}) {
  return (
    <div className={cn("mx-auto w-full min-w-0 px-4 sm:px-5", className)} style={{ maxWidth }}>
      {children}
    </div>
  );
}
