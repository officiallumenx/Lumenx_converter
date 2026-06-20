import { useMemo, useState } from "react";
import { PageHeader } from "@/components/app/PageHeader";
import { SectionCard } from "@/components/app/SectionCard";
import { useStudentPortal } from "@/context/StudentPortalContext";
import { classAchievements } from "@/lib/mock-data";
import {
  achievementCategoryMap,
  ACHIEVEMENT_FILTER_LABELS,
  type AchievementCategory,
} from "@/lib/student/mock-data";
import { AchievementBadge } from "@/components/app/motivation/AchievementBadge";
import { EmptyState, PageSkeleton } from "@/student-portal/shared/ui";
import { Badge, Button, cn, Dialog, DialogContent, DialogHeader, DialogTitle } from "@lumenx/ui";
import { Trophy, Medal, Award } from "lucide-react";
import type { Achievement } from "@lumenx/types";

const TONE_CLS = {
  success: "text-success",
  primary: "text-primary",
  warning: "text-warning-foreground",
} as const;

export function StudentAchievementsPage() {
  const portal = useStudentPortal();
  const [filter, setFilter] = useState<AchievementCategory | "all">("all");
  const [selected, setSelected] = useState<Achievement | null>(null);

  const achievements = portal.isStudent && portal.snapshot ? portal.snapshot.achievements : [];
  const studentCompetitions = portal.isStudent && portal.snapshot ? portal.snapshot.competitions : [];

  const unlocked = useMemo(() => achievements.filter((a) => !a.progress), [achievements]);
  const inProgress = useMemo(() => achievements.filter((a) => a.progress), [achievements]);

  const filteredUnlocked = useMemo(() => {
    if (filter === "all") return unlocked;
    return unlocked.filter((a) => achievementCategoryMap[a.id] === filter);
  }, [filter, unlocked]);

  const filteredProgress = useMemo(() => {
    if (filter === "all") return inProgress;
    return inProgress.filter((a) => achievementCategoryMap[a.id] === filter);
  }, [filter, inProgress]);

  const filteredCompetitions = useMemo(() => {
    if (filter === "all") return studentCompetitions;
    return studentCompetitions.filter((c) => c.category === filter);
  }, [filter, studentCompetitions]);

  if (!portal.isStudent) return null;
  if (portal.isLoading || !portal.snapshot) return <PageSkeleton rows={6} />;

  return (
    <div className="min-w-0 space-y-5">
      <PageHeader
        title="Achievements"
        subtitle="Awards, recognition, competitions, and academic excellence"
      />

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Stat label="Unlocked" value={String(unlocked.length)} icon={Trophy} />
        <Stat label="In progress" value={String(inProgress.length)} icon={Award} />
        <Stat label="Competitions" value={String(studentCompetitions.length)} icon={Medal} />
        <Stat label="Class awards" value={String(classAchievements.length)} icon={Trophy} />
      </div>

      <div className="flex flex-wrap gap-2">
        {(["all", "academic", "sports", "discipline", "cultural"] as const).map((f) => (
          <button
            key={f}
            type="button"
            onClick={() => setFilter(f)}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium capitalize transition-colors",
              filter === f ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground hover:bg-muted/80",
            )}
          >
            {ACHIEVEMENT_FILTER_LABELS[f]}
          </button>
        ))}
      </div>

      <SectionCard title={`Your achievements · ${filteredUnlocked.length + filteredProgress.length}`}>
        {filteredUnlocked.length + filteredProgress.length ? (
          <div className="space-y-4">
            {filteredUnlocked.length > 0 && (
              <div>
                <div className="mb-2 text-xs uppercase tracking-widest text-muted-foreground font-medium">
                  Unlocked
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredUnlocked.map((a) => (
                    <button key={a.id} type="button" className="text-left" onClick={() => setSelected(a)}>
                      <AchievementBadge a={a} />
                    </button>
                  ))}
                </div>
              </div>
            )}
            {filteredProgress.length > 0 && (
              <div>
                <div className="mb-2 text-xs uppercase tracking-widest text-muted-foreground font-medium">
                  In progress
                </div>
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {filteredProgress.map((a) => (
                    <button key={a.id} type="button" className="text-left" onClick={() => setSelected(a)}>
                      <AchievementBadge a={a} />
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <EmptyState
            icon={Trophy}
            title="No achievements in this category"
            description="Try another filter or keep earning badges across academics, sports, and more."
          />
        )}
      </SectionCard>

      <SectionCard title="Competitions & recognition">
        {filteredCompetitions.length ? (
          <div className="space-y-2">
            {filteredCompetitions.map((c) => (
              <div key={c.id} className="rounded-xl border p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <div className="font-medium">{c.title}</div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {c.date} · {c.venue}
                    </div>
                  </div>
                  <Badge variant="outline" className="capitalize">
                    {c.category}
                  </Badge>
                </div>
                <div className="mt-2 flex flex-wrap gap-2 text-sm">
                  <Badge className="border-0 bg-success/15 text-success">{c.result}</Badge>
                  <span className="text-muted-foreground">{c.rank}</span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <EmptyState
            icon={Medal}
            title="No competitions in this category"
            description="Competition results will appear here when you participate in events."
          />
        )}
      </SectionCard>

      <SectionCard title="Class recognition">
        <div className="grid gap-3 sm:grid-cols-3">
          {classAchievements.map((c) => (
            <div key={c.id} className="rounded-xl border bg-muted/30 p-4">
              <div className="text-[11px] uppercase tracking-widest text-muted-foreground">
                Section {c.section}
              </div>
              <div className="mt-1 font-medium leading-snug">{c.title}</div>
              <div className={cn("mt-1 text-xs font-medium", TONE_CLS[c.tone])}>{c.value}</div>
            </div>
          ))}
        </div>
      </SectionCard>

      <Dialog open={!!selected} onOpenChange={(o) => !o && setSelected(null)}>
        <DialogContent className="rounded-2xl max-w-sm">
          <DialogHeader>
            <DialogTitle>{selected?.title}</DialogTitle>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <AchievementBadge a={selected} />
              <p className="text-muted-foreground">{selected.description}</p>
              {achievementCategoryMap[selected.id] && (
                <Badge variant="outline" className="capitalize">
                  {achievementCategoryMap[selected.id]}
                </Badge>
              )}
              {selected.progress !== undefined ? (
                <p className="text-xs text-muted-foreground">{selected.progress}% complete — keep going!</p>
              ) : (
                <p className="text-xs text-success font-medium">Unlocked {selected.unlockedOn}</p>
              )}
              <Button className="w-full rounded-xl" onClick={() => setSelected(null)}>
                Close
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Stat({ label, value, icon: Icon }: { label: string; value: string; icon: typeof Trophy }) {
  return (
    <div className="rounded-2xl border bg-card p-4 shadow-soft">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Icon className="size-4" />
        <span className="text-[10px] uppercase tracking-wide">{label}</span>
      </div>
      <div className="mt-1 font-display text-2xl font-semibold tabular-nums">{value}</div>
    </div>
  );
}
