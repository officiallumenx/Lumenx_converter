/** ─────────────────────────────────────────────────────────────
 *  LumenX Admin — AuthLayout
 *  Responsive two-column wrapper for all auth screens.
 *  Left: brand panel (lg+) | Right: form content (all sizes)
 * ───────────────────────────────────────────────────────────── */

import { Link } from "@tanstack/react-router";
import { Sparkles, ArrowLeft, ShieldCheck, BarChart3, Users, GraduationCap } from "lucide-react";
import { useTheme } from "@/components/theme-provider";
import { IconChip } from "@/components/IconChip";
import { AUTH_PAGE_ENTER } from "../auth-ui";
import type { ReactNode } from "react";

interface AuthLayoutProps {
  /** Main heading displayed above the form */
  title: string;
  /** Subheading / context sentence */
  subtitle?: string;
  /** Show a back-navigation link */
  showBack?: boolean;
  /** Route for the back link (defaults to /welcome) */
  backTo?: string;
  backLabel?: string;
  children: ReactNode;
}

const BRAND_FEATURES = [
  {
    icon: Users,
    label: "People & Academics",
    hint: "Students · Teachers · Parents · Attendance",
  },
  {
    icon: BarChart3,
    label: "Analytics & Intelligence",
    hint: "Live KPIs · Reports · Insights · Export",
  },
  {
    icon: ShieldCheck,
    label: "Enterprise Security",
    hint: "Roles · Permissions · 2FA · Audit log",
  },
  {
    icon: GraduationCap,
    label: "Documents & Records",
    hint: "Certificates · Reports · TC · Signatures",
  },
] as const;

export function AuthLayout({
  title,
  subtitle,
  showBack = false,
  backTo = "/welcome",
  backLabel = "Back",
  children,
}: AuthLayoutProps) {
  const { theme } = useTheme();

  return (
    <div className="min-h-screen flex bg-background text-foreground">
      {/* ── Left: brand panel (visible lg+) ───────────────── */}
      <aside className="hidden lg:flex lg:w-[44%] xl:w-[40%] flex-col justify-between p-12 bg-gradient-to-br from-primary/[0.07] via-background to-chart-5/[0.05] border-r border-border relative overflow-hidden shrink-0">
        {/* Grid texture */}
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "linear-gradient(hsl(var(--border)) 1px, transparent 1px), linear-gradient(90deg, hsl(var(--border)) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />
        {/* Glow blobs */}
        <div className="pointer-events-none absolute -top-24 -left-24 w-96 h-96 bg-primary/10 rounded-full blur-3xl" />
        <div className="pointer-events-none absolute -bottom-24 -right-24 w-80 h-80 bg-chart-5/10 rounded-full blur-3xl" />

        {/* Brand header */}
        <div className="relative z-10">
          <Link to="/" className="flex items-center gap-3 mb-10 group w-fit">
            <div className="size-11 rounded-xl lx-icon-chip lx-icon-chip--md shadow-glow group-hover:shadow-glow-lg transition-shadow">
              <Sparkles strokeWidth={2} />
            </div>
            <div>
              <div className="font-bold text-[15px] tracking-tight">LUMENX ADMIN</div>
              <div className="text-[10px] uppercase tracking-[0.2em] text-muted-foreground">
                Institute Intelligence
              </div>
            </div>
          </Link>

          <h1 className="text-4xl xl:text-[2.6rem] font-bold tracking-tight leading-tight">
            One platform.<br />Every classroom.
          </h1>
          <p className="mt-4 text-sm text-muted-foreground leading-relaxed max-w-[22rem]">
            Built for principals who demand clarity — academics, people,
            operations, and insights in a single pane.
          </p>
        </div>

        {/* Feature list */}
        <div className="relative z-10 space-y-2.5">
          {BRAND_FEATURES.map(({ icon: Icon, label, hint }) => (
            <div
              key={label}
              className="flex items-start gap-3 p-3.5 rounded-xl border border-border/60 bg-background/60 backdrop-blur-sm hover:bg-background/80 transition-colors"
            >
              <IconChip icon={Icon} size="sm" variant="soft" />
              <div>
                <div className="text-xs font-semibold">{label}</div>
                <div className="text-[10px] text-muted-foreground mt-0.5">{hint}</div>
              </div>
            </div>
          ))}
        </div>

        <div className="relative z-10 text-[10px] text-muted-foreground">
          &copy; {new Date().getFullYear()} LumenX Technologies · All rights reserved
        </div>
      </aside>

      {/* ── Right: form area ───────────────────────────────── */}
      <main className="flex-1 flex flex-col min-h-0">
        {/* Mobile logo bar */}
        <div className="flex items-center justify-between px-6 py-5 lg:hidden border-b border-border">
          <Link to="/" className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg lx-icon-chip lx-icon-chip--sm shadow-glow">
              <Sparkles strokeWidth={2} />
            </div>
            <span className="font-bold text-sm tracking-tight">LUMENX ADMIN</span>
          </Link>
          {showBack && (
            <Link
              to={backTo as never}
              className="flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground transition-colors"
            >
              <ArrowLeft className="size-3.5" /> {backLabel}
            </Link>
          )}
        </div>

        {/* Scrollable form area */}
        <div className="flex-1 overflow-y-auto flex flex-col items-center justify-center px-6 sm:px-10 xl:px-14 py-10">
          <div className="w-full max-w-[26rem]">
            {/* Desktop back link */}
            {showBack && (
              <Link
                to={backTo as never}
                className="hidden lg:flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground mb-6 w-fit transition-colors"
              >
                <ArrowLeft className="size-3.5" /> {backLabel}
              </Link>
            )}

            {/* Page heading */}
            <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
            {subtitle && (
              <p className="text-sm text-muted-foreground mt-1.5">{subtitle}</p>
            )}

            {/* Form content */}
            <div className={`mt-6 ${AUTH_PAGE_ENTER}`}>{children}</div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 pb-4 text-center text-[10px] text-muted-foreground/50 shrink-0">
          {theme} mode · Demo environment · No real authentication performed
        </div>
      </main>
    </div>
  );
}
