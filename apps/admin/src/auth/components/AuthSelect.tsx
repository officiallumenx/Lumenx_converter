/** ─────────────────────────────────────────────────────────────
 *  LumenX Admin — AuthSelect
 *  Themed select matching AuthInput (in-app menu, not OS picker).
 * ───────────────────────────────────────────────────────────── */

import type { LucideIcon } from "lucide-react";
import type { ComponentPropsWithoutRef } from "react";
import { Select } from "@lumenx/ui-admin";

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
          <div className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2">
            <Icon className="size-3.5 text-muted-foreground" aria-hidden />
          </div>
        )}
        <Select
          id={id}
          fieldSize="md"
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
          className={[
            "h-10 rounded-lg text-sm",
            Icon ? "pl-9" : "",
            error ? "border-destructive/60" : "",
          ]
            .filter(Boolean)
            .join(" ")}
          {...selectProps}
        >
          <option value="">{placeholder}</option>
          {options.map((o) => (
            <option key={o} value={o}>
              {o}
            </option>
          ))}
        </Select>
      </div>
      {error && (
        <p id={`${id}-error`} className="text-[11px] text-destructive" role="alert">
          {error}
        </p>
      )}
      {!error && hint && (
        <p id={`${id}-hint`} className="text-[11px] text-muted-foreground">
          {hint}
        </p>
      )}
    </div>
  );
}
