/** ─────────────────────────────────────────────────────────────
 *  LumenX Admin — AuthStepBar
 *  Unified wizard step indicator.
 * ───────────────────────────────────────────────────────────── */

import { Check } from "lucide-react";

export interface AuthStepMeta {
  label: string;
  short: string;
}

interface AuthStepBarProps {
  steps: readonly AuthStepMeta[];
  current: number;
}

export function AuthStepBar({ steps, current }: AuthStepBarProps) {
  const total = steps.length;

  return (
    <div className="mb-6" aria-label={`Step ${current} of ${total}`}>
      <div className="flex items-start">
        {steps.map((s, i) => {
          const step   = i + 1;
          const done   = step < current;
          const active = step === current;
          const last   = i === total - 1;
          return (
            <div key={s.label} className="flex-1 flex flex-col items-center relative">
              {!last && (
                <div
                  className={[
                    "absolute top-3.5 left-1/2 w-full h-0.5 transition-colors duration-300",
                    done ? "bg-primary" : "bg-border",
                  ].join(" ")}
                  aria-hidden
                />
              )}
              <div
                className={[
                  "relative z-10 size-7 rounded-full flex items-center justify-center text-[11px] font-semibold border-2 transition-all duration-200",
                  done ? "bg-primary border-primary text-primary-foreground" : "",
                  active ? "bg-primary border-primary text-primary-foreground shadow-glow scale-105" : "",
                  !done && !active ? "bg-background border-border text-muted-foreground" : "",
                ].join(" ")}
                aria-current={active ? "step" : undefined}
              >
                {done ? <Check className="size-3" aria-hidden /> : step}
              </div>
              <span
                className={[
                  "mt-1.5 text-[10px] font-medium text-center leading-tight hidden sm:block",
                  active ? "text-primary" : done ? "text-foreground" : "text-muted-foreground",
                ].join(" ")}
              >
                {s.label}
              </span>
              <span
                className={[
                  "mt-1.5 text-[10px] font-medium text-center leading-tight sm:hidden",
                  active ? "text-primary" : done ? "text-foreground" : "text-muted-foreground",
                ].join(" ")}
              >
                {s.short}
              </span>
            </div>
          );
        })}
      </div>
      <div className="mt-3 h-0.5 bg-muted rounded-full overflow-hidden" aria-hidden>
        <div
          className="h-full bg-primary rounded-full transition-all duration-500 ease-out"
          style={{ width: `${total <= 1 ? 100 : ((current - 1) / (total - 1)) * 100}%` }}
        />
      </div>
    </div>
  );
}
