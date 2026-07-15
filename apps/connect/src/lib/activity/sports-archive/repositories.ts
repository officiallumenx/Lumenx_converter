import {
  aggregateSportsArchiveRecords,
  applyArchiveFilters,
  buildArchiveFilterOptions,
  listArchiveCandidates,
} from "./aggregate";
import { executeArchive, executeRestore, resetSportsArchiveStore } from "./store";
import type {
  SportsArchiveInput,
  SportsArchiveListFilters,
  SportsArchiveRecord,
  SportsArchiveRestoreInput,
} from "./types";

const delay = (ms = 180) => new Promise((r) => setTimeout(r, ms));

export const sportsArchiveRepository = {
  async listRecords(filters?: SportsArchiveListFilters): Promise<SportsArchiveRecord[]> {
    await delay();
    return applyArchiveFilters(aggregateSportsArchiveRecords(), filters);
  },
  getRecordsSnapshot(filters?: SportsArchiveListFilters): SportsArchiveRecord[] {
    return applyArchiveFilters(aggregateSportsArchiveRecords(), filters);
  },
  async getFilterOptions() {
    await delay(80);
    return buildArchiveFilterOptions(aggregateSportsArchiveRecords());
  },
  async listCandidates() {
    await delay(100);
    return listArchiveCandidates();
  },
  async archive(input: SportsArchiveInput): Promise<SportsArchiveRecord[]> {
    await delay(240);
    await executeArchive(input);
    return applyArchiveFilters(aggregateSportsArchiveRecords());
  },
  async restore(
    record: SportsArchiveRecord,
    input: SportsArchiveRestoreInput,
  ): Promise<SportsArchiveRecord[]> {
    await delay(240);
    await executeRestore(record, input.restoredBy);
    return applyArchiveFilters(aggregateSportsArchiveRecords());
  },
  reset() {
    resetSportsArchiveStore();
  },
};
