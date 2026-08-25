import {
  diaryDayKey,
  isDiaryDayReady,
  isDiaryDaySubmitted,
  type DiaryDay,
  type DiaryRow,
  type DiaryScope,
} from "./types";
import { yesterdayIso } from "./dates";
import { pushDiarySubmissionLog } from "@lumenx/utils";
import { teacherProfile } from "../mock-data";

let daysByKey: Record<string, DiaryDay> = {};
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function nowIso() {
  return new Date().toISOString();
}

export function newDiaryRow(): DiaryRow {
  return {
    id: `row-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    className: "",
    description: "",
  };
}

export function subscribeDiaryStore(listener: () => void) {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
}

export function getDiarySnapshot(): Record<string, DiaryDay> {
  return daysByKey;
}

export function resetDiaryStore() {
  daysByKey = {};
  emit();
}

export function getDiaryDay(scope: DiaryScope, date: string): DiaryDay | undefined {
  return daysByKey[diaryDayKey(scope, date)];
}

/** Ensure a day exists (empty starter row) for editing. */
export function ensureDiaryDay(scope: DiaryScope, date: string): DiaryDay {
  const key = diaryDayKey(scope, date);
  const existing = daysByKey[key];
  if (existing) return existing;
  const day: DiaryDay = {
    date,
    scope,
    rows: [newDiaryRow()],
    updatedAt: nowIso(),
  };
  daysByKey = { ...daysByKey, [key]: day };
  emit();
  return day;
}

/** Local draft save — does not send to admin. Preserves submittedAt if already sent. */
export function setDiaryRows(scope: DiaryScope, date: string, rows: DiaryRow[]): DiaryDay {
  const key = diaryDayKey(scope, date);
  const prev = daysByKey[key];
  const day: DiaryDay = {
    date,
    scope,
    rows: rows.length > 0 ? rows : [newDiaryRow()],
    updatedAt: nowIso(),
    submittedAt: prev?.submittedAt,
  };
  daysByKey = { ...daysByKey, [key]: day };
  emit();
  return day;
}

/**
 * Submit / update this day into the principal admin diary.
 * Persists rows and sets submittedAt (mock handoff until admin API exists).
 */
export function submitDiaryDay(scope: DiaryScope, date: string, rows: DiaryRow[]): DiaryDay {
  const key = diaryDayKey(scope, date);
  const nextRows = rows.length > 0 ? rows : [newDiaryRow()];
  const day: DiaryDay = {
    date,
    scope,
    rows: nextRows,
    updatedAt: nowIso(),
    submittedAt: nowIso(),
  };
  daysByKey = { ...daysByKey, [key]: day };
  emit();
  pushDiarySubmissionLog({
    id: `diary-${scope}-${date}`,
    submittedAt: day.submittedAt!,
    date,
    scope,
    teacherId: teacherProfile.id,
    teacherName: teacherProfile.name,
    rows: nextRows.map((r) => ({
      className: r.className,
      description: r.description,
    })),
  });
  return day;
}

/** Yesterday overdue when not yet submitted to admin. */
export function isYesterdayDiaryOverdue(scope: DiaryScope): boolean {
  const day = getDiaryDay(scope, yesterdayIso());
  return !isDiaryDaySubmitted(day);
}

export function isDiaryReady(scope: DiaryScope, date: string): boolean {
  return isDiaryDayReady(getDiaryDay(scope, date));
}

export function isDiarySubmitted(scope: DiaryScope, date: string): boolean {
  return isDiaryDaySubmitted(getDiaryDay(scope, date));
}
