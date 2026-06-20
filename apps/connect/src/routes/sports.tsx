import { createFileRoute } from "@tanstack/react-router";
import { AppShell } from "@/components/app/AppShell";
import { PageHeader } from "@/components/app/PageHeader";
import { SectionCard } from "@/components/app/SectionCard";
import { LearnerSportsView } from "@/components/app/sports/LearnerSportsView";
import { useApp } from "@/lib/app-state";
import { useParentPortal } from "@/context/ParentPortalContext";
import { useStudentPortal } from "@/context/StudentPortalContext";
import { studentProfile } from "@/lib/mock-data";
import {
  sportsEvents,
  sportsTeams,
  sportsTeamRoster,
  achievements,
} from "@/lib/mock-data";
import { Badge } from "@lumenx/ui";
import { Trophy, Calendar as CalIcon, MapPin, UserCheck, UserX } from "lucide-react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@lumenx/ui";

export const Route = createFileRoute("/sports")({
  head: () => ({ meta: [{ title: "Sports — LumenX Connect" }] }),
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
  if (role === "teacher") return <TeacherSportsContent />;

  const parentPortal = useParentPortal();
  const studentPortal = useStudentPortal();

  const parentSnap = role === "parent" && parentPortal.isParent ? parentPortal.snapshot : null;
  const studentSnap =
    role === "student" && studentPortal.isStudent ? studentPortal.snapshot : null;

  const learner = parentSnap
    ? {
        name: parentSnap.child.name,
        rollNo: parentSnap.child.rollNo,
        childId: parentSnap.child.id,
      }
    : studentSnap
      ? {
          name: studentSnap.profile.name,
          rollNo: studentSnap.profile.rollNo,
          childId: "C1",
        }
      : {
          name: studentProfile.name,
          rollNo: studentProfile.rollNo,
          childId: "C1",
        };

  const subtitle = parentSnap
    ? `Showing squads and events for ${parentSnap.child.name}. Switch learners in the header for another child.`
    : `${learner.name} · ${studentSnap?.profile.class ?? studentProfile.class} ${studentSnap?.profile.section ?? studentProfile.section}`;

  return (
    <div className="min-w-0 max-w-full space-y-4">
      <PageHeader
        title="Sports & Cultural"
        subtitle="Your squads, upcoming events, and sports or cultural achievements only"
      />
      <LearnerSportsView
        learner={learner}
        subtitle={subtitle}
        showAllChildrenStrip={role === "parent"}
      />
    </div>
  );
}

function TeacherSportsContent() {
  const upcomingEvents = sportsEvents.filter((e) => e.status === "upcoming");
  const ongoingEvents = sportsEvents.filter((e) => e.status === "ongoing");

  return (
    <div className="space-y-5">
      <PageHeader
        title="Sports"
        subtitle="Class sports participants and upcoming school sports events"
      />

      {(ongoingEvents.length > 0 || upcomingEvents.length > 0) && (
        <section className="rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
          <h2 className="mb-3 font-semibold">Upcoming & ongoing events</h2>
          <div className="space-y-2">
            {[...ongoingEvents, ...upcomingEvents].map((ev) => (
              <div
                key={ev.id}
                className="flex flex-wrap items-center justify-between gap-2 rounded-xl border p-3 text-sm"
              >
                <div>
                  <div className="font-medium">{ev.title}</div>
                  <div className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                    <CalIcon className="size-3" /> {ev.date} · <MapPin className="size-3" />{" "}
                    {ev.venue}
                  </div>
                </div>
                <Badge className={STATUS_TONE[ev.status]}>{ev.status}</Badge>
              </div>
            ))}
          </div>
        </section>
      )}

      <SectionCard title="Rosters & practice attendance">
        <p className="mb-4 text-sm text-muted-foreground">
          Squad rosters and last-session attendance for coach reference.
        </p>
        <div className="space-y-6">
          {sportsTeams.map((team) => {
            const roster = sportsTeamRoster[team.id] ?? [];
            return (
              <div key={team.id} className="min-w-0 overflow-x-auto rounded-xl border">
                <div className="border-b bg-muted/40 px-3 py-2 text-sm font-semibold">
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
                        <TableCell className="font-medium tabular-nums">{r.roll}</TableCell>
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

      <section className="rounded-2xl border border-border bg-card p-4 shadow-soft sm:p-5">
        <div className="mb-3 flex items-center gap-2">
          <Trophy className="size-4 text-primary" />
          <h2 className="font-semibold">Recent sports achievements</h2>
        </div>
        <div className="space-y-2">
          {achievements
            .filter((a) => ["ach-6", "ach-10"].includes(a.id))
            .map((a) => (
              <div key={a.id} className="flex items-start gap-3 rounded-xl border p-3 text-sm">
                <Trophy className="mt-0.5 size-4 shrink-0 text-primary" />
                <div>
                  <div className="font-medium">{a.title}</div>
                  <div className="text-xs text-muted-foreground">{a.description}</div>
                </div>
              </div>
            ))}
        </div>
      </section>
    </div>
  );
}
