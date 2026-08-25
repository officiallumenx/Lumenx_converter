import { CAREERS_STORAGE_KEYS, createBrowserAuthStorage } from "@lumenx/auth";
import { postDemoSync } from "@lumenx/utils";
import type { ApplicationStatus, JobApplication } from "./types";
import { normalizeApplicationStatus } from "./status-utils";

const storage = createBrowserAuthStorage();

/** Aligned with Admin Careers board (same columns as Admissions). */
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
  role: string;
  institute: string;
  stage: AdminCareerStage;
  applied: string;
  docs: string;
  jobId?: string;
}

export interface CareersSyncSnapshot {
  updatedAt: string;
  applications: AdminCareerSyncRow[];
}

const STAGE_TO_STATUS: Record<AdminCareerStage, ApplicationStatus> = {
  review: "under_review",
  verification: "shortlisted",
  interview: "interview_scheduled",
  approved: "offer_accepted",
  waitlist: "on_hold",
  rejected: "rejected",
};

const STATUS_TO_STAGE: Partial<Record<ApplicationStatus, AdminCareerStage>> = {
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
  rejected: "rejected",
  on_hold: "waitlist",
};

function readSnapshot(): CareersSyncSnapshot | null {
  try {
    const raw = storage.getItem(CAREERS_STORAGE_KEYS.sync);
    if (!raw) return null;
    return JSON.parse(raw) as CareersSyncSnapshot;
  } catch {
    return null;
  }
}

function writeSnapshot(snapshot: CareersSyncSnapshot) {
  storage.setItem(CAREERS_STORAGE_KEYS.sync, JSON.stringify(snapshot));
  postDemoSync("careers", snapshot);
  try {
    window.opener?.postMessage({ type: "lumenx-careers-sync", ...snapshot }, "*");
  } catch {
    /* ignore */
  }
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
  return STATUS_TO_STAGE[stage as ApplicationStatus] ?? "review";
}

export function applicationToSyncRow(app: JobApplication): AdminCareerSyncRow {
  const verified = app.documents.filter((d) => d.status === "verified").length;
  const total = Math.max(app.documents.length, 5);
  const status = normalizeApplicationStatus(app.status);
  return {
    id: app.id,
    name: app.personal.name,
    role: app.jobTitle,
    institute: app.instituteName,
    stage: STATUS_TO_STAGE[status] ?? "review",
    applied: app.submittedAt
      ? new Date(app.submittedAt).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "—",
    docs: `${verified}/${total}`,
    jobId: app.jobId,
  };
}

export function pushSyncSnapshot(apps: JobApplication[]) {
  const snapshot: CareersSyncSnapshot = {
    updatedAt: new Date().toISOString(),
    applications: apps.map(applicationToSyncRow),
  };
  writeSnapshot(snapshot);
}

export function readAdminSyncRows(fallback: JobApplication[]): AdminCareerSyncRow[] {
  const snap = readSnapshot();
  if (snap?.applications?.length) {
    return snap.applications.map((row) => ({
      ...row,
      stage: normalizeStage(row.stage),
    }));
  }
  return fallback.map(applicationToSyncRow);
}

export function persistAdminStageChange(
  appId: string,
  stage: AdminCareerStage,
  apps: JobApplication[],
  onSave: (apps: JobApplication[]) => void,
): JobApplication | undefined {
  const status = STAGE_TO_STATUS[stage];
  const idx = apps.findIndex((a) => a.id === appId);
  if (idx < 0) return undefined;
  const app = apps[idx]!;
  const updated: JobApplication = {
    ...app,
    status,
    updatedAt: new Date().toISOString(),
    timeline: [
      ...app.timeline,
      {
        id: `tl-${Date.now()}`,
        status,
        label: status.replace(/_/g, " "),
        at: new Date().toISOString(),
        note: `Updated by HR (${stage})`,
      },
    ],
  };
  const next = [...apps];
  next[idx] = updated;
  onSave(next);
  pushSyncSnapshot(next);
  return updated;
}

export { STAGE_TO_STATUS, STATUS_TO_STAGE };
