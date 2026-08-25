import type { ReactNode } from "react";
import { Award, Bell, Pencil, Send } from "lucide-react";
import {
  Badge,
  Button,
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@lumenx/ui";
import { toast } from "sonner";
import { pushCertificateRecommendation } from "@lumenx/utils";
import type { ActivityAchievement } from "@/lib/activity/achievements/types";
import {
  ACHIEVEMENT_LEVEL_LABELS,
  ACHIEVEMENT_SOURCE_KIND_LABELS,
  ACHIEVEMENT_SOURCE_MODULE_LABELS,
  ACHIEVEMENT_TYPE_LABELS,
} from "@/lib/activity/achievements/types";

export function AchievementDetailSheet({
  achievement,
  open,
  onOpenChange,
  onEdit,
  onAward,
  onNotify,
}: {
  achievement: ActivityAchievement | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onEdit: (achievement: ActivityAchievement) => void;
  onAward: (achievement: ActivityAchievement) => void;
  onNotify: (achievement: ActivityAchievement) => void;
}) {
  if (!achievement) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="font-display text-left">Achievement Details</SheetTitle>
        </SheetHeader>

        <div className="mt-6 space-y-6 pb-8">
          <div>
            <h3 className="font-display text-xl font-semibold">{achievement.title}</h3>
            <p className="text-sm text-muted-foreground">
              {achievement.studentName} · {achievement.studentClassLabel}
            </p>
            <div className="mt-2 flex flex-wrap gap-2">
              <Badge variant="outline">
                {ACHIEVEMENT_TYPE_LABELS[achievement.achievementType]}
              </Badge>
              <Badge variant="outline">{ACHIEVEMENT_LEVEL_LABELS[achievement.level]}</Badge>
              <Badge variant="outline">
                {ACHIEVEMENT_SOURCE_MODULE_LABELS[achievement.source.module]}
              </Badge>
              {achievement.awardedAt ? (
                <Badge variant="outline" className="border-success/30 text-success">
                  Awarded {achievement.awardedAt}
                </Badge>
              ) : null}
            </div>
          </div>

          <Section title="Student">
            <InfoRow label="Student" value={achievement.studentName} />
            <InfoRow label="Class" value={achievement.studentClassLabel} />
            {achievement.teamName ? <InfoRow label="Team" value={achievement.teamName} /> : null}
            <InfoRow label="Date" value={achievement.date} />
          </Section>

          <Section title="Source">
            <InfoRow
              label="Source module"
              value={ACHIEVEMENT_SOURCE_MODULE_LABELS[achievement.source.module]}
            />
            <InfoRow
              label="Source record"
              value={ACHIEVEMENT_SOURCE_KIND_LABELS[achievement.source.recordKind]}
            />
            <InfoRow label="Record" value={achievement.source.recordLabel} />
            <p className="text-[10px] text-muted-foreground">
              Achievements link to a source record in any activity module — Sports is live; others
              are architecture-ready.
            </p>
          </Section>

          <Section title="Description">
            <p className="text-sm">{achievement.description || "No description provided."}</p>
          </Section>

          <Section title="Notifications">
            <InfoRow
              label="Student"
              value={achievement.notifications.notifyStudent ? "Enabled" : "Disabled"}
            />
            <InfoRow
              label="Parents"
              value={achievement.notifications.notifyParents ? "Enabled" : "Disabled"}
            />
            <InfoRow
              label="Teachers"
              value={achievement.notifications.notifyTeachers ? "Enabled" : "Disabled"}
            />
          </Section>

          <div className="flex flex-col gap-2">
            <Button
              variant="outline"
              className="rounded-xl gap-2"
              onClick={() => onEdit(achievement)}
            >
              <Pencil className="size-4" />
              Edit Achievement
            </Button>
            {!achievement.awardedAt ? (
              <Button className="rounded-xl gap-2" onClick={() => onAward(achievement)}>
                <Send className="size-4" />
                Award Achievement
              </Button>
            ) : (
              <>
                <Button
                  className="rounded-xl gap-2"
                  onClick={() => {
                    pushCertificateRecommendation({
                      achievementId: achievement.id,
                      achievementTitle: achievement.title,
                      achievementType: achievement.achievementType,
                      studentId: achievement.studentId,
                      studentName: achievement.studentName,
                      studentClassLabel: achievement.studentClassLabel,
                      recommendedBy: "Activity Teacher",
                    });
                    toast.success("Certificate recommendation sent to Admin for issue");
                  }}
                >
                  <Award className="size-4" />
                  Recommend Certificate
                </Button>
                <Button
                  variant="outline"
                  className="rounded-xl gap-2"
                  onClick={() => onNotify(achievement)}
                >
                  <Bell className="size-4" />
                  Send notification (mock)
                </Button>
              </>
            )}
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{title}</h4>
      <div className="space-y-2 rounded-2xl border border-border bg-muted/5 p-4">{children}</div>
    </section>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] font-medium text-muted-foreground">{label}</p>
      <p className="text-sm">{value}</p>
    </div>
  );
}
