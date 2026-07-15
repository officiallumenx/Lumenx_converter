/** ─────────────────────────────────────────────────────────────
 *  LumenX Admin — OtpInput
 *  Professional 6-digit OTP input with individual boxes.
 *
 *  Features:
 *   • Auto-focus first box on mount
 *   • Auto-advance to next box on digit entry
 *   • Backspace navigates to previous box
 *   • Full paste support (pastes all 6 digits)
 *   • Calls onComplete when all digits are filled
 *   • Error state with red ring
 *   • Success state with green ring
 *   • Disabled state during submission
 * ───────────────────────────────────────────────────────────── */

import {
  useRef,
  useEffect,
  useCallback,
  type KeyboardEvent,
  type ClipboardEvent,
  type ChangeEvent,
} from "react";
import { CheckCircle2, XCircle } from "lucide-react";
import { OTP_LENGTH } from "../otp-service";

interface OtpInputProps {
  value:       string;
  onChange:    (value: string) => void;
  onComplete?: (value: string) => void;
  error?:      string;
  success?:    boolean;
  disabled?:   boolean;
  autoFocus?:  boolean;
  id?:         string;
}

export function OtpInput({
  value,
  onChange,
  onComplete,
  error,
  success,
  disabled = false,
  autoFocus = true,
  id = "otp",
}: OtpInputProps) {
  const inputRefs = useRef<(HTMLInputElement | null)[]>(Array(OTP_LENGTH).fill(null));
  const digits    = value.padEnd(OTP_LENGTH, "").slice(0, OTP_LENGTH).split("");

  // Focus first empty box or last box on mount
  useEffect(() => {
    if (!autoFocus) return;
    const firstEmpty = digits.findIndex((d) => d === "" || d === " ");
    const focusIdx   = firstEmpty === -1 ? OTP_LENGTH - 1 : firstEmpty;
    setTimeout(() => inputRefs.current[focusIdx]?.focus(), 80);
  }, []); // run once on mount

  const update = useCallback(
    (idx: number, char: string) => {
      const arr  = digits.map((d) => (d === " " ? "" : d));
      arr[idx]   = char;
      const next = arr.join("");
      onChange(next);
      if (next.replace(/\s/g, "").length === OTP_LENGTH && onComplete) {
        onComplete(next);
      }
      return arr;
    },
    [digits, onChange, onComplete],
  );

  const handleChange = (e: ChangeEvent<HTMLInputElement>, idx: number) => {
    const raw = e.target.value.replace(/\D/g, "");
    if (!raw) return;
    const char = raw[raw.length - 1]; // take last digit (handles browser autofill)
    update(idx, char);
    if (idx < OTP_LENGTH - 1) {
      inputRefs.current[idx + 1]?.focus();
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>, idx: number) => {
    if (e.key === "Backspace") {
      e.preventDefault();
      if (digits[idx] && digits[idx] !== " ") {
        update(idx, "");
      } else if (idx > 0) {
        update(idx - 1, "");
        inputRefs.current[idx - 1]?.focus();
      }
    } else if (e.key === "ArrowLeft" && idx > 0) {
      e.preventDefault();
      inputRefs.current[idx - 1]?.focus();
    } else if (e.key === "ArrowRight" && idx < OTP_LENGTH - 1) {
      e.preventDefault();
      inputRefs.current[idx + 1]?.focus();
    } else if (e.key === "Delete") {
      e.preventDefault();
      update(idx, "");
    }
  };

  const handlePaste = (e: ClipboardEvent<HTMLInputElement>) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData("text").replace(/\D/g, "").slice(0, OTP_LENGTH);
    if (!pasted) return;
    const arr = pasted.padEnd(OTP_LENGTH, "").slice(0, OTP_LENGTH).split("");
    onChange(arr.join(""));
    if (pasted.length === OTP_LENGTH && onComplete) {
      onComplete(arr.join(""));
    }
    // Focus last filled box
    const focusIdx = Math.min(pasted.length, OTP_LENGTH - 1);
    inputRefs.current[focusIdx]?.focus();
  };

  const handleFocus = (e: React.FocusEvent<HTMLInputElement>) => {
    e.target.select();
  };

  const boxBase =
    "w-11 h-14 sm:w-12 sm:h-[3.75rem] text-center text-2xl font-bold font-mono rounded-xl border-2 " +
    "transition-all duration-150 outline-none select-none caret-transparent " +
    "focus:scale-[1.06] focus:shadow-md";

  function boxClass(idx: number): string {
    const digit = digits[idx];
    const filled = digit && digit !== " " && digit !== "";

    if (disabled) {
      return `${boxBase} border-border bg-muted/40 text-muted-foreground cursor-not-allowed`;
    }
    if (success) {
      return `${boxBase} border-emerald-500 bg-emerald-50 dark:bg-emerald-950/30 text-emerald-700 dark:text-emerald-400 shadow-emerald-100 dark:shadow-none`;
    }
    if (error) {
      return `${boxBase} border-destructive bg-destructive/[0.05] text-destructive focus:ring-2 focus:ring-destructive/25`;
    }
    if (filled) {
      return `${boxBase} border-primary/70 bg-primary/[0.05] text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20`;
    }
    return `${boxBase} border-border bg-background text-foreground focus:border-primary focus:ring-2 focus:ring-primary/20`;
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* ── Boxes ─────────────────────────────────────────────── */}
      <div className="flex items-center gap-2 sm:gap-3">
        {digits.map((digit, idx) => (
          <input
            key={idx}
            ref={(el) => { inputRefs.current[idx] = el; }}
            id={`${id}-${idx}`}
            type="text"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={1}
            value={digit === " " ? "" : digit}
            onChange={(e) => handleChange(e, idx)}
            onKeyDown={(e) => handleKeyDown(e, idx)}
            onPaste={handlePaste}
            onFocus={handleFocus}
            disabled={disabled}
            autoComplete="one-time-code"
            className={boxClass(idx)}
            aria-label={`OTP digit ${idx + 1}`}
          />
        ))}
      </div>

      {/* ── Status message ────────────────────────────────────── */}
      {success && (
        <p className="flex items-center gap-1.5 text-sm font-medium text-emerald-600 dark:text-emerald-400 animate-in fade-in slide-in-from-bottom-1 duration-200">
          <CheckCircle2 className="w-4 h-4" />
          Code verified successfully!
        </p>
      )}
      {error && !success && (
        <p className="flex items-center gap-1.5 text-sm font-medium text-destructive animate-in fade-in slide-in-from-bottom-1 duration-200">
          <XCircle className="w-4 h-4 shrink-0" />
          {error}
        </p>
      )}
    </div>
  );
}
