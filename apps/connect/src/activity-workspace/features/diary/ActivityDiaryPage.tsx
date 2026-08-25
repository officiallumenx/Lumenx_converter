import { ActivityPageShell } from "@/activity-workspace/shared/ui/ActivityPageShell";
import { DiaryBookPage } from "@/components/app/diary/DiaryBookPage";

export function ActivityDiaryPage() {
  return (
    <ActivityPageShell>
      <DiaryBookPage scope="activity" />
    </ActivityPageShell>
  );
}
