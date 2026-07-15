import { Badge, cn } from "@lumenx/ui";
import { SPORTS_UNIT_TYPE_LABELS, type SportsTeam } from "@/lib/activity/sports/types";

export function SportsTeamCard({
  team,
  onClick,
}: {
  team: SportsTeam;
  onClick: () => void;
}) {
  const memberCount = team.members.length;

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-[8.5rem] flex-col rounded-2xl border border-border bg-card p-4 text-left shadow-soft transition-colors",
        "hover:border-primary/30 hover:bg-primary/[0.03] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
      )}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-2xl" aria-hidden>
          {team.logoEmoji}
        </span>
        <Badge variant="outline" className="text-[10px] capitalize">
          {SPORTS_UNIT_TYPE_LABELS[team.unitType]}
        </Badge>
      </div>
      <p className="mt-3 font-medium text-sm">{team.name}</p>
      <p className="mt-1 text-[10px] text-muted-foreground">
        {memberCount} / {team.studentCapacity} students
      </p>
      <p className="mt-auto pt-3 text-[10px] text-muted-foreground tabular-nums">
        {team.stats.wins}W · {team.stats.losses}L · {team.stats.achievements} achievements
      </p>
    </button>
  );
}
