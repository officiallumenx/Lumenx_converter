/** ─────────────────────────────────────────────────────────────
 *  LumenX Admin — OtpInput
 *  Same 6-digit OTP control as Connect (InputOTP from @lumenx/ui).
 * ───────────────────────────────────────────────────────────── */

import { CheckCircle2, XCircle } from "lucide-react";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@lumenx/ui";
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
}: OtpInputProps) {
  return (
    <div className="flex flex-col items-center gap-4">
      <div className="flex justify-center">
        <InputOTP
          maxLength={OTP_LENGTH}
          value={value}
          autoFocus={autoFocus}
          disabled={disabled}
          pattern="^[0-9]+$"
          inputMode="numeric"
          autoComplete="one-time-code"
          onChange={onChange}
          onComplete={onComplete}
        >
          <InputOTPGroup>
            {Array.from({ length: OTP_LENGTH }, (_, i) => (
              <InputOTPSlot
                key={i}
                index={i}
                className="size-11 sm:size-12 text-base sm:text-lg rounded-xl"
              />
            ))}
          </InputOTPGroup>
        </InputOTP>
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
