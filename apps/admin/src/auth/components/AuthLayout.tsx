/** ─────────────────────────────────────────────────────────────
 *  LumenX Admin — AuthLayout
 *  App-style centered shell for login / register (no marketing panel).
 * ───────────────────────────────────────────────────────────── */

import { Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { LumenXAdminLogo } from "@/components/LumenXAdminLogo";
import { AUTH_PAGE_ENTER } from "../auth-ui";
import type { ReactNode } from "react";

interface AuthLayoutProps {
  /** Main heading displayed above the form */
  title: string;
  /** Short context line under the title */
  subtitle?: string;
  /** Show a back control in the top bar */
  showBack?: boolean;
  /** Route for the back link (ignored when onBack is set) */
  backTo?: string;
  backLabel?: string;
  /** Prefer callback back (multi-step flows) over a route link */
  onBack?: () => void;
  children: ReactNode;
  /** Optional line under the form (e.g. Login / Register link) */
  footer?: ReactNode;
}

export function AuthLayout({
  title,
  subtitle,
  showBack = false,
  backTo = "/welcome",
  backLabel = "Back",
  onBack,
  children,
  footer,
}: AuthLayoutProps) {
  return (
    <div className="min-h-screen-dvh flex flex-col bg-gradient-to-b from-background via-background to-muted/30 text-foreground">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute top-0 left-1/2 -translate-x-1/2 h-[280px] w-[560px] rounded-full bg-primary/[0.04] blur-3xl" />
      </div>

      <header className="lx-auth-top-bar relative z-10 flex shrink-0 items-center border-b border-border/40">
        <div className="flex w-20 shrink-0 items-center justify-start">
          {showBack ? (
            onBack ? (
              <button
                type="button"
                onClick={onBack}
                className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="size-3.5" />
                {backLabel}
              </button>
            ) : (
              <Link
                to={backTo as never}
                className="flex items-center gap-1 text-xs text-muted-foreground transition-colors hover:text-foreground"
              >
                <ArrowLeft className="size-3.5" />
                {backLabel}
              </Link>
            )
          ) : null}
        </div>
        <div className="flex flex-1 justify-center">
          <LumenXAdminLogo size="sm" className="max-h-8" />
        </div>
        <div className="w-20 shrink-0" aria-hidden />
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center overflow-y-auto px-4 py-8 sm:py-10">
        <div className="my-auto w-full max-w-[24rem] pb-[max(1rem,var(--lx-safe-bottom))]">
          <div className="mb-6 text-center">
            <h1 className="text-xl font-bold tracking-tight sm:text-[1.35rem]">{title}</h1>
            {subtitle ? (
              <p className="mt-1.5 text-[13px] leading-snug text-muted-foreground">{subtitle}</p>
            ) : null}
          </div>

          <div className={AUTH_PAGE_ENTER}>{children}</div>

          {footer ? (
            <div className="mt-6 text-center text-xs text-muted-foreground">{footer}</div>
          ) : null}
        </div>
      </main>
    </div>
  );
}
