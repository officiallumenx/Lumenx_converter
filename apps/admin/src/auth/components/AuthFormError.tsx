/** ─────────────────────────────────────────────────────────────
 *  LumenX Admin — AuthFormError
 *  Standardized alert banner for form-level errors.
 * ───────────────────────────────────────────────────────────── */

import { AlertCircle } from "lucide-react";
import { AUTH_BANNER_ENTER } from "../auth-ui";

interface AuthFormErrorProps {
  message: string;
  className?: string;
}

export function AuthFormError({ message, className = "" }: AuthFormErrorProps) {
  return (
    <div
      role="alert"
      aria-live="polite"
      className={[
        "flex items-start gap-2.5 rounded-xl border border-destructive/30 bg-destructive/[0.05] px-3.5 py-3 text-xs text-destructive leading-relaxed",
        AUTH_BANNER_ENTER,
        className,
      ].join(" ")}
    >
      <AlertCircle className="size-4 shrink-0 mt-0.5" aria-hidden />
      <span>{message}</span>
    </div>
  );
}
