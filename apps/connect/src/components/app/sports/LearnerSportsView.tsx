import { useMemo } from "react";
import { SectionCard } from "@/components/app/SectionCard";
import { ChildSwitcher } from "@/components/app/ChildSwitcher";
import { AchievementBadge } from "@/components/app/motivation/AchievementBadge";
import {
  getLearnerCompetitions,
  getLearnerEvents,
  getLearnerSquads,
  getLearnerSportsAchievements,
  pickNextHighlight,
  practiceAttendancePct,
  resolveLearnerSportsProfile,
  type LearnerRef,
} from "@/lib/sports-utils";
import { prefersReducedMotion } from "@/lib/prefers-reduced-motion";
import { Badge, cn, Tabs, TabsList, TabsTrigger, TabsContent } from "@lumenx/ui";
import {
  Trophy,
  Calendar as CalIcon,
  MapPin,
  Star,
  UserCheck,
  UserX,
  Sparkles,
  Clock,
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";
import type { SportEvent } from "@lumenx/types";

const STATUS_TONE = {
  upcoming: "bg-primary/10 text-primary",
  ongoing: "bg-warning/15 text-warning-foreground",
  completed: "bg-muted text-muted-foreground",
} as const;

export function LearnerSportsView({
  learner,
  subtitle,
  showChildSwitcher,
}: {
  learner: LearnerRef;
  subtitle: string;
  showChildSwitcher?: boolean;
}) {
  const childKey = learner.childId ?? `${learner.name}:${learner.rollNo}`;

  const squads = useMemo(() => getLearnerSquads(learner), [childKey, learner]);
  const profile = useMemo(() => resolveLearnerSportsProfile(learner), [childKey, learner]);
  const events = useMemo(
    () => getLearnerEvents(squads, profile.registeredEventIds),
    [squads, profile, childKey],
  );
  const nextEvent = useMemo(() => pickNextHighlight(events), [events]);
  const sportsAchievements = useMemo(() => getLearnerSportsAchievements(learner), [childKey, learner]);
  const competitions = useMemo(() => getLearnerCompetitions(learner), [childKey, learner]);
  const attendancePct = practiceAttendancePct(profile.practiceWeeks);
  // Scale the chart to the busiest week (min 3) so bars never clip when a week has >3 sessions.
  const practiceMax = useMemo(
    () => Math.max(3, ...profile.practiceWeeks.map((w) => w.total)),
    [profile.practiceWeeks],
  );

  return (
    <div className="min-w-0 space-y-4">
      {showChildSwitcher ? (
        <div className="space-y-2">
          <ChildSwitcher />
          <p className="text-xs text-muted-foreground">{subtitle}</p>
        </div>
      ) : null}

      {nextEvent && <UpcomingHighlight event={nextEvent} learnerName={learner.name} />}

      <div className="grid min-w-0 grid-cols-3 gap-2 sm:gap-3">
        <MiniStat value={String(squads.length)} label="Squads" />
        <MiniStat
          value={String(events.filter((e) => e.status !== "completed").length)}
          label="Upcoming"
        />
        <MiniStat value={`${attendancePct}%`} label="Practice rate" />
      </div>

      <SectionCard title="Squad participation">
        {squads.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No squad roster entry for {learner.name} (roll {learner.rollNo}) in the current term.
          </p>
        ) : (
          <div className="grid min-w-0 gap-3 sm:grid-cols-2">
            {squads.map((s) => (
              <div key={s.teamId} className="rounded-xl border border-border bg-muted/20 p-4">
                <div className="font-semibold">{s.teamName}</div>
                <div className="mt-1 text-xs text-muted-foreground">
                  {s.sport} · Coach {s.coach}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {s.presentLastSession ? (
                    <Badge className="gap-1 border-0 bg-success/15 text-success">
                      <UserCheck className="size-3" /> Last practice: present
                    </Badge>
                  ) : (
                    <Badge variant="outline" className="gap-1 text-muted-foreground">
                      <UserX className="size-3" /> Last practice: absent
                    </Badge>
                  )}
                  <Badge variant="secondary" className="tabular-nums">
                    Squad rank: {s.squadRank ? `#${s.squadRank}` : "—"}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>

      <Tabs defaultValue="events" className="w-full min-w-0">
        <TabsList className="grid h-auto w-full grid-cols-3 rounded-xl p-1">
          <TabsTrigger value="events" className="rounded-lg text-xs sm:text-sm">
            Schedule
          </TabsTrigger>
          <TabsTrigger value="performance" className="rounded-lg text-xs sm:text-sm">
            Performance
          </TabsTrigger>
          <TabsTrigger value="awards" className="rounded-lg text-xs sm:text-sm">
            Awards
          </TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="mt-4 space-y-2">
          {events.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No sports or cultural events for this learner.
            </p>
          ) : (
            events.map((e) => <EventRow key={e.id} event={e} highlight={e.id === nextEvent?.id} />)
          )}
        </TabsContent>

        <TabsContent value="performance" className="mt-4 space-y-4">
          <div className="rounded-2xl border bg-card p-4 shadow-soft">
            <h3 className="mb-3 font-semibold">Practice attendance — last 5 weeks</h3>
            <div className="h-56 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={profile.practiceWeeks}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="week" fontSize={11} tickLine={false} axisLine={false} />
                  <YAxis
                    domain={[0, practiceMax]}
                    allowDecimals={false}
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip />
                  <Bar
                    dataKey="total"
                    fill="oklch(0.86 0.04 250)"
                    radius={[6, 6, 0, 0]}
                    name="Scheduled"
                    isAnimationActive={!prefersReducedMotion()}
                  />
                  <Bar
                    dataKey="attended"
                    fill="oklch(0.55 0.22 260)"
                    radius={[6, 6, 0, 0]}
                    name="Attended"
                    isAnimationActive={!prefersReducedMotion()}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div>
            <h3 className="mb-2 font-semibold">Competition results</h3>
            {competitions.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No competition results recorded for {learner.name} yet.
              </p>
            ) : (
            <ul className="space-y-2">
              {competitions.map((c) => (
                <li
                  key={c.id}
                  className="flex flex-wrap items-start justify-between gap-2 rounded-xl border p-3 text-sm"
                >
                  <div className="min-w-0">
                    <div className="font-medium">{c.title}</div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
                      <CalIcon className="size-3" /> {c.date}
                      <MapPin className="size-3" /> {c.venue}
                    </div>
                  </div>
                  <div className="shrink-0 text-right">
                    <Badge variant="outline" className="mb-1 capitalize">
                      {c.category}
                    </Badge>
                    <div className="text-xs font-medium text-success">{c.result}</div>
                    <div className="text-[10px] text-muted-foreground">{c.rank}</div>
                  </div>
                </li>
              ))}
            </ul>
            )}
          </div>
        </TabsContent>

        <TabsContent value="awards" className="mt-4 space-y-4">
          <p className="text-sm text-muted-foreground">
            Sports and cultural achievements only — academic and discipline badges are on Growth.
          </p>
          <div className="grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {sportsAchievements.map((a) => (
              <AchievementBadge key={a.id} a={a} />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function UpcomingHighlight({ event, learnerName }: { event: SportEvent; learnerName: string }) {
  const isCultural = event.kind === "cultural";
  return (
    <div className="relative overflow-hidden rounded-2xl border border-primary/40 bg-gradient-to-br from-primary/10 via-card to-card p-4 shadow-soft sm:p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0">
          <Badge className="mb-2 gap-1 border-0 bg-primary text-primary-foreground">
            {event.status === "ongoing" ? (
              <>
                <Clock className="size-3" /> Happening now
              </>
            ) : (
              <>
                <Star className="size-3" /> Next up for {learnerName.split(" ")[0]}
              </>
            )}
          </Badge>
          <div className="flex flex-wrap items-center gap-2">
            <h2 className="font-display text-lg font-semibold sm:text-xl">{event.title}</h2>
            <Badge variant="outline" className="capitalize">
              {isCultural ? "Cultural" : event.sport}
            </Badge>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <CalIcon className="size-3.5" /> {event.date} · {event.time}
            </span>
            <span className="inline-flex items-center gap-1">
              <MapPin className="size-3.5" /> {event.venue}
            </span>
          </div>
        </div>
        <div
          className={cn(
            "grid size-14 shrink-0 place-items-center rounded-2xl",
            isCultural ? "bg-violet-500/15 text-violet-600" : "bg-primary/15 text-primary",
          )}
        >
          {isCultural ? <Sparkles className="size-6" /> : <Trophy className="size-6" />}
        </div>
      </div>
    </div>
  );
}

function EventRow({ event, highlight }: { event: SportEvent; highlight?: boolean }) {
  const isCultural = event.kind === "cultural";
  return (
    <div
      className={cn(
        "flex min-w-0 items-center gap-3 rounded-2xl border bg-card p-3 shadow-soft sm:p-4",
        highlight && "border-primary/30 ring-1 ring-primary/20",
      )}
    >
      <div
        className={cn(
          "grid size-11 shrink-0 place-items-center rounded-xl",
          isCultural ? "bg-violet-500/10 text-violet-600" : "bg-primary/10 text-primary",
        )}
      >
        {isCultural ? <Sparkles className="size-5" /> : <Trophy className="size-5" />}
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium">{event.title}</span>
          <Badge
            variant="secondary"
            className={cn("text-[10px] capitalize", STATUS_TONE[event.status])}
          >
            {event.status}
          </Badge>
          {isCultural && (
            <Badge variant="outline" className="text-[10px]">
              Cultural
            </Badge>
          )}
        </div>
        <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs text-muted-foreground">
          <CalIcon className="size-3" /> {event.date} · {event.time}
          <MapPin className="size-3" /> {event.venue}
          {event.result && <span className="font-medium text-success">— {event.result}</span>}
        </div>
      </div>
    </div>
  );
}

function MiniStat({ value, label }: { value: string; label: string }) {
  return (
    <div className="rounded-xl border bg-card p-3 text-center shadow-soft">
      <div className="font-display text-xl font-bold tabular-nums">{value}</div>
      <div className="text-[10px] uppercase tracking-wide text-muted-foreground">{label}</div>
    </div>
  );
}
