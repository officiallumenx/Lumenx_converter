/** ─────────────────────────────────────────────────────────────
 *  LumenX Admin — OtpInput
 *  Six separate digit blocks (not a single text field).
 * ───────────────────────────────────────────────────────────── */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ClipboardEvent,
  type KeyboardEvent,
} from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { OTP_LENGTH } from "../otp-service";

interface OtpInputProps {
  value: string;
  onChange: (value: string) => void;
  onComplete?: (value: string) => void;
  error?: string;
  success?: boolean;
  disabled?: boolean;
  autoFocus?: boolean;
  id?: string;
}

export function OtpInput({
  value,
  onChange,
  onComplete,
  error,
  success,
  disabled = false,
  autoFocus = true,
  id = "otp-input",
}: OtpInputProps) {
  const [focused, setFocused] = useState<number | null>(null);
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const digits = Array.from({ length: OTP_LENGTH }, (_, i) => value[i] ?? "");
  const completedRef = useRef<string | null>(null);

  const focusAt = useCallback((index: number) => {
    const clamped = Math.max(0, Math.min(OTP_LENGTH - 1, index));
    refs.current[clamped]?.focus();
    refs.current[clamped]?.select();
  }, []);

  const emitChange = useCallback(
    (next: string) => {
      const normalized = next.replace(/\D/g, "").slice(0, OTP_LENGTH);
      onChange(normalized);
      if (normalized.length === OTP_LENGTH) {
        if (completedRef.current !== normalized) {
          completedRef.current = normalized;
          onComplete?.(normalized);
        }
      } else {
        completedRef.current = null;
      }
    },
    [onChange, onComplete],
  );

  const handleChange = useCallback(
    (index: number, raw: string) => {
      const chars = raw.replace(/\D/g, "");
      if (!chars) return;

      // Support paste / autofill dumping multiple digits into one box.
      if (chars.length > 1) {
        const next = (
          value.slice(0, index) +
          chars +
          value.slice(index + chars.length)
        )
          .replace(/\D/g, "")
          .slice(0, OTP_LENGTH);
        emitChange(next);
        focusAt(Math.min(index + chars.length, OTP_LENGTH - 1));
        return;
      }

      const next = (
        value.slice(0, index) +
        chars +
        value.slice(index + 1)
      ).slice(0, OTP_LENGTH);
      emitChange(next);
      if (index < OTP_LENGTH - 1) focusAt(index + 1);
    },
    [value, emitChange, focusAt],
  );

  const handleKeyDown = useCallback(
    (index: number, e: KeyboardEvent<HTMLInputElement>) => {
      if (/^[0-9]$/.test(e.key)) {
        e.preventDefault();
        handleChange(index, e.key);
        return;
      }

      if (e.key === "Backspace") {
        e.preventDefault();
        if (digits[index]) {
          emitChange(value.slice(0, index) + value.slice(index + 1));
        } else if (index > 0) {
          focusAt(index - 1);
          emitChange(value.slice(0, index - 1) + value.slice(index));
        }
        return;
      }

      if (e.key === "ArrowLeft" && index > 0) {
        e.preventDefault();
        focusAt(index - 1);
      } else if (e.key === "ArrowRight" && index < OTP_LENGTH - 1) {
        e.preventDefault();
        focusAt(index + 1);
      }
    },
    [digits, value, emitChange, focusAt, handleChange],
  );

  const handlePaste = useCallback(
    (e: ClipboardEvent<HTMLInputElement>) => {
      e.preventDefault();
      const pasted = e.clipboardData
        .getData("text")
        .replace(/\D/g, "")
        .slice(0, OTP_LENGTH);
      if (!pasted) return;
      emitChange(pasted);
      focusAt(Math.min(pasted.length, OTP_LENGTH) - 1);
    },
    [emitChange, focusAt],
  );

  useEffect(() => {
    if (autoFocus && !disabled) focusAt(0);
  }, [autoFocus, disabled, focusAt]);

  return (
    <div className="flex flex-col items-center gap-3" id={id}>
      <div
        className="flex w-full max-w-sm items-center justify-center gap-2 sm:gap-2.5"
        role="group"
        aria-label="One-time passcode"
      >
        {Array.from({ length: OTP_LENGTH }).map((_, i) => {
          const filled = !!digits[i];
          const isFocus = focused === i;
          const hasError = !!error && !success;

          return (
            <input
              key={i}
              ref={(el) => {
                refs.current[i] = el;
              }}
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={1}
              value={digits[i]}
              disabled={disabled || success}
              autoComplete={i === 0 ? "one-time-code" : "off"}
              aria-label={`OTP digit ${i + 1} of ${OTP_LENGTH}`}
              aria-invalid={hasError || undefined}
              onFocus={() => setFocused(i)}
              onBlur={() => setFocused(null)}
              onChange={(e) => handleChange(i, e.target.value)}
              onKeyDown={(e) => handleKeyDown(i, e)}
              onPaste={handlePaste}
              className={[
                "h-12 w-11 sm:h-14 sm:w-12 shrink-0 text-center text-lg sm:text-xl font-semibold tabular-nums rounded-xl border-2 transition-all duration-150",
                "bg-background text-foreground focus:outline-none",
                "disabled:cursor-not-allowed disabled:opacity-60",
                hasError
                  ? "border-destructive/60 bg-destructive/[0.04] focus:border-destructive"
                  : success
                    ? "border-emerald-500/60 bg-emerald-500/[0.06]"
                    : filled
                      ? "border-border-strong bg-muted/20 focus:border-primary focus:shadow-[0_0_0_3px_hsl(var(--primary)/0.12)]"
                      : isFocus
                        ? "border-primary shadow-[0_0_0_3px_hsl(var(--primary)/0.15)]"
                        : "border-border hover:border-border-strong",
              ].join(" ")}
            />
          );
        })}
      </div>

      {success && (
        <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="w-4 h-4" />
          Code verified successfully!
        </p>
      )}
      {error && !success && (
        <p className="flex items-center gap-1.5 text-sm font-medium text-destructive text-center">
          <XCircle className="w-4 h-4 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
