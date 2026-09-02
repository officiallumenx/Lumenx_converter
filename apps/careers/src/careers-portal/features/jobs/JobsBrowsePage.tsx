import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import {
  Button,
  Input,
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@lumenx/ui";
import { Search, Sparkles, TrendingUp, Clock, Plus } from "lucide-react";
import { CareersPageHeader } from "@/careers-portal/shared/ui/CareersPageHeader";
import { JobCard } from "@/careers-portal/shared/ui/CareersShellWidgets";
import { useCareersAuth } from "@/careers-portal/core/CareersAuthProvider";
import { isRecruiter } from "@/lib/careers/auth-utils";
import {
  EXPERIENCE_BAND_LABEL,
  JOB_CATEGORY_LABEL,
  LOCATIONS,
  readJobsScroll,
  saveJobsScroll,
  type ExperienceBand,
} from "@/lib/careers/jobs-data";
import { filterAllJobs, getJobs } from "@/lib/careers/repositories";
import {
  getFeaturedJobs,
  getTrendingJobs,
  getRecentJobs,
  getRecommendedJobs,
} from "@/lib/careers/recommendations";
import { getCandidateProfile } from "@/lib/careers/profile-repository";
import type { JobCategory } from "@/lib/careers/types";

export function JobsBrowsePage() {
  const { user } = useCareersAuth();
  const recruiter = isRecruiter(user);
  const [q, setQ] = useState("");
  const [state, setState] = useState("all");
  const [city, setCity] = useState("all");
  const [category, setCategory] = useState<JobCategory | "all">("all");
  const [employmentType, setEmploymentType] = useState("all");
  const [workMode, setWorkMode] = useState("all");
  const [experience, setExperience] = useState<ExperienceBand>("all");
  const [sort, setSort] = useState<"recent" | "deadline" | "title">("recent");
  const [showSections, setShowSections] = useState(true);
  const listRef = useRef<HTMLDivElement>(null);
  const restored = useRef(false);

  const profile = user && !recruiter ? getCandidateProfile(user.id) : null;
  const allJobs = useMemo(() => getJobs(), []);
  const featured = useMemo(() => getFeaturedJobs(), [allJobs.length]);
  const trending = useMemo(() => getTrendingJobs(), [allJobs.length]);
  const recent = useMemo(() => getRecentJobs(4), [allJobs.length]);
  const recommended = useMemo(() => (profile ? getRecommendedJobs(profile, 3) : []), [profile]);

  const jobs = useMemo(
    () => filterAllJobs({ q, state, city, category, employmentType, workMode, experience, sort }),
    [q, state, city, category, employmentType, workMode, experience, sort],
  );

  const hasFilters =
    q ||
    state !== "all" ||
    city !== "all" ||
    category !== "all" ||
    employmentType !== "all" ||
    workMode !== "all" ||
    experience !== "all";

  useEffect(() => {
    setShowSections(!hasFilters);
  }, [hasFilters]);

  useEffect(() => {
    if (restored.current || !listRef.current) return;
    const top = readJobsScroll();
    if (top > 0) listRef.current.scrollTop = top;
    restored.current = true;
  }, []);

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    const onScroll = () => saveJobsScroll(el.scrollTop);
    el.addEventListener("scroll", onScroll);
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const cardProps = recruiter ? { browseMarket: true as const } : {};

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] lg:h-[calc(100vh-4rem)] min-h-0">
      <CareersPageHeader
        title={recruiter ? "Browse market" : "Find jobs"}
        subtitle={
          recruiter
            ? `${allJobs.length} live listings · research competitors, salary bands, and role types`
            : `${allJobs.length} open roles · search by title, company, or skills`
        }
        backTo={recruiter ? "/recruiter" : undefined}
        action={
          recruiter ? (
            <Button size="sm" asChild>
              <Link to="/recruiter/jobs/new">
                <Plus className="size-4 mr-1.5" /> Post a job
              </Link>
            </Button>
          ) : undefined
        }
      />

      <div className="sticky top-0 z-10 -mx-4 px-4 py-3 bg-background/95 backdrop-blur border-b border-border space-y-3 shrink-0">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder={
              recruiter
                ? "Search roles, companies, skills…"
                : "Search job title, company, or skills…"
            }
            value={q}
            onChange={(e) => setQ(e.target.value)}
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
          <Select value={sort} onValueChange={(v) => setSort(v as typeof sort)}>
            <SelectTrigger className="w-[110px] shrink-0">
              <SelectValue placeholder="Sort" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Recent</SelectItem>
              <SelectItem value="deadline">Deadline</SelectItem>
              <SelectItem value="title">Title</SelectItem>
            </SelectContent>
          </Select>
          <Select value={experience} onValueChange={(v) => setExperience(v as ExperienceBand)}>
            <SelectTrigger className="w-[120px] shrink-0">
              <SelectValue placeholder="Experience" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All experience</SelectItem>
              {(
                Object.entries(EXPERIENCE_BAND_LABEL) as [Exclude<ExperienceBand, "all">, string][]
              ).map(([k, label]) => (
                <SelectItem key={k} value={k}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={workMode} onValueChange={setWorkMode}>
            <SelectTrigger className="w-[120px] shrink-0">
              <SelectValue placeholder="Work mode" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All modes</SelectItem>
              <SelectItem value="onsite">On-site</SelectItem>
              <SelectItem value="remote">Remote</SelectItem>
              <SelectItem value="hybrid">Hybrid</SelectItem>
            </SelectContent>
          </Select>
          <Select value={category} onValueChange={(v) => setCategory(v as JobCategory | "all")}>
            <SelectTrigger className="w-[140px] shrink-0">
              <SelectValue placeholder="Role type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All role types</SelectItem>
              {(Object.entries(JOB_CATEGORY_LABEL) as [JobCategory, string][]).map(([k, label]) => (
                <SelectItem key={k} value={k}>
                  {label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={state} onValueChange={setState}>
            <SelectTrigger className="w-[120px] shrink-0">
              <SelectValue placeholder="State" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All states</SelectItem>
              {LOCATIONS.states.map((s) => (
                <SelectItem key={s} value={s}>
                  {s}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={city} onValueChange={setCity}>
            <SelectTrigger className="w-[120px] shrink-0">
              <SelectValue placeholder="City" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All cities</SelectItem>
              {LOCATIONS.cities.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={employmentType} onValueChange={setEmploymentType}>
            <SelectTrigger className="w-[120px] shrink-0">
              <SelectValue placeholder="Type" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All types</SelectItem>
              <SelectItem value="full_time">Full time</SelectItem>
              <SelectItem value="part_time">Part time</SelectItem>
              <SelectItem value="contract">Contract</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div
        ref={listRef}
        className="flex-1 overflow-y-auto overscroll-contain mt-4 space-y-8 min-h-0 pb-4"
      >
        {showSections && (
          <>
            {!recruiter && recommended.length > 0 && (
              <section>
                <h2 className="font-display text-sm font-bold flex items-center gap-2 mb-3">
                  <Sparkles className="size-4 text-primary" /> Recommended for you
                </h2>
                <div className="grid gap-4 sm:grid-cols-2">
                  {recommended.map(({ job }) => (
                    <JobCard key={job.id} job={job} compact {...cardProps} />
                  ))}
                </div>
              </section>
            )}
            <section>
              <h2 className="font-display text-sm font-bold flex items-center gap-2 mb-3">
                <Sparkles className="size-4" /> Featured
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {featured.slice(0, 4).map((j) => (
                  <JobCard key={j.id} job={j} compact {...cardProps} />
                ))}
              </div>
            </section>
            <section>
              <h2 className="font-display text-sm font-bold flex items-center gap-2 mb-3">
                <TrendingUp className="size-4" /> Trending
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {trending.slice(0, 4).map((j) => (
                  <JobCard key={j.id} job={j} compact {...cardProps} />
                ))}
              </div>
            </section>
            <section>
              <h2 className="font-display text-sm font-bold flex items-center gap-2 mb-3">
                <Clock className="size-4" /> Recently posted
              </h2>
              <div className="grid gap-4 sm:grid-cols-2">
                {recent.map((j) => (
                  <JobCard key={j.id} job={j} compact {...cardProps} />
                ))}
              </div>
            </section>
          </>
        )}

        <section>
          <h2 className="font-display text-sm font-bold mb-3">
            {hasFilters
              ? `Results (${jobs.length})`
              : recruiter
                ? "All market listings"
                : "All jobs"}
          </h2>
          {jobs.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-12">
              No jobs match your filters.
            </p>
          ) : (
            <div className="space-y-4">
              {jobs.map((j) => (
                <JobCard key={j.id} job={j} {...cardProps} />
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
