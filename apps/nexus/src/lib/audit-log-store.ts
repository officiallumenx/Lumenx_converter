/**
 * Nexus Audit Log — single platform governance trail (demo / localStorage).
 * Records Nexus operator actions only. No student/teacher/parent personal data.
 * Do not add a second audit system elsewhere.
 */

export type AuditAction =
  | "institute_created"
  | "institute_suspended"
  | "institute_archived"
  | "plan_changed"
  | "billing_changed"
  | "module_enabled"
  | "module_disabled"
  | "policy_changed"
  | "support_status_changed"
  | "platform_setting_changed";

export type AuditRecord = {
  id: string;
  at: string;
  operator: string;
  action: AuditAction;
  /** Institute id or resource id (thread, rule, setting key) */
  targetId: string;
  /** Human label — institute name or resource title · never person PII */
  targetLabel: string;
  targetKind: "institute" | "license" | "module" | "policy" | "support" | "settings" | "platform";
  before?: string;
  after?: string;
  summary?: string;
};

const STORAGE_KEY = "lumenx.nexus.auditLog.v1";
const CHANGE_EVENT = "lumenx-nexus-audit-log-changed";

/** Demo operator acting on mutations when not specified. */
export const AUDIT_DEFAULT_OPERATOR = "nexus_root";

export const AUDIT_ACTION_LABEL: Record<AuditAction, string> = {
  institute_created: "Institute created",
  institute_suspended: "Institute suspended",
  institute_archived: "Institute archived",
  plan_changed: "Plan changed",
  billing_changed: "Billing changed",
  module_enabled: "Module enabled",
  module_disabled: "Module disabled",
  policy_changed: "Policy changed",
  support_status_changed: "Support status changed",
  platform_setting_changed: "Platform setting changed",
};

function nowIso(): string {
  return new Date().toISOString();
}

function uid(): string {
  return `aud-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;
}

function daysAgo(days: number, hour = 11): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, 30, 0, 0);
  return d.toISOString();
}

function seedAuditLog(): AuditRecord[] {
  return [
    {
      id: "aud-seed-1",
      at: daysAgo(0, 11),
      operator: "ops.priya",
      action: "support_status_changed",
      targetId: "sup-oak-billing",
      targetLabel: "Oakridge Public School · Annual Max invoice",
      targetKind: "support",
      before: "Open",
      after: "In Progress",
      summary: "Support thread status updated",
    },
    {
      id: "aud-seed-2",
      at: daysAgo(0, 9),
      operator: "nexus_root",
      action: "module_disabled",
      targetId: "ins-delhi-riverside",
      targetLabel: "Delhi Riverside Academy · Transport",
      targetKind: "module",
      before: "Enabled",
      after: "Disabled",
      summary: "Entitlement off · data retained",
    },
    {
      id: "aud-seed-3",
      at: daysAgo(1, 16),
      operator: "billing.neha",
      action: "billing_changed",
      targetId: "ins-mumbai-harbor",
      targetLabel: "Harbor High School",
      targetKind: "license",
      before: "per_institute · ₹24,999",
      after: "per_student · ₹25 × headcount",
      summary: "Billing model reconfigured",
    },
    {
      id: "aud-seed-4",
      at: daysAgo(2, 10),
      operator: "ops.arjun",
      action: "plan_changed",
      targetId: "ins-delhi-riverside",
      targetLabel: "Delhi Riverside Academy",
      targetKind: "license",
      before: "Plus",
      after: "Max",
      summary: "Plan upgraded",
    },
    {
      id: "aud-seed-5",
      at: daysAgo(3, 14),
      operator: "ops.priya",
      action: "policy_changed",
      targetId: "rule-storage",
      targetLabel: "Storage quota exceeded",
      targetKind: "policy",
      before: "Paused",
      after: "Enabled",
      summary: "Platform alert rule toggled",
    },
    {
      id: "aud-seed-6",
      at: daysAgo(4, 12),
      operator: "nexus_root",
      action: "institute_created",
      targetId: "ins-hyderabad-lotus",
      targetLabel: "Lotus International",
      targetKind: "institute",
      before: "—",
      after: "Trial · Plus",
      summary: "Institute onboarded on platform",
    },
    {
      id: "aud-seed-7",
      at: daysAgo(6, 9),
      operator: "ops.arjun",
      action: "institute_suspended",
      targetId: "ins-jaipur-heritage",
      targetLabel: "Heritage Academy Jaipur",
      targetKind: "institute",
      before: "Active",
      after: "Suspended",
      summary: "Institute suspended from platform access",
    },
    {
      id: "aud-seed-8",
      at: daysAgo(8, 15),
      operator: "nexus_root",
      action: "institute_archived",
      targetId: "ins-ahmedabad-north",
      targetLabel: "Northgate Academy",
      targetKind: "institute",
      before: "Suspended",
      after: "Archived",
      summary: "Institute archived",
    },
    {
      id: "aud-seed-9",
      at: daysAgo(9, 11),
      operator: "ops.priya",
      action: "module_enabled",
      targetId: "ins-mumbai-harbor",
      targetLabel: "Harbor High School · Analytics",
      targetKind: "module",
      before: "Disabled",
      after: "Enabled",
      summary: "Module entitlement restored",
    },
    {
      id: "aud-seed-10",
      at: daysAgo(11, 17),
      operator: "nexus_root",
      action: "platform_setting_changed",
      targetId: "setting.audit_retention",
      targetLabel: "Audit log retention",
      targetKind: "settings",
      before: "90 days",
      after: "1 year",
      summary: "Platform default updated",
    },
  ].sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

function notify(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }
}

function readLog(): AuditRecord[] {
  if (typeof localStorage === "undefined") return seedAuditLog();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const seeded = seedAuditLog();
      localStorage.setItem(STORAGE_KEY, JSON.stringify(seeded));
      return seeded;
    }
    const parsed = JSON.parse(raw) as AuditRecord[];
    return Array.isArray(parsed) ? parsed : seedAuditLog();
  } catch {
    return seedAuditLog();
  }
}

function writeLog(records: AuditRecord[]): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  notify();
}

export type AppendAuditInput = {
  action: AuditAction;
  operator?: string;
  targetId: string;
  targetLabel: string;
  targetKind: AuditRecord["targetKind"];
  before?: string;
  after?: string;
  summary?: string;
  at?: string;
};

export function appendAuditEvent(input: AppendAuditInput): AuditRecord {
  const record: AuditRecord = {
    id: uid(),
    at: input.at ?? nowIso(),
    operator: (input.operator ?? AUDIT_DEFAULT_OPERATOR).trim() || AUDIT_DEFAULT_OPERATOR,
    action: input.action,
    targetId: input.targetId,
    targetLabel: input.targetLabel,
    targetKind: input.targetKind,
    before: input.before,
    after: input.after,
    summary: input.summary,
  };
  const next = [record, ...readLog()].slice(0, 500);
  writeLog(next);
  return record;
}

export function listAuditRecords(): AuditRecord[] {
  return readLog().sort((a, b) => new Date(b.at).getTime() - new Date(a.at).getTime());
}

export function subscribeAuditLog(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (e: StorageEvent) => {
    if (e.key === STORAGE_KEY) listener();
  };
  window.addEventListener(CHANGE_EVENT, listener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function auditStats(records: AuditRecord[]) {
  const last24h = Date.now() - 24 * 60 * 60 * 1000;
  return {
    total: records.length,
    last24h: records.filter((r) => new Date(r.at).getTime() >= last24h).length,
    institutes: records.filter((r) => r.action.startsWith("institute_")).length,
    commercial: records.filter((r) =>
      ["plan_changed", "billing_changed", "module_enabled", "module_disabled"].includes(r.action),
    ).length,
    governance: records.filter((r) =>
      ["policy_changed", "support_status_changed", "platform_setting_changed"].includes(r.action),
    ).length,
  };
}

export function labelAuditAction(action: AuditAction): string {
  return AUDIT_ACTION_LABEL[action];
}

export function formatAuditDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}
