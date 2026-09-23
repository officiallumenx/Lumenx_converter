import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BarChart3,
  GraduationCap,
  ShieldCheck,
  Sparkles,
  Users,
} from "lucide-react";
import { AuthButton } from "@/auth/components/AuthButton";
import { LumenXAdminLogo } from "@/components/LumenXAdminLogo";
import { AUTH_CARD_ENTER, AUTH_PAGE_ENTER } from "@/auth/auth-ui";

export const Route = createFileRoute("/welcome")({
  head: () => ({ meta: [{ title: "Welcome — LumenX Admin" }] }),
  component: WelcomePage,
});

const BENEFITS = [
  { icon: Users, label: "People", hint: "Students & staff" },
  { icon: GraduationCap, label: "Academics", hint: "Classes & exams" },
  { icon: BarChart3, label: "Ops", hint: "Fees & reports" },
  { icon: ShieldCheck, label: "Secure", hint: "Roles & OTP" },
] as const;

function WelcomeMark() {
  return (
    <div className="relative mx-auto mb-7 flex size-[9.5rem] items-center justify-center">
      {/* Soft bloom */}
      <div
        className="absolute inset-[-18%] rounded-full bg-primary/[0.12] blur-2xl"
        aria-hidden
      />
      {/* Orbit rings */}
      <div
        className="absolute inset-0 rounded-full border border-primary/15"
        aria-hidden
      />
      <div
        className="absolute inset-[12%] animate-[spin_18s_linear_infinite] rounded-full border border-dashed border-primary/25"
        aria-hidden
      />
      <div
        className="absolute inset-[24%] rounded-full border border-primary/10 bg-gradient-to-b from-primary/[0.08] to-transparent"
        aria-hidden
      />
      {/* Core — LumenX Admin logo on white */}
      <div className="relative z-10 flex size-[5.5rem] items-center justify-center overflow-hidden rounded-[1.4rem] border border-primary/20 bg-white p-1.5 shadow-[0_12px_40px_-12px_hsl(var(--primary)/0.45)]">
        <LumenXAdminLogo size="xl" className="max-h-full w-auto object-contain" />
      </div>
      {/* Orbit dots */}
      <span
        className="absolute left-1/2 top-0 size-2 -translate-x-1/2 rounded-full bg-primary shadow-[0_0_10px_hsl(var(--primary)/0.7)]"
        aria-hidden
      />
      <span
        className="absolute bottom-[10%] right-[8%] size-1.5 rounded-full bg-chart-5/80"
        aria-hidden
      />
    </div>
  );
}

function WelcomePage() {
  return (
    <div className="min-h-screen-dvh flex flex-col bg-gradient-to-b from-background via-background to-muted/35 text-foreground">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute top-[-10%] left-1/2 h-[420px] w-[720px] -translate-x-1/2 rounded-full bg-primary/[0.07] blur-3xl" />
        <div className="absolute bottom-[-15%] right-[-10%] h-[280px] w-[280px] rounded-full bg-chart-5/[0.06] blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.035]"
          style={{
            backgroundImage:
              "radial-gradient(hsl(var(--foreground)) 0.6px, transparent 0.6px)",
            backgroundSize: "18px 18px",
            maskImage:
              "radial-gradient(ellipse 70% 55% at 50% 35%, black 20%, transparent 75%)",
          }}
        />
      </div>

      <header className="lx-auth-top-bar relative z-10 flex shrink-0 items-center justify-center border-b border-border/40">
        <LumenXAdminLogo size="sm" className="max-h-8" />
      </header>

      <main className="relative z-10 flex flex-1 flex-col items-center overflow-y-auto px-4 py-8 sm:py-10">
        <div
          className={`my-auto w-full max-w-[24rem] pb-[max(1rem,var(--lx-safe-bottom))] ${AUTH_PAGE_ENTER}`}
        >
          <WelcomeMark />

          <div className="mb-6 text-center">
            <h1 className="text-[1.55rem] font-bold tracking-tight sm:text-[1.7rem]">
              LumenX Admin
            </h1>
            <p className="mt-2 text-[13px] leading-relaxed text-muted-foreground">
              The operating system for your institute —
              <br className="hidden sm:block" />
              academics, people, and operations in one place.
            </p>
          </div>

          {/* Trial offer */}
          <div
            className={`relative mb-5 overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/[0.14] via-primary/[0.05] to-chart-5/[0.08] p-4 ${AUTH_CARD_ENTER}`}
          >
            <div
              className="pointer-events-none absolute -right-6 -top-8 size-24 rounded-full bg-primary/20 blur-2xl"
              aria-hidden
            />
            <div className="relative flex items-start gap-3">
              <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                <Sparkles className="size-4" aria-hidden />
              </span>
              <div className="min-w-0 text-left">
                <p className="text-sm font-semibold tracking-tight text-foreground">
                  60-day free trial
                </p>
                <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                  Register now · full access after approval · no payment during trial
                </p>
              </div>
            </div>
          </div>

          {/* Benefit icons */}
          <div className="mb-6 grid grid-cols-4 gap-2">
            {BENEFITS.map(({ icon: Icon, label, hint }) => (
              <div
                key={label}
                className="flex flex-col items-center gap-1.5 rounded-xl border border-border/70 bg-card/70 px-1 py-2.5 text-center shadow-sm backdrop-blur-sm"
              >
                <span className="flex size-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <Icon className="size-3.5" aria-hidden />
                </span>
                <span className="text-[10px] font-semibold leading-none">{label}</span>
                <span className="text-[9px] leading-tight text-muted-foreground">{hint}</span>
              </div>
            ))}
          </div>

          <div className="space-y-3">
            <Link to="/signup" className="block">
              <AuthButton variant="primary" fullWidth>
                Start free trial
                <ArrowRight className="size-4" />
              </AuthButton>
            </Link>
            <Link to="/login" className="block">
              <AuthButton variant="outline" fullWidth>
                Sign in
              </AuthButton>
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
