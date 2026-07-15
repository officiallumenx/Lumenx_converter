/** ─────────────────────────────────────────────────────────────
 *  LumenX Admin — OtpStepIndicator
 *  Compact two-step email → mobile progress for OTP flows.
 * ───────────────────────────────────────────────────────────── */

import { ChevronRight, CheckCircle2 } from "lucide-react";

interface OtpStepIndicatorProps {
  current: 1 | 2;
}

export function OtpStepIndicator({ current }: OtpStepIndicatorProps) {
  if (current === 1) {
    return (
      <div
        className="mb-7 flex items-center justify-center gap-2 text-xs text-muted-foreground"
        aria-label="Step 1 of 2: Email OTP"
      >
        <div className="flex items-center gap-1.5">
          <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
            1
          </span>
          <span className="font-medium text-foreground">Email OTP</span>
        </div>
        <ChevronRight className="h-3 w-3 shrink-0" aria-hidden />
        <div className="flex items-center gap-1.5 opacity-50">
          <span className="flex h-5 w-5 items-center justify-center rounded-full border border-border text-[10px] font-bold">
            2
          </span>
          <span>Mobile OTP</span>
        </div>
      </div>
    );
  }

  return (
    <div
      className="mb-7 flex items-center justify-center gap-2 text-xs text-muted-foreground"
      aria-label="Step 2 of 2: Mobile OTP"
    >
      <div className="flex items-center gap-1.5 opacity-60">
        <CheckCircle2 className="h-4 w-4 text-emerald-500 opacity-100" aria-hidden />
        <span className="line-through">Email OTP</span>
      </div>
      <div className="h-px w-6 bg-border" aria-hidden />
      <div className="flex items-center gap-1.5">
        <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
          2
        </span>
        <span className="font-medium text-foreground">Mobile OTP</span>
      </div>
    </div>
  );
}
