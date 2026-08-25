import * as React from "react";
import { Input as UiInput, Label, cn } from "@lumenx/ui";

export interface InputProps extends React.ComponentProps<"input"> {
  label?: string;
  hint?: string;
  error?: string;
  prefixIcon?: React.ReactNode;
  suffixIcon?: React.ReactNode;
}

export const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, label, hint, error, prefixIcon, suffixIcon, id, ...props }, ref) => {
    const inputId = id ?? props.name;

    return (
      <div className="min-w-0 space-y-1.5">
        {label ? (
          <Label htmlFor={inputId} className="text-sm font-medium text-foreground">
            {label}
          </Label>
        ) : null}
        <div className="relative">
          {prefixIcon ? (
            <span className="pointer-events-none absolute top-1/2 left-3.5 -translate-y-1/2 text-muted-foreground [&_svg]:size-4">
              {prefixIcon}
            </span>
          ) : null}
          <UiInput
            id={inputId}
            ref={ref}
            aria-invalid={Boolean(error) || undefined}
            className={cn(
              "min-h-11 rounded-xl border-border bg-card px-3.5 text-base shadow-soft md:text-sm",
              prefixIcon && "pl-10",
              suffixIcon && "pr-10",
              error && "border-destructive focus-visible:ring-destructive",
              className,
            )}
            {...props}
          />
          {suffixIcon ? (
            <span className="absolute top-1/2 right-2 -translate-y-1/2 text-muted-foreground [&_svg]:size-4">
              {suffixIcon}
            </span>
          ) : null}
        </div>
        {error ? <p className="text-xs text-destructive">{error}</p> : null}
        {!error && hint ? <p className="text-xs text-muted-foreground">{hint}</p> : null}
      </div>
    );
  },
);
Input.displayName = "Input";
