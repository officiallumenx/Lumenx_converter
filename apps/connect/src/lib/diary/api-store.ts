import { ApiClientError } from "@/lib/api";
import {
  createDiaryDay,
  listDiaryDays,
  submitDiaryDayApi,
  updateDiaryDay,
} from "./api";
import { clearDiaryApiContext, requireDiaryApiContext } from "./context";
import { diaryDtoToDay, diaryRowsToApiInput, emptyDiaryDay } from "./map";
import type { DiaryDay, DiaryRow, DiaryScope } from "@/lib/teacher/diary/types";
import { diaryDayKey, isDiaryDaySubmitted } from "@/lib/teacher/diary/types";
import { yesterdayIso } from "@/lib/teacher/diary/dates";
import { newDiaryRow } from "@/lib/teacher/diary/store";

let daysByKey: Record<string, DiaryDay> = {};
const listeners = new Set<() => void>();

function emit() {
  listeners.forEach((l) => l());
}

function nowIso() {
  return new Date().toISOString();
}

export function subscribeDiaryApiStore(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function getDiaryApiSnapshot(): Record<string, DiaryDay> {
  return daysByKey;
}

export function resetDiaryApiStore() {
  daysByKey = {};
  clearDiaryApiContext();
  emit();
}

export function getDiaryApiDay(scope: DiaryScope, date: string): DiaryDay | undefined {
  return daysByKey[diaryDayKey(scope, date)];
}

export async function loadDiaryApiDay(scope: DiaryScope, date: string): Promise<DiaryDay> {
  const { instituteId, teacherId } = requireDiaryApiContext();
  const rows = await listDiaryDays({
    instituteId,
    teacherId,
    scope,
    diaryDate: date,
  });
  const day = rows[0] ? diaryDtoToDay(rows[0]) : emptyDiaryDay(scope, date);
  const key = diaryDayKey(scope, date);
  daysByKey = { ...daysByKey, [key]: day };
  emit();
  return day;
}

export async function saveDiaryApiRows(
  scope: DiaryScope,
  date: string,
  rows: DiaryRow[],
): Promise<DiaryDay> {
  const { instituteId } = requireDiaryApiContext();
  const key = diaryDayKey(scope, date);
  const prev = daysByKey[key] ?? emptyDiaryDay(scope, date);
  const apiRows = diaryRowsToApiInput(rows, scope);

  let dto;
  if (prev.apiId) {
    dto = await updateDiaryDay(prev.apiId, { rows: apiRows });
  } else if (apiRows.length > 0) {
    try {
      dto = await createDiaryDay({
        instituteId,
        diaryDate: date,
        scope,
        rows: apiRows,
      });
    } catch (err) {
      if (err instanceof ApiClientError && err.status === 409) {
        const existing = await listDiaryDays({
          instituteId,
          teacherId: requireDiaryApiContext().teacherId,
          scope,
          diaryDate: date,
        });
        const found = existing[0];
        if (!found) throw err;
        dto = await updateDiaryDay(found.id, { rows: apiRows });
      } else {
        throw err;
      }
    }
  } else {
    const day: DiaryDay = {
      ...prev,
      date,
      scope,
      rows: rows.length > 0 ? rows : [newDiaryRow()],
      updatedAt: nowIso(),
    };
    daysByKey = { ...daysByKey, [key]: day };
    emit();
    return day;
  }

  const merged = diaryDtoToDay(dto);
  const incomplete = rows.filter(
    (r) => !r.className.trim() || !r.description.trim(),
  );
  merged.rows = [...merged.rows, ...incomplete];
  if (merged.rows.length === 0) merged.rows = [newDiaryRow()];

  daysByKey = { ...daysByKey, [key]: merged };
  emit();
  return merged;
}

export async function submitDiaryApiDay(
  scope: DiaryScope,
  date: string,
  rows: DiaryRow[],
): Promise<DiaryDay> {
  const saved = await saveDiaryApiRows(scope, date, rows);
  if (!saved.apiId) {
    throw new Error("Could not save diary before submit");
  }
  const dto = await submitDiaryDayApi(saved.apiId);
  const day = diaryDtoToDay(dto);
  const key = diaryDayKey(scope, date);
  daysByKey = { ...daysByKey, [key]: day };
  emit();
  return day;
}

export function isDiaryApiReady(scope: DiaryScope, date: string): boolean {
  const day = getDiaryApiDay(scope, date);
  if (!day?.rows?.length) return false;
  return day.rows.some(
    (r) => r.className.trim().length > 0 && r.description.trim().length > 0,
  );
}

export function isDiaryApiSubmitted(scope: DiaryScope, date: string): boolean {
  return isDiaryDaySubmitted(getDiaryApiDay(scope, date));
}

export function isYesterdayDiaryApiOverdue(scope: DiaryScope): boolean {
  return !isDiaryApiSubmitted(scope, yesterdayIso());
}
