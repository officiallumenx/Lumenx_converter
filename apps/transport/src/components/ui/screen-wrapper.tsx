import type { ReactNode } from "react";
import { cn } from "@lumenx/ui";

import { AppBar, type AppBarProps } from "./app-bar";
import { PageContainer } from "./page-container";

export interface ScreenWrapperProps {
  children: ReactNode;
  className?: string;
  contentClassName?: string;
  /** When set, renders Transport AppBar above content. */
  appBar?: Omit<AppBarProps, "className"> & { className?: string };
  /** Reserve space for fixed bottom navigation. */
  withBottomNav?: boolean;
}

/**
 * Screen chrome wrapper — AppBar + padded scroll body.
 * Does not define routes/pages; compose inside route components later.
 */
export function ScreenWrapper({
  children,
  className,
  contentClassName,
  appBar,
  withBottomNav = false,
}: ScreenWrapperProps) {
  return (
    <div className={cn("flex min-h-dvh flex-col bg-background", className)}>
      {appBar ? <AppBar {...appBar} /> : null}
      <main
        className={cn(
          "flex-1 overflow-y-auto overscroll-contain",
          withBottomNav && "pb-[calc(5.25rem+var(--safe-area-bottom))]",
          contentClassName,
        )}
      >
        <PageContainer className="space-y-5 py-4 sm:space-y-6 sm:py-5">{children}</PageContainer>
      </main>
    </div>
  );
}
