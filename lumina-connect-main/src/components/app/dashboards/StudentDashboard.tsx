import { Link } from "@tanstack/react-router";
import {
  ClipboardCheck,
  BookOpen,
  GraduationCap,
  TrendingUp,
  ArrowRight,
  Sparkles,
  Trophy,
} from "lucide-react";
import { StatCard } from "../StatCard";
import {
  assignments,
  exams,
  performance,
  remarks,
  studentProfile,
  studentTimetable,
  trend,
  days,
  achievements,
  streaks,
  goals,
} from "@/lib/mock-data";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
} from "recharts";
import { AchievementBadge } from "../motivation/AchievementBadge";
import { StreakCard } from "../motivation/StreakCard";
import { GoalCard } from "../motivation/GoalCard";
import { EncouragementCarousel } from "../motivation/EncouragementCarousel";

export function StudentDashboard() {
  const today = days[Math.max(0, Math.min(5, new Date().getDay() - 1))];
  const todayClasses = studentTimetable[today] ?? [];
  const weak = [...performance].sort((a, b) => a.score - b.score).slice(0, 2);
  const recentAch = achievements.filter((a) => !a.progress).slice(0, 3);
  const topGoal = goals[0];

  return (
    <div className="min-w-0 max-w-full space-y-6">
      <div className="relative overflow-hidden rounded-3xl bg-gradient-primary p-5 text-primary-foreground shadow-glow sm:p-6 md:p-8">
        <div className="absolute -top-10 -right-10 size-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex min-w-0 flex-col items-start justify-between gap-4 md:flex-row md:gap-6">
          <div className="min-w-0 max-w-full flex-1">
            <div className="text-xs uppercase tracking-widest opacity-80">Today, {today}</div>
            <h2 className="mt-1 font-display text-xl font-semibold leading-snug break-words sm:text-2xl md:text-3xl">
              Hi {studentProfile.name.split(" ")[0]}, you're on a roll.
            </h2>
            <p className="mt-2 max-w-full text-xs opacity-85 sm:max-w-md sm:text-sm">
              Your average is up by 4% this term. Keep momentum on Chemistry — small daily reps will
              move the needle.
            </p>
            <div className="mt-4 flex min-w-0 flex-wrap gap-2">
              <Badge className="max-w-full border-0 bg-white/20 text-primary-foreground hover:bg-white/30 break-words">
                <Sparkles className="size-3 mr-1 shrink-0" /> Improvement streak: 5 weeks
              </Badge>
            </div>
          </div>
          <div className="hidden shrink-0 text-right md:block">
            <div className="font-display text-3xl font-bold sm:text-4xl md:text-5xl">
              {studentProfile.attendance}%
            </div>
            <div className="text-xs opacity-80">Attendance</div>
          </div>
        </div>
      </div>

      <div className="grid min-w-0 auto-rows-fr grid-cols-2 items-stretch gap-2.5 sm:gap-3 md:grid-cols-4 md:gap-4">
        <StatCard
          icon={ClipboardCheck}
          label="Attendance"
          value={`${studentProfile.attendance}%`}
          tone="success"
          hint="Above class average"
        />
        <StatCard icon={BookOpen} label="Pending" value="3" tone="warning" hint="2 due this week" />
        <StatCard
          icon={GraduationCap}
          label="Avg Score"
          value="84%"
          tone="primary"
          hint="+4% vs last term"
        />
        <StatCard icon={TrendingUp} label="Class Rank" value="#7" hint="Top 15%" />
      </div>

      <EncouragementCarousel />

      <div className="grid min-w-0 auto-rows-fr grid-cols-1 items-stretch gap-2.5 sm:grid-cols-3 sm:gap-3">
        {streaks.map((s) => (
          <StreakCard key={s.id} s={s} />
        ))}
      </div>

      <Card title="Recent achievements" link="/growth">
        <div className="grid min-w-0 auto-rows-fr grid-cols-1 items-stretch gap-2.5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-3">
          {recentAch.map((a) => (
            <AchievementBadge key={a.id} a={a} />
          ))}
        </div>
      </Card>

      <Card title="Your top goal" link="/growth">
        <GoalCard g={topGoal} />
      </Card>

      <div className="grid min-w-0 grid-cols-1 gap-4 items-stretch lg:grid-cols-3">
        <Card title="Today's classes" link="/timetable">
          <div className="min-w-0 divide-y divide-border">
            {todayClasses.slice(0, 4).map((c) => (
              <div
                key={c.time}
                className="flex min-w-0 items-center gap-2 py-3 first:pt-0 sm:gap-3"
              >
                <div className="w-[3.75rem] shrink-0 text-xs font-medium tabular-nums text-muted-foreground sm:w-20">
                  <span className="block truncate">{c.time.split(" – ")[0]}</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate font-medium">{c.subject}</div>
                  <div className="truncate text-xs text-muted-foreground">{c.teacher}</div>
                </div>
              </div>
            ))}
            {!todayClasses.length && (
              <div className="text-sm text-muted-foreground py-4">No classes scheduled.</div>
            )}
          </div>
        </Card>

        <Card title="Performance trend">
          <div className="h-40 w-full min-w-0 max-w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={trend}>
                <defs>
                  <linearGradient id="g" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="oklch(0.55 0.22 260)" stopOpacity={0.4} />
                    <stop offset="100%" stopColor="oklch(0.55 0.22 260)" stopOpacity={0} />
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
                  stroke="oklch(0.55 0.22 260)"
                  strokeWidth={2.5}
                  fill="url(#g)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
          <div className="mt-2 flex min-w-0 items-center gap-2 text-xs font-medium text-success">
            <TrendingUp className="size-3.5 shrink-0" />{" "}
            <span className="min-w-0 break-words">+12 points across 5 terms</span>
          </div>
        </Card>

        <Card title="Focus subjects">
          <div className="min-w-0 space-y-3">
            {weak.map((p) => (
              <div key={p.subject} className="min-w-0">
                <div className="mb-1 flex min-w-0 items-baseline justify-between gap-2 text-sm">
                  <span className="min-w-0 truncate font-medium">{p.subject}</span>
                  <span className="shrink-0 tabular-nums text-muted-foreground">{p.score}%</span>
                </div>
                <Progress value={p.score} className="h-2" />
              </div>
            ))}
            <p className="text-xs text-muted-foreground pt-1">
              Suggested: 30 min daily revision + 1 mock test/week.
            </p>
          </div>
        </Card>
      </div>

      <div className="grid min-w-0 grid-cols-1 gap-4 items-stretch lg:grid-cols-2">
        <Card title="Pending assignments" link="/assignments">
          <div className="min-w-0 flex-1 space-y-2">
            {assignments
              .filter((a) => a.status === "pending")
              .slice(0, 3)
              .map((a) => (
                <div
                  key={a.id}
                  className="flex min-w-0 items-center gap-2 rounded-xl border border-border p-3 sm:gap-3"
                >
                  <div className="size-9 shrink-0 rounded-lg bg-primary/10 text-primary grid place-items-center">
                    <BookOpen className="size-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="truncate font-medium">{a.title}</div>
                    <div className="truncate text-xs text-muted-foreground">
                      {a.subject} • Due {a.due}
                    </div>
                  </div>
                  <Badge variant="outline" className="shrink-0 text-[10px] sm:text-xs">
                    Open
                  </Badge>
                </div>
              ))}
          </div>
        </Card>

        <Card title="Latest remarks">
          <div className="min-w-0 flex-1 space-y-3">
            {remarks.map((r, i) => (
              <div key={i} className="flex min-w-0 gap-3">
                <div
                  className={`mt-1.5 size-2 shrink-0 rounded-full ${r.tone === "positive" ? "bg-success" : "bg-warning"}`}
                />
                <div className="min-w-0 flex-1">
                  <div className="text-sm leading-snug break-words">{r.text}</div>
                  <div className="mt-0.5 text-xs leading-snug text-muted-foreground break-words line-clamp-2">
                    {r.teacher} • {r.subject} • {r.date}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      <Card title="Upcoming exams" link="/exams">
        <div className="grid min-w-0 auto-rows-fr grid-cols-1 items-stretch gap-2.5 sm:grid-cols-2 sm:gap-3 lg:grid-cols-4">
          {exams.slice(0, 4).map((e) => (
            <div
              key={e.id}
              className="flex min-h-0 min-w-0 flex-col rounded-xl border border-border p-3 sm:p-4"
            >
              <div className="text-xs text-muted-foreground">{e.date}</div>
              <div className="mt-1 font-medium leading-snug break-words line-clamp-2">
                {e.subject}
              </div>
              <div className="mt-1 text-xs leading-snug text-muted-foreground break-words line-clamp-2">
                {e.duration} • {e.room}
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function Card({
  title,
  link,
  children,
}: {
  title: string;
  link?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex h-full min-h-0 min-w-0 max-w-full flex-col rounded-2xl border border-border bg-card p-3 shadow-soft sm:p-4 md:p-5">
      <div className="mb-3 flex min-w-0 items-start justify-between gap-2 sm:items-center">
        <h3 className="min-w-0 flex-1 font-semibold leading-snug line-clamp-2 break-words">
          {title}
        </h3>
        {link && (
          <Link
            to={link}
            className="inline-flex shrink-0 items-center gap-1 text-xs text-primary hover:underline"
          >
            View all <ArrowRight className="size-3 shrink-0" />
          </Link>
        )}
      </div>
      <div className="flex-1 min-h-0">{children}</div>
    </div>
  );
}
