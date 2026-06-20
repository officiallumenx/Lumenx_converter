import { ADMISSIONS_STORAGE_KEYS, createBrowserAuthStorage } from "@lumenx/auth";
import type { ApplicationStatus, AdmissionApplication } from "./types";
import { normalizeApplicationStatus } from "./status-utils";

const storage = createBrowserAuthStorage();

export type AdminAdmissionStage =
  | "review"
  | "verification"
  | "interview"
  | "approved"
  | "waitlist"
  | "rejected";

export interface AdminSyncRow {
  id: string;
  name: string;
  grade: string;
  stage: AdminAdmissionStage;
  applied: string;
  docs: string;
  instituteId?: string;
}

export interface AdmissionsSyncSnapshot {
  updatedAt: string;
  applications: AdminSyncRow[];
}

const STAGE_TO_STATUS: Record<AdminAdmissionStage, ApplicationStatus> = {
  review: "under_final_review",
  verification: "document_verification",
  interview: "interview_scheduled",
  approved: "approved",
  waitlist: "waitlisted",
  rejected: "rejected",
};

const STATUS_TO_STAGE: Partial<Record<ApplicationStatus, AdminAdmissionStage>> = {
  submitted: "review",
  documents_pending: "review",
  documents_uploaded: "verification",
  document_verification: "verification",
  interview_scheduled: "interview",
  interview_completed: "interview",
  under_final_review: "review",
  under_review: "review",
  approved: "approved",
  waitlisted: "waitlist",
  rejected: "rejected",
};

function readSnapshot(): AdmissionsSyncSnapshot | null {
  try {
    const raw = storage.getItem(ADMISSIONS_STORAGE_KEYS.sync);
    if (!raw) return null;
    return JSON.parse(raw) as AdmissionsSyncSnapshot;
  } catch {
    return null;
  }
}

function writeSnapshot(snapshot: AdmissionsSyncSnapshot) {
  storage.setItem(ADMISSIONS_STORAGE_KEYS.sync, JSON.stringify(snapshot));
}

export function applicationToSyncRow(app: AdmissionApplication): AdminSyncRow {
  const verified = app.documents.filter((d) => d.status === "verified").length;
  const total = Math.max(app.documents.length, 4);
  const status = normalizeApplicationStatus(app.status);
  return {
    id: app.id,
    name: app.student.name,
    grade: app.grade,
    stage: STATUS_TO_STAGE[status] ?? "review",
    applied: app.submittedAt
      ? new Date(app.submittedAt).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" })
      : "—",
    docs: `${verified}/${total}`,
    instituteId: app.instituteId,
  };
}

/** Push Connect applications to shared demo sync storage */
export function pushSyncSnapshot(apps: AdmissionApplication[]) {
  writeSnapshot({
    updatedAt: new Date().toISOString(),
    applications: apps.map(applicationToSyncRow),
  });
}

/** Read rows for Admin admissions module */
export function readAdminSyncRows(fallback: AdminSyncRow[]): AdminSyncRow[] {
  const snap = readSnapshot();
  if (!snap?.applications?.length) return fallback;
  return snap.applications;
}

/** Admin stage change → Connect status (demo) */
export function adminStageToStatus(stage: AdminAdmissionStage): ApplicationStatus {
  return STAGE_TO_STATUS[stage];
}

/** Persist admin stage change into Connect applications + sync snapshot (demo, same origin). */
export function persistAdminStageChange(appId: string, stage: AdminAdmissionStage): boolean {
  try {
    const raw = storage.getItem(ADMISSIONS_STORAGE_KEYS.applications);
    if (!raw) return false;
    const apps = JSON.parse(raw) as AdmissionApplication[];
    const idx = apps.findIndex((a) => a.id === appId);
    if (idx < 0) return false;
    apps[idx] = applyAdminStageToApplication(apps[idx]!, stage);
    storage.setItem(ADMISSIONS_STORAGE_KEYS.applications, JSON.stringify(apps));
    pushSyncSnapshot(apps);
    return true;
  } catch {
    return false;
  }
}

export function applyAdminStageToApplication(
  app: AdmissionApplication,
  stage: AdminAdmissionStage,
): AdmissionApplication {
  const status = adminStageToStatus(stage);
  const at = new Date().toISOString();
  const label =
    stage === "approved"
      ? "Admission approved"
      : stage === "rejected"
        ? "Application rejected"
        : stage === "interview"
          ? "Interview scheduled"
          : stage === "verification"
            ? "Documents under verification"
            : "Application under review";

  return {
    ...app,
    status,
    updatedAt: at,
    timeline: [
      ...app.timeline,
      { id: `sync-${Date.now()}`, status, label, at },
    ],
  };
}
