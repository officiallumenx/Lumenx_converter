/** ─────────────────────────────────────────────────────────────
 *  LumenX Admin — OtpVerificationStep
 *  Shared email/mobile OTP panel for onboarding & recovery.
 * ───────────────────────────────────────────────────────────── */

import { useState, useEffect } from "react";
import { RefreshCw } from "lucide-react";

import { OtpInput } from "./OtpInput";
import { AuthButton } from "./AuthButton";
import { useCountdown } from "../hooks/useCountdown";
import { AUTH_BANNER_ENTER } from "../auth-ui";
import {
  otpService,
  DEMO_OTP,
  OTP_RESEND_COOLDOWN_SEC,
} from "../otp-service";

export interface OtpVerificationStepProps {
  channel: "email" | "mobile";
  destination: string;
  maskedDestination: string;
  onVerified: () => void | Promise<void>;
  onBack?: () => void;
  /** When false, OTP is verified without persisting session state (recovery flows). */
  persist?: boolean;
  verifyLabel?: string;
  successLabel?: string;
  sendOnMount?: boolean;
  /** embedded = recovery card header; minimal = OTP form only */
  variant?: "embedded" | "minimal";
}

export function OtpVerificationStep({
  channel,
  destination,
  maskedDestination,
  onVerified,
  onBack,
  persist = true,
  verifyLabel,
  successLabel,
  sendOnMount = true,
  variant = "minimal",
}: OtpVerificationStepProps) {
  const countdown = useCountdown(OTP_RESEND_COOLDOWN_SEC);
  const [otp, setOtp] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [sentBanner, setSentBanner] = useState(false);

  const defaultVerify =
    channel === "email" ? "Verify email" : "Verify mobile number";
  const defaultSuccess =
    channel === "email" ? "Verified! Continuing…" : "Verified! Almost done…";

  useEffect(() => {
    countdown.start();
    if (sendOnMount) {
      void (channel === "email"
        ? otpService.sendEmailOtp(destination)
        : otpService.sendMobileOtp(destination));
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleVerify = async (code?: string) => {
    const value = code ?? otp;
    if (value.replace(/\s/g, "").length < 6) {
      setError("Please enter the complete 6-digit code.");
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const result =
        channel === "email"
          ? await otpService.verifyEmailOtp(destination, value, persist)
          : await otpService.verifyMobileOtp(destination, value, persist);
      if (result.success) {
        setSuccess(true);
        await new Promise((r) => setTimeout(r, variant === "embedded" ? 500 : 700));
        await onVerified();
      } else {
        setError(result.error ?? "Invalid code. Please try again.");
        setOtp("");
      }
    } catch (e: unknown) {
      setError((e as Error).message ?? "Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleResend = async () => {
    if (countdown.isRunning) return;
    setSending(true);
    setSentBanner(false);
    try {
      if (channel === "email") await otpService.sendEmailOtp(destination);
      else await otpService.sendMobileOtp(destination);
      setSentBanner(true);
      countdown.start();
      setOtp("");
      setError(null);
      setTimeout(() => setSentBanner(false), 4000);
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-5">
      {variant === "embedded" && (
        <p className="text-sm text-muted-foreground text-center">
          Enter the 6-digit code sent to{" "}
          <span className="font-medium text-foreground">{maskedDestination}</span>.
        </p>
      )}

      {sentBanner && (
        <div
          role="status"
          className={`flex items-center gap-2 rounded-lg border border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950/40 px-4 py-3 text-sm text-emerald-700 dark:text-emerald-400 ${AUTH_BANNER_ENTER}`}
        >
          <RefreshCw className="h-4 w-4 shrink-0" aria-hidden />
          New OTP sent to {maskedDestination}
        </div>
      )}

      <OtpInput
        value={otp}
        onChange={(v) => {
          setOtp(v);
          if (error) setError(null);
        }}
        onComplete={handleVerify}
        error={error ?? undefined}
        success={success}
        disabled={loading || success}
        autoFocus
      />

      <AuthButton
        variant="primary"
        loading={loading}
        disabled={otp.replace(/\s/g, "").length < 6 || success}
        onClick={() => handleVerify()}
        aria-busy={loading}
      >
        {success ? (successLabel ?? defaultSuccess) : (verifyLabel ?? defaultVerify)}
      </AuthButton>

      <p className="text-center text-xs text-muted-foreground">
        Demo OTP: <span className="font-mono font-semibold tracking-widest text-foreground">{DEMO_OTP}</span>
      </p>

      <div className="flex flex-col items-center gap-1.5 text-sm">
        <span className="text-muted-foreground text-xs sm:text-sm">Didn't receive it?</span>
        {countdown.isRunning ? (
          <span className="text-xs sm:text-sm text-muted-foreground">
            Resend in{" "}
            <span className="font-semibold tabular-nums text-foreground">
              {countdown.formatted}
            </span>
          </span>
        ) : (
          <button
            type="button"
            onClick={handleResend}
            disabled={sending}
            className="flex items-center gap-1.5 text-xs sm:text-sm font-semibold text-primary hover:text-primary/80 transition-colors disabled:opacity-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
          >
            {sending && <RefreshCw className="h-3.5 w-3.5 animate-spin" aria-hidden />}
            Resend OTP
          </button>
        )}
      </div>

      {onBack && (
        <AuthButton variant="outline" onClick={onBack}>
          Back
        </AuthButton>
      )}
    </div>
  );
}
