/**
 * Nexus Platform Policies & Alerts — demo / localStorage.
 * Platform-level signals only (billing, quota, security, SLA, usage, support).
 * Academic/ops rules (attendance %, marks, homework) stay in Admin — not here.
 * Does not build a separate notification delivery stack.
 */

import { listPlatformInstitutes } from "@/lib/institute-directory-store";
import { appendAuditEvent } from "@/lib/audit-log-store";

export type PlatformAlertKind =
  | "payment_overdue"
  | "renewal_approaching"
  | "storage_quota_exceeded"
  | "platform_incident"
  | "security_issue"
  | "sla_breach"
  | "institute_usage_risk"
  | "support_escalation";

export type AlertSeverity = "low" | "medium" | "high" | "critical";

export type AlertLifecycle = "active" | "handled";

export type PlatformAlert = {
  id: string;
  kind: PlatformAlertKind;
  title: string;
  summary: string;
  severity: AlertSeverity;
  lifecycle: AlertLifecycle;
  /** Optional institute scope — never person-level */
  instituteId: string | null;
  instituteName: string | null;
  createdAt: string;
  updatedAt: string;
  handledAt: string | null;
  handledBy: string | null;
  ruleId: string;
};

export type PlatformAlertRule = {
  id: string;
  kind: PlatformAlertKind;
  name: string;
  description: string;
  /** Operator-facing condition (platform metrics only) */
  condition: string;
  severityDefault: AlertSeverity;
  enabled: boolean;
  updatedAt: string;
};

const ALERTS_KEY = "lumenx.nexus.platformAlerts.v1";
const RULES_KEY = "lumenx.nexus.platformAlertRules.v1";
const CHANGE_EVENT = "lumenx-nexus-platform-alerts-changed";

function nowIso(): string {
  return new Date().toISOString();
}

function daysAgo(days: number, hour = 10): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  d.setHours(hour, 20, 0, 0);
  return d.toISOString();
}

export const PLATFORM_ALERT_KIND_LABEL: Record<PlatformAlertKind, string> = {
  payment_overdue: "Payment overdue",
  renewal_approaching: "Renewal approaching",
  storage_quota_exceeded: "Storage quota exceeded",
  platform_incident: "Platform incident",
  security_issue: "Security issue",
  sla_breach: "SLA breach",
  institute_usage_risk: "Institute usage risk",
  support_escalation: "Support escalation",
};

export const DEFAULT_PLATFORM_RULES: PlatformAlertRule[] = [
  {
    id: "rule-payment-overdue",
    kind: "payment_overdue",
    name: "Payment overdue",
    description: "Fires when an institute license payment status is overdue.",
    condition: "institute.paymentStatus = overdue",
    severityDefault: "high",
    enabled: true,
    updatedAt: daysAgo(30),
  },
  {
    id: "rule-renewal",
    kind: "renewal_approaching",
    name: "Renewal approaching",
    description: "Fires when renewal enters the configured reminder window.",
    condition: "days_until_renewal ≤ reminder window",
    severityDefault: "medium",
    enabled: true,
    updatedAt: daysAgo(30),
  },
  {
    id: "rule-storage",
    kind: "storage_quota_exceeded",
    name: "Storage quota exceeded",
    description: "Fires when institute storage pressure crosses plan quota.",
    condition: "storage_pressure ≥ 95%",
    severityDefault: "high",
    enabled: true,
    updatedAt: daysAgo(20),
  },
  {
    id: "rule-incident",
    kind: "platform_incident",
    name: "Platform incident",
    description: "Manual or system platform outage / degradation signal.",
    condition: "platform.health ≠ operational OR operator-declared",
    severityDefault: "critical",
    enabled: true,
    updatedAt: daysAgo(14),
  },
  {
    id: "rule-security",
    kind: "security_issue",
    name: "Security issue",
    description: "Suspicious Nexus operator access or token anomalies.",
    condition: "failed_nexus_logins ≥ threshold OR token anomaly",
    severityDefault: "critical",
    enabled: true,
    updatedAt: daysAgo(14),
  },
  {
    id: "rule-sla",
    kind: "sla_breach",
    name: "SLA breach",
    description: "Support ticket exceeds platform SLA clock.",
    condition: "support.ticket.open_beyond_sla = true",
    severityDefault: "high",
    enabled: true,
    updatedAt: daysAgo(10),
  },
  {
    id: "rule-usage",
    kind: "institute_usage_risk",
    name: "Institute usage risk",
    description: "Sharp decline or inactive usage on a live institute.",
    condition: "usage_drop ≥ 15 pts OR usageStatus = inactive",
    severityDefault: "medium",
    enabled: true,
    updatedAt: daysAgo(10),
  },
  {
    id: "rule-support-esc",
    kind: "support_escalation",
    name: "Support escalation",
    description: "High-priority support thread escalated to Nexus operators.",
    condition: "support.priority = high AND status ∈ {open, in_progress}",
    severityDefault: "high",
    enabled: true,
    updatedAt: daysAgo(7),
  },
];

function seedAlerts(): PlatformAlert[] {
  const live = listPlatformInstitutes().filter((i) => i.status !== "archived");
  const oak = live.find((i) => i.id === "ins-test1school");
  const harbor = live.find((i) => i.id === "ins-test1school");
  const jaipur = live.find((i) => i.id === "ins-test1school");
  const kochi = live.find((i) => i.id === "ins-test1school");
  const pune = live.find((i) => i.id === "ins-test1school");

  const alerts: PlatformAlert[] = [
    {
      id: "alert-platform-ingest",
      kind: "platform_incident",
      title: "Elevated ingest lag",
      summary: "Platform metrics ingest lag above 5s for 12 minutes. Institute apps unaffected; Nexus dashboards delayed.",
      severity: "medium",
      lifecycle: "active",
      instituteId: null,
      instituteName: null,
      createdAt: daysAgo(0, 8),
      updatedAt: daysAgo(0, 8),
      handledAt: null,
      handledBy: null,
      ruleId: "rule-incident",
    },
    {
      id: "alert-security-nexus",
      kind: "security_issue",
      title: "Repeated failed Nexus operator sign-in",
      summary: "Multiple failed attempts against nexus_root from a new ASN. No institute Admin credentials involved.",
      severity: "critical",
      lifecycle: "active",
      instituteId: null,
      instituteName: null,
      createdAt: daysAgo(0, 7),
      updatedAt: daysAgo(0, 7),
      handledAt: null,
      handledBy: null,
      ruleId: "rule-security",
    },
  ];

  if (oak) {
    alerts.push({
      id: "alert-oak-pay",
      kind: "payment_overdue",
      title: "Payment overdue",
      summary: `${oak.name} Max yearly license payment is overdue.`,
      severity: "high",
      lifecycle: "active",
      instituteId: oak.id,
      instituteName: oak.name,
      createdAt: daysAgo(5, 11),
      updatedAt: daysAgo(5, 11),
      handledAt: null,
      handledBy: null,
      ruleId: "rule-payment-overdue",
    });
    alerts.push({
      id: "alert-oak-sla",
      kind: "sla_breach",
      title: "SLA breach",
      summary: `Support thread on ${oak.name} exceeded billing SLA clock.`,
      severity: "high",
      lifecycle: "active",
      instituteId: oak.id,
      instituteName: oak.name,
      createdAt: daysAgo(1, 14),
      updatedAt: daysAgo(1, 14),
      handledAt: null,
      handledBy: null,
      ruleId: "rule-sla",
    });
  }

  if (harbor) {
    alerts.push({
      id: "alert-harbor-renewal",
      kind: "renewal_approaching",
      title: "Renewal approaching",
      summary: `${harbor.name} Plus monthly renewal enters reminder window.`,
      severity: "medium",
      lifecycle: "active",
      instituteId: harbor.id,
      instituteName: harbor.name,
      createdAt: daysAgo(2, 9),
      updatedAt: daysAgo(2, 9),
      handledAt: null,
      handledBy: null,
      ruleId: "rule-renewal",
    });
  }

  if (kochi) {
    alerts.push({
      id: "alert-kochi-renewal",
      kind: "renewal_approaching",
      title: "Renewal approaching",
      summary: `${kochi.name} renewal due today.`,
      severity: "high",
      lifecycle: "active",
      instituteId: kochi.id,
      instituteName: kochi.name,
      createdAt: daysAgo(0, 6),
      updatedAt: daysAgo(0, 6),
      handledAt: null,
      handledBy: null,
      ruleId: "rule-renewal",
    });
  }

  if (jaipur) {
    alerts.push({
      id: "alert-jaipur-usage",
      kind: "institute_usage_risk",
      title: "Institute usage risk",
      summary: `${jaipur.name} usage inactive with sharp decline from prior months.`,
      severity: "high",
      lifecycle: "active",
      instituteId: jaipur.id,
      instituteName: jaipur.name,
      createdAt: daysAgo(3, 12),
      updatedAt: daysAgo(3, 12),
      handledAt: null,
      handledBy: null,
      ruleId: "rule-usage",
    });
    alerts.push({
      id: "alert-jaipur-support",
      kind: "support_escalation",
      title: "Support escalation",
      summary: `High-priority access thread for ${jaipur.name} escalated to Support Center.`,
      severity: "high",
      lifecycle: "active",
      instituteId: jaipur.id,
      instituteName: jaipur.name,
      createdAt: daysAgo(0, 8),
      updatedAt: daysAgo(0, 8),
      handledAt: null,
      handledBy: null,
      ruleId: "rule-support-esc",
    });
  }

  if (pune) {
    alerts.push({
      id: "alert-pune-storage",
      kind: "storage_quota_exceeded",
      title: "Storage quota exceeded",
      summary: `${pune.name} storage pressure estimate crossed plan quota threshold.`,
      severity: "high",
      lifecycle: "handled",
      instituteId: pune.id,
      instituteName: pune.name,
      createdAt: daysAgo(9, 15),
      updatedAt: daysAgo(8, 10),
      handledAt: daysAgo(8, 10),
      handledBy: "ops.priya",
      ruleId: "rule-storage",
    });
  }

  alerts.push({
    id: "alert-security-handled",
    kind: "security_issue",
    title: "API key rotation anomaly",
    summary: "Stale platform service key used once; rotated and revoked.",
    severity: "medium",
    lifecycle: "handled",
    instituteId: null,
    instituteName: null,
    createdAt: daysAgo(14, 18),
    updatedAt: daysAgo(13, 9),
    handledAt: daysAgo(13, 9),
    handledBy: "nexus_root",
    ruleId: "rule-security",
  });

  return alerts.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
}

function notify(): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(CHANGE_EVENT));
  }
}

function readJson<T>(key: string, fallback: () => T): T {
  if (typeof localStorage === "undefined") return fallback();
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      const seeded = fallback();
      localStorage.setItem(key, JSON.stringify(seeded));
      return seeded;
    }
    return JSON.parse(raw) as T;
  } catch {
    return fallback();
  }
}

function writeJson(key: string, value: unknown): void {
  if (typeof localStorage === "undefined") return;
  localStorage.setItem(key, JSON.stringify(value));
  notify();
}

export function subscribePlatformAlerts(listener: () => void): () => void {
  if (typeof window === "undefined") return () => {};
  const onStorage = (e: StorageEvent) => {
    if (e.key === ALERTS_KEY || e.key === RULES_KEY) listener();
  };
  window.addEventListener(CHANGE_EVENT, listener);
  window.addEventListener("storage", onStorage);
  return () => {
    window.removeEventListener(CHANGE_EVENT, listener);
    window.removeEventListener("storage", onStorage);
  };
}

export function listPlatformAlertRules(): PlatformAlertRule[] {
  const stored = readJson<PlatformAlertRule[]>(RULES_KEY, () => DEFAULT_PLATFORM_RULES);
  // Merge any new default kinds without wiping operator toggles
  const byId = new Map(stored.map((r) => [r.id, r]));
  for (const def of DEFAULT_PLATFORM_RULES) {
    if (!byId.has(def.id)) byId.set(def.id, def);
  }
  return DEFAULT_PLATFORM_RULES.map((def) => byId.get(def.id) ?? def);
}

export function listPlatformAlerts(): PlatformAlert[] {
  return readJson<PlatformAlert[]>(ALERTS_KEY, seedAlerts).sort(
    (a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export function listActivePlatformAlerts(): PlatformAlert[] {
  return listPlatformAlerts().filter((a) => a.lifecycle === "active");
}

export function listHandledPlatformAlerts(): PlatformAlert[] {
  return listPlatformAlerts().filter((a) => a.lifecycle === "handled");
}

export function markAlertHandled(alertId: string, operator = "nexus_root"): PlatformAlert | null {
  const all = listPlatformAlerts();
  const idx = all.findIndex((a) => a.id === alertId);
  if (idx < 0) return null;
  const cur = all[idx]!;
  if (cur.lifecycle === "handled") return cur;
  const next: PlatformAlert = {
    ...cur,
    lifecycle: "handled",
    handledAt: nowIso(),
    handledBy: operator,
    updatedAt: nowIso(),
  };
  all[idx] = next;
  writeJson(ALERTS_KEY, all);
  return next;
}

export function reopenAlert(alertId: string): PlatformAlert | null {
  const all = listPlatformAlerts();
  const idx = all.findIndex((a) => a.id === alertId);
  if (idx < 0) return null;
  const cur = all[idx]!;
  const next: PlatformAlert = {
    ...cur,
    lifecycle: "active",
    handledAt: null,
    handledBy: null,
    updatedAt: nowIso(),
  };
  all[idx] = next;
  writeJson(ALERTS_KEY, all);
  return next;
}

export function setAlertRuleEnabled(ruleId: string, enabled: boolean): PlatformAlertRule | null {
  const rules = listPlatformAlertRules();
  const idx = rules.findIndex((r) => r.id === ruleId);
  if (idx < 0) return null;
  const cur = rules[idx]!;
  if (cur.enabled === enabled) return cur;
  const next = { ...cur, enabled, updatedAt: nowIso() };
  rules[idx] = next;
  writeJson(RULES_KEY, rules);
  appendAuditEvent({
    action: "policy_changed",
    targetId: next.id,
    targetLabel: next.name,
    targetKind: "policy",
    before: cur.enabled ? "Enabled" : "Paused",
    after: enabled ? "Enabled" : "Paused",
    summary: "Platform alert rule toggled",
  });
  return next;
}

export function platformAlertStats(alerts: PlatformAlert[]) {
  const active = alerts.filter((a) => a.lifecycle === "active");
  return {
    active: active.length,
    handled: alerts.filter((a) => a.lifecycle === "handled").length,
    critical: active.filter((a) => a.severity === "critical").length,
    high: active.filter((a) => a.severity === "high").length,
    rulesEnabled: listPlatformAlertRules().filter((r) => r.enabled).length,
    rulesTotal: listPlatformAlertRules().length,
  };
}

export function labelAlertKind(kind: PlatformAlertKind): string {
  return PLATFORM_ALERT_KIND_LABEL[kind];
}

export function labelSeverity(s: AlertSeverity): string {
  if (s === "critical") return "Critical";
  if (s === "high") return "High";
  if (s === "medium") return "Medium";
  return "Low";
}

export function severityTone(s: AlertSeverity): "success" | "warning" | "danger" | "info" | "neutral" {
  if (s === "critical" || s === "high") return "danger";
  if (s === "medium") return "warning";
  return "info";
}

export function formatAlertDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "—";
  return d.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
