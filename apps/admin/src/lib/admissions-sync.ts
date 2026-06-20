/** Demo Admin ↔ Connect admissions sync (shared localStorage keys, same origin). */

const SYNC_KEY = "ues_admissions_sync";
const APPLICATIONS_KEY = "ues_admissions_applications";

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

interface AdmissionsSyncSnapshot {
  updatedAt: string;
  applications: AdminSyncRow[];
}

const STAGE_TO_STATUS: Record<AdminAdmissionStage, string> = {
  review: "under_final_review",
  verification: "document_verification",
  interview: "interview_scheduled",
  approved: "approved",
  waitlist: "waitlisted",
  rejected: "rejected",
};

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

export function readAdminSyncRows(fallback: AdminSyncRow[]): AdminSyncRow[] {
  const snap = readSnapshot();
  if (!snap?.applications?.length) return fallback;
  return snap.applications;
}

export function persistAdminStageChange(appId: string, stage: AdminAdmissionStage): boolean {
  try {
    const raw = localStorage.getItem(APPLICATIONS_KEY);
    if (!raw) return false;
    const apps = JSON.parse(raw) as Array<Record<string, unknown>>;
    const idx = apps.findIndex((a) => a.id === appId);
    if (idx < 0) return false;

    const app = apps[idx]!;
    const status = STAGE_TO_STATUS[stage];
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

    const timeline = Array.isArray(app.timeline) ? [...app.timeline] : [];
    timeline.push({ id: `sync-${Date.now()}`, status, label, at });

    apps[idx] = { ...app, status, updatedAt: at, timeline };
    localStorage.setItem(APPLICATIONS_KEY, JSON.stringify(apps));

    writeSnapshot({
      updatedAt: at,
      applications: apps.map((a) => {
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
      }),
    });
    return true;
  } catch {
    return false;
  }
}
