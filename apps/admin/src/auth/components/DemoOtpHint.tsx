/** ─────────────────────────────────────────────────────────────
 *  LumenX Admin — DemoOtpHint
 *  Collapsible demo OTP panel for development flows.
 * ───────────────────────────────────────────────────────────── */

import { useState } from "react";
import { Info } from "lucide-react";
import { AUTH_BANNER_ENTER } from "../auth-ui";

interface DemoOtpHintProps {
  otp: string;
  channel: "email" | "mobile";
  onUse?: (otp: string) => void;
  compact?: boolean;
}

export function DemoOtpHint({ otp, channel, onUse, compact = false }: DemoOtpHintProps) {
  const [open, setOpen] = useState(!compact);

  if (compact) {
    return (
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="w-full flex items-center justify-between rounded-lg border border-dashed border-amber-300 bg-amber-50/60 dark:border-amber-700 dark:bg-amber-950/20 px-3 py-2.5 text-left text-xs transition-colors hover:bg-amber-100/80 dark:hover:bg-amber-950/40"
      >
        <span className="flex items-center gap-2 text-amber-700 dark:text-amber-400 font-medium">
          <Info className="size-3.5 shrink-0" aria-hidden />
          Demo OTP: {open ? "hide" : "show"}
        </span>
        {open && (
          <span className="font-mono font-bold tracking-widest text-amber-800 dark:text-amber-300">{otp}</span>
        )}
      </button>
    );
  }

  return (
    <div className="mt-2">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className="flex w-full items-center justify-between rounded-lg border border-dashed border-amber-300 bg-amber-50 dark:border-amber-700 dark:bg-amber-950/30 px-4 py-3 text-left text-sm transition-colors hover:bg-amber-100 dark:hover:bg-amber-950/50"
        aria-expanded={open}
      >
        <span className="flex items-center gap-2 font-medium text-amber-700 dark:text-amber-400">
          <Info className="h-4 w-4 shrink-0" aria-hidden />
          Demo mode — view OTP
        </span>
        <span className="text-amber-500 text-xs">{open ? "hide" : "show"}</span>
      </button>
      {open && (
        <div className={`mt-2 rounded-lg border border-amber-200 bg-amber-50/80 dark:border-amber-800 dark:bg-amber-950/20 px-4 py-3 ${AUTH_BANNER_ENTER}`}>
          <p className="text-xs text-amber-600 dark:text-amber-400 mb-2">
            In production, a real OTP is sent to your {channel}.
          </p>
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-xs text-muted-foreground shrink-0">Demo OTP:</span>
              <span className="font-mono text-lg font-bold tracking-[0.35em] text-amber-700 dark:text-amber-300">
                {otp}
              </span>
            </div>
            {onUse && (
              <button
                type="button"
                onClick={() => onUse(otp)}
                className="rounded-md bg-amber-100 dark:bg-amber-900/50 px-3 py-1 text-xs font-semibold text-amber-700 dark:text-amber-300 hover:bg-amber-200 dark:hover:bg-amber-900/80 transition-colors shrink-0"
              >
                Use this code
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
