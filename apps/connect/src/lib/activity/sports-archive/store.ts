import {
  archiveMetadataSeed,
  cloneMetadataEntry,
  metadataKey,
  type ArchiveMetadataEntry,
} from "./metadata";
import { archiveNativeRecord, restoreNativeArchiveRecord } from "./restore-handlers";
import type { SportsArchiveInput, SportsArchiveRecord } from "./types";

function inferAcademicYear(dateIso: string): string {
  const year = Number(dateIso.slice(0, 4));
  const month = Number(dateIso.slice(5, 7));
  if (month >= 4) return `${year}–${String(year + 1).slice(-2)}`;
  return `${year - 1}–${String(year).slice(-2)}`;
}

let metadataStore = new Map<string, ArchiveMetadataEntry>(
  archiveMetadataSeed.map((e) => [metadataKey(e.sourceModule, e.sourceId), cloneMetadataEntry(e)]),
);

let runtimeManualRecords: SportsArchiveRecord[] = [];

export function getMetadataMap(): Map<string, ArchiveMetadataEntry> {
  return metadataStore;
}

export function getManualRecords(): SportsArchiveRecord[] {
  return runtimeManualRecords;
}

export function upsertMetadata(entry: ArchiveMetadataEntry): void {
  metadataStore.set(metadataKey(entry.sourceModule, entry.sourceId), cloneMetadataEntry(entry));
}

export function markMetadataRestored(
  sourceModule: ArchiveMetadataEntry["sourceModule"],
  sourceId: string,
  restoredBy: string,
): void {
  const key = metadataKey(sourceModule, sourceId);
  const prev = metadataStore.get(key) ?? {
    sourceModule,
    sourceId,
    archivedBy: "Sports Coordinator",
    reason: "Archived.",
    archivedAt: new Date().toISOString().slice(0, 10),
  };
  metadataStore.set(key, {
    ...prev,
    restoredAt: new Date().toISOString().slice(0, 10),
    restoredBy,
  });
}

export function addRuntimeManualRecord(record: SportsArchiveRecord): void {
  runtimeManualRecords = [record, ...runtimeManualRecords];
}

export async function executeArchive(input: SportsArchiveInput): Promise<void> {
  const today = new Date().toISOString().slice(0, 10);
  upsertMetadata({
    sourceModule: input.sourceModule,
    sourceId: input.sourceId,
    archivedBy: input.archivedBy,
    reason: input.reason,
    archivedAt: today,
  });

  switch (input.sourceModule) {
    case "teams":
    case "activities":
    case "practice":
    case "tournaments":
      await archiveNativeRecord(input.sourceModule, input.sourceId);
      break;
    case "attendance": {
      const { sportsRepository } = await import("@/lib/activity/sports/repositories");
      const att = sportsRepository.getAttendanceSnapshot().find((a) => a.id === input.sourceId);
      if (!att) throw new Error("Attendance record not found");
      const team = sportsRepository.getTeamsSnapshot().find((t) => t.id === att.teamId);
      addRuntimeManualRecord({
        id: `arc-attendance-${input.sourceId}`,
        sourceModule: "attendance",
        sourceId: input.sourceId,
        title: `${att.studentName} — ${att.practiceSessionTitle}`,
        subtitle: `${att.teamName} · ${att.sessionDate}`,
        academicYear: inferAcademicYear(att.sessionDate),
        teamId: att.teamId,
        teamName: att.teamName,
        sportType: team?.sportType,
        archivedAt: today,
        archivedBy: input.archivedBy,
        reason: input.reason,
        status: "archived",
        summary: `Status: ${att.status}`,
      });
      break;
    }
    case "coach_notes": {
      const { sportsRepository } = await import("@/lib/activity/sports/repositories");
      const note = sportsRepository.getCoachNotesSnapshot().find((n) => n.id === input.sourceId);
      if (!note) throw new Error("Coach note not found");
      const team = sportsRepository.getTeamsSnapshot().find((t) => t.id === note.teamId);
      addRuntimeManualRecord({
        id: `arc-coach_notes-${input.sourceId}`,
        sourceModule: "coach_notes",
        sourceId: input.sourceId,
        title: `Coach Note — ${note.studentName}`,
        subtitle: `${note.teamName} · ${note.sessionDate}`,
        academicYear: inferAcademicYear(note.sessionDate),
        teamId: note.teamId,
        teamName: note.teamName,
        sportType: team?.sportType,
        archivedAt: today,
        archivedBy: input.archivedBy,
        reason: input.reason,
        status: "archived",
      });
      break;
    }
    case "match_results":
    case "achievements":
    case "certificates":
      addRuntimeManualRecord({
        id: `arc-${input.sourceModule}-${input.sourceId}`,
        sourceModule: input.sourceModule,
        sourceId: input.sourceId,
        title: input.sourceId,
        archivedAt: today,
        archivedBy: input.archivedBy,
        reason: input.reason,
        status: "archived",
        academicYear: "2025–26",
      });
      break;
    default:
      break;
  }
}

export async function executeRestore(record: SportsArchiveRecord, restoredBy: string): Promise<void> {
  await restoreNativeArchiveRecord(record);
  markMetadataRestored(record.sourceModule, record.sourceId, restoredBy);
}

export function resetSportsArchiveStore(): void {
  metadataStore = new Map(
    archiveMetadataSeed.map((e) => [metadataKey(e.sourceModule, e.sourceId), cloneMetadataEntry(e)]),
  );
  runtimeManualRecords = [];
}
