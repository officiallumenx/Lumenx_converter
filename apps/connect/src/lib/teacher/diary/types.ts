/** Subject Teacher vs Activity Coordinator diaries stay separate (dual-role safe). */
export type DiaryScope = "subject" | "activity";

export type DiaryRow = {
  id: string;
  /** Class / group / session label (free text). */
  className: string;
  description: string;
};

/** One diary entry per calendar day per scope. */
export type DiaryDay = {
  date: string; // YYYY-MM-DD
  scope: DiaryScope;
  rows: DiaryRow[];
  updatedAt: string;
  /** Set when teacher submits — syncs into principal admin diary. */
  submittedAt?: string;
};

export function diaryDayKey(scope: DiaryScope, date: string) {
  return `${scope}:${date}`;
}

/** Ready to submit: at least one row has both fields filled. */
export function isDiaryDayReady(day: DiaryDay | undefined | null): boolean {
  if (!day?.rows?.length) return false;
  return day.rows.some(
    (r) => r.className.trim().length > 0 && r.description.trim().length > 0,
  );
}

/** Submitted to principal admin for that date. */
export function isDiaryDaySubmitted(day: DiaryDay | undefined | null): boolean {
  return Boolean(day?.submittedAt);
}

/** @deprecated use isDiaryDayReady / isDiaryDaySubmitted */
export function isDiaryDayComplete(day: DiaryDay | undefined | null): boolean {
  return isDiaryDaySubmitted(day);
}
