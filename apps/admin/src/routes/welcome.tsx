import { createFileRoute, Link } from "@tanstack/react-router";
import {
  Sparkles, ArrowRight, BarChart3, Users, ShieldCheck,
  GraduationCap, CalendarRange, FileBarChart, Award,
} from "lucide-react";
import { AuthButton } from "@/auth/components/AuthButton";
import { IconChip } from "@/components/IconChip";
import { RegistrationOnboardingCallout } from "@/components/registration/RegistrationOnboardingCallout";

export const Route = createFileRoute("/welcome")({
  head: () => ({ meta: [{ title: "Welcome — LumenX Admin" }] }),
  component: WelcomePage,
});

const FEATURES = [
  { icon: Users,        label: "People Management",   desc: "Students, teachers, parents"     },
  { icon: CalendarRange,label: "Smart Timetables",     desc: "Visual drag-and-drop builder"    },
  { icon: BarChart3,    label: "Live Analytics",       desc: "Live dashboard, charts, insights" },
  { icon: GraduationCap,label: "Exams & Marks",        desc: "Pipeline from paper to portal"   },
  { icon: FileBarChart, label: "Reports",     desc: "Download Excel, PDF, and CSV"     },
  { icon: ShieldCheck,  label: "Roles & Access",  desc: "Granular institute access"      },
];

function WelcomePage() {
  return (
    <div className="min-h-screen-dvh bg-background text-foreground overflow-x-hidden">
      {/* Ambient background */}
      <div className="pointer-events-none fixed inset-0 overflow-hidden">
        <div className="absolute -top-32 -left-32 w-[50vw] h-[50vw] bg-primary/[0.06] rounded-full blur-3xl" />
        <div className="absolute -bottom-32 -right-32 w-[40vw] h-[40vw] bg-chart-5/[0.05] rounded-full blur-3xl" />
        <div
          className="absolute inset-0 opacity-[0.025]"
          style={{
            backgroundImage: "radial-gradient(hsl(var(--border)) 1px, transparent 1px)",
            backgroundSize: "24px 24px",
          }}
        />
      </div>

      {/* ── Top nav ──────────────────────────────────────────── */}
      <header className="lx-auth-top-bar relative z-10 flex items-center justify-between border-b border-border/50 backdrop-blur-sm">
        <div className="flex items-center gap-2.5">
          <div className="size-8 rounded-lg bg-primary flex items-center justify-center shadow-glow">
            <Sparkles className="size-4 text-primary-foreground" />
          </div>
          <span className="font-bold tracking-tight text-sm">LUMENX ADMIN</span>
        </div>
        <div className="flex items-center gap-2">
          <Link to="/login">
            <AuthButton variant="outline" fullWidth={false} size="sm">
              Login
            </AuthButton>
          </Link>
          <Link to="/signup">
            <AuthButton variant="primary" fullWidth={false} size="sm">
              Get started <ArrowRight className="size-3.5" />
            </AuthButton>
          </Link>
        </div>
      </header>

      {/* ── Hero ─────────────────────────────────────────────── */}
      <section className="relative z-10 flex flex-col items-center text-center px-6 pt-20 pb-16 sm:pt-24 sm:pb-20">
        <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-primary/30 bg-primary/[0.06] text-xs text-primary mb-6">
          Institute operating system
        </div>

        <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold tracking-tight leading-[1.1] max-w-3xl">
          The operating system<br />
          <span className="text-primary">for modern institutes</span>
        </h1>
        <p className="mt-5 text-base sm:text-lg text-muted-foreground max-w-xl leading-relaxed">
          Manage academics, people, operations, and analytics — all from one
          powerful, enterprise-grade admin platform.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3 mt-8">
          <Link to="/signup">
            <AuthButton variant="primary" fullWidth={false}>
              Start free trial <ArrowRight className="size-4" />
            </AuthButton>
          </Link>
          <Link to="/login">
            <AuthButton variant="outline" fullWidth={false}>
              Login to your institute
            </AuthButton>
          </Link>
        </div>
      </section>

      {/* ── Feature cards ─────────────────────────────────────── */}
      <section className="relative z-10 px-6 sm:px-10 pb-16">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-center text-xl font-bold mb-8">
            Everything your institute needs
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {FEATURES.map(({ icon: Icon, label, desc }) => (
              <div
                key={label}
                className="p-5 rounded-2xl border border-border bg-surface/60 hover:bg-surface-hover hover:-translate-y-0.5 transition-all group"
              >
                <IconChip icon={Icon} size="md" className="mb-3" />
                <div className="text-sm font-semibold group-hover:text-primary transition-colors">{label}</div>
                <div className="text-[11px] text-muted-foreground mt-1">{desc}</div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── CTA banner ───────────────────────────────────────── */}
      <section className="relative z-10 px-6 sm:px-10 pb-16">
        <div className="max-w-3xl mx-auto rounded-2xl border border-primary/25 bg-gradient-to-br from-primary/[0.06] to-chart-5/[0.04] p-10 text-center">
          <IconChip icon={Award} size="lg" className="mx-auto mb-4" />
          <h3 className="text-xl font-bold">Ready to transform your institute?</h3>
          <p className="text-sm text-muted-foreground mt-2 mb-4 max-w-sm mx-auto">
            Create your institute account and start managing academics, people, and operations.
          </p>
          <RegistrationOnboardingCallout variant="welcome" />
          <div className="flex flex-col sm:flex-row gap-3 justify-center mt-6">
            <Link to="/signup">
              <AuthButton variant="primary" fullWidth={false}>
                Create your account <ArrowRight className="size-4" />
              </AuthButton>
            </Link>
            <Link to="/login">
              <AuthButton variant="outline" fullWidth={false}>
                Already have an account? Login
              </AuthButton>
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 border-t border-border px-6 sm:px-10 py-5 flex flex-col sm:flex-row items-center justify-between gap-3 text-[11px] text-muted-foreground">
        <span>&copy; {new Date().getFullYear()} LumenX Technologies Pvt. Ltd.</span>
        <div className="flex gap-4">
          <span className="hover:text-foreground cursor-pointer transition-colors">Privacy</span>
          <span className="hover:text-foreground cursor-pointer transition-colors">Terms</span>
          <span className="hover:text-foreground cursor-pointer transition-colors">Support</span>
        </div>
      </footer>
    </div>
  );
}
