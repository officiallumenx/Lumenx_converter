/**
 * Nexus global search — platform entities only (demo).
 * Never indexes student / teacher / parent personal records.
 * Results are filtered by the active Nexus operator's access areas.
 */

import { listAuditRecords, labelAuditAction } from "@/lib/audit-log-store";
import {
  labelStatus as labelInstituteStatus,
  listPlatformInstitutes,
  locationLabel,
} from "@/lib/institute-directory-store";
import {
  NEXUS_MODULE_CATALOG,
  PLAN_CATALOG,
  billingModelLabel,
  labelPaymentStatus,
  listInstituteBillingRows,
  loadLicenses,
  planLabel,
} from "@/lib/institute-licensing-store";
import { listCatalogTemplates, labelCategory as labelNotifCategory } from "@/lib/notification-template-catalog-store";
import {
  canAccessArea,
  type NexusAccessArea,
} from "@/lib/platform-access-store";
import {
  labelAlertKind,
  labelSeverity,
  listPlatformAlertRules,
  listPlatformAlerts,
} from "@/lib/platform-policies-alerts-store";
import {
  labelCategory as labelSupportCategory,
  labelStatus as labelSupportStatus,
  listSupportThreads,
} from "@/lib/support-center-store";
import { listCertificateTemplates } from "@lumenx/module-certificates";

export type NexusSearchGroup =
  | "institutes"
  | "plans"
  | "billing"
  | "support"
  | "templates"
  | "modules"
  | "policies"
  | "audit"
  | "reports";

export type NexusSearchItem = {
  id: string;
  group: NexusSearchGroup;
  title: string;
  subtitle?: string;
  /** Space-joined haystack for cmdk / filter */
  keywords: string;
  to: string;
  params?: Record<string, string>;
  accessArea: NexusAccessArea;
};

export const NEXUS_SEARCH_GROUP_LABEL: Record<NexusSearchGroup, string> = {
  institutes: "Institutes",
  plans: "Plans",
  billing: "Billing",
  support: "Support tickets",
  templates: "Templates",
  modules: "Modules",
  policies: "Policies",
  audit: "Audit records",
  reports: "Reports",
};

const GROUP_ORDER: NexusSearchGroup[] = [
  "institutes",
  "plans",
  "billing",
  "modules",
  "support",
  "templates",
  "policies",
  "audit",
  "reports",
];

function hay(...parts: Array<string | null | undefined>): string {
  return parts
    .filter(Boolean)
    .join(" ")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

/** Build the full platform search index (no person-level PII). */
export function buildNexusSearchIndex(): NexusSearchItem[] {
  const items: NexusSearchItem[] = [];
  const institutes = listPlatformInstitutes();
  const seeds = institutes.map((i) => ({
    id: i.id,
    name: i.name,
    city: i.city,
    studentCount: i.studentCount,
  }));

  for (const inst of institutes) {
    items.push({
      id: `inst-${inst.id}`,
      group: "institutes",
      title: inst.name,
      subtitle: `${locationLabel(inst)} · ${labelInstituteStatus(inst.status)} · ${planLabel(inst.plan)}`,
      keywords: hay(
        inst.name,
        inst.id,
        inst.city,
        inst.state,
        inst.board,
        inst.instituteType,
        inst.status,
        inst.plan,
        "institute",
      ),
      to: "/institutes/$id",
      params: { id: inst.id },
      accessArea: "institutes",
    });
  }

  for (const plan of PLAN_CATALOG) {
    items.push({
      id: `plan-${plan.id}`,
      group: "plans",
      title: `${plan.label} plan`,
      subtitle: plan.description,
      keywords: hay(plan.id, plan.label, plan.description, "plan", "tier", "license"),
      to: "/modules",
      accessArea: "modules",
    });
  }

  const billingRows = listInstituteBillingRows(loadLicenses(), seeds);
  for (const row of billingRows) {
    items.push({
      id: `bill-${row.instituteId}`,
      group: "billing",
      title: `${row.instituteName} · billing`,
      subtitle: `${planLabel(row.plan)} · ${billingModelLabel(row.billingModel)} · ${labelPaymentStatus(row.paymentStatus)}`,
      keywords: hay(
        row.instituteName,
        row.instituteId,
        row.city,
        row.plan,
        row.billingModel,
        row.paymentStatus,
        "billing",
        "invoice",
        "renewal",
        "payment",
      ),
      to: "/billing",
      accessArea: "billing",
    });
  }

  for (const mod of NEXUS_MODULE_CATALOG) {
    items.push({
      id: `mod-${mod.id}`,
      group: "modules",
      title: mod.label,
      subtitle: `${mod.group} · min ${planLabel(mod.minPlan)} · ${mod.description}`,
      keywords: hay(mod.id, mod.label, mod.group, mod.description, "module", "entitlement"),
      to: "/modules",
      accessArea: "modules",
    });
  }

  for (const thread of listSupportThreads()) {
    items.push({
      id: `sup-${thread.id}`,
      group: "support",
      title: thread.subject,
      subtitle: `${thread.instituteName} · ${labelSupportCategory(thread.category)} · ${labelSupportStatus(thread.status)}`,
      keywords: hay(
        thread.id,
        thread.subject,
        thread.instituteName,
        thread.instituteId,
        thread.category,
        thread.status,
        thread.assignee,
        "ticket",
        "support",
      ),
      to: "/support",
      accessArea: "support",
    });
  }

  for (const t of listCatalogTemplates()) {
    items.push({
      id: `ntpl-${t.id}`,
      group: "templates",
      title: t.name,
      subtitle: `Notification · ${labelNotifCategory(t.category)} · ${t.status}`,
      keywords: hay(t.id, t.name, t.purpose, t.category, t.status, "notification", "template"),
      to: "/notification-templates",
      accessArea: "modules",
    });
  }

  for (const t of listCertificateTemplates()) {
    items.push({
      id: `ctpl-${t.id}`,
      group: "templates",
      title: t.name,
      subtitle: `Certificate · ${t.status} · v${t.version}`,
      keywords: hay(t.id, t.name, t.status, t.familyId, "certificate", "template"),
      to: "/certificates",
      accessArea: "modules",
    });
  }

  for (const rule of listPlatformAlertRules()) {
    items.push({
      id: `rule-${rule.id}`,
      group: "policies",
      title: rule.name,
      subtitle: `Rule · ${labelAlertKind(rule.kind)} · ${rule.enabled ? "Enabled" : "Disabled"}`,
      keywords: hay(rule.id, rule.name, rule.description, rule.condition, rule.kind, "policy", "rule"),
      to: "/policies",
      accessArea: "policies",
    });
  }

  for (const alert of listPlatformAlerts()) {
    items.push({
      id: `alert-${alert.id}`,
      group: "policies",
      title: alert.title,
      subtitle: [
        labelSeverity(alert.severity),
        alert.instituteName ?? "Platform-wide",
        alert.lifecycle,
      ].join(" · "),
      keywords: hay(
        alert.id,
        alert.title,
        alert.summary,
        alert.kind,
        alert.instituteName,
        alert.instituteId,
        "policy",
        "alert",
      ),
      to: "/policies",
      accessArea: "policies",
    });
  }

  for (const rec of listAuditRecords().slice(0, 120)) {
    items.push({
      id: `aud-${rec.id}`,
      group: "audit",
      title: labelAuditAction(rec.action),
      subtitle: `${rec.targetLabel} · ${rec.operator}`,
      keywords: hay(
        rec.id,
        rec.action,
        labelAuditAction(rec.action),
        rec.targetLabel,
        rec.targetId,
        rec.operator,
        rec.summary,
        "audit",
      ),
      to: "/audit",
      accessArea: "audit",
    });
  }

  const reports: Array<{ id: string; title: string; subtitle: string; keywords: string }> = [
    {
      id: "rpt-network",
      title: "Network analytics",
      subtitle: "Cross-institute growth, adoption, and usage",
      keywords: "network analytics growth adoption usage report",
    },
    {
      id: "rpt-plans",
      title: "Plan mix report",
      subtitle: "Core / Plus / Max distribution across institutes",
      keywords: "plan mix distribution core plus max report",
    },
    {
      id: "rpt-billing",
      title: "Billing & renewals report",
      subtitle: "Portfolio payments and renewal outlook",
      keywords: "billing renewals payments overdue report",
    },
    {
      id: "rpt-support",
      title: "Support volume report",
      subtitle: "Ticket volume and resolution trends",
      keywords: "support tickets volume sla report",
    },
    {
      id: "rpt-modules",
      title: "Module adoption report",
      subtitle: "Entitlement and enablement across the network",
      keywords: "module adoption entitlement enablement report",
    },
  ];
  for (const r of reports) {
    items.push({
      id: r.id,
      group: "reports",
      title: r.title,
      subtitle: r.subtitle,
      keywords: hay(r.keywords, r.title),
      to: "/analytics",
      accessArea: "analytics",
    });
  }

  return items;
}

/** Filter index by active operator permissions (read or full). */
export function filterSearchByAccess(items: NexusSearchItem[]): NexusSearchItem[] {
  return items.filter((item) => canAccessArea(item.accessArea));
}

export function groupSearchItems(
  items: NexusSearchItem[],
  group: NexusSearchGroup,
): NexusSearchItem[] {
  return items.filter((i) => i.group === group);
}

export function orderedSearchGroups(items: NexusSearchItem[]): NexusSearchGroup[] {
  return GROUP_ORDER.filter((g) => items.some((i) => i.group === g));
}
