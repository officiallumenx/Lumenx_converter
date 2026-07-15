/** ─────────────────────────────────────────────────────────────
 *  LumenX Admin — AuthSelect
 *  Styled select matching AuthInput.
 * ───────────────────────────────────────────────────────────── */

import type { LucideIcon } from "lucide-react";
import type { ComponentPropsWithoutRef } from "react";

interface AuthSelectProps extends Omit<ComponentPropsWithoutRef<"select">, "className"> {
  label?: string;
  icon?: LucideIcon;
  error?: string;
  hint?: string;
  required?: boolean;
  options: readonly string[];
  placeholder?: string;
}

export function AuthSelect({
  label,
  icon: Icon,
  error,
  hint,
  required,
  options,
  placeholder = "Select…",
  ...selectProps
}: AuthSelectProps) {
  const id = selectProps.id ?? selectProps.name ?? label?.toLowerCase().replace(/\s+/g, "-");

  return (
    <div className="space-y-1.5">
      {label && (
        <label htmlFor={id} className="block text-xs font-medium text-foreground">
          {label}
          {required && <span className="text-destructive ml-0.5" aria-hidden>*</span>}
        </label>
      )}
      <div className="relative">
        {Icon && (
          <div className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2">
            <Icon className="size-3.5 text-muted-foreground" aria-hidden />
          </div>
        )}
        <select
          id={id}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          className={[
            "w-full h-10 rounded-lg border text-sm bg-background text-foreground transition-all duration-200 appearance-none",
            "focus:outline-none focus:ring-2 focus:ring-primary/40 focus:border-primary/50",
            Icon ? "pl-9" : "pl-3.5",
            "pr-8",
            error ? "border-destructive/60" : "border-border hover:border-border-strong",
          ].join(" ")}
          {...selectProps}
        >
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o} value={o}>{o}</option>
          ))}
        </select>
        <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
          <svg className="size-3.5 text-muted-foreground" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2} aria-hidden>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
          </svg>
        </div>
      </div>
      {error && (
        <p id={`${id}-error`} role="alert" className="text-[11px] text-destructive flex items-center gap-1">
          <span className="size-1.5 rounded-full bg-destructive shrink-0" aria-hidden />
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={`${id}-hint`} className="text-[11px] text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}
