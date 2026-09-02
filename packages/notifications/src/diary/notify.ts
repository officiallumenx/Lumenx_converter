import { pushPhase7Inbox } from "../shared/phase7-inbox";

export type DiaryReminderScope = "subject" | "activity";

function scopeLabel(scope: DiaryReminderScope): string {
  return scope === "activity" ? "Activity diary" : "Class diary";
}

/** Demo-mode diary reminder — fan-out to teacher Connect inbox. */
export function notifyDiaryReminderDemo(input: {
  scope: DiaryReminderScope;
  diaryDate: string;
  overdue: boolean;
  href: string;
}): void {
  const label = scopeLabel(input.scope);
  const title = input.overdue ? `${label} overdue` : `${label} due today`;
  const body = input.overdue
    ? `Your ${label.toLowerCase()} for ${input.diaryDate} was not submitted.`
    : `End of day: submit your ${label.toLowerCase()} for ${input.diaryDate}.`;

  pushPhase7Inbox({
    id: `diary-rem-${input.scope}-${input.diaryDate}`,
    title,
    desc: body,
    detail: body,
    time: "Just now",
    type: input.overdue ? "warning" : "info",
    category: "assignments",
    unread: true,
    priority: input.overdue ? "high" : "normal",
    createdAt: new Date().toISOString(),
    href: input.href,
    audiences: ["teacher"],
    audience: "teacher",
    module: "timetable",
  });
}
