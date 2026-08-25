import {
  ensureDiaryDay,
  getDiaryDay,
  getDiarySnapshot,
  isDiaryReady,
  isDiarySubmitted,
  isYesterdayDiaryOverdue,
  resetDiaryStore,
  setDiaryRows,
  submitDiaryDay,
  subscribeDiaryStore,
} from "./store";
import type { DiaryRow, DiaryScope } from "./types";
import { isDiaryDayReady, isDiaryDaySubmitted } from "./types";

const delay = (ms = 200) => new Promise((r) => setTimeout(r, ms));

export const diaryRepository = {
  subscribe: subscribeDiaryStore,
  getSnapshot: getDiarySnapshot,

  getDay(scope: DiaryScope, date: string) {
    return getDiaryDay(scope, date);
  },

  ensureDay(scope: DiaryScope, date: string) {
    return ensureDiaryDay(scope, date);
  },

  /** Local draft persist (UI debounces typing). */
  saveRows(scope: DiaryScope, date: string, rows: DiaryRow[]) {
    return setDiaryRows(scope, date, rows);
  },

  /**
   * Submit day to principal admin diary (mock sync).
   * Rejects if no complete class row.
   */
  async submitToAdmin(scope: DiaryScope, date: string, rows: DiaryRow[]) {
    const draft = { date, scope, rows, updatedAt: "" };
    if (!isDiaryDayReady(draft)) {
      throw new Error("Add at least one class with a description before submitting.");
    }
    await delay();
    return submitDiaryDay(scope, date, rows);
  },

  isReady(scope: DiaryScope, date: string) {
    return isDiaryReady(scope, date);
  },

  isSubmitted(scope: DiaryScope, date: string) {
    return isDiarySubmitted(scope, date);
  },

  /** @deprecated use isSubmitted */
  isComplete(scope: DiaryScope, date: string) {
    return isDiaryDaySubmitted(getDiaryDay(scope, date));
  },

  isYesterdayOverdue(scope: DiaryScope) {
    return isYesterdayDiaryOverdue(scope);
  },

  reset() {
    resetDiaryStore();
  },
};
