import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { X } from "lucide-react";
import { cn } from "@lumenx/ui";

const chipVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-border bg-card text-foreground",
        primary: "border-transparent bg-primary/10 text-primary",
        transport: "border-transparent bg-transport/10 text-transport",
        muted: "border-transparent bg-muted text-muted-foreground",
        selected: "border-primary bg-primary text-primary-foreground",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface ChipProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof chipVariants> {
  selected?: boolean;
  onRemove?: () => void;
}

export function Chip({ className, variant, selected, onRemove, children, ...props }: ChipProps) {
  return (
    <button
      type="button"
      className={cn(chipVariants({ variant: selected ? "selected" : variant }), className)}
      aria-pressed={selected}
      {...props}
    >
      <span>{children}</span>
      {onRemove ? (
        <span
          role="button"
          tabIndex={0}
          onClick={(e) => {
            e.stopPropagation();
            onRemove();
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              e.stopPropagation();
              onRemove();
            }
          }}
          className="inline-flex size-4 items-center justify-center rounded-full hover:bg-black/10"
          aria-label="Remove"
        >
          <X className="size-3" aria-hidden />
        </span>
      ) : null}
    </button>
  );
}

export { chipVariants };
