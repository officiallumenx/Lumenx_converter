import { useMemo, type FocusEventHandler } from "react";
import { Input, cn } from "@lumenx/ui";

import { FormField } from "@/components/ui/form-field";

export interface Country {
  code: string;
  iso: string;
  label: string;
  maxLen: number;
  placeholder: string;
}

export const COUNTRIES: Country[] = [
  {
    code: "+91",
    iso: "IN",
    label: "India",
    maxLen: 10,
    placeholder: "9876543210",
  },
];

export function PhoneInput({
  country,
  value,
  onChange,
  autoFocus,
  onEnter,
  error,
  id = "phone",
  label = "Mobile number",
  hint,
  onFocus,
}: {
  country: Country;
  value: string;
  onChange: (digits: string) => void;
  autoFocus?: boolean;
  onEnter?: () => void;
  onFocus?: FocusEventHandler<HTMLInputElement>;
  error?: string | null;
  id?: string;
  label?: string;
  hint?: string;
}) {
  const digits = useMemo(
    () => value.replace(/\D/g, "").slice(0, country.maxLen),
    [value, country.maxLen],
  );

  return (
    <FormField id={id} label={label} hint={hint} error={error}>
      <div
        className={cn(
          "grid w-full min-w-0 grid-cols-[4.75rem_minmax(0,1fr)] overflow-hidden rounded-xl border bg-background",
          error ? "border-destructive" : "border-input",
        )}
      >
        <div className="flex h-12 items-center justify-center border-r border-input bg-muted/50 text-sm font-semibold tabular-nums text-foreground">
          {country.code}
        </div>
        <Input
          id={id}
          type="tel"
          inputMode="numeric"
          autoComplete="tel-national"
          pattern="[0-9]*"
          placeholder={country.placeholder}
          autoFocus={autoFocus}
          maxLength={country.maxLen}
          value={digits}
          aria-invalid={Boolean(error)}
          aria-describedby={error || hint ? `${id}-message` : undefined}
          onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, country.maxLen))}
          onFocus={onFocus}
          onKeyDown={(e) => {
            if (e.key === "Enter" && onEnter) onEnter();
            if (e.key.length === 1 && !/[0-9]/.test(e.key)) e.preventDefault();
          }}
          className="h-12 min-w-0 rounded-none border-0 bg-transparent px-3 text-base shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
        />
      </div>
    </FormField>
  );
}

export const validatePhone = (digits: string, country: Country) =>
  digits.replace(/\D/g, "").length === country.maxLen;
