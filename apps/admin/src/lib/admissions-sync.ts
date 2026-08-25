/** Demo Admin ↔ Connect admissions sync (shared localStorage keys, same origin). */

import {
  admissionsStageToLifecycle,
  notifyAdmissionsLifecycle,
} from "@lumenx/notifications";

const SYNC_KEY = "ues_admissions_sync";
const APPLICATIONS_KEY = "ues_admissions_applications";
const CONVERTED_KEY = "ues_admissions_converted";

/** Cross-window message when Connect Admissions updates a stage (different ports). */
export const ADMISSIONS_SYNC_MESSAGE = "lumenx-admissions-sync";

/** Admin → Connect: please push the latest admissions sync snapshot. */
export const ADMISSIONS_SYNC_REQUEST = "lumenx-admissions-sync-request";

export type AdminAdmissionStage =
  | "submitted"
  | "review"
  | "verification"
  | "approved"
  | "parent_confirmation"
  | "waitlisted"
  | "rejected"
  | "withdrawn";

export interface AdminSyncRow {
  id: string;
  name: string;
  grade: string;
  stage: AdminAdmissionStage;
  applied: string;
  docs: string;
  instituteId?: string;
}

export type AdmissionsSyncMessage = {
  type: typeof ADMISSIONS_SYNC_MESSAGE;
  applications: AdminSyncRow[];
  updatedAt: string;
};

interface AdmissionsSyncSnapshot {
  updatedAt: string;
  applications: AdminSyncRow[];
}

const STAGE_TO_STATUS: Record<AdminAdmissionStage, string> = {
  submitted: "submitted",
  review: "review",
  verification: "verification",
  parent_confirmation: "parent_confirmation",
  waitlisted: "waitlisted",
  approved: "approved",
  rejected: "rejected",
  withdrawn: "withdrawn",
};

const STAGE_LABEL: Record<AdminAdmissionStage, string> = {
  submitted: "Application submitted",
  review: "Moved back to review",
  verification: "Moved to verification",
  parent_confirmation: "Awaiting parent confirmation",
  waitlisted: "Moved to waitlist",
  approved: "Admission approved",
  rejected: "Application rejected",
  withdrawn: "Application withdrawn",
};

const STATUS_TO_STAGE: Record<string, AdminAdmissionStage> = {
  draft: "submitted",
  submitted: "submitted",
  review: "review",
  verification: "verification",
  parent_confirmation: "parent_confirmation",
  documents_pending: "verification",
  documents_uploaded: "verification",
  document_verification: "verification",
  interview_scheduled: "verification",
  interview_completed: "verification",
  under_final_review: "review",
  under_review: "review",
  approved: "approved",
  waitlisted: "waitlisted",
  rejected: "rejected",
  withdrawn: "withdrawn",
};

const KNOWN_STAGES: AdminAdmissionStage[] = [
  "submitted",
  "review",
  "verification",
  "parent_confirmation",
  "waitlisted",
  "approved",
  "rejected",
  "withdrawn",
];

function readSnapshot(): AdmissionsSyncSnapshot | null {
  try {
    const raw = localStorage.getItem(SYNC_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as AdmissionsSyncSnapshot;
  } catch {
    return null;
  }
}

function writeSnapshot(snapshot: AdmissionsSyncSnapshot) {
  localStorage.setItem(SYNC_KEY, JSON.stringify(snapshot));
}

function normalizeStage(stage: string): AdminAdmissionStage {
  if (KNOWN_STAGES.includes(stage as AdminAdmissionStage)) {
    return stage as AdminAdmissionStage;
  }
  return STATUS_TO_STAGE[stage] ?? "review";
}

function normalizeRow(row: AdminSyncRow): AdminSyncRow {
  return { ...row, stage: normalizeStage(String(row.stage)) };
}

export function loadConvertedAdmissionIds(): Set<string> {
  try {
    const raw = localStorage.getItem(CONVERTED_KEY);
    if (!raw) return new Set();
    const parsed = JSON.parse(raw) as string[];
    return new Set(Array.isArray(parsed) ? parsed : []);
  } catch {
    return new Set();
  }
}

export function markAdmissionConverted(appId: string): void {
  const next = loadConvertedAdmissionIds();
  next.add(appId);
  localStorage.setItem(CONVERTED_KEY, JSON.stringify([...next]));
}

export function subscribeAdmissionsSync(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (event: StorageEvent) => {
    if (
      event.key === SYNC_KEY ||
      event.key === APPLICATIONS_KEY ||
      event.key === CONVERTED_KEY ||
      event.key === null
    ) {
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

function readConnectApplicationRows(): AdminSyncRow[] {
  try {
    const raw = localStorage.getItem(APPLICATIONS_KEY);
    if (!raw) return [];
    const apps = JSON.parse(raw) as Array<Record<string, unknown>>;
    if (!Array.isArray(apps)) return [];
    return apps
      .filter((a) => a && a.id && a.status && a.status !== "draft")
      .map((a) => {
        const status = String(a.status);
        const stage = STATUS_TO_STAGE[status] ?? "review";
        return normalizeRow(rowFromConnectApp(a, stage));
      });
  } catch {
    return [];
  }
}

/**
 * Merge order:
 * 1) Existing Admin sync snapshot (or empty)
 * 2) Connect applications on this origin (status → stage)
 * 3) Incoming rows from Connect postMessage (highest priority for shared ids)
 * 4) Fallback seed rows for ids still missing; restore seed “approved”
 *    applicants that were dropped from a stale sync (until converted)
 * Then drop apps already converted to students.
 */
export function mergeAdmissionRows(
  fallback: AdminSyncRow[],
  incoming?: AdminSyncRow[],
): AdminSyncRow[] {
  const byId = new Map<string, AdminSyncRow>();
  const incomingIds = new Set((incoming ?? []).map((row) => row.id));
  const converted = loadConvertedAdmissionIds();

  for (const row of readSnapshot()?.applications ?? []) {
    byId.set(row.id, normalizeRow(row));
  }
  for (const row of readConnectApplicationRows()) {
    byId.set(row.id, row);
  }
  for (const row of incoming ?? []) {
    byId.set(row.id, normalizeRow(row));
  }
  for (const row of fallback) {
    const normalized = normalizeRow(row);
    if (!byId.has(normalized.id)) {
      byId.set(normalized.id, normalized);
      continue;
    }
    // Demo seed approved applicants must stay visible until Convert to student.
    // Stale sync sometimes keeps the id at an earlier stage after a bad overwrite.
    if (
      normalized.stage === "approved" &&
      !converted.has(normalized.id) &&
      !incomingIds.has(normalized.id) &&
      byId.get(normalized.id)?.stage !== "approved"
    ) {
      byId.set(normalized.id, normalized);
    }
  }

  const merged = [...byId.values()].filter((row) => !converted.has(row.id));
  writeSnapshot({
    updatedAt: new Date().toISOString(),
    applications: merged,
  });
  return merged;
}

export function readAdminSyncRows(fallback: AdminSyncRow[]): AdminSyncRow[] {
  return mergeAdmissionRows(fallback);
}

/** Read-only snapshot for Home / subscriptions — never writes. */
export function peekAdminSyncRows(fallback: AdminSyncRow[]): AdminSyncRow[] {
  const converted = loadConvertedAdmissionIds();
  const snap = readSnapshot();
  if (snap?.applications?.length) {
    return snap.applications.map(normalizeRow).filter((row) => !converted.has(row.id));
  }
  return fallback.map(normalizeRow).filter((row) => !converted.has(row.id));
}

function rowFromConnectApp(
  a: Record<string, unknown>,
  stage: AdminAdmissionStage,
): AdminSyncRow {
  const docs = Array.isArray(a.documents) ? a.documents : [];
  const verified = docs.filter((d: { status?: string }) => d.status === "verified").length;
  const student = a.student as { name?: string } | undefined;
  return {
    id: String(a.id),
    name: student?.name ?? "Applicant",
    grade: String(a.grade ?? "—"),
    stage,
    applied: a.submittedAt
      ? new Date(String(a.submittedAt)).toLocaleDateString("en-IN", {
          day: "numeric",
          month: "short",
          year: "numeric",
        })
      : "—",
    docs: `${verified}/${Math.max(docs.length, 4)}`,
    instituteId: a.instituteId as string | undefined,
  };
}

/**
 * Persist a stage change for one application (waitlist / approve / resume, etc.).
 * Always updates Admin sync snapshot; also updates Connect applications when present.
 */
export function persistAdminStageChange(
  appId: string,
  stage: AdminAdmissionStage,
  currentRows: AdminSyncRow[],
): AdminSyncRow[] {
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
    const applicantId = String(app?.applicantId ?? app?.parentId ?? "");
    const student =
      app && typeof app.student === "object" && app.student
        ? (app.student as Record<string, unknown>)
        : null;
    const studentName =
      (student && String(student.name ?? "")) ||
      currentRows.find((r) => r.id === appId)?.name ||
      "Applicant";
    const event = admissionsStageToLifecycle(stage);
    if (applicantId && event) {
      notifyAdmissionsLifecycle({
        event,
        applicantId,
        applicationId: appId,
        studentName,
        statusLabel: label,
        detail:
          stage === "verification"
            ? "Interview / document verification is in progress"
            : undefined,
      });
    }
  } catch {
    /* notification best-effort */
  }

  return nextRows;
}

export function stageLabel(stage: AdminAdmissionStage): string {
  switch (stage) {
    case "submitted":
      return "Submitted";
    case "review":
      return "Review";
    case "verification":
      return "Verification";
    case "parent_confirmation":
      return "Parent confirmation";
    case "waitlisted":
      return "Waitlist";
    case "approved":
      return "Approved";
    case "rejected":
      return "Rejected";
    case "withdrawn":
      return "Withdrawn";
    default:
      return stage;
  }
}

export function stageTone(
  stage: AdminAdmissionStage,
): "warning" | "info" | "success" | "neutral" | "danger" {
  if (stage === "approved") return "success";
  if (stage === "rejected") return "danger";
  if (stage === "withdrawn") return "neutral";
  if (stage === "waitlisted") return "neutral";
  if (stage === "submitted" || stage === "review") return "warning";
  return "info";
}

/** Seed / refresh Admin admissions board from sync + Connect apps + fallback. */
export function ensureAdminSyncSeed(fallback: AdminSyncRow[]): AdminSyncRow[] {
  return mergeAdmissionRows(fallback);
}

/** Apply rows received from Connect (cross-port postMessage). */
export function applyIncomingAdmissionRows(
  fallback: AdminSyncRow[],
  incoming: AdminSyncRow[],
): AdminSyncRow[] {
  return mergeAdmissionRows(fallback, incoming);
}

export { STATUS_TO_STAGE, rowFromConnectApp };
