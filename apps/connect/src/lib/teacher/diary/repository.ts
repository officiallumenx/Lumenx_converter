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

function isApiMode() {
  return isApiAuthMode();
}

export const diaryRepository = {
  configureApiContext(input: { instituteId: string; teacherId: string }) {
    setDiaryApiContext(input);
  },

  subscribe(listener: () => void) {
    if (isApiMode()) return subscribeDiaryApiStore(listener);
    return subscribeDiaryStore(listener);
  },

  getSnapshot() {
    if (isApiMode()) return getDiaryApiSnapshot();
    return getDiarySnapshot();
  },

  async loadDay(scope: DiaryScope, date: string) {
    if (isApiMode()) return loadDiaryApiDay(scope, date);
    return ensureDiaryDay(scope, date);
  },

  getDay(scope: DiaryScope, date: string) {
    if (isApiMode()) return getDiaryApiDay(scope, date);
    return getDiaryDay(scope, date);
  },

  ensureDay(scope: DiaryScope, date: string) {
    if (isApiMode()) {
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
    if (isApiMode()) return saveDiaryApiRows(scope, date, rows);
    return setDiaryRows(scope, date, rows);
  },

  async submitToAdmin(scope: DiaryScope, date: string, rows: DiaryRow[]) {
    const draft = { date, scope, rows, updatedAt: "" };
    if (!isDiaryDayReady(draft)) {
      throw new Error(
        scope === "subject"
          ? "Fill at least one row with class & section and a description."
          : "Fill at least one row with a class and description.",
      );
    }
    if (isApiMode()) {
      return submitDiaryApiDay(scope, date, rows);
    }
    await delay();
    return submitDiaryDay(scope, date, rows);
  },

  isReady(scope: DiaryScope, date: string) {
    if (isApiMode()) return isDiaryApiReady(scope, date);
    return isDiaryReady(scope, date);
  },

  isSubmitted(scope: DiaryScope, date: string) {
    if (isApiMode()) return isDiaryApiSubmitted(scope, date);
    return isDiarySubmitted(scope, date);
  },

  isComplete(scope: DiaryScope, date: string) {
    return isDiaryDaySubmitted(this.getDay(scope, date));
  },

  isYesterdayOverdue(scope: DiaryScope) {
    if (isApiMode()) return isYesterdayDiaryApiOverdue(scope);
    return isYesterdayDiaryOverdue(scope);
  },

  reset() {
    resetDiaryStore();
    resetDiaryApiStore();
  },
};
