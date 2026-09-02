import { isApiAuthMode } from "@/auth/auth-mode";
import {
  getDiaryApiDay,
  getDiaryApiSnapshot,
  isDiaryApiReady,
  isDiaryApiSubmitted,
  isYesterdayDiaryApiOverdue,
  loadDiaryApiDay,
  resetDiaryApiStore,
  saveDiaryApiRows,
  submitDiaryApiDay,
  subscribeDiaryApiStore,
} from "@/lib/diary/api-store";
import { setDiaryApiContext } from "@/lib/diary/context";
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

function useApi() {
  return isApiAuthMode();
}

export const diaryRepository = {
  configureApiContext(input: { instituteId: string; teacherId: string }) {
    setDiaryApiContext(input);
  },

  subscribe(listener: () => void) {
    if (useApi()) return subscribeDiaryApiStore(listener);
    return subscribeDiaryStore(listener);
  },

  getSnapshot() {
    if (useApi()) return getDiaryApiSnapshot();
    return getDiarySnapshot();
  },

  async loadDay(scope: DiaryScope, date: string) {
    if (useApi()) return loadDiaryApiDay(scope, date);
    return ensureDiaryDay(scope, date);
  },

  getDay(scope: DiaryScope, date: string) {
    if (useApi()) return getDiaryApiDay(scope, date);
    return getDiaryDay(scope, date);
  },

  ensureDay(scope: DiaryScope, date: string) {
    if (useApi()) {
      const existing = getDiaryApiDay(scope, date);
      if (existing) return existing;
      return {
        date,
        scope,
        rows: [{ id: `row-${Date.now()}`, className: "", description: "" }],
        updatedAt: new Date().toISOString(),
      };
    }
    return ensureDiaryDay(scope, date);
  },

  /** Local or API draft persist (UI debounces typing). */
  async saveRows(scope: DiaryScope, date: string, rows: DiaryRow[]) {
    if (useApi()) return saveDiaryApiRows(scope, date, rows);
    return setDiaryRows(scope, date, rows);
  },

  async submitToAdmin(scope: DiaryScope, date: string, rows: DiaryRow[]) {
    const draft = { date, scope, rows, updatedAt: "" };
    if (!isDiaryDayReady(draft)) {
      throw new Error("Add at least one class with a description before submitting.");
    }
    if (useApi()) {
      if (scope === "subject") {
        const complete = rows.filter(
          (r) => r.className.trim() && r.description.trim(),
        );
        if (complete.some((r) => !r.sectionId)) {
          throw new Error("Select a class section for each subject diary row.");
        }
      }
      return submitDiaryApiDay(scope, date, rows);
    }
    await delay();
    return submitDiaryDay(scope, date, rows);
  },

  isReady(scope: DiaryScope, date: string) {
    if (useApi()) return isDiaryApiReady(scope, date);
    return isDiaryReady(scope, date);
  },

  isSubmitted(scope: DiaryScope, date: string) {
    if (useApi()) return isDiaryApiSubmitted(scope, date);
    return isDiarySubmitted(scope, date);
  },

  isComplete(scope: DiaryScope, date: string) {
    return isDiaryDaySubmitted(this.getDay(scope, date));
  },

  isYesterdayOverdue(scope: DiaryScope) {
    if (useApi()) return isYesterdayDiaryApiOverdue(scope);
    return isYesterdayDiaryOverdue(scope);
  },

  reset() {
    resetDiaryStore();
    resetDiaryApiStore();
  },
};
