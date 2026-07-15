/** ─────────────────────────────────────────────────────────────
 *  LumenX Admin — AuthInput
 *  Reusable controlled input for authentication forms.
 *  Supports: text | email | password | tel | date
 * ───────────────────────────────────────────────────────────── */

import { useState, type ComponentPropsWithoutRef, type ReactNode } from "react";
import { Eye, EyeOff, type LucideIcon } from "lucide-react";

interface AuthInputProps extends Omit<ComponentPropsWithoutRef<"input">, "className"> {
  label?: string;
  icon?: LucideIcon;
  error?: string;
  hint?: string;
  /** Optional trailing element (e.g. "Forgot?" link) */
  trailing?: ReactNode;
  required?: boolean;
}

export function AuthInput({
  label,
  icon: Icon,
  error,
  hint,
  trailing,
  required,
  type = "text",
  ...inputProps
}: AuthInputProps) {
  const [showPassword, setShowPassword] = useState(false);
  const isPassword   = type === "password";
  const resolvedType = isPassword ? (showPassword ? "text" : "password") : type;
  const inputId      = inputProps.id ?? inputProps.name ?? label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="space-y-1.5">
      {/* Label row */}
      {(label || trailing) && (
        <div className="flex items-center justify-between">
          {label && (
            <label
              htmlFor={inputId}
              className="block text-xs font-medium text-foreground"
            >
              {label}
              {required && <span className="text-destructive ml-0.5">*</span>}
            </label>
          )}
          {trailing && <div className="text-[11px]">{trailing}</div>}
        </div>
      )}

      {/* Input wrapper */}
      <div className="relative">
        {/* Left icon */}
        {Icon && (
          <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
            <Icon className="size-3.5 text-muted-foreground" />
          </div>
        )}

        <input
          id={inputId}
          type={resolvedType}
          aria-invalid={!!error}
          aria-describedby={error ? `${inputId}-error` : hint ? `${inputId}-hint` : undefined}
          className={[
            "w-full h-10 sm:h-11 rounded-lg border text-sm transition-all duration-200",
            "bg-background placeholder:text-muted-foreground/60",
            "focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50",
            Icon     ? "pl-9"  : "pl-3.5",
            isPassword ? "pr-10" : "pr-3.5",
            error
              ? "border-destructive/60 focus:ring-destructive/30 focus:border-destructive/50"
              : "border-border hover:border-border-strong",
          ].join(" ")}
          {...inputProps}
        />

        {/* Password visibility toggle */}
        {isPassword && (
          <button
            type="button"
            tabIndex={-1}
            onClick={() => setShowPassword((v) => !v)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors rounded-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            aria-label={showPassword ? "Hide password" : "Show password"}
          >
            {showPassword ? <EyeOff className="size-3.5" /> : <Eye className="size-3.5" />}
          </button>
        )}
      </div>

      {/* Error */}
      {error && (
        <p
          id={`${inputId}-error`}
          role="alert"
          className="text-[11px] text-destructive flex items-center gap-1"
        >
          <span className="size-1.5 rounded-full bg-destructive shrink-0" aria-hidden />
          {error}
        </p>
      )}

      {/* Hint */}
      {!error && hint && (
        <p id={`${inputId}-hint`} className="text-[11px] text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}
