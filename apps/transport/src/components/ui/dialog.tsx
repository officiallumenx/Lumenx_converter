import type { ReactNode } from "react";
import {
  Dialog as UiDialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  cn,
} from "@lumenx/ui";

import { Button } from "./button";

export interface DialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  trigger?: ReactNode;
  title: string;
  description?: string;
  children?: ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm?: () => void;
  destructive?: boolean;
  /** Scroll long content on small screens instead of clipping. */
  scrollable?: boolean;
  className?: string;
}

/** Centered confirm / content dialog styled for Transport. */
export function Dialog({
  open,
  onOpenChange,
  trigger,
  title,
  description,
  children,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  destructive = false,
  scrollable = false,
  className,
}: DialogProps) {
  return (
    <UiDialog open={open} onOpenChange={onOpenChange}>
      {trigger ? <DialogTrigger asChild>{trigger}</DialogTrigger> : null}
      <DialogContent
        className={cn(
          "z-[60] gap-4 rounded-2xl border-border bg-card shadow-elevated sm:rounded-2xl",
          scrollable
            ? "flex max-h-[min(88dvh,calc(100dvh-1rem))] w-[calc(100%-2rem)] max-w-[var(--width-dialog)] flex-col overflow-hidden p-0"
            : "max-h-[min(88dvh,calc(100dvh-2rem))] w-[calc(100%-2rem)] max-w-[var(--width-auth)] overflow-y-auto p-5 max-sm:top-auto max-sm:bottom-[max(1rem,var(--safe-area-bottom))] max-sm:translate-y-0",
          className,
        )}
      >
        <DialogHeader className={cn(scrollable && "shrink-0 space-y-1 border-b border-border/70 px-5 pt-5 pb-3 pr-12 text-left")}>
          <DialogTitle className="font-display text-lg tracking-tight">{title}</DialogTitle>
          {description ? (
            <DialogDescription className="text-sm text-muted-foreground">
              {description}
            </DialogDescription>
          ) : null}
        </DialogHeader>

        {children ? (
          scrollable ? (
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
              {children}
            </div>
          ) : (
            children
          )
        ) : null}

        {onConfirm ? (
          <DialogFooter
            className={cn(
              "gap-2 sm:gap-2",
              scrollable && "shrink-0 border-t border-border px-5 py-3 sm:flex-col",
            )}
          >
            <DialogClose asChild>
              <Button variant="outline" expanded>
                {cancelLabel}
              </Button>
            </DialogClose>
            <Button variant={destructive ? "destructive" : "default"} expanded onClick={onConfirm}>
              {confirmLabel}
            </Button>
          </DialogFooter>
        ) : null}
      </DialogContent>
    </UiDialog>
  );
}

export {
  UiDialog as DialogRoot,
  DialogTrigger,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
};
