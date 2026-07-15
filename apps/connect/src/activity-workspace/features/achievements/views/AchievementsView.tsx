import { useState } from "react";
import { Award } from "lucide-react";
import { toast } from "sonner";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@lumenx/ui";
import { EmptyState } from "@/teacher-portal/shared/ui/EmptyState";
import { PageSkeleton } from "@/activity-workspace/shared/ui/PageSkeleton";
import { achievementsRepository } from "@/lib/activity/achievements/repositories";
import type {
  AchievementSourceModule,
  ActivityAchievement,
  ActivityAchievementInput,
} from "@/lib/activity/achievements/types";
import {
  buildAchievementNotificationDispatch,
  estimateAchievementRecipients,
} from "@/lib/activity/achievements/notifications";
import { useAchievements } from "../hooks/useAchievements";
import { AchievementsToolbar } from "../components/AchievementsToolbar";
import { AchievementCard } from "../components/AchievementCard";
import { AchievementDetailSheet } from "../components/AchievementDetailSheet";
import { AchievementFormDialog } from "../components/AchievementFormDialog";

export type AchievementsViewScope = {
  lockedSourceModule?: AchievementSourceModule;
  title?: string;
  subtitle?: string;
};

export function AchievementsView({ scope }: { scope?: AchievementsViewScope }) {
  const {
    achievements,
    studentOptions,
    teamOptions,
    sourceOptions,
    filters,
    isLoading,
    refresh,
    updateFilters,
    lockedSourceModule,
  } = useAchievements({ lockedSourceModule: scope?.lockedSourceModule });

  const [selected, setSelected] = useState<ActivityAchievement | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<"create" | "edit">("create");
  const [awardTarget, setAwardTarget] = useState<ActivityAchievement | null>(null);

  const moduleForSources = lockedSourceModule ?? "sports";
  const availableSources = achievementsRepository.listEligibleSourceOptions(moduleForSources);

  const openCreate = () => {
    if (availableSources.length === 0) {
      toast.error("No source record available", {
        description: lockedSourceModule
          ? "Record match results or other sports outcomes first."
          : "Select a module with available source records (Sports is live in this demo).",
      });
      return;
    }
    setFormMode("create");
    setSelected(null);
    setFormOpen(true);
  };

  const openEdit = (achievement: ActivityAchievement) => {
    setFormMode("edit");
    setSelected(achievement);
    setDetailOpen(false);
    setFormOpen(true);
  };

  const openDetail = (achievement: ActivityAchievement) => {
    setSelected(achievement);
    setDetailOpen(true);
  };

  const handleFormSubmit = async (input: ActivityAchievementInput) => {
    try {
      if (formMode === "create") {
        const created = await achievementsRepository.createAchievement(input);
        toast.success("Achievement added", {
          description: `${created.title} — ${created.studentName}`,
        });
      } else if (selected) {
        const updated = await achievementsRepository.updateAchievement(selected.id, input);
        toast.success("Achievement updated", { description: updated.title });
        setSelected(updated);
      }
      refresh();
    } catch (err) {
      toast.error("Could not save achievement", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    }
  };

  const runAward = async () => {
    if (!awardTarget) return;
    try {
      const awarded = await achievementsRepository.awardAchievement(awardTarget.id);
      const dispatch = buildAchievementNotificationDispatch(awarded);
      const count = estimateAchievementRecipients(awarded);
      toast.success("Achievement awarded", {
        description: awarded.notifications.notifyStudent
          ? `${awarded.title} — ~${count} recipients notified (mock).`
          : awarded.title,
      });
      if (
        awarded.notifications.notifyStudent ||
        awarded.notifications.notifyParents ||
        awarded.notifications.notifyTeachers
      ) {
        toast.message("Notification dispatch (mock)", {
          description: `${dispatch.title}: ${dispatch.body}`,
        });
      }
      setSelected((prev) => (prev?.id === awarded.id ? awarded : prev));
      refresh();
    } catch (err) {
      toast.error("Could not award achievement", {
        description: err instanceof Error ? err.message : "Please try again.",
      });
    } finally {
      setAwardTarget(null);
    }
  };

  const handleNotify = (achievement: ActivityAchievement) => {
    const dispatch = buildAchievementNotificationDispatch(achievement);
    const count = estimateAchievementRecipients(achievement);
    toast.success("Notification sent (mock)", {
      description: `~${count} recipients — ${dispatch.title}`,
    });
    toast.message("Notification dispatch (mock)", {
      description: `${dispatch.title}: ${dispatch.body}`,
    });
  };

  if (isLoading) {
    return <PageSkeleton rows={5} />;
  }

  const hasFilters =
    (filters.query?.trim().length ?? 0) > 0 ||
    filters.achievementType !== "all" ||
    filters.level !== "all" ||
    filters.studentId !== "all" ||
    filters.teamId !== "all" ||
    (!lockedSourceModule && filters.sourceModule !== "all") ||
    filters.date !== "all";

  return (
    <div className="min-w-0 space-y-4">
      <AchievementsToolbar
        filters={filters}
        onFiltersChange={updateFilters}
        onCreate={openCreate}
        totalCount={achievements.length}
        studentOptions={studentOptions}
        teamOptions={teamOptions}
        lockedSourceModule={lockedSourceModule}
        title={scope?.title}
        subtitle={scope?.subtitle}
      />

      {achievements.length === 0 ? (
        <EmptyState
          icon={Award}
          title={hasFilters ? "No achievements match your filters" : "No achievements yet"}
          description={
            hasFilters
              ? "Try adjusting search or filters."
              : availableSources.length === 0
                ? "Source records (e.g. match results) are required before adding achievements."
                : "Recognize students for outcomes across activity modules — Sports is live."
          }
          action={
            !hasFilters && availableSources.length > 0 ? (
              <button
                type="button"
                onClick={openCreate}
                className="rounded-xl bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
              >
                Add Achievement
              </button>
            ) : undefined
          }
        />
      ) : (
        <ul className="space-y-3">
          {achievements.map((achievement) => (
            <li key={achievement.id}>
              <AchievementCard achievement={achievement} onClick={() => openDetail(achievement)} />
            </li>
          ))}
        </ul>
      )}

      <AchievementDetailSheet
        achievement={selected}
        open={detailOpen}
        onOpenChange={setDetailOpen}
        onEdit={openEdit}
        onAward={(a) => {
          setAwardTarget(a);
          setDetailOpen(false);
        }}
        onNotify={handleNotify}
      />

      <AchievementFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        achievement={selected}
        sourceOptions={sourceOptions}
        teamOptions={teamOptions}
        lockedSourceModule={lockedSourceModule}
        onSubmit={handleFormSubmit}
      />

      <AlertDialog open={!!awardTarget} onOpenChange={(o) => !o && setAwardTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Award achievement?</AlertDialogTitle>
            <AlertDialogDescription>
              {awardTarget
                ? `Award "${awardTarget.title}" to ${awardTarget.studentName}? Mock notifications will be sent per your preferences.`
                : null}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void runAward()}>Award</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
