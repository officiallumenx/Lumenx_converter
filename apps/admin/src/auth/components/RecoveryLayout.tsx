/** ─────────────────────────────────────────────────────────────
 *  LumenX Admin — Recovery Layout
 *  Wizard shell for forgot password / forgot PIN flows.
 * ───────────────────────────────────────────────────────────── */

import { Link } from "@tanstack/react-router";
import { ArrowLeft, Check, Sparkles } from "lucide-react";
import { IconChip } from "@/components/IconChip";
import { AUTH_PAGE_ENTER, AUTH_PAGE_MAX } from "../auth-ui";
import type { ReactNode } from "react";
import type { RecoveryFlowType } from "../recovery-flow-store";
import { FORGOT_PASSWORD_STEPS, FORGOT_PIN_STEPS, stepIndex } from "../recovery-flow-store";

interface RecoveryLayoutProps {
  type: RecoveryFlowType;
  currentStep: string;
  title: string;
  subtitle?: string;
  backTo?: string;
  backLabel?: string;
  onBack?: () => void;
  children: ReactNode;
}

export function RecoveryLayout({
  type,
  currentStep,
  title,
  subtitle,
  backTo = "/login",
  backLabel = "Back to sign in",
  onBack,
  children,
}: RecoveryLayoutProps) {
  const steps = type === "forgot_password" ? FORGOT_PASSWORD_STEPS : FORGOT_PIN_STEPS;
  const currentIdx = stepIndex(type, currentStep as never);

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      <aside className="hidden lg:flex lg:w-[38%] flex-col justify-between p-10 bg-gradient-to-br from-primary/[0.06] via-background to-muted/20 border-r border-border shrink-0">
        <div>
          <div className="flex items-center gap-2.5 mb-10">
            <IconChip icon={Sparkles} size="sm" />
            <span className="font-bold text-sm tracking-tight">LUMENX ADMIN</span>
          </div>
          <h2 className="text-2xl font-bold tracking-tight leading-snug">
            {type === "forgot_password" ? "Reset your password" : "Reset your security PIN"}
          </h2>
          <p className="mt-3 text-sm text-muted-foreground leading-relaxed max-w-xs">
            {type === "forgot_password"
              ? "Verify your identity with OTP, then create a new password."
              : "Sign in to verify your identity, complete OTP verification, then set a new PIN."}
          </p>
        </div>

        <ol className="space-y-3">
          {steps.map((s, i) => {
            const done = i < currentIdx;
            const active = i === currentIdx;
            return (
              <li
                key={s.id}
                className={[
                  "flex items-center gap-3 px-3 py-2.5 rounded-xl border transition-all",
                  active ? "border-primary/30 bg-primary/[0.04]" : done ? "border-emerald-500/20 bg-emerald-500/[0.03]" : "border-border/50 opacity-60",
                ].join(" ")}
              >
                <div
                  className={[
                    "size-6 rounded-full flex items-center justify-center text-[10px] font-bold border shrink-0",
                    done ? "bg-emerald-500 border-emerald-500 text-white" : active ? "bg-primary border-primary text-primary-foreground" : "bg-muted border-border text-muted-foreground",
                  ].join(" ")}
                >
                  {done ? <Check className="size-3" /> : i + 1}
                </div>
                <span className={`text-xs font-medium ${active ? "text-primary" : ""}`}>{s.label}</span>
              </li>
            );
          })}
        </ol>

        <p className="text-[10px] text-muted-foreground">&copy; {new Date().getFullYear()} LumenX Technologies</p>
      </aside>

      <main className="flex-1 flex flex-col min-h-0">
        <div className="flex items-center justify-between px-6 py-4 border-b border-border/50 lg:hidden">
          <div className="flex items-center gap-2">
            <IconChip icon={Sparkles} size="xs" />
            <span className="text-xs font-bold">LUMENX ADMIN</span>
          </div>
          {onBack ? (
            <button type="button" onClick={onBack} className="text-xs text-muted-foreground flex items-center gap-1 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm">
              <ArrowLeft className="size-3.5" /> Back
            </button>
          ) : (
            <Link to={backTo as never} className="text-xs text-muted-foreground flex items-center gap-1">
              <ArrowLeft className="size-3.5" /> Back
            </Link>
          )}
        </div>

        <div className="flex-1 overflow-y-auto flex items-center justify-center px-6 py-10">
          <div className={`w-full ${AUTH_PAGE_MAX} ${AUTH_PAGE_ENTER}`}>
            {onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="hidden lg:flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-6"
              >
                <ArrowLeft className="size-3.5" /> {backLabel}
              </button>
            ) : (
              <Link
                to={backTo as never}
                className="hidden lg:flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-6 w-fit"
              >
                <ArrowLeft className="size-3.5" /> {backLabel}
              </Link>
            )}

            {/* Mobile step indicator */}
            <div className="flex items-center gap-1 mb-6 lg:hidden">
              {steps.map((s, i) => (
                <div
                  key={s.id}
                  className={[
                    "h-1 flex-1 rounded-full transition-colors",
                    i <= currentIdx ? "bg-primary" : "bg-border",
                  ].join(" ")}
                />
              ))}
            </div>

            <h1 className="text-xl sm:text-2xl font-bold tracking-tight">{title}</h1>
            {subtitle && <p className="text-sm text-muted-foreground mt-1.5">{subtitle}</p>}
            <div className="mt-6">{children}</div>
          </div>
        </div>
      </main>
    </div>
  );
}
