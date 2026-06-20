/** Demo Admin ↔ Connect careers sync (shared localStorage keys, same origin). */

const SYNC_KEY = "ues_careers_sync";
const APPLICATIONS_KEY = "ues_careers_applications";

export type AdminCareerStage =
  | "review"
  | "shortlist"
  | "assessment"
  | "demo"
  | "interview"
  | "offer"
  | "hired"
  | "rejected"
  | "hold";

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

interface CareersSyncSnapshot {
  updatedAt: string;
  applications: AdminCareerSyncRow[];
}

const STAGE_TO_STATUS: Record<AdminCareerStage, string> = {
  review: "under_review",
  shortlist: "shortlisted",
  assessment: "assessment",
  demo: "demo_class",
  interview: "interview_scheduled",
  offer: "offer_sent",
  hired: "offer_accepted",
  rejected: "rejected",
  hold: "on_hold",
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
}

export function readAdminCareerSyncRows(fallback: AdminCareerSyncRow[]): AdminCareerSyncRow[] {
  const snap = readSnapshot();
  if (!snap?.applications?.length) return fallback;
  return snap.applications;
}

export function persistAdminCareerStageChange(appId: string, stage: AdminCareerStage): boolean {
  try {
    const raw = localStorage.getItem(APPLICATIONS_KEY);
    if (!raw) return false;
    const apps = JSON.parse(raw) as Array<Record<string, unknown>>;
    const idx = apps.findIndex((a) => a.id === appId);
    if (idx < 0) return false;

    const app = apps[idx]!;
    const status = STAGE_TO_STATUS[stage];
    const at = new Date().toISOString();
    const label = status.replace(/_/g, " ");

    const timeline = Array.isArray(app.timeline) ? [...app.timeline] : [];
    timeline.push({ id: `tl-${Date.now()}`, status, label, at, note: `Updated by HR (${stage})` });

    apps[idx] = { ...app, status, updatedAt: at, timeline };
    localStorage.setItem(APPLICATIONS_KEY, JSON.stringify(apps));

    const snap = readSnapshot();
    if (snap) {
      writeSnapshot({
        ...snap,
        updatedAt: at,
        applications: snap.applications.map((r) =>
          r.id === appId ? { ...r, stage } : r,
        ),
      });
    }
    return true;
  } catch {
    return false;
  }
}
