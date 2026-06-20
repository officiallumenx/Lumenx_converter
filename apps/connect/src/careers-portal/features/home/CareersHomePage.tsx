import { useMemo, useState } from "react";
import { Link, useNavigate } from "@tanstack/react-router";
import { Badge, Button, Input } from "@lumenx/ui";
import {
  ArrowRight,
  Briefcase,
  LayoutDashboard,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Users,
} from "lucide-react";
import { SectionCard } from "@/components/app/SectionCard";
import { JobCard } from "@/careers-portal/shared/ui/CareersShellWidgets";
import { useCareersAuth } from "@/careers-portal/core/CareersAuthProvider";
import { isRecruiter } from "@/lib/careers/auth-utils";
import {
  BENEFITS,
  CAREERS_HERO,
  CULTURE_VALUES,
  HIRING_PROCESS,
  TESTIMONIALS,
  WHY_WORK,
} from "@/lib/careers/mock-data";
import { JOB_CATEGORY_LABEL } from "@/lib/careers/jobs-data";
import { getJobs } from "@/lib/careers/repositories";
import { getRecruiterJobsForOrg } from "@/lib/careers/recruiter-jobs-store";
import type { JobCategory, JobPosting } from "@/lib/careers/types";

function pickFeaturedJobs(jobs: JobPosting[], limit = 4): JobPosting[] {
  const score = (j: JobPosting) => (j.featured ? 2 : 0) + (j.trending ? 1 : 0);
  return [...jobs]
    .sort((a, b) => score(b) - score(a) || b.postedAt.localeCompare(a.postedAt))
    .slice(0, limit);
}

const POPULAR_CATEGORIES: JobCategory[] = [
  "it_software",
  "human_resources",
  "sales_marketing",
  "finance",
  "healthcare",
  "academic_faculty",
];

export function CareersHomePage() {
  const { user } = useCareersAuth();
  const nav = useNavigate();
  const [keyword, setKeyword] = useState("");
  const recruiter = isRecruiter(user);

  const allJobs = useMemo(() => getJobs(), []);
  const featured = useMemo(() => pickFeaturedJobs(allJobs), [allJobs]);
  const myJobs = useMemo(
    () => (recruiter && user?.organizationId ? getRecruiterJobsForOrg(user.organizationId) : []),
    [recruiter, user?.organizationId],
  );

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    nav({ to: "/careers/jobs" });
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary/15 via-primary/5 to-background border border-primary/20 p-6 sm:p-8">
        <div className="relative z-10 max-w-2xl">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">LumenX Careers</p>
          <h1 className="mt-2 font-display text-3xl font-bold tracking-tight sm:text-4xl">
            {recruiter ? "Hire talent on LumenX Careers" : CAREERS_HERO.title}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground sm:text-base">
            {recruiter
              ? `Post roles for ${user?.organizationName ?? "your company"}, manage applicants, and reach candidates across India.`
              : CAREERS_HERO.subtitle}
          </p>

          {!recruiter && (
            <form onSubmit={handleSearch} className="mt-6 flex flex-col sm:flex-row gap-2 max-w-lg">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Job title, skill, or company…"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                />
              </div>
              <Button type="submit" size="lg" className="shrink-0">
                Search jobs
              </Button>
            </form>
          )}

          <div className="mt-4 flex flex-wrap gap-3">
            {recruiter ? (
              <>
                <Button size="lg" asChild>
                  <Link to="/careers/recruiter/jobs/new">
                    <Plus className="size-4 mr-1.5" /> Post a job
                  </Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/careers/recruiter/jobs">Manage listings</Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/careers/jobs">Browse market</Link>
                </Button>
                <Button size="lg" variant="outline" asChild>
                  <Link to="/careers/recruiter">
                    <LayoutDashboard className="size-4 mr-1.5" /> Workspace
                  </Link>
                </Button>
              </>
            ) : (
              <>
                <Button size="lg" asChild>
                  <Link to="/careers/jobs">
                    {CAREERS_HERO.cta} <ArrowRight className="size-4 ml-1" />
                  </Link>
                </Button>
                {user ? (
                  <Button size="lg" variant="outline" asChild>
                    <Link to="/careers/dashboard">My dashboard</Link>
                  </Button>
                ) : (
                  <>
                    <Button size="lg" variant="outline" asChild>
                      <Link to="/careers/signup">Create account</Link>
                    </Button>
                    <Button size="lg" variant="ghost" asChild>
                      <Link to="/careers/signup" search={{ type: "recruiter" }}>For recruiters</Link>
                    </Button>
                  </>
                )}
              </>
            )}
          </div>
        </div>
        <Sparkles className="absolute right-4 top-4 size-24 text-primary/10" />
      </section>

      {recruiter && myJobs.length > 0 && (
        <SectionCard title="Your recent listings" link="/careers/recruiter/jobs" linkLabel="All jobs">
          <div className="grid gap-4 sm:grid-cols-2">
            {myJobs.slice(0, 2).map((job) => (
              <JobCard
                key={job.id}
                job={job}
                compact
                hideActions
                footer={
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <Badge variant="secondary" className="capitalize">
                      {job.recruiterJobStatus ?? "draft"}
                    </Badge>
                    <Button size="sm" asChild>
                      <Link to="/careers/recruiter/jobs/$jobId/edit" params={{ jobId: job.id }}>
                        <Pencil className="size-3.5 mr-1.5" /> Edit
                      </Link>
                    </Button>
                  </div>
                }
              />
            ))}
          </div>
        </SectionCard>
      )}

      {!recruiter && (
        <SectionCard title="Browse by role type">
          <div className="flex flex-wrap gap-2">
            {POPULAR_CATEGORIES.map((cat) => (
              <Button key={cat} variant="outline" size="sm" asChild>
                <Link to="/careers/jobs">{JOB_CATEGORY_LABEL[cat]}</Link>
              </Button>
            ))}
          </div>
        </SectionCard>
      )}

      <SectionCard title="Why LumenX Careers">
        <div className="grid gap-3 sm:grid-cols-2">
          {WHY_WORK.map((w) => (
            <div key={w.title} className="rounded-xl border border-border p-3">
              <p className="font-medium text-sm">{w.title}</p>
              <p className="text-xs text-muted-foreground mt-1">{w.desc}</p>
            </div>
          ))}
        </div>
      </SectionCard>

      <SectionCard title="Platform highlights">
        <ul className="grid gap-2 sm:grid-cols-2">
          {CULTURE_VALUES.map((v) => (
            <li key={v} className="flex items-center gap-2 text-sm">
              <Sparkles className="size-4 shrink-0 text-primary" /> {v}
            </li>
          ))}
        </ul>
      </SectionCard>

      {!recruiter && (
        <SectionCard title="Benefits candidates look for">
          <ul className="space-y-2">
            {BENEFITS.map((b) => (
              <li key={b} className="text-sm text-muted-foreground">• {b}</li>
            ))}
          </ul>
        </SectionCard>
      )}

      <SectionCard title="Featured openings" link="/careers/jobs" linkLabel="View all">
        {featured.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4 text-center">No open roles right now. Check back soon.</p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {featured.map((j) => (
              <JobCard key={j.id} job={j} compact />
            ))}
          </div>
        )}
      </SectionCard>

      {!recruiter && (
        <>
          <SectionCard title="Success stories">
            <div className="space-y-4">
              {TESTIMONIALS.map((t) => (
                <blockquote key={t.name} className="rounded-xl border border-border p-4">
                  <p className="text-sm italic text-muted-foreground">&ldquo;{t.quote}&rdquo;</p>
                  <footer className="mt-2 text-xs font-medium">{t.name} — {t.role}</footer>
                </blockquote>
              ))}
            </div>
          </SectionCard>

          <SectionCard title="How hiring works">
            <ol className="space-y-4">
              {HIRING_PROCESS.map((s) => (
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
        </>
      )}

      <section className="rounded-2xl border border-primary/20 bg-primary/5 p-6 text-center">
        <Briefcase className="mx-auto size-8 text-primary" />
        <h2 className="mt-3 font-display text-xl font-bold">
          {recruiter ? "Need to update a listing?" : "Ready to apply?"}
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          {recruiter
            ? `${myJobs.length} listing${myJobs.length !== 1 ? "s" : ""} · ${allJobs.length} roles live on the board`
            : `Browse ${allJobs.length}+ open roles across India`}
        </p>
        <Button className="mt-4" asChild>
          {recruiter ? (
            <Link to="/careers/recruiter/jobs/new"><Plus className="size-4 mr-2" /> Post a new job</Link>
          ) : (
            <Link to="/careers/jobs"><Users className="size-4 mr-2" /> Open positions</Link>
          )}
        </Button>
      </section>
    </div>
  );
}
