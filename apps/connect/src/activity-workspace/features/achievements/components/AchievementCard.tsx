import { Award, Calendar, ChevronRight } from "lucide-react";
import { Badge, cn } from "@lumenx/ui";
import type { ActivityAchievement } from "@/lib/activity/achievements/types";
import {
  ACHIEVEMENT_LEVEL_LABELS,
  ACHIEVEMENT_SOURCE_MODULE_LABELS,
  ACHIEVEMENT_TYPE_LABELS,
} from "@/lib/activity/achievements/types";

const LEVEL_TONE: Record<ActivityAchievement["level"], string> = {
  school: "border-muted-foreground/30 text-muted-foreground",
  inter_school: "border-primary/30 text-primary",
  district: "border-primary/30 text-primary",
  state: "border-warning/40 text-warning-foreground",
  national: "border-success/30 text-success",
  international: "border-success/30 text-success",
};

export function AchievementCard({
  achievement,
  onClick,
}: {
  achievement: ActivityAchievement;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex min-w-0 w-full items-start gap-3 rounded-2xl border border-border bg-card p-4 text-left shadow-soft transition-colors hover:bg-muted/20 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
    >
      <div
        className="grid size-12 shrink-0 place-items-center rounded-xl bg-primary/10 text-primary"
        aria-hidden
      >
        <Award className="size-5" />
      </div>
      <div className="min-w-0 flex-1">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-medium text-sm">{achievement.title}</span>
          <Badge variant="outline" className="text-[10px]">
            {ACHIEVEMENT_TYPE_LABELS[achievement.achievementType]}
          </Badge>
          <Badge
            variant="outline"
            className={cn("text-[10px]", LEVEL_TONE[achievement.level])}
          >
            {ACHIEVEMENT_LEVEL_LABELS[achievement.level]}
          </Badge>
          {achievement.awardedAt ? (
            <Badge variant="outline" className="text-[10px] border-success/30 text-success">
              Awarded
            </Badge>
          ) : null}
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          {achievement.studentName} · {achievement.studentClassLabel}
          {achievement.teamName ? ` · ${achievement.teamName}` : ""}
        </p>
        <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{achievement.description}</p>
        <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-[10px] text-muted-foreground">
          <span className="inline-flex items-center gap-1">
            <Calendar className="size-3" aria-hidden />
            {achievement.date}
          </span>
          <span>
            {ACHIEVEMENT_SOURCE_MODULE_LABELS[achievement.source.module]} ·{" "}
            {achievement.source.recordLabel}
          </span>
        </div>
      </div>
      <ChevronRight className="mt-1 size-4 shrink-0 text-muted-foreground" aria-hidden />
    </button>
  );
}
