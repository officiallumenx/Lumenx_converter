import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useMemo, useState } from "react";
import { AppShell } from "@/components/app/AppShell";
import { PageHeader } from "@/components/app/PageHeader";
import { useApp } from "@/lib/app-state";
import { useParentPortal } from "@/context/ParentPortalContext";
import {
  achievements,
  classAchievements,
  goals,
  instituteAssignedGoals,
  streaks,
  trend,
  performance,
} from "@/lib/mock-data";
import { AchievementBadge } from "@/components/app/motivation/AchievementBadge";
import { StreakCard } from "@/components/app/motivation/StreakCard";
import { GoalCard } from "@/components/app/motivation/GoalCard";
import { EncouragementCarousel } from "@/components/app/motivation/EncouragementCarousel";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  Tooltip,
  BarChart,
  Bar,
  CartesianGrid,
  YAxis,
} from "recharts";
import { Award, Sparkles, TrendingUp, Trophy, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import type { Goal } from "@/lib/types";

export const Route = createFileRoute("/growth")({
  head: () => ({ meta: [{ title: "Growth — Unify" }] }),
  component: () => (
    <AppShell>
      <GrowthPage />
    </AppShell>
  ),
});

function GrowthPage() {
  const { role, activeChildId, studentIncludedMode } = useApp();
  const portal = useParentPortal();
  const isParent = role === "parent";
  const snap = isParent && portal.isParent ? portal.snapshot : null;
  const parentBoot = isParent && portal.isParent && portal.isLoading && !snap;

  const streaksView = snap?.streaks ?? streaks;
  const trendView = snap?.trend ?? trend;
  const performanceView = snap?.performance ?? performance;
  const goalsView = snap?.goals ?? goals;
  const instituteGoalsView = snap?.instituteGoals ?? instituteAssignedGoals;
  const achievementsView = snap?.achievements ?? achievements;

  const unlocked = achievementsView.filter((a) => !a.progress);
  const inProgress = achievementsView.filter((a) => a.progress);

  const classAchievementsView = useMemo(() => {
    if (!snap) return classAchievements;
    const tag = snap.classTag;
    const filtered = classAchievements.filter((c) => c.section === tag);
    return filtered.length > 0 ? filtered : classAchievements;
  }, [snap]);

  if (parentBoot) {
    return (
      <div className="min-w-0 max-w-full space-y-4">
        <PageHeader title="Your child's growth" subtitle="Loading this learner's growth profile…" />
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
          <Skeleton className="h-28 rounded-2xl" />
        </div>
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  return (
    <div className="min-w-0 max-w-full">
      <PageHeader
        title={isParent ? "Your child's growth" : "Your growth"}
        subtitle={
          isParent
            ? "Celebrate progress, milestones and consistency."
            : "Achievements, streaks, and goals — your story of improvement."
        }
      />

      <div className="min-w-0 space-y-5">
        <EncouragementCarousel />

        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3">
          {streaksView.map((s) => (
            <StreakCard key={s.id} s={s} />
          ))}
        </div>

        <Tabs defaultValue="achievements" className="w-full min-w-0">
          <TabsList className="grid w-full grid-cols-3 rounded-xl">
            <TabsTrigger value="achievements" className="rounded-lg gap-1.5">
              <Award className="size-3.5" /> Achievements
            </TabsTrigger>
            <TabsTrigger value="goals" className="rounded-lg gap-1.5">
              <Sparkles className="size-3.5" /> Goals
            </TabsTrigger>
            <TabsTrigger value="trends" className="rounded-lg gap-1.5">
              <TrendingUp className="size-3.5" /> Trends
            </TabsTrigger>
          </TabsList>

          <TabsContent value="achievements" className="mt-4 space-y-4">
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-2">
                Unlocked · {unlocked.length}
              </div>
              <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {unlocked.map((a) => (
                  <AchievementBadge key={a.id} a={a} />
                ))}
              </div>
            </div>
            <div>
              <div className="text-xs uppercase tracking-widest text-muted-foreground font-medium mb-2">
                In progress · {inProgress.length}
              </div>
              <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {inProgress.map((a) => (
                  <AchievementBadge key={a.id} a={a} />
                ))}
              </div>
            </div>

            <div className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
              <div className="mb-3 flex min-w-0 items-center gap-2">
                <Trophy className="size-4 shrink-0 text-primary" />
                <h3 className="min-w-0 font-semibold leading-snug">Class achievements</h3>
              </div>
              <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-3">
                {classAchievementsView.map((c) => (
                  <div
                    key={c.id}
                    className="min-w-0 rounded-xl border border-border bg-muted/30 p-4"
                  >
                    <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
                      Section {c.section}
                    </div>
                    <div className="mt-1 break-words text-sm font-medium leading-snug line-clamp-3">
                      {c.title}
                    </div>
                    <div className="mt-1 break-words text-xs font-medium text-success">
                      {c.value}
                    </div>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-muted-foreground mt-3">
                Healthy class-level recognition. We never publicly rank individual students.
              </p>
            </div>
          </TabsContent>

          <TabsContent value="goals" className="mt-4 space-y-4">
            {!isParent && (
              <>
                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
                    From your institute
                  </div>
                  <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                    {instituteAssignedGoals.map((g) => (
                      <GoalCard key={g.id} g={g} />
                    ))}
                  </div>
                </div>
                <StudentPersonalGoals />
              </>
            )}
            {isParent && snap && (
              <div key={activeChildId} className="space-y-4">
                <div>
                  <div className="mb-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
                    From your institute
                  </div>
                  <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                    {instituteGoalsView.map((g) => (
                      <GoalCard key={g.id} g={g} />
                    ))}
                  </div>
                </div>
                <p className="text-sm text-muted-foreground">
                  Targets below are scoped to{" "}
                  <span className="font-medium text-foreground">{snap.child.name}</span> (
                  {snap.classTag}).
                </p>
                <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
                  {goalsView.map((g) => (
                    <GoalCard key={g.id} g={g} />
                  ))}
                </div>
                {studentIncludedMode && (
                  <StudentPersonalGoals
                    storageKey={`ues_student_personal_goals_${activeChildId}`}
                    title="Delegated personal goals"
                  />
                )}
              </div>
            )}
            {!isParent && (
              <p className="text-xs text-muted-foreground px-1">
                Tip: set 1–2 stretch goals and track tiny wins each week. Consistency beats
                intensity.
              </p>
            )}
          </TabsContent>

          <TabsContent
            value="trends"
            className="mt-4 grid min-w-0 grid-cols-1 gap-4 lg:grid-cols-2"
          >
            <div className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-soft md:p-5">
              <h3 className="mb-3 font-semibold">Improvement trend</h3>
              <div className="h-56 w-full min-w-0 max-w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trendView}>
                    <defs>
                      <linearGradient id="gw" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="oklch(0.7 0.16 155)" stopOpacity={0.4} />
                        <stop offset="100%" stopColor="oklch(0.7 0.16 155)" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <XAxis
                      dataKey="term"
                      stroke="oklch(0.5 0.02 260)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis hide domain={[60, 100]} />
                    <Tooltip
                      contentStyle={{
                        background: "var(--popover)",
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="score"
                      stroke="oklch(0.7 0.16 155)"
                      strokeWidth={2.5}
                      fill="url(#gw)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
              <div className="text-xs text-success font-medium mt-2">+12 points across 5 terms</div>
            </div>

            <div className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-soft md:p-5">
              <h3 className="mb-3 font-semibold">Subject performance</h3>
              <div className="h-56 w-full min-w-0 max-w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={performanceView}>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      stroke="oklch(0.92 0.01 250)"
                      vertical={false}
                    />
                    <XAxis
                      dataKey="subject"
                      stroke="oklch(0.5 0.02 260)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                    />
                    <YAxis
                      stroke="oklch(0.5 0.02 260)"
                      fontSize={11}
                      tickLine={false}
                      axisLine={false}
                      domain={[0, 100]}
                    />
                    <Tooltip
                      contentStyle={{
                        background: "var(--popover)",
                        border: "1px solid var(--border)",
                        borderRadius: 12,
                      }}
                    />
                    <Bar dataKey="prev" fill="oklch(0.86 0.04 250)" radius={[6, 6, 0, 0]} />
                    <Bar dataKey="score" fill="oklch(0.55 0.22 260)" radius={[6, 6, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

function StudentPersonalGoals({
  storageKey = "ues_student_personal_goals",
  title = "Your personal goals",
}: {
  storageKey?: string;
  title?: string;
}) {
  const [goalTitle, setGoalTitle] = useState("");
  const [personal, setPersonal] = useState<Goal[]>([]);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(storageKey);
      if (raw) setPersonal(JSON.parse(raw) as Goal[]);
      else setPersonal([]);
    } catch {
      void 0;
    }
  }, [storageKey]);

  const persist = (next: Goal[]) => {
    setPersonal(next);
    localStorage.setItem(storageKey, JSON.stringify(next));
  };

  const add = () => {
    const t = goalTitle.trim();
    if (t.length < 4) return;
    const g: Goal = {
      id: `my-${Date.now()}`,
      title: t,
      metric: "assignments",
      target: 100,
      current: 0,
      unit: "%",
      due: "Self-paced",
    };
    persist([g, ...personal]);
    setGoalTitle("");
  };

  return (
    <div>
      <div className="mb-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
        {title}
      </div>
      <div className="mb-3 flex min-w-0 flex-col gap-2 sm:flex-row">
        <Input
          value={goalTitle}
          onChange={(e) => setGoalTitle(e.target.value)}
          placeholder="e.g. Revise organic chemistry 3× this week"
          className="min-w-0 flex-1 rounded-xl"
        />
        <Button type="button" className="shrink-0 rounded-xl gap-1.5" onClick={add}>
          <Plus className="size-4" /> Add goal
        </Button>
      </div>
      {personal.length === 0 ? (
        <p className="text-sm text-muted-foreground">No personal goals yet — add one above.</p>
      ) : (
        <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
          {personal.map((g) => (
            <GoalCard key={g.id} g={g} />
          ))}
        </div>
      )}
    </div>
  );
}
