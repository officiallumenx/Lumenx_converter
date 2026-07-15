/** ─────────────────────────────────────────────────────────────
 *  LumenX Admin — PinInput
 *  6-digit security PIN input with individual boxes.
 *  Features: auto-advance, backspace-back, paste, show/hide.
 * ───────────────────────────────────────────────────────────── */

import { useRef, useState, useCallback, useEffect, type KeyboardEvent, type ClipboardEvent } from "react";
import { Eye, EyeOff, ShieldCheck } from "lucide-react";
import { usePrefersTouchKeypad } from "@/auth/hooks/usePrefersTouchKeypad";

interface PinInputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  hint?: string;
  required?: boolean;
  id?: string;
  autoFocus?: boolean;
}

export function PinInput({
  label,
  value,
  onChange,
  error,
  hint,
  required,
  id: idProp,
  autoFocus = false,
}: PinInputProps) {
  const [show,     setShow]     = useState(false);
  const [focused,  setFocused]  = useState<number | null>(null);
  const prefersTouchKeypad = usePrefersTouchKeypad();
  const PIN_LENGTH = 6;

  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: PIN_LENGTH }, (_, i) => value[i] ?? "");

  const id = idProp ?? label.toLowerCase().replace(/\s+/g, "-");

  const focusAt = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(PIN_LENGTH - 1, index));
    refs.current[clamped]?.focus();
  }, []);

  const handleChange = useCallback(
    (index: number, raw: string) => {
      const char = raw.replace(/[^0-9]/g, "").slice(-1);
      if (!char) return;
      const next = (value.slice(0, index) + char + value.slice(index + 1)).slice(0, PIN_LENGTH);
      onChange(next);
      if (index < PIN_LENGTH - 1) focusAt(index + 1);
    },
    [value, onChange, focusAt],
  );

  const handleKeyDown = useCallback(
    (index: number, e: KeyboardEvent<HTMLInputElement>) => {
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        handleChange(index, e.key);
        return;
      }

      if (e.key === "Backspace") {
        if (digits[index]) {
          onChange(value.slice(0, index) + value.slice(index + 1));
        } else if (index > 0) {
          focusAt(index - 1);
          onChange(value.slice(0, index - 1) + value.slice(index));
        }
        e.preventDefault();
      } else if (e.key === "ArrowLeft" && index > 0) {
        focusAt(index - 1);
        e.preventDefault();
      } else if (e.key === "ArrowRight" && index < PIN_LENGTH - 1) {
        focusAt(index + 1);
        e.preventDefault();
      }
    },
    [digits, value, onChange, focusAt, handleChange],
  );

  const handlePaste = useCallback(
    (e: ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pasted = e.clipboardData
        .getData("text")
        .replace(/[^0-9]/g, "")
        .slice(0, PIN_LENGTH);
      if (pasted.length > 0) {
        onChange(pasted.padEnd(PIN_LENGTH, "").slice(0, PIN_LENGTH));
        focusAt(Math.min(pasted.length, PIN_LENGTH - 1));
      }
    },
    [onChange, focusAt],
  );

  useEffect(() => {
    if (autoFocus) refs.current[0]?.focus();
  }, [autoFocus]);

  const isFilled = value.length === PIN_LENGTH;

  return (
    <div className="space-y-1.5" id={id}>
      {/* Label row */}
      <div className="flex items-center justify-between">
        <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
          <ShieldCheck className="size-3.5 text-muted-foreground" />
          {label}
          {required && <span className="text-destructive">*</span>}
        </label>
        <button
          type="button"
          onClick={() => setShow((v) => !v)}
          className="flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          aria-label={show ? "Hide PIN" : "Show PIN"}
        >
          {show ? <EyeOff className="size-3" /> : <Eye className="size-3" />}
          {show ? "Hide" : "Show"}
        </button>
      </div>

      {/* 6 digit boxes */}
      <div
        className="flex gap-2 sm:gap-2.5"
        role="group"
        aria-label={label}
      >
        {Array.from({ length: PIN_LENGTH }).map((_, i) => {
          const filled   = !!digits[i];
          const isFocus  = focused === i;
          const hasError = !!error;

          return (
            <input
              key={i}
              ref={(el) => { refs.current[i] = el; }}
              type={show ? "text" : "password"}
              inputMode={prefersTouchKeypad ? "numeric" : "text"}
              pattern="[0-9]*"
              maxLength={1}
              value={digits[i]}
              autoComplete="one-time-code"
              aria-label={`PIN digit ${i + 1}`}
              aria-invalid={hasError || undefined}
              onFocus={() => setFocused(i)}
              onBlur={() => setFocused(null)}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              className={[
                "flex-1 aspect-square max-w-[3rem] min-w-0 text-center text-base font-bold rounded-xl border-2 transition-all duration-150",
                "bg-background focus:outline-none",
                "caret-transparent select-none",
                hasError
                  ? "border-destructive/50 bg-destructive/[0.04] focus:border-destructive focus:ring-0"
                  : filled
                    ? "border-border-strong bg-muted/30 focus:border-primary focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.12)]"
                    : isFocus
                      ? "border-primary bg-background shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]"
                      : "border-border hover:border-border-strong",
              ].join(" ")}
            />
          );
        })}
      </div>

      {/* Strength dots */}
      <div className="flex items-center gap-1.5 mt-0.5">
        {Array.from({ length: PIN_LENGTH }).map((_, i) => (
          <div
            key={i}
            className={[
              "h-0.5 flex-1 rounded-full transition-all duration-300",
              i < value.length
                ? isFilled ? "bg-success" : "bg-primary"
                : "bg-muted",
            ].join(" ")}
          />
        ))}
        <span className="text-[10px] text-muted-foreground ml-1 shrink-0 font-mono">
          {value.length}/{PIN_LENGTH}
        </span>
      </div>

      {/* Error */}
      {error && (
        <p role="alert" className="text-[11px] text-destructive flex items-center gap-1">
          <span className="size-1.5 rounded-full bg-destructive shrink-0" aria-hidden />
          {error}
        </p>
      )}

      {/* Hint */}
      {!error && hint && (
        <p className="text-[11px] text-muted-foreground">{hint}</p>
      )}
    </div>
  );
}
