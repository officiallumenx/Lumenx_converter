/** Centralized audit & activity log — Admin changes only. Never logs private chats. */

export type AuditModule =
  | "Attendance"
  | "Marks"
  | "Students"
  | "Teachers"
  | "Admissions"
  | "Fees"
  | "Leave"
  | "Complaints"
  | "Notifications"
  | "Documents"
  | "Settings"
  | "Storage"
  | "Platform";

export type AuditStatus = "success" | "warning" | "info" | "error";

export type AuditEntry = {
  id: string;
  user: string;
  role: string;
  action: string;
  target: string;
  module: AuditModule;
  status: AuditStatus;
  at: string;
  atSort: string;
  /** Always Admin for platform audit (teacher/parent chat never recorded). */
  actorScope: "admin";
};

export const AUDIT_MODULES: AuditModule[] = [
  "Attendance",
  "Marks",
  "Students",
  "Teachers",
  "Admissions",
  "Fees",
  "Leave",
  "Complaints",
  "Notifications",
  "Documents",
  "Settings",
  "Storage",
  "Platform",
];

const STORAGE_KEY = "lumenx.admin.audit-log.v1";

/** Modules / action patterns that must never be audited (private communications). */
const PRIVATE_CHAT_BLOCKLIST = [
  "private chat",
  "direct message",
  "dm ",
  "conversation",
  "chat message",
  "message thread",
];

const SEED: AuditEntry[] = [
  {
    id: "AUD-1001",
    user: "Admin R. Chen",
    role: "Admin",
    action: "Published marks",
    target: "MTH-101 · Mid-term",
    module: "Marks",
    status: "success",
    at: "Today · 09:14",
    atSort: "2026-06-20T09:14:00",
    actorScope: "admin",
  },
  {
    id: "AUD-1000",
    user: "Dr. Alistair Vance",
    role: "Principal",
    action: "Approved teacher leave",
    target: "A. Mehta · TLR-012",
    module: "Leave",
    status: "success",
    at: "Today · 08:52",
    atSort: "2026-06-20T08:52:00",
    actorScope: "admin",
  },
  {
    id: "AUD-999",
    user: "Admin R. Chen",
    role: "Admin",
    action: "Approved admission",
    target: "Application #ADM-4421",
    module: "Admissions",
    status: "success",
    at: "Today · 08:30",
    atSort: "2026-06-20T08:30:00",
    actorScope: "admin",
  },
  {
    id: "AUD-998",
    user: "Principal",
    role: "Principal",
    action: "Resolved complaint",
    target: "CMP-201 · HVAC Block B",
    module: "Complaints",
    status: "success",
    at: "Yesterday · 16:20",
    atSort: "2026-06-19T16:20:00",
    actorScope: "admin",
  },
  {
    id: "AUD-997",
    user: "Admin R. Chen",
    role: "Admin",
    action: "Restored from recycle bin",
    target: "Old fee circular.pdf",
    module: "Storage",
    status: "info",
    at: "Yesterday · 11:05",
    atSort: "2026-06-19T11:05:00",
    actorScope: "admin",
  },
  {
    id: "AUD-996",
    user: "Principal",
    role: "Principal",
    action: "Flushed offline sync queue",
    target: "2 pending mutations",
    module: "Platform",
    status: "success",
    at: "18 Jun · 13:44",
    atSort: "2026-06-18T13:44:00",
    actorScope: "admin",
  },
];

function isPrivateChatAttempt(action: string, target: string, module: string): boolean {
  const hay = `${action} ${target} ${module}`.toLowerCase();
  return PRIVATE_CHAT_BLOCKLIST.some((blocked) => hay.includes(blocked));
}

function readStored(): AuditEntry[] {
  if (typeof localStorage === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as AuditEntry[];
    return Array.isArray(parsed) ? parsed.filter((e) => e.actorScope === "admin") : [];
  } catch {
    return [];
  }
}

function writeStored(entries: AuditEntry[]): void {
  if (typeof localStorage === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(entries.slice(0, 500)));
  } catch {
    // Ignore quota / private mode.
  }
}

function formatAt(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleString(undefined, {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/** Admin changes only. Returns null if the event looks like a private chat. */
export function appendAdminAuditEntry(input: {
  user: string;
  role?: string;
  action: string;
  target: string;
  module: AuditModule;
  status?: AuditStatus;
}): AuditEntry | null {
  if (isPrivateChatAttempt(input.action, input.target, input.module)) {
    return null;
  }
  const atSort = new Date().toISOString();
  const entry: AuditEntry = {
    id: `AUD-${Date.now()}`,
    user: input.user,
    role: input.role ?? "Admin",
    action: input.action,
    target: input.target,
    module: input.module,
    status: input.status ?? "success",
    at: formatAt(atSort),
    atSort,
    actorScope: "admin",
  };
  writeStored([entry, ...readStored()]);
  return entry;
}

export function getAuditLog(): AuditEntry[] {
  const stored = readStored();
  const seedIds = new Set(SEED.map((s) => s.id));
  const extras = stored.filter((e) => !seedIds.has(e.id));
  return [...extras, ...SEED]
    .filter((e) => e.actorScope === "admin")
    .filter((e) => !isPrivateChatAttempt(e.action, e.target, e.module))
    .sort((a, b) => b.atSort.localeCompare(a.atSort));
}

export function filterAuditLog(
  entries: AuditEntry[],
  q: string,
  module: AuditModule | "all",
  status: AuditStatus | "all",
): AuditEntry[] {
  return entries.filter((e) => {
    if (e.actorScope !== "admin") return false;
    if (module !== "all" && e.module !== module) return false;
    if (status !== "all" && e.status !== status) return false;
    if (!q.trim()) return true;
    const hay = `${e.user} ${e.action} ${e.target} ${e.module} ${e.role}`.toLowerCase();
    return hay.includes(q.toLowerCase());
  });
}
