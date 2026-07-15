import type { SportsArchiveModule } from "./types";

export interface ArchiveMetadataEntry {
  sourceModule: SportsArchiveModule;
  sourceId: string;
  archivedBy: string;
  reason: string;
  archivedAt?: string;
  restoredAt?: string;
  restoredBy?: string;
}

function key(module: SportsArchiveModule, sourceId: string): string {
  return `${module}:${sourceId}`;
}

export const archiveMetadataSeed: ArchiveMetadataEntry[] = [
  {
    sourceModule: "teams",
    sourceId: "team-swimming-legacy",
    archivedBy: "Sports Coordinator",
    reason: "Academic year ended — squad archived for records.",
    archivedAt: "2025-05-15",
  },
  {
    sourceModule: "teams",
    sourceId: "team-tabletennis-legacy",
    archivedBy: "Sports Coordinator",
    reason: "Team disbanded after inter-house season.",
    archivedAt: "2025-04-01",
  },
  {
    sourceModule: "activities",
    sourceId: "sact-9",
    archivedBy: "Neha Kulkarni",
    reason: "Previous academic year session — retained for audit.",
    archivedAt: "2025-04-15",
  },
  {
    sourceModule: "tournaments",
    sourceId: "tourn-4",
    archivedBy: "Suresh Kumar",
    reason: "Tournament completed and archived.",
    archivedAt: "2025-12-01",
  },
  {
    sourceModule: "practice",
    sourceId: "psess-6",
    archivedBy: "Coach Vikram Singh",
    reason: "Superseded by new season schedule.",
    archivedAt: "2025-06-01",
  },
  {
    sourceModule: "attendance",
    sourceId: "att-arch-1",
    archivedBy: "Coach Vikram Singh",
    reason: "Session records consolidated into annual report.",
    archivedAt: "2025-05-20",
  },
  {
    sourceModule: "coach_notes",
    sourceId: "cnote-arch-1",
    archivedBy: "Coach Meera Iyer",
    reason: "Student transferred — notes archived.",
    archivedAt: "2025-04-10",
  },
  {
    sourceModule: "match_results",
    sourceId: "mres-arch-1",
    archivedBy: "Sports Coordinator",
    reason: "Season results filed to archive.",
    archivedAt: "2025-11-20",
  },
  {
    sourceModule: "achievements",
    sourceId: "ach-arch-1",
    archivedBy: "Sports Coordinator",
    reason: "Duplicate entry removed — original retained.",
    archivedAt: "2025-03-15",
  },
  {
    sourceModule: "certificates",
    sourceId: "cert-arch-1",
    archivedBy: "Admin Office",
    reason: "Certificate reissued — old version archived.",
    archivedAt: "2025-02-28",
  },
];

export function metadataKey(module: SportsArchiveModule, sourceId: string): string {
  return key(module, sourceId);
}

export function cloneMetadataEntry(e: ArchiveMetadataEntry): ArchiveMetadataEntry {
  return { ...e };
}
