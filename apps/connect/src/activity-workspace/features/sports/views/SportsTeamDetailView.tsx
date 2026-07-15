import { useEffect, useState } from "react";
import { Badge } from "@lumenx/ui";
import { PageSkeleton } from "@/activity-workspace/shared/ui/PageSkeleton";
import { sportsRepository } from "@/lib/activity/sports/repositories";
import type { SportsTeam } from "@/lib/activity/sports/types";
import { SportsBackBar } from "../components/SportsBackBar";

export function SportsTeamDetailView({
  teamId,
  sectionName,
  onBack,
}: {
  teamId: string;
  sectionName: string;
  onBack: () => void;
}) {
  const [team, setTeam] = useState<SportsTeam | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    sportsRepository
      .getTeamById(teamId)
      .then((result) => {
        if (!cancelled) setTeam(result);
      })
      .finally(() => {
        if (!cancelled) setIsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [teamId]);

  if (isLoading) {
    return <PageSkeleton rows={4} />;
  }

  if (!team) {
    return (
      <div className="activity-panel py-10 text-center">
        <p className="text-sm font-medium">Team not found</p>
        <SportsBackBar label={`Back to ${sectionName}`} onBack={onBack} className="mt-4" />
      </div>
    );
  }

  return (
    <div className="min-w-0 space-y-5">
      <SportsBackBar label={`Back to ${sectionName}`} onBack={onBack} />

      <div>
        <h2 className="font-display text-xl font-semibold">{team.name}</h2>
        <p className="mt-1 text-xs text-muted-foreground capitalize">{team.unitType}</p>
      </div>

      <div className="flex flex-wrap gap-2">
        <StatBadge label="Wins" value={team.stats.wins} tone="success" />
        <StatBadge label="Losses" value={team.stats.losses} tone="muted" />
        <StatBadge label="Achievements" value={team.stats.achievements} tone="primary" />
      </div>

      <section>
        <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
          Students
        </h3>
        {team.members.length === 0 ? (
          <p className="activity-empty-state py-6 text-sm">
            No students assigned yet. Assign students to this {team.unitType}.
          </p>
        ) : (
          <ul className="space-y-2">
            {team.members.map((member) => {
              const isLeader = member.role === "captain";
              return (
                <li
                  key={member.id}
                  className="flex items-center justify-between rounded-xl border border-border px-3 py-2.5 text-sm"
                >
                  <div className="min-w-0">
                    <span className="font-medium">{member.name}</span>
                    <span className="ml-2 text-xs text-muted-foreground">
                      {member.classLabel} · Roll {member.rollNo}
                    </span>
                  </div>
                  {isLeader ? (
                    <Badge className="shrink-0 text-[10px]">Team lead</Badge>
                  ) : null}
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <p className="text-xs text-muted-foreground">
        Capacity: {team.members.length} / {team.studentCapacity} students
      </p>
    </div>
  );
}

function StatBadge({
  label,
  value,
  tone,
}: {
  label: string;
  value: number;
  tone: "success" | "muted" | "primary";
}) {
  return (
    <div
      className={
        tone === "success"
          ? "rounded-full border border-success/30 bg-success/10 px-3 py-1.5 text-center"
          : tone === "primary"
            ? "rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-center"
            : "rounded-full border border-border bg-muted/30 px-3 py-1.5 text-center"
      }
    >
      <p className="text-[10px] text-muted-foreground">{label}</p>
      <p className="font-display text-lg font-semibold tabular-nums">{value}</p>
    </div>
  );
}
