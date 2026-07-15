import { Link } from "@tanstack/react-router";
import { Button } from "@lumenx/ui";
import { ArrowRight, Calendar, Sparkles, Trophy } from "lucide-react";
import { SectionCard } from "@/components/app/SectionCard";
import { ProgramCard } from "@/admissions-portal/shared/ui/AdmissionsShellWidgets";
import { InstitutePreviewStrip } from "@/admissions-portal/features/institutes/InstitutesBrowsePage";
import {
  ACHIEVEMENTS,
  ADMISSION_PROCESS_STEPS,
  CAMPUS_HIGHLIGHTS,
  IMPORTANT_DATES,
  SUCCESS_STORIES,
  WHY_CHOOSE_US,
} from "@/lib/admissions/mock-data";
import { getFeaturedPrograms, getProgramsGroupedByInstitute } from "@/lib/admissions/programs-data";
import { ADMISSION_INSTITUTES } from "@/lib/admissions/institutes-data";

export function AdmissionsHomePage() {
  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/15 via-primary/5 to-background border border-primary/20 p-6 sm:p-8">
        <div className="relative z-10 max-w-xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">
            Admissions 2026–27
          </p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            Discover & apply to {ADMISSION_INSTITUTES.length}+ institutes
          </h1>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">
            Browse schools and colleges, compare programs, apply online, and track your admission
            journey — mobile-first.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Button size="lg" asChild>
              <Link to="/admissions/institutes">
                Explore institutes <ArrowRight className="size-4 ml-1" />
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/admissions/signup" search={{ type: "parent" }}>
                Parent sign up
              </Link>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link to="/admissions/signup" search={{ type: "institute" }}>
                Institute sign up
              </Link>
            </Button>
          </div>
        </div>
        <Sparkles className="absolute right-4 top-4 size-24 text-primary/10" />
      </section>

      <InstitutePreviewStrip />

      <SectionCard title="Why choose us">
        <ul className="grid gap-2 sm:grid-cols-2">
          {WHY_CHOOSE_US.map((item) => (
            <li key={item} className="flex items-start gap-2 text-sm">
              <Trophy className="size-4 shrink-0 text-primary mt-0.5" />
              {item}
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard title="Programs offered" link="/admissions/programs" linkLabel="View all">
        <div className="grid gap-4 sm:grid-cols-2">
          {getFeaturedPrograms(4).map((p) => (
            <ProgramCard key={p.id} program={p} />
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Achievements">
        <ul className="space-y-2">
          {ACHIEVEMENTS.map((a) => (
            <li key={a} className="text-sm text-muted-foreground">
              • {a}
            </li>
          ))}
        </ul>
      </SectionCard>

      <SectionCard title="Campus facilities">
        <div className="grid gap-3 sm:grid-cols-2">
          {CAMPUS_HIGHLIGHTS.map((c) => (
            <div key={c.title} className="rounded-xl border border-border p-3">
              <p className="font-medium text-sm">{c.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{c.desc}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Admission process">
        <ol className="space-y-4">
          {ADMISSION_PROCESS_STEPS.map((s) => (
            <li key={s.step} className="flex gap-3">
              <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-primary/10 text-sm font-bold text-primary">
                {s.step}
              </span>
              <div>
                <p className="font-medium text-sm">{s.title}</p>
                <p className="text-xs text-muted-foreground">{s.desc}</p>
              </div>
            </li>
          ))}
        </ol>
      </SectionCard>

      <SectionCard title="Student success stories">
        <div className="space-y-4">
          {SUCCESS_STORIES.map((s) => (
            <blockquote key={s.name} className="rounded-xl bg-muted/40 p-4 text-sm">
              <p className="italic text-muted-foreground">&ldquo;{s.quote}&rdquo;</p>
              <footer className="mt-2 font-medium">
                {s.name} · {s.program}
              </footer>
            </blockquote>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Important dates">
        <ul className="space-y-2">
          {IMPORTANT_DATES.map((d) => (
            <li
              key={d.label}
              className="flex items-center justify-between text-sm border-b border-border pb-2 last:border-0"
            >
              <span className="flex items-center gap-2">
                <Calendar className="size-4 text-primary" />
                {d.label}
              </span>
              <span className="font-medium">{d.date}</span>
            </li>
          ))}
        </ul>
      </SectionCard>

      <div className="rounded-2xl bg-primary p-6 text-center text-primary-foreground">
        <h2 className="font-display text-xl font-bold">Ready to apply?</h2>
        <p className="mt-2 text-sm opacity-90">Start your application in under 10 minutes.</p>
        <Button
          className="mt-4 bg-background text-foreground hover:bg-background/90"
          size="lg"
          asChild
        >
          <Link to="/admissions/signup" search={{ type: "parent" }}>
            Get started
          </Link>
        </Button>
      </div>

      <div className="text-center pb-4">
        <Link to="/admissions/contact" className="text-sm text-primary hover:underline">
          Contact admissions office
        </Link>
      </div>
    </div>
  );
}

export function ProgramsPage() {
  const grouped = getProgramsGroupedByInstitute();

  return (
    <div className="animate-in fade-in duration-300 space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Programs & courses</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Browse by institute — each program is unique to its institution.
        </p>
      </div>
      {grouped.map((group) => (
        <section key={group.instituteId}>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <h2 className="font-display text-lg font-bold">{group.instituteName}</h2>
            <Link
              to="/admissions/institutes/$instituteId"
              params={{ instituteId: group.instituteId }}
              className="text-xs text-primary hover:underline"
            >
              View institute
            </Link>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            {group.programs.map((p) => (
              <ProgramCard
                key={p.id}
                program={p}
                instituteId={group.instituteId}
                showInstitute={false}
              />
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
