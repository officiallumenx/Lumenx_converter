import type { ReactNode } from "react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  cn,
} from "@lumenx/ui";

export interface BottomSheetProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: ReactNode;
  title?: string;
  description?: string;
  children: ReactNode;
  footer?: ReactNode;
  className?: string;
}

/**
 * Mobile-first bottom sheet — sizes to content, scrolls the body when tall.
 * Avoids flex-1 collapse (which clipped short panels like Start Trip checks).
 */
export function BottomSheet({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  children,
  footer,
  className,
}: BottomSheetProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      {trigger ? <SheetTrigger asChild>{trigger}</SheetTrigger> : null}
      <SheetContent
        side="bottom"
        className={cn(
          "z-[60] flex flex-col gap-0 rounded-t-3xl border-t border-border bg-card p-0 shadow-elevated",
          "max-h-[min(92dvh,calc(100dvh-0.5rem))]",
          "pb-[max(0.75rem,var(--safe-area-bottom))]",
          "duration-200 data-[state=open]:duration-200 data-[state=closed]:duration-150",
          "[&>button]:hidden",
          className,
        )}
      >
        {(title || description) && (
          <SheetHeader className="shrink-0 space-y-1 border-b border-border/70 px-5 pt-5 pb-3 text-left">
            {title ? (
              <SheetTitle className="pr-2 font-display text-lg tracking-tight">{title}</SheetTitle>
            ) : null}
            {description ? (
              <SheetDescription className="text-sm leading-relaxed text-muted-foreground">
                {description}
              </SheetDescription>
            ) : null}
          </SheetHeader>
        )}

        {/*
          Cap height on the body only — do not use flex-1 here.
          flex-1 + min-h-0 inside an auto-height sheet collapses the checklist.
        */}
        <div className="overflow-y-auto overscroll-contain px-5 py-4 max-h-[min(58dvh,calc(100dvh-13rem))]">
          {children}
        </div>

        {footer ? (
          <SheetFooter className="shrink-0 flex-col gap-2 space-x-0 border-t border-border bg-card px-5 pt-3 pb-1 sm:flex-col sm:justify-stretch sm:space-x-0">
            {footer}
          </SheetFooter>
        ) : null}
      </SheetContent>
    </Sheet>
  );
}

export {
  Sheet as BottomSheetRoot,
  SheetTrigger as BottomSheetTrigger,
  SheetContent as BottomSheetContent,
  SheetHeader as BottomSheetHeader,
  SheetTitle as BottomSheetTitle,
  SheetDescription as BottomSheetDescription,
  SheetFooter as BottomSheetFooter,
};
