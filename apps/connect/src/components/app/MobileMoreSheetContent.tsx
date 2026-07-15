import type { ReactNode } from "react";
import { SheetContent, SheetTitle, cn } from "@lumenx/ui";

type MobileMoreSheetContentProps = {
  title: ReactNode;
  children: ReactNode;
  className?: string;
};

/** Scrollable bottom sheet for mobile "More" menus — used across Connect portals. */
export function MobileMoreSheetContent({ title, children, className }: MobileMoreSheetContentProps) {
  return (
    <SheetContent
      side="bottom"
      className={cn(
        "connect-more-sheet flex flex-col gap-0 rounded-t-3xl border-t p-0 connect-sheet-rise",
        "max-h-[min(88dvh,calc(100dvh-0.75rem))] overflow-hidden",
        "pb-0 duration-200 data-[state=open]:duration-200 data-[state=closed]:duration-150 ease-out",
        "[&>button]:hidden",
        className,
      )}
    >
      <div className="shrink-0 border-b border-border/60 px-5 pb-3 pt-2">
        <div
          className="mx-auto mb-3 h-1 w-10 rounded-full bg-muted-foreground/30"
          aria-hidden
        />
        <SheetTitle className="text-left font-display text-lg">{title}</SheetTitle>
      </div>
      <div className="connect-more-sheet-body min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4 pb-[max(1.25rem,var(--safe-area-bottom))]">
        {children}
      </div>
    </SheetContent>
  );
}
