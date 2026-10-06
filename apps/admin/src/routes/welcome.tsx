import { createFileRoute, Link } from "@tanstack/react-router";
import {
  ArrowRight,
  BookOpen,
  CalendarCheck,
  ClipboardList,
  IndianRupee,
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

const FEATURES = [
  {
    icon: CalendarCheck,
    title: "Attendance",
    body: "Mark student and staff attendance by class and date, then submit the register.",
  },
  {
    icon: BookOpen,
    title: "Diary & homework",
    body: "Teachers log the day’s work. You see overdue diaries and class notes in one place.",
  },
  {
    icon: Users,
    title: "People & classes",
    body: "Students, teachers, sections, and roles — who belongs where, and who can do what.",
  },
  {
    icon: IndianRupee,
    title: "Fees",
    body: "Record payments, receipts, and dues without leaving Admin.",
  },
  {
    icon: ClipboardList,
    title: "Leave & notices",
    body: "Approve leave, publish circulars, and keep the office and classrooms in sync.",
  },
  {
    icon: ShieldCheck,
    title: "Secure access",
    body: "Institute login with email or mobile, password, PIN, and OTP when needed.",
  },
] as const;

const STEPS = [
  {
    n: "1",
    title: "Register the institute",
    body: "Add school name, principal, and contact. No payment on this step.",
  },
  {
    n: "2",
    title: "Wait for approval",
    body: "LumenX reviews the request. You get access when the institute is active.",
  },
  {
    n: "3",
    title: "Login and run the school",
    body: "Use the same email or mobile. Start with attendance, staff, and fees.",
  },
] as const;

function WelcomePage() {
  return (
    <div className="flex min-h-screen-dvh flex-col bg-gradient-to-b from-background via-background to-muted/40 text-foreground">
      <div className="pointer-events-none fixed inset-0 overflow-hidden" aria-hidden>
        <div className="absolute top-[-12%] left-1/2 h-[480px] w-[820px] -translate-x-1/2 rounded-full bg-primary/[0.08] blur-3xl" />
        <div className="absolute bottom-[-18%] right-[-8%] h-[320px] w-[320px] rounded-full bg-chart-5/[0.07] blur-3xl" />
      </div>

      <header className="relative z-20 shrink-0 border-b border-border/70 bg-background/90 px-4 py-2.5 backdrop-blur-md lg:hidden">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <LumenXAdminLogo size="sm" className="h-8" />
          <nav className="flex shrink-0 items-center gap-2" aria-label="Account">
            <Link to="/login" className="block">
              <AuthButton variant="outline" size="sm" fullWidth={false}>
                Login
              </AuthButton>
            </Link>
            <Link to="/signup" className="block">
              <AuthButton variant="primary" size="sm" fullWidth={false}>
                Register
              </AuthButton>
            </Link>
          </nav>
        </div>
      </header>

      <main className="relative z-10 flex flex-1 flex-col overflow-y-auto px-4 py-8 sm:px-8 sm:py-12 lg:px-12 lg:py-14">
        <div className={`mx-auto my-auto w-full max-w-6xl ${AUTH_PAGE_ENTER}`}>
          <div className="grid items-start gap-10 lg:grid-cols-[1.05fr_0.95fr] lg:gap-14 xl:gap-16">
            <div className="text-center lg:text-left">
              <LumenXAdminLogo
                size="hero"
                className="mx-auto mb-5 h-20 drop-shadow-md sm:h-24 lg:mx-0 lg:mb-6 lg:h-28"
              />
              <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-primary">
                For principals & office staff
              </p>
              <h1 className="mt-2 text-[1.75rem] font-bold tracking-tight sm:text-3xl lg:text-[2.35rem] lg:leading-tight">
                Run your institute from one admin desk
              </h1>
              <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-muted-foreground sm:text-[15px] lg:mx-0">
                LumenX Admin is the office app: attendance, diary, people, fees, leave,
                and notices. Teachers and parents use Connect. You stay here.
              </p>

              <ol className="mx-auto mt-8 max-w-lg space-y-3 text-left lg:mx-0">
                {STEPS.map((step) => (
                  <li
                    key={step.n}
                    className="flex gap-3 rounded-2xl border border-border/70 bg-card/70 p-3.5 shadow-sm"
                  >
                    <span className="grid size-8 shrink-0 place-items-center rounded-full bg-primary text-[12px] font-bold text-primary-foreground">
                      {step.n}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold tracking-tight">{step.title}</p>
                      <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">
                        {step.body}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            </div>

            <div
              className={`rounded-3xl border border-border/80 bg-card/90 p-5 shadow-elevated backdrop-blur-sm sm:p-7 ${AUTH_CARD_ENTER}`}
            >
              <div className="relative mb-5 overflow-hidden rounded-2xl border border-primary/30 bg-gradient-to-br from-primary/[0.16] via-primary/[0.05] to-chart-5/[0.08] p-4">
                <div className="flex items-start gap-3">
                  <span className="mt-0.5 flex size-9 shrink-0 items-center justify-center rounded-xl bg-primary text-primary-foreground shadow-sm">
                    <Sparkles className="size-4" aria-hidden />
                  </span>
                  <div>
                    <p className="text-sm font-semibold tracking-tight">60-day free trial</p>
                    <p className="mt-0.5 text-[12px] leading-snug text-muted-foreground">
                      New institutes register here. After approval you get full Admin
                      access — no payment during the trial.
                    </p>
                  </div>
                </div>
              </div>

              <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                What you can do
              </p>
              <div className="mb-6 grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {FEATURES.map(({ icon: Icon, title, body }) => (
                  <div
                    key={title}
                    className="flex gap-2.5 rounded-xl border border-border/70 bg-background/60 p-3"
                  >
                    <span className="mt-0.5 grid size-8 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary">
                      <Icon className="size-4" aria-hidden />
                    </span>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold leading-tight">{title}</p>
                      <p className="mt-0.5 text-[11px] leading-snug text-muted-foreground">
                        {body}
                      </p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex flex-col gap-3 sm:flex-row">
                <Link to="/signup" className="block min-w-0 flex-1">
                  <AuthButton variant="primary" fullWidth>
                    Register institute
                    <ArrowRight className="size-4" />
                  </AuthButton>
                </Link>
                <Link to="/login" className="block min-w-0 flex-1">
                  <AuthButton variant="outline" fullWidth>
                    Login
                  </AuthButton>
                </Link>
              </div>
              <p className="mt-3 text-center text-[11px] text-muted-foreground sm:text-left">
                Already approved? Login with the institute email or mobile.
              </p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
