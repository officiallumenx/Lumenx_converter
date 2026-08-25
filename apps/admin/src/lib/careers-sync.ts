import { postDemoSync } from "@lumenx/utils";
import {
  careersStatusToLifecycle,
  notifyCareersLifecycle,
} from "@lumenx/notifications";

const SYNC_KEY = "ues_careers_sync";
const APPLICATIONS_KEY = "ues_careers_applications";

/** Same pipeline shape as Admissions for a matching Admin board. */
export type AdminCareerStage =
  | "review"
  | "verification"
  | "interview"
  | "approved"
  | "waitlist"
  | "rejected";

export interface AdminCareerSyncRow {
  id: string;
  name: string;
  /** Job / role applied for */
  role: string;
  stage: AdminCareerStage;
  applied: string;
  docs: string;
  institute?: string;
  jobId?: string;
}

interface CareersSyncSnapshot {
  updatedAt: string;
  applications: AdminCareerSyncRow[];
}

const STAGE_TO_STATUS: Record<AdminCareerStage, string> = {
  review: "under_review",
  verification: "shortlisted",
  interview: "interview_scheduled",
  approved: "offer_accepted",
  waitlist: "on_hold",
  rejected: "rejected",
};

const STAGE_LABEL: Record<AdminCareerStage, string> = {
  review: "Moved back to review",
  verification: "Documents / shortlist verification",
  interview: "Interview scheduled",
  approved: "Offer accepted · approved to hire",
  waitlist: "Moved to waiting list",
  rejected: "Application rejected",
};

const STATUS_TO_STAGE: Record<string, AdminCareerStage> = {
  draft: "review",
  submitted: "review",
  under_review: "review",
  shortlisted: "verification",
  assessment: "verification",
  demo_class: "verification",
  interview_scheduled: "interview",
  interview_completed: "interview",
  offer_sent: "approved",
  offer_accepted: "approved",
  selected: "approved",
  on_hold: "waitlist",
  rejected: "rejected",
};

function readSnapshot(): CareersSyncSnapshot | null {
  try {
    const raw = localStorage.getItem(SYNC_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as CareersSyncSnapshot;
  } catch {
    return null;
  }
}

function writeSnapshot(snapshot: CareersSyncSnapshot) {
  localStorage.setItem(SYNC_KEY, JSON.stringify(snapshot));
  postDemoSync("careers", snapshot);
}

function normalizeStage(stage: string): AdminCareerStage {
  const known: AdminCareerStage[] = [
    "review",
    "verification",
    "interview",
    "approved",
    "waitlist",
    "rejected",
  ];
  if (known.includes(stage as AdminCareerStage)) return stage as AdminCareerStage;
  return STATUS_TO_STAGE[stage] ?? "review";
}

function normalizeRow(row: AdminCareerSyncRow): AdminCareerSyncRow {
  return { ...row, stage: normalizeStage(row.stage) };
}

export function readAdminCareerSyncRows(fallback: AdminCareerSyncRow[]): AdminCareerSyncRow[] {
  const snap = readSnapshot();
  if (!snap?.applications?.length) return fallback.map(normalizeRow);
  return snap.applications.map(normalizeRow);
}

export function subscribeCareersSync(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent) => {
    if (event.key === SYNC_KEY || event.key === APPLICATIONS_KEY || event.key === null) {
      listener();
    }
  };
  window.addEventListener("storage", onStorage);
  window.addEventListener("focus", listener);
  return () => {
    window.removeEventListener("storage", onStorage);
    window.removeEventListener("focus", listener);
  };
}

/**
 * Persist a stage change. Always updates Admin sync snapshot;
 * also updates Connect applications when present.
 */
export function persistAdminCareerStageChange(
  appId: string,
  stage: AdminCareerStage,
  currentRows: AdminCareerSyncRow[],
): AdminCareerSyncRow[] {
  const at = new Date().toISOString();
  const status = STAGE_TO_STATUS[stage];
  const label = STAGE_LABEL[stage];

  try {
    const raw = localStorage.getItem(APPLICATIONS_KEY);
    if (raw) {
      const apps = JSON.parse(raw) as Array<Record<string, unknown>>;
      const idx = apps.findIndex((a) => a.id === appId);
      if (idx >= 0) {
        const app = apps[idx]!;
        const timeline = Array.isArray(app.timeline) ? [...app.timeline] : [];
        timeline.push({ id: `sync-${Date.now()}`, status, label, at });
        apps[idx] = { ...app, status, updatedAt: at, timeline };
        localStorage.setItem(APPLICATIONS_KEY, JSON.stringify(apps));
      }
    }
  } catch {
    // Admin board still updates even if Connect store is unavailable.
  }

  const nextRows = currentRows.map((row) =>
    row.id === appId ? { ...row, stage } : row,
  );
  writeSnapshot({ updatedAt: at, applications: nextRows });

  try {
    const raw = localStorage.getItem(APPLICATIONS_KEY);
    const apps = raw ? (JSON.parse(raw) as Array<Record<string, unknown>>) : [];
    const app = apps.find((a) => a.id === appId);
    const candidateId = String(app?.candidateId ?? "");
    const jobTitle =
      String(app?.jobTitle ?? "") ||
      currentRows.find((r) => r.id === appId)?.role ||
      "the role";
    const instituteName =
      String(app?.instituteName ?? "") ||
      currentRows.find((r) => r.id === appId)?.institute ||
      "the institute";
    if (candidateId) {
      const event = careersStatusToLifecycle(status);
      notifyCareersLifecycle({
        event: stage === "approved" ? "selected" : event,
        candidateId,
        applicationId: appId,
        jobTitle,
        instituteName,
        statusLabel: label,
        detail:
          stage === "interview"
            ? "Interview details are available in your application"
            : stage === "approved"
              ? "Onboarding / joining steps will follow shortly"
              : undefined,
      });
      if (stage === "approved") {
        notifyCareersLifecycle({
          event: "onboarding",
          candidateId,
          applicationId: appId,
          jobTitle,
          instituteName,
          detail: "Joining / onboarding update — check your application for next steps",
        });
      }
    }
  } catch {
    /* notification best-effort */
  }

  return nextRows;
}

export function careerStageLabel(stage: AdminCareerStage): string {
  switch (stage) {
    case "review":
      return "Review";
    case "verification":
      return "Verification";
    case "interview":
      return "Interview";
    case "approved":
      return "Approved";
    case "waitlist":
      return "Waitlist";
    case "rejected":
      return "Rejected";
    default:
      return stage;
  }
}

export function careerStageTone(
  stage: AdminCareerStage,
): "warning" | "info" | "success" | "neutral" | "danger" {
  if (stage === "approved") return "success";
  if (stage === "rejected") return "danger";
  if (stage === "waitlist") return "neutral";
  if (stage === "review") return "warning";
  return "info";
}

/** Seed sync from fallback once so stage moves persist across reloads. */
export function ensureAdminCareerSyncSeed(
  fallback: AdminCareerSyncRow[],
): AdminCareerSyncRow[] {
  const existing = readSnapshot();
  if (existing?.applications?.length) {
    return existing.applications.map(normalizeRow);
  }
  const seeded = fallback.map((r) => normalizeRow({ ...r }));
  writeSnapshot({
    updatedAt: new Date().toISOString(),
    applications: seeded,
  });
  return seeded;
}

export { STATUS_TO_STAGE, STAGE_TO_STATUS };
