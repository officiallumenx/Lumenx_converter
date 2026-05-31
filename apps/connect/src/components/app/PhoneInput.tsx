import { useMemo } from "react";
import { Phone } from "lucide-react";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";

export interface Country {
  code: string; // dial code, e.g. "+91"
  iso: string; // ISO, e.g. "IN"
  flag: string; // emoji
  label: string; // display label
  maxLen: number; // max national digits
}

export const COUNTRIES: Country[] = [
  { code: "+91", iso: "IN", flag: "🇮🇳", label: "India", maxLen: 10 },
  { code: "+1", iso: "US", flag: "🇺🇸", label: "United States", maxLen: 10 },
  { code: "+44", iso: "GB", flag: "🇬🇧", label: "United Kingdom", maxLen: 10 },
  { code: "+971", iso: "AE", flag: "🇦🇪", label: "UAE", maxLen: 9 },
  { code: "+65", iso: "SG", flag: "🇸🇬", label: "Singapore", maxLen: 8 },
  { code: "+61", iso: "AU", flag: "🇦🇺", label: "Australia", maxLen: 9 },
  { code: "+966", iso: "SA", flag: "🇸🇦", label: "Saudi Arabia", maxLen: 9 },
  { code: "+880", iso: "BD", flag: "🇧🇩", label: "Bangladesh", maxLen: 10 },
];

export function PhoneInput({
  country,
  onCountryChange,
  value,
  onChange,
  autoFocus,
  onEnter,
  error,
  id,
}: {
  country: Country;
  onCountryChange: (c: Country) => void;
  value: string;
  onChange: (digits: string) => void;
  autoFocus?: boolean;
  onEnter?: () => void;
  error?: string | null;
  id?: string;
}) {
  const digits = useMemo(
    () => value.replace(/\D/g, "").slice(0, country.maxLen),
    [value, country.maxLen],
  );
  const isValid = digits.length === country.maxLen;

  return (
    <div className="space-y-1.5">
      <div
        className={cn(
          "flex items-stretch rounded-xl border bg-background overflow-hidden transition-colors focus-within:border-primary",
          error ? "border-destructive" : "border-input",
        )}
      >
        <Select
          value={country.iso}
          onValueChange={(iso) => {
            const next = COUNTRIES.find((c) => c.iso === iso);
            if (next) onCountryChange(next);
          }}
        >
          <SelectTrigger className="h-12 w-[110px] rounded-none border-0 border-r border-input bg-muted/40 px-3 focus:ring-0 shrink-0">
            <SelectValue>
              <span className="inline-flex items-center gap-1.5 text-sm">
                <span className="text-base leading-none">{country.flag}</span>
                <span className="font-medium">{country.code}</span>
              </span>
            </SelectValue>
          </SelectTrigger>
          <SelectContent>
            {COUNTRIES.map((c) => (
              <SelectItem key={c.iso} value={c.iso}>
                <span className="inline-flex items-center gap-2">
                  <span>{c.flag}</span>
                  <span className="font-medium">{c.code}</span>
                  <span className="text-muted-foreground text-xs">{c.label}</span>
                </span>
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative flex-1 min-w-0">
          <Phone className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground pointer-events-none" />
          <Input
            id={id}
            type="tel"
            inputMode="numeric"
            autoComplete="tel-national"
            pattern="[0-9]*"
            placeholder={"".padStart(country.maxLen, "0")}
            autoFocus={autoFocus}
            maxLength={country.maxLen}
            value={digits}
            onChange={(e) => onChange(e.target.value.replace(/\D/g, "").slice(0, country.maxLen))}
            onKeyDown={(e) => {
              if (e.key === "Enter" && onEnter) onEnter();
              // block non-numeric typing (allow control keys)
              if (e.key.length === 1 && !/[0-9]/.test(e.key)) e.preventDefault();
            }}
            className="pl-10 h-12 rounded-none border-0 text-base focus-visible:ring-0 focus-visible:ring-offset-0"
          />
        </div>
      </div>
      <div className="flex items-center justify-between text-[11px]">
        <span className={cn("text-muted-foreground", error && "text-destructive")}>
          {error ?? `Enter your ${country.maxLen}-digit number`}
        </span>
        <span className={cn("tabular-nums", isValid ? "text-success" : "text-muted-foreground")}>
          {digits.length}/{country.maxLen}
        </span>
      </div>
    </div>
  );
}

export const validatePhone = (digits: string, country: Country) =>
  digits.replace(/\D/g, "").length === country.maxLen;
