"use client";

import * as React from "react";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { cn } from "../../lib/utils";
import { Dialog, DialogPortal, DialogOverlay, DialogTitle } from "./dialog";

export type PersonPhotoLightboxProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  src: string;
  alt?: string;
  /** Optional caption under the photo (person name). */
  title?: string;
};

/**
 * Full-screen dark photo viewer (WhatsApp / Instagram profile photo style).
 * Tap backdrop or close to dismiss.
 */
export function PersonPhotoLightbox({
  open,
  onOpenChange,
  src,
  alt = "",
  title,
}: PersonPhotoLightboxProps) {
  const label = title?.trim() || alt?.trim() || "Photo";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogPortal>
        <DialogOverlay className="bg-black/92 backdrop-blur-[2px]" />
        <DialogPrimitive.Content
          aria-describedby={undefined}
          className={cn(
            "fixed inset-0 z-50 flex flex-col items-center justify-center gap-3 p-4 outline-none",
            "data-[state=open]:animate-in data-[state=closed]:animate-out",
            "data-[state=open]:fade-in-0 data-[state=closed]:fade-out-0",
            "data-[state=open]:zoom-in-95 data-[state=closed]:zoom-out-95",
          )}
          onClick={() => onOpenChange(false)}
          onKeyDown={(event) => {
            if (event.key === "Escape") onOpenChange(false);
          }}
        >
          <DialogTitle className="sr-only">{label}</DialogTitle>
          <DialogPrimitive.Close
            className={cn(
              "absolute right-3 top-[max(0.75rem,env(safe-area-inset-top))] z-10",
              "inline-flex size-10 items-center justify-center rounded-full",
              "bg-white/10 text-white backdrop-blur-md transition-colors",
              "hover:bg-white/20 focus:outline-none focus-visible:ring-2 focus-visible:ring-white/60",
            )}
            aria-label="Close photo"
            onClick={(event) => event.stopPropagation()}
          >
            <X className="size-5" />
          </DialogPrimitive.Close>

          <img
            src={src}
            alt={alt}
            draggable={false}
            className={cn(
              "max-h-[min(82vh,40rem)] max-w-[min(92vw,40rem)]",
              "rounded-2xl object-contain select-none",
              "shadow-[0_24px_80px_rgba(0,0,0,0.55)] ring-1 ring-white/10",
              "animate-in fade-in-0 zoom-in-95 duration-200",
            )}
            onClick={(event) => event.stopPropagation()}
          />

          {title?.trim() ? (
            <p className="max-w-[min(92vw,40rem)] truncate px-2 text-center text-sm font-medium text-white/90">
              {title.trim()}
            </p>
          ) : null}
        </DialogPrimitive.Content>
      </DialogPortal>
    </Dialog>
  );
}

export type PersonPhotoPreviewProps = {
  /** Signed / public photo URL. When empty, children render with no preview. */
  src?: string | null;
  alt?: string;
  title?: string;
  children: React.ReactNode;
  className?: string;
  /** Keep parent row/card navigation from firing when opening the photo. */
  stopPropagation?: boolean;
  /**
   * Use `span` when nesting inside another `<button>` (invalid HTML otherwise).
   * Defaults to a real button for accessibility.
   */
  as?: "button" | "span";
};

/**
 * Makes a thumbnail clickable to open {@link PersonPhotoLightbox}.
 * Renders children unchanged when there is no photo URL.
 */
export function PersonPhotoPreview({
  src,
  alt = "",
  title,
  children,
  className,
  stopPropagation = true,
  as = "button",
}: PersonPhotoPreviewProps) {
  const [open, setOpen] = React.useState(false);
  const url = typeof src === "string" ? src.trim() : "";

  if (!url) {
    return <>{children}</>;
  }

  const label = title?.trim() ? `View photo of ${title.trim()}` : "View photo";
  const openPreview = (event: React.SyntheticEvent) => {
    if (stopPropagation) {
      event.preventDefault();
      event.stopPropagation();
    }
    setOpen(true);
  };

  const sharedClassName = cn(
    "appearance-none border-0 bg-transparent p-0 m-0",
    "cursor-zoom-in rounded-[inherit] focus:outline-none",
    "focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
    className,
  );

  const trigger =
    as === "span" ? (
      <span
        role="button"
        tabIndex={0}
        className={sharedClassName}
        aria-label={label}
        onClick={openPreview}
        onKeyDown={(event) => {
          if (event.key === "Enter" || event.key === " ") {
            openPreview(event);
          }
        }}
      >
        {children}
      </span>
    ) : (
      <button type="button" className={sharedClassName} aria-label={label} onClick={openPreview}>
        {children}
      </button>
    );

  return (
    <>
      {trigger}
      <PersonPhotoLightbox
        open={open}
        onOpenChange={setOpen}
        src={url}
        alt={alt}
        title={title}
      />
    </>
  );
}
