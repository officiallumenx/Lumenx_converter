import { achievementsRepository } from "@/lib/activity/achievements/repositories";
import { certificatesRepository } from "@/lib/activity/certificates/repositories";
import { sportsRepository } from "@/lib/activity/sports/repositories";
import { getPracticeSessionByIdFromStore } from "@/lib/activity/sports/practice-sessions-store";
import type { SportType } from "@/lib/activity/sports/types";
import { archiveMetadataSeed, metadataKey } from "./metadata";
import { manualArchiveRecordsSeed } from "./manual-records";
import { getMetadataMap, getManualRecords } from "./store";
import { inferAcademicYear } from "./academic-year";
import type {
  SportsArchiveListFilters,
  SportsArchiveModule,
  SportsArchiveRecord,
  SportsArchiveRecordStatus,
} from "./types";

function recordId(module: SportsArchiveModule, sourceId: string): string {
  return `arc-${module}-${sourceId}`;
}

function resolveMetadata(module: SportsArchiveModule, sourceId: string) {
  const map = getMetadataMap();
  const key = metadataKey(module, sourceId);
  return map.get(key);
}

function buildRecord(
  partial: Omit<SportsArchiveRecord, "id" | "status"> & {
    status?: SportsArchiveRecordStatus;
  },
): SportsArchiveRecord {
  const meta = resolveMetadata(partial.sourceModule, partial.sourceId);
  const status: SportsArchiveRecordStatus =
    meta?.restoredAt || partial.status === "restored" ? "restored" : "archived";
  return {
    ...partial,
    id: recordId(partial.sourceModule, partial.sourceId),
    archivedAt: meta?.archivedAt ?? partial.archivedAt,
    archivedBy: meta?.archivedBy ?? partial.archivedBy,
    reason: meta?.reason ?? partial.reason,
    status,
    restoredAt: meta?.restoredAt,
    restoredBy: meta?.restoredBy,
  };
}

function teamFromSnapshot(): SportsArchiveRecord[] {
  return sportsRepository
    .getTeamsSnapshot()
    .filter((t) => t.status === "archived")
    .map((t) =>
      buildRecord({
        sourceModule: "teams",
        sourceId: t.id,
        title: t.name,
        subtitle: `${t.sportType.replace(/_/g, " ")} · ${t.academicYear}`,
        academicYear: t.academicYear,
        teamId: t.id,
        teamName: t.name,
        sportType: t.sportType,
        archivedAt: t.archivedAt ?? t.updatedAt,
        archivedBy: "Sports Coordinator",
        reason: "Team archived.",
        summary: `${t.stats.totalMembers} members`,
      }),
    );
}

function resolveTeamName(teamId: string | undefined): string | undefined {
  if (!teamId) return undefined;
  return sportsRepository.getTeamsSnapshot().find((t) => t.id === teamId)?.name;
}

function activitiesFromSnapshot(): SportsArchiveRecord[] {
  return sportsRepository
    .getActivitiesSnapshot()
    .filter((a) => a.status === "archived")
    .map((a) => {
      const teamId = a.linkedTeamIds[0];
      const teamName = resolveTeamName(teamId);
      return buildRecord({
        sourceModule: "activities",
        sourceId: a.id,
        title: a.title,
        subtitle: `${teamName ?? "Multi-team"} · ${a.date}`,
        academicYear: inferAcademicYear(a.date),
        teamId,
        teamName,
        sportType: a.sportType,
        archivedAt: a.archivedAt ?? a.updatedAt,
        archivedBy: a.coordinators.coach,
        reason: "Activity archived.",
        summary: a.activityType,
      });
    });
}

function practiceFromSnapshot(): SportsArchiveRecord[] {
  const native = sportsRepository
    .getPracticeSessionsSnapshot()
    .filter((s) => s.status === "archived")
    .map((s) =>
      buildRecord({
        sourceModule: "practice",
        sourceId: s.id,
        title: s.title,
        subtitle: `${s.teamName} · ${s.date}`,
        academicYear: inferAcademicYear(s.date),
        teamId: s.teamId,
        teamName: s.teamName,
        sportType: inferSportFromTeam(s.teamId),
        archivedAt: s.archivedAt ?? s.updatedAt,
        archivedBy: s.coach,
        reason: "Practice session archived.",
      }),
    );

  const overlay: SportsArchiveRecord[] = [];
  for (const meta of archiveMetadataSeed) {
    if (meta.sourceModule !== "practice") continue;
    const key = metadataKey(meta.sourceModule, meta.sourceId);
    const stored = getMetadataMap().get(key) ?? meta;
    if (stored.restoredAt) continue;
    const session = getPracticeSessionByIdFromStore(meta.sourceId);
    if (!session || session.status === "archived") continue;
    overlay.push(
      buildRecord({
        sourceModule: "practice",
        sourceId: session.id,
        title: session.title,
        subtitle: `${session.teamName} · ${session.date}`,
        academicYear: inferAcademicYear(session.date),
        teamId: session.teamId,
        teamName: session.teamName,
        sportType: inferSportFromTeam(session.teamId),
        archivedAt: stored.archivedAt ?? session.updatedAt,
        archivedBy: stored.archivedBy,
        reason: stored.reason,
      }),
    );
  }
  return [...native, ...overlay];
}

function tournamentsFromSnapshot(): SportsArchiveRecord[] {
  return sportsRepository
    .getTournamentsSnapshot()
    .filter((t) => t.status === "archived")
    .map((t) => {
      const teamId = t.linkedTeamIds[0];
      const teamName = resolveTeamName(teamId);
      return buildRecord({
        sourceModule: "tournaments",
        sourceId: t.id,
        title: t.name,
        subtitle: `${t.venue} · ${t.startDate}`,
        academicYear: t.academicYear,
        teamId,
        teamName,
        sportType: t.sportType,
        archivedAt: t.archivedAt ?? t.updatedAt,
        archivedBy: t.organizer,
        reason: "Tournament archived.",
        summary: t.tournamentType,
      });
    });
}

function certificatesFromSnapshot(): SportsArchiveRecord[] {
  return certificatesRepository
    .getCertificatesSnapshot()
    .filter((c) => c.status === "revoked")
    .map((c) =>
      buildRecord({
        sourceModule: "certificates",
        sourceId: c.id,
        title: `Certificate ${c.certificateNumber} — ${c.studentName}`,
        subtitle: c.templateName,
        academicYear: inferAcademicYear(c.issueDate),
        teamId: c.teamId,
        teamName: c.teamName,
        sportType: c.category === "sports" ? "football" : undefined,
        archivedAt: c.revokedAt ?? c.updatedAt,
        archivedBy: "Admin Office",
        reason: c.revokeReason ?? "Certificate revoked.",
      }),
    );
}

function manualRecords(): SportsArchiveRecord[] {
  const seeded = manualArchiveRecordsSeed.map((r) => {
    const meta = resolveMetadata(r.sourceModule, r.sourceId);
    if (meta?.restoredAt) {
      return { ...r, status: "restored" as const, restoredAt: meta.restoredAt, restoredBy: meta.restoredBy };
    }
    return buildRecord(r);
  });
  const runtime = getManualRecords().map((r) => buildRecord(r));
  const seen = new Set<string>();
  return [...seeded, ...runtime].filter((r) => {
    const k = metadataKey(r.sourceModule, r.sourceId);
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

function inferSportFromTeam(teamId: string): SportType | undefined {
  const team = sportsRepository.getTeamsSnapshot().find((t) => t.id === teamId);
  return team?.sportType;
}

export function aggregateSportsArchiveRecords(): SportsArchiveRecord[] {
  const byKey = new Map<string, SportsArchiveRecord>();

  const sources = [
    ...teamFromSnapshot(),
    ...activitiesFromSnapshot(),
    ...practiceFromSnapshot(),
    ...tournamentsFromSnapshot(),
    ...certificatesFromSnapshot(),
    ...manualRecords(),
  ];

  for (const record of sources) {
    byKey.set(metadataKey(record.sourceModule, record.sourceId), record);
  }

  return [...byKey.values()];
}

export function applyArchiveFilters(
  records: SportsArchiveRecord[],
  filters?: SportsArchiveListFilters,
): SportsArchiveRecord[] {
  let list = [...records];
  const f = filters ?? {};

  if (f.status && f.status !== "all") {
    list = list.filter((r) => r.status === f.status);
  } else if (f.historyTab === "archived") {
    list = list.filter((r) => r.status === "archived");
  } else if (f.historyTab === "restored") {
    list = list.filter((r) => r.status === "restored");
  }

  if (f.sourceModule && f.sourceModule !== "all") {
    list = list.filter((r) => r.sourceModule === f.sourceModule);
  }

  if (f.academicYear && f.academicYear !== "all") {
    list = list.filter((r) => r.academicYear === f.academicYear);
  }

  if (f.teamId && f.teamId !== "all") {
    list = list.filter((r) => r.teamId === f.teamId);
  }

  if (f.sportType && f.sportType !== "all") {
    list = list.filter((r) => r.sportType === f.sportType);
  }

  if (f.archivedDate && f.archivedDate !== "all") {
    list = list.filter((r) => r.archivedAt === f.archivedDate);
  }

  const q = f.query?.trim().toLowerCase();
  if (q) {
    list = list.filter(
      (r) =>
        r.title.toLowerCase().includes(q) ||
        r.subtitle?.toLowerCase().includes(q) ||
        r.reason.toLowerCase().includes(q) ||
        r.archivedBy.toLowerCase().includes(q) ||
        r.teamName?.toLowerCase().includes(q),
    );
  }

  const sortBy = f.sortBy ?? "archivedAt";
  const sortDir = f.sortDir ?? "desc";
  list.sort((a, b) => {
    let cmp = 0;
    if (sortBy === "title") cmp = a.title.localeCompare(b.title);
    else if (sortBy === "module") cmp = a.sourceModule.localeCompare(b.sourceModule);
    else cmp = a.archivedAt.localeCompare(b.archivedAt);
    return sortDir === "asc" ? cmp : -cmp;
  });

  return list;
}

export interface SportsArchiveFilterOptions {
  academicYears: string[];
  teams: { id: string; name: string }[];
  sportTypes: SportType[];
  archivedDates: string[];
}

export function buildArchiveFilterOptions(records: SportsArchiveRecord[]): SportsArchiveFilterOptions {
  const years = new Set<string>();
  const teams = new Map<string, string>();
  const sports = new Set<SportType>();
  const dates = new Set<string>();

  for (const r of records) {
    years.add(r.academicYear);
    if (r.teamId && r.teamName) teams.set(r.teamId, r.teamName);
    if (r.sportType) sports.add(r.sportType);
    dates.add(r.archivedAt);
  }

  return {
    academicYears: [...years].sort().reverse(),
    teams: [...teams.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name)),
    sportTypes: [...sports].sort(),
    archivedDates: [...dates].sort().reverse(),
  };
}

export interface ArchiveCandidate {
  sourceModule: SportsArchiveModule;
  sourceId: string;
  label: string;
  teamName?: string;
}

/** Active records eligible for archiving from this module. */
export function listArchiveCandidates(): ArchiveCandidate[] {
  const candidates: ArchiveCandidate[] = [];
  const archivedKeys = new Set(
    aggregateSportsArchiveRecords()
      .filter((r) => r.status === "archived")
      .map((r) => metadataKey(r.sourceModule, r.sourceId)),
  );

  for (const t of sportsRepository.getTeamsSnapshot()) {
    if (t.status !== "archived") {
      candidates.push({
        sourceModule: "teams",
        sourceId: t.id,
        label: t.name,
        teamName: t.name,
      });
    }
  }

  for (const a of sportsRepository.getActivitiesSnapshot()) {
    if (a.status !== "archived" && a.status !== "cancelled") {
      const teamName = resolveTeamName(a.linkedTeamIds[0]);
      candidates.push({
        sourceModule: "activities",
        sourceId: a.id,
        label: a.title,
        teamName,
      });
    }
  }

  for (const s of sportsRepository.getPracticeSessionsSnapshot()) {
    if (s.status !== "archived" && s.status !== "cancelled") {
      candidates.push({
        sourceModule: "practice",
        sourceId: s.id,
        label: s.title,
        teamName: s.teamName,
      });
    }
  }

  for (const t of sportsRepository.getTournamentsSnapshot()) {
    if (t.status !== "archived" && t.status !== "cancelled") {
      candidates.push({
        sourceModule: "tournaments",
        sourceId: t.id,
        label: t.name,
        teamName: resolveTeamName(t.linkedTeamIds[0]),
      });
    }
  }

  for (const a of achievementsRepository.getAchievementsSnapshot().slice(0, 4)) {
    const key = metadataKey("achievements", a.id);
    if (!archivedKeys.has(key)) {
      candidates.push({
        sourceModule: "achievements",
        sourceId: a.id,
        label: a.title,
        teamName: a.teamName,
      });
    }
  }

  for (const att of sportsRepository.getAttendanceSnapshot().slice(0, 3)) {
    const key = metadataKey("attendance", att.id);
    if (!archivedKeys.has(key)) {
      candidates.push({
        sourceModule: "attendance",
        sourceId: att.id,
        label: `${att.studentName} — ${att.sessionDate}`,
        teamName: att.teamName,
      });
    }
  }

  for (const n of sportsRepository.getCoachNotesSnapshot().slice(0, 3)) {
    const key = metadataKey("coach_notes", n.id);
    if (!archivedKeys.has(key)) {
      candidates.push({
        sourceModule: "coach_notes",
        sourceId: n.id,
        label: `${n.studentName} — ${n.teamName}`,
        teamName: n.teamName,
      });
    }
  }

  return candidates;
}
