/** ─────────────────────────────────────────────────────────────
 *  LumenX Admin — PasswordStrength
 *  Visual 4-bar strength meter shown beneath a password field.
 * ───────────────────────────────────────────────────────────── */

import {
  getPasswordStrength,
  getPasswordStrengthLabel,
  getPasswordStrengthColor,
  getPasswordErrors,
} from "../validation";
import { Check, X } from "lucide-react";

interface PasswordStrengthProps {
  password: string;
  showRules?: boolean;
}

export function PasswordStrength({ password, showRules = true }: PasswordStrengthProps) {
  const score  = getPasswordStrength(password);
  const label  = getPasswordStrengthLabel(score);
  const color  = getPasswordStrengthColor(score);
  const errors = getPasswordErrors(password);

  const rules = [
    { label: "At least 8 characters",     pass: password.length >= 8         },
    { label: "One uppercase letter",       pass: /[A-Z]/.test(password)       },
    { label: "One number",                 pass: /[0-9]/.test(password)       },
    { label: "One special character",      pass: /[^A-Za-z0-9]/.test(password) },
  ];

  if (!password) return null;

  return (
    <div className="space-y-2 mt-1">
      {/* Strength bars */}
      <div className="flex items-center gap-2">
        <div className="flex gap-1 flex-1">
          {[1, 2, 3, 4].map((n) => (
            <div
              key={n}
              className={[
                "h-1 flex-1 rounded-full transition-all duration-300",
                n <= score ? color : "bg-muted",
              ].join(" ")}
            />
          ))}
        </div>
        <span
          className={[
            "text-[10px] font-medium min-w-[3rem] text-right",
            score <= 1 ? "text-destructive" :
            score === 2 ? "text-warning" :
            score === 3 ? "text-chart-5" : "text-success",
          ].join(" ")}
        >
          {label}
        </span>
      </div>

      {/* Rules checklist */}
      {showRules && (
        <div className="grid grid-cols-2 gap-x-3 gap-y-1">
          {rules.map(({ label: ruleLabel, pass }) => (
            <div key={ruleLabel} className="flex items-center gap-1.5">
              {pass ? (
                <Check className="size-3 text-success shrink-0" />
              ) : (
                <X className="size-3 text-muted-foreground shrink-0" />
              )}
              <span
                className={[
                  "text-[10px]",
                  pass ? "text-success" : "text-muted-foreground",
                ].join(" ")}
              >
                {ruleLabel}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
