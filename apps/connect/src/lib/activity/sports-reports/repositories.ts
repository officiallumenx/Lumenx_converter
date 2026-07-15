import {
  buildDefaultFilters,
  buildSportsReportsSnapshot,
  listCoachFilterOptions,
  listTeamFilterOptions,
} from "./aggregate";
import type { SportsReportsFilters, SportsReportsSnapshot } from "./types";
import { mockExportSportsReport } from "./exports";
import type { SportsReportExportFormat } from "./types";

const delay = (ms = 240) => new Promise((r) => setTimeout(r, ms));

let cachedSnapshot: SportsReportsSnapshot | null = null;
let cachedFilters: SportsReportsFilters = buildDefaultFilters();

export const sportsReportsRepository = {
  async getReports(filters?: Partial<SportsReportsFilters>): Promise<SportsReportsSnapshot> {
    await delay();
    const merged = { ...cachedFilters, ...filters };
    cachedFilters = merged;
    cachedSnapshot = buildSportsReportsSnapshot(merged);
    return cachedSnapshot;
  },
  getReportsSnapshot(): SportsReportsSnapshot | null {
    return cachedSnapshot;
  },
  getDefaultFilters(): SportsReportsFilters {
    return buildDefaultFilters();
  },
  listTeamFilterOptions() {
    return listTeamFilterOptions();
  },
  listCoachFilterOptions() {
    return listCoachFilterOptions();
  },
  async exportReport(format: SportsReportExportFormat) {
    await delay(400);
    const snapshot = cachedSnapshot ?? buildSportsReportsSnapshot(cachedFilters);
    return mockExportSportsReport(snapshot, format);
  },
  reset() {
    cachedSnapshot = null;
    cachedFilters = buildDefaultFilters();
  },
};
