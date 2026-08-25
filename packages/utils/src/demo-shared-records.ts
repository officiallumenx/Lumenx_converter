import { postDemoSync } from "./demo-cross-port";

const LEAVE_DECISIONS_KEY = "lumenx.demo.leave-decisions.v1";
const COMPLAINTS_KEY = "lumenx.demo.complaints.v1";
const BROADCAST_INBOX_KEY = "lumenx.demo.broadcast-inbox.v1";
const TEACHER_LEAVE_KEY = "lumenx.demo.teacher-leave.v1";

export type DemoLeaveDecision = {
  status: "approved" | "rejected" | "ignored";
  note?: string;
  decidedAt: string;
};

export type DemoComplaint = {
  id: string;
  title: string;
  from: string;
  role: string;
  destination: "class_teacher" | "principal_admin";
  priority: "Low" | "Medium" | "High";
  status: "pending" | "review" | "resolved" | "rejected";
  time: string;
  body: string;
};

export type DemoBroadcast = {
  id: string;
  title: string;
  message: string;
  audience: string;
  priority: "normal" | "high" | "critical";
  time: string;
  /** Optional sender label (Admin, Principal, …). */
  sender?: string;
  /** Optional deep link into Connect / Admin. */
  href?: string;
  /** Optional attachment file name — no binary payload. */
  attachmentName?: string | null;
  audienceKind?: "everyone" | "parents" | "students" | "teachers" | "class_section" | "group";
  classFilter?: string;
  section?: string;
};

function readJson<T>(key: string, fallback: T): T {
  if (typeof localStorage === "undefined") return fallback;
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* ignore */
  }
}

export function loadLeaveDecisions(): Record<string, DemoLeaveDecision> {
  return readJson(LEAVE_DECISIONS_KEY, {});
}

export function saveLeaveDecision(id: string, decision: DemoLeaveDecision): void {
  const all = loadLeaveDecisions();
  all[id] = decision;
  writeJson(LEAVE_DECISIONS_KEY, all);
  postDemoSync("leave", { id, ...decision });
}

export function loadDemoComplaints(seed: DemoComplaint[] = []): DemoComplaint[] {
  const stored = readJson<DemoComplaint[]>(COMPLAINTS_KEY, []);
  if (stored.length === 0) return seed;
  const byId = new Map(seed.map((c) => [c.id, c]));
  for (const c of stored) byId.set(c.id, c);
  return [...byId.values()];
}

export function appendDemoComplaint(row: DemoComplaint): void {
  const all = loadDemoComplaints();
  writeJson(COMPLAINTS_KEY, [row, ...all.filter((c) => c.id !== row.id)]);
  postDemoSync("complaints", row);
}

export function saveDemoComplaints(rows: DemoComplaint[]): void {
  writeJson(COMPLAINTS_KEY, rows);
  postDemoSync("complaints", rows);
}

export function loadBroadcastInbox(): DemoBroadcast[] {
  return readJson(BROADCAST_INBOX_KEY, []);
}

export function appendBroadcastInbox(row: DemoBroadcast): void {
  writeJson(BROADCAST_INBOX_KEY, [row, ...loadBroadcastInbox()].slice(0, 50));
  postDemoSync("broadcast", row);
}

export function saveTeacherLeaveSnapshot(rows: unknown[]): void {
  writeJson(TEACHER_LEAVE_KEY, rows);
  postDemoSync("leave", { rows });
}

export function loadTeacherLeaveSnapshot<T>(fallback: T[]): T[] {
  const stored = readJson<T[]>(TEACHER_LEAVE_KEY, []);
  return stored.length > 0 ? stored : fallback;
}
