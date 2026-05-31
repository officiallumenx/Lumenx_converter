import { createFileRoute } from "@tanstack/react-router";
import { useMemo } from "react";
import { AppShell } from "@/components/app/AppShell";
import { PageHeader } from "@/components/app/PageHeader";
import { SectionCard } from "@/components/app/SectionCard";
import { useApp } from "@/lib/app-state";
import { useParentPortal } from "@/context/ParentPortalContext";
import {
  sportsEvents,
  sportsTeams,
  sportsAttendance,
  achievements,
  sportsTeamRoster,
} from "@/lib/mock-data";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import {
  Trophy,
  Users,
  Calendar as CalIcon,
  MapPin,
  Star,
  ChevronRight,
  UserCheck,
  UserX,
} from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, CartesianGrid, XAxis, YAxis, Tooltip } from "recharts";
import { AchievementBadge } from "@/components/app/motivation/AchievementBadge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export const Route = createFileRoute("/sports")({
  head: () => ({ meta: [{ title: "Sports — Unify" }] }),
  component: () => (
    <AppShell>
      <SportsPage />
    </AppShell>
  ),
});

const STATUS_TONE = {
  upcoming: "bg-primary/10 text-primary",
  ongoing: "bg-warning/15 text-warning-foreground",
  completed: "bg-muted text-muted-foreground",
} as const;

function SportsPage() {
  const { role } = useApp();
  const portal = useParentPortal();
  const snap = role === "parent" && portal.isParent ? portal.snapshot : null;

  const parentSquads = useMemo(() => {
    if (!snap) return [];
    const child = snap.child;
    const normRoll = (r: string) => r.replace(/^0+/, "") || "0";
    const cr = normRoll(child.rollNo);
    const out: {
      teamId: string;
      teamName: string;
      sport: string;
      coach: string;
      presentLastSession: boolean;
      squadRank: number | null;
    }[] = [];
    for (const team of sportsTeams) {
      const roster = sportsTeamRoster[team.id] ?? [];
      const row = roster.find(
        (r) => r.name === child.name || r.roll === child.rollNo || normRoll(r.roll) === cr,
      );
      if (row) {
        out.push({
          teamId: team.id,
          teamName: team.name,
          sport: team.sport,
          coach: team.coach,
          presentLastSession: row.presentLastSession,
          squadRank: row.squadRank,
        });
      }
    }
    return out;
  }, [snap]);

  const sportsAchievements = achievements.filter((a) =>
    ["zap", "trophy", "medal"].includes(a.icon),
  );

  return (
    <div className="min-w-0 max-w-full">
      <PageHeader
        title="Sports"
        subtitle="Events, teams, practice attendance and athletic achievements."
      />

      {snap && (
        <div className="mb-5 rounded-2xl border border-border bg-card p-4 text-sm shadow-soft sm:p-5">
          <div className="font-medium">Learner context</div>
          <p className="mt-1 text-muted-foreground">
            Schedules and achievements below are shown for{" "}
            <span className="font-medium text-foreground">{snap.child.name}</span> ({snap.classTag}
            ). School-wide events apply to all students; switch the active child to align messages
            and practice reminders.
          </p>
        </div>
      )}

      {snap && role === "parent" && (
        <SectionCard title="Squad participation" className="mb-5">
          {parentSquads.length === 0 ? (
            <p className="text-sm text-muted-foreground">
              No published squad roster entry matches{" "}
              <span className="font-medium text-foreground">{snap.child.name}</span> (roll{" "}
              {snap.child.rollNo}) in the current demo teams. Switch learners or ask the coach to
              confirm registration.
            </p>
          ) : (
            <div className="grid min-w-0 gap-3 sm:grid-cols-2">
              {parentSquads.map((s) => (
                <div
                  key={s.teamId}
                  className="min-w-0 rounded-xl border border-border bg-muted/20 p-4"
                >
                  <div className="font-semibold leading-snug break-words">{s.teamName}</div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {s.sport} · Coach {s.coach}
                  </div>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
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
      )}

      {role === "teacher" && (
        <SectionCard title="Rosters & practice attendance" className="mb-5">
          <p className="mb-4 text-sm text-muted-foreground">
            Each table lists students linked to a squad for the current term. “Last session” shows
            who checked in at the most recent scheduled practice. Squad rank highlights published
            starters.
          </p>
          <div className="space-y-6">
            {sportsTeams.map((team) => {
              const roster = sportsTeamRoster[team.id] ?? [];
              return (
                <div
                  key={team.id}
                  className="min-w-0 overflow-x-auto rounded-xl border border-border"
                >
                  <div className="border-b border-border bg-muted/40 px-3 py-2 text-sm font-semibold">
                    {team.name}{" "}
                    <span className="font-normal text-muted-foreground">
                      · {team.sport} · Coach {team.coach}
                    </span>
                  </div>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-14">Roll</TableHead>
                        <TableHead>Student</TableHead>
                        <TableHead className="w-28">Last session</TableHead>
                        <TableHead className="w-24">Squad rank</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {roster.map((r) => (
                        <TableRow key={`${team.id}-${r.roll}`}>
                          <TableCell className="tabular-nums font-medium">{r.roll}</TableCell>
                          <TableCell>{r.name}</TableCell>
                          <TableCell>
                            {r.presentLastSession ? (
                              <Badge className="gap-1 border-0 bg-success/15 text-success">
                                <UserCheck className="size-3" /> Present
                              </Badge>
                            ) : (
                              <Badge variant="outline" className="gap-1 text-muted-foreground">
                                <UserX className="size-3" /> Absent
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="tabular-nums text-muted-foreground">
                            {r.squadRank ? `#${r.squadRank}` : "—"}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              );
            })}
          </div>
        </SectionCard>
      )}

      <div className="relative mb-5 max-w-full min-w-0 overflow-hidden rounded-3xl bg-gradient-primary p-5 text-primary-foreground shadow-glow md:p-7">
        <div className="absolute -top-10 -right-10 size-40 rounded-full bg-white/10 blur-2xl" />
        <div className="relative grid min-w-0 grid-cols-1 gap-4 sm:grid-cols-3">
          <Stat value="4" label="Teams" />
          <Stat
            value={String(sportsEvents.filter((e) => e.status === "upcoming").length)}
            label="Upcoming events"
          />
          <Stat value="92%" label="Practice attendance" />
        </div>
      </div>

      <Tabs defaultValue="events" className="w-full min-w-0">
        <TabsList className="grid w-full grid-cols-4 rounded-xl">
          <TabsTrigger value="events" className="rounded-lg text-xs sm:text-sm gap-1.5">
            <CalIcon className="size-3.5" /> Events
          </TabsTrigger>
          <TabsTrigger value="teams" className="rounded-lg text-xs sm:text-sm gap-1.5">
            <Users className="size-3.5" /> Teams
          </TabsTrigger>
          <TabsTrigger value="practice" className="rounded-lg text-xs sm:text-sm gap-1.5">
            <Star className="size-3.5" /> Practice
          </TabsTrigger>
          <TabsTrigger value="awards" className="rounded-lg text-xs sm:text-sm gap-1.5">
            <Trophy className="size-3.5" /> Awards
          </TabsTrigger>
        </TabsList>

        <TabsContent value="events" className="mt-4 space-y-2">
          {sportsEvents.map((e) => (
            <div
              key={e.id}
              className="flex min-w-0 items-center gap-2 rounded-2xl border border-border bg-card p-3 shadow-soft sm:gap-3 sm:p-4"
            >
              <div className="size-12 rounded-xl bg-primary/10 text-primary grid place-items-center shrink-0">
                <Trophy className="size-5" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 flex-wrap items-center gap-2">
                  <div className="min-w-0 truncate text-sm font-medium">{e.title}</div>
                  <Badge
                    variant="secondary"
                    className={`shrink-0 text-[10px] capitalize ${STATUS_TONE[e.status]}`}
                  >
                    {e.status}
                  </Badge>
                </div>
                <div className="text-xs text-muted-foreground mt-0.5 flex items-center gap-1.5 flex-wrap">
                  <CalIcon className="size-3" /> {e.date} · {e.time}
                  <span className="opacity-50">•</span>
                  <MapPin className="size-3" /> {e.venue}
                  {e.result && <span className="text-success font-medium ml-1">— {e.result}</span>}
                </div>
              </div>
              <ChevronRight className="size-4 text-muted-foreground shrink-0" />
            </div>
          ))}
        </TabsContent>

        <TabsContent value="teams" className="mt-4 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2">
          {sportsTeams.map((t) => (
            <div
              key={t.id}
              className="min-w-0 rounded-2xl border border-border bg-card p-4 shadow-soft"
            >
              <div className="flex min-w-0 items-center gap-3">
                <div className="size-12 rounded-2xl bg-gradient-primary text-primary-foreground grid place-items-center shrink-0">
                  <Trophy className="size-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="truncate text-sm font-medium">{t.name}</div>
                  <div className="truncate text-xs text-muted-foreground">
                    {t.sport} · {t.coach}
                  </div>
                </div>
                <div className="flex items-center gap-1 text-xs font-medium">
                  <Star className="size-3.5 text-warning" /> {t.rating}
                </div>
              </div>
              <div className="mt-3 grid grid-cols-2 gap-2 text-[11px]">
                <div className="rounded-lg bg-muted/40 px-2.5 py-1.5">
                  <span className="text-muted-foreground">Members</span>{" "}
                  <span className="font-semibold">{t.members}</span>
                </div>
                <div className="rounded-lg bg-muted/40 px-2.5 py-1.5">
                  <span className="text-muted-foreground">Practice</span>{" "}
                  <span className="font-semibold">{t.practiceDays}</span>
                </div>
              </div>
            </div>
          ))}
        </TabsContent>

        <TabsContent value="practice" className="mt-4 space-y-3">
          <div className="min-w-0 overflow-hidden rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
            <h3 className="mb-3 font-semibold">Practice attendance — last 5 weeks</h3>
            <div className="h-56 w-full min-w-0 max-w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={sportsAttendance}>
                  <CartesianGrid
                    strokeDasharray="3 3"
                    stroke="oklch(0.92 0.01 250)"
                    vertical={false}
                  />
                  <XAxis
                    dataKey="week"
                    stroke="oklch(0.5 0.02 260)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    domain={[0, 3]}
                    stroke="oklch(0.5 0.02 260)"
                    fontSize={11}
                    tickLine={false}
                    axisLine={false}
                  />
                  <Tooltip
                    contentStyle={{
                      background: "var(--popover)",
                      border: "1px solid var(--border)",
                      borderRadius: 12,
                    }}
                  />
                  <Bar dataKey="total" fill="oklch(0.86 0.04 250)" radius={[6, 6, 0, 0]} />
                  <Bar dataKey="attended" fill="oklch(0.55 0.22 260)" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
          <div className="rounded-2xl border border-dashed border-border p-5 text-sm text-muted-foreground text-center">
            Coaches mark practice attendance from the Teacher portal. Students see streaks and
            improvement here.
          </div>
        </TabsContent>

        <TabsContent
          value="awards"
          className="mt-4 grid min-w-0 grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3"
        >
          {sportsAchievements.map((a) => (
            <AchievementBadge key={a.id} a={a} />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function Stat({ value, label }: { value: string; label: string }) {
  return (
    <div className="relative min-w-0">
      <div className="font-display text-3xl font-bold tabular-nums">{value}</div>
      <div className="text-xs leading-snug opacity-80 break-words">{label}</div>
    </div>
  );
}
