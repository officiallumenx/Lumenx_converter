/** ─────────────────────────────────────────────────────────────
 *  LumenX Admin — AuthLayout
 *  Phone: branded stack + form card. Desktop: split rail + form.
 * ───────────────────────────────────────────────────────────── */

import { Link } from "@tanstack/react-router";
import { ArrowLeft, Check } from "lucide-react";
import { AUTH_CARD_ENTER, AUTH_PAGE_ENTER } from "../auth-ui";
import { LumenXAdminLogo } from "@/components/LumenXAdminLogo";
import type { ReactNode } from "react";

export type AuthLayoutStep = {
  id: string;
  label: string;
};

interface AuthLayoutProps {
  title: string;
  subtitle?: string;
  showBack?: boolean;
  backTo?: string;
  backLabel?: string;
  onBack?: () => void;
  children: ReactNode;
  footer?: ReactNode;
  /** Desktop left-rail copy */
  asideTitle?: string;
  asideBody?: string;
  steps?: readonly AuthLayoutStep[];
  currentStepId?: string;
}

function StepRail({
  steps,
  currentIdx,
  contrast = false,
}: {
  steps: readonly AuthLayoutStep[];
  currentIdx: number;
  /** Light-on-primary rail (desktop brand panel) */
  contrast?: boolean;
}) {
  return (
    <ol className="space-y-2">
      {steps.map((s, i) => {
        const done = i < currentIdx;
        const active = i === currentIdx;
        return (
          <li key={s.id} className="relative flex items-stretch gap-3">
            {i < steps.length - 1 ? (
              <span
                aria-hidden
                className={[
                  "absolute left-[13px] top-8 h-[calc(100%-0.25rem)] w-px",
                  contrast
                    ? done
                      ? "bg-white/55"
                      : "bg-white/20"
                    : done
                      ? "bg-emerald-500/50"
                      : "bg-border/80",
                ].join(" ")}
              />
            ) : null}
            <div
              className={[
                "relative z-[1] flex w-full items-center gap-3 rounded-2xl border px-3 py-2.5 transition-all duration-300",
                contrast
                  ? active
                    ? "border-white/45 bg-white/18 shadow-sm"
                    : done
                      ? "border-white/25 bg-white/10"
                      : "border-white/12 bg-white/[0.04] opacity-75"
                  : active
                    ? "border-primary/35 bg-primary/[0.08] shadow-sm"
                    : done
                      ? "border-emerald-500/25 bg-emerald-500/[0.06]"
                      : "border-border/60 bg-card/50 opacity-70",
              ].join(" ")}
            >
              <div
                className={[
                  "grid size-7 shrink-0 place-items-center rounded-full border text-[11px] font-bold transition-colors",
                  contrast
                    ? done
                      ? "border-white bg-white text-primary"
                      : active
                        ? "border-white bg-white text-primary"
                        : "border-white/35 bg-transparent text-white/80"
                    : done
                      ? "border-emerald-500 bg-emerald-500 text-white"
                      : active
                        ? "border-primary bg-primary text-primary-foreground"
                        : "border-border bg-muted text-muted-foreground",
                ].join(" ")}
              >
                {done ? <Check className="size-3.5" strokeWidth={2.5} /> : i + 1}
              </div>
              <span
                className={[
                  "text-[13px] font-medium tracking-tight",
                  contrast
                    ? active || done
                      ? "text-white"
                      : "text-white/70"
                    : active
                      ? "text-primary"
                      : done
                        ? "text-foreground"
                        : "text-muted-foreground",
                ].join(" ")}
              >
                {s.label}
              </span>
            </div>
          </li>
        );
      })}
    </ol>
  );
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
  asideTitle,
  asideBody,
  steps,
  currentStepId,
}: AuthLayoutProps) {
  const currentIdx =
    steps && currentStepId
      ? Math.max(0, steps.findIndex((s) => s.id === currentStepId))
      : 0;
  const showAside = Boolean(asideTitle || (steps && steps.length > 0));
  const progressPct =
    steps && steps.length > 0
      ? ((currentIdx + 1) / steps.length) * 100
      : 0;

  const backControl =
    showBack ? (
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
    ) : null;

  return (
    <div className="flex min-h-screen-dvh bg-background text-foreground">
      {showAside ? (
        <aside className="relative hidden shrink-0 flex-col justify-between overflow-hidden bg-gradient-to-br from-primary via-primary to-[oklch(0.38_0.16_280)] p-10 text-primary-foreground lg:flex lg:w-[40%] xl:w-[38%]">
          <div className="pointer-events-none absolute inset-0" aria-hidden>
            <div className="absolute -top-20 -left-12 h-72 w-72 rounded-full bg-white/15 blur-3xl" />
            <div className="absolute bottom-0 right-[-20%] h-80 w-80 rounded-full bg-[oklch(0.55_0.18_305)]/35 blur-3xl" />
            <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(255,255,255,0.14),transparent_55%)]" />
          </div>

          <div className="relative z-10">
            <LumenXAdminLogo size="lg" className="mb-8 h-12 drop-shadow-md" />
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/75">
              Institute admin
            </p>
            <h2 className="mt-2 max-w-sm text-2xl font-bold leading-snug tracking-tight text-white xl:text-[1.75rem]">
              {asideTitle ?? title}
            </h2>
            {(asideBody || subtitle) && (
              <p className="mt-3 max-w-sm text-sm leading-relaxed text-white/80">
                {asideBody ?? subtitle}
              </p>
            )}
          </div>

          {steps && steps.length > 0 ? (
            <div className="relative z-10 my-8">
              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-white/65">
                Your path
              </p>
              <StepRail steps={steps} currentIdx={currentIdx} contrast />
            </div>
          ) : (
            <div className="relative z-10 flex-1" />
          )}

          <p className="relative z-10 text-[10px] text-white/55">
            &copy; {new Date().getFullYear()} LumenX Technologies
          </p>
        </aside>
      ) : null}

      <div className="relative flex min-h-0 min-w-0 flex-1 flex-col">
        <div
          className="pointer-events-none absolute inset-0 overflow-hidden"
          aria-hidden
        >
          <div className="absolute top-[-10%] left-1/2 h-[320px] w-[640px] -translate-x-1/2 rounded-full bg-primary/[0.07] blur-3xl lg:left-auto lg:right-[-10%] lg:translate-x-0" />
          <div className="absolute bottom-[-12%] left-[-8%] h-[240px] w-[240px] rounded-full bg-chart-5/[0.06] blur-3xl" />
        </div>

        <header
          className={[
            "relative z-20 flex shrink-0 items-center gap-3 border-b border-border/60 bg-background/85 px-4 py-2.5 backdrop-blur-md",
            showAside ? "lg:hidden" : "",
          ].join(" ")}
        >
          <div className="flex min-w-0 flex-1 items-center gap-3">
            {backControl}
            {!backControl ? <LumenXAdminLogo size="sm" className="h-8" /> : null}
          </div>
          {steps && steps.length > 0 ? (
            <p className="shrink-0 text-[11px] font-medium text-muted-foreground">
              Step {currentIdx + 1} of {steps.length}
            </p>
          ) : null}
        </header>

        <main className="relative z-10 flex flex-1 flex-col items-center overflow-y-auto px-4 py-6 sm:px-8 sm:py-10">
          <div
            className={[
              "relative my-auto w-full pb-[max(1rem,var(--lx-safe-bottom))]",
              showAside ? "max-w-[28rem] xl:max-w-[32rem]" : "max-w-[24rem] sm:max-w-[26rem]",
            ].join(" ")}
          >
            {showAside && backControl ? (
              <div className="mb-5 hidden lg:block">{backControl}</div>
            ) : null}

            {steps && steps.length > 0 ? (
              <div className="mb-5 lg:hidden">
                <div
                  className="mb-3 h-1.5 overflow-hidden rounded-full bg-muted"
                  role="progressbar"
                  aria-valuemin={1}
                  aria-valuemax={steps.length}
                  aria-valuenow={currentIdx + 1}
                  aria-label={`Step ${currentIdx + 1} of ${steps.length}`}
                >
                  <div
                    className="h-full rounded-full bg-primary transition-[width] duration-300 ease-out"
                    style={{ width: `${progressPct}%` }}
                  />
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {steps.map((s, i) => {
                    const done = i < currentIdx;
                    const active = i === currentIdx;
                    return (
                      <span
                        key={s.id}
                        className={[
                          "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors",
                          active
                            ? "bg-primary text-primary-foreground"
                            : done
                              ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                              : "bg-muted text-muted-foreground",
                        ].join(" ")}
                      >
                        {done ? <Check className="size-3" strokeWidth={2.5} /> : null}
                        {s.label}
                      </span>
                    );
                  })}
                </div>
              </div>
            ) : null}

            <div
              className={`rounded-3xl border border-border/80 bg-card/90 p-5 shadow-elevated backdrop-blur-sm sm:p-7 ${AUTH_CARD_ENTER}`}
            >
              <div className="mb-5 text-center lg:text-left">
                <h1 className="text-xl font-bold tracking-tight sm:text-[1.45rem]">
                  {title}
                </h1>
                {subtitle ? (
                  <p className="mt-1.5 text-[13px] leading-snug text-muted-foreground">
                    {subtitle}
                  </p>
                ) : null}
              </div>

              <div className={AUTH_PAGE_ENTER}>{children}</div>
            </div>

            {footer ? (
              <div className="mt-5 text-center text-xs text-muted-foreground lg:text-left">
                {footer}
              </div>
            ) : null}
          </div>
        </main>
      </div>
    </div>
  );
}
