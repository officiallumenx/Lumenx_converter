/**
 * Nexus Health & Risks — demo aggregates only.
 * Two lanes: Institute Risk (ops health) and Nexus Business Risk (commercial retention).
 * No person-level records.
 */

import {
  formatCount,
  listPlatformInstitutes,
  locationLabel,
  type PlatformInstitute,
} from "@/lib/institute-directory-store";
import {
  formatDateTime,
  formatMoneyInr,
  listUpcomingReminders,
  loadLicenses,
  nextRenewalDate,
  resolveInstituteModules,
  type InstituteLicense,
} from "@/lib/institute-licensing-store";

export type RiskLevel = "low" | "medium" | "high";

export type SuggestedAction =
  | "Send institute message"
  | "Review support ticket"
  | "Send payment reminder"
  | "Review modules"
  | "Contact institute";

export type HealthRiskKind = "institute" | "business";

export type HealthRiskItem = {
  id: string;
  kind: HealthRiskKind;
  instituteId: string;
  instituteName: string;
  location: string;
  /** Short risk title */
  risk: string;
  reason: string;
  date: string;
  level: RiskLevel;
  suggestedAction: SuggestedAction;
  /** Optional deep-link hint for UI */
  actionTo?: "/support" | "/billing" | "/modules" | "/institutes/$id";
};

const IMPORTANT_MODULES: { id: string; label: string }[] = [
  { id: "student-attendance", label: "Student Attendance" },
  { id: "fees", label: "Fees" },
  { id: "transport", label: "Transport" },
  { id: "exams", label: "Exams" },
  { id: "analytics", label: "Analytics" },
  { id: "storage", label: "Storage" },
];

function live(institutes: PlatformInstitute[]): PlatformInstitute[] {
  return institutes.filter((i) => i.status !== "archived");
}

function usageDeltaPts(i: PlatformInstitute): number {
  if (i.usageTrend.length < 2) return 0;
  const last = i.usageTrend[i.usageTrend.length - 1]!;
  const prev = i.usageTrend[i.usageTrend.length - 2]!;
  return last - prev;
}

function usageDropFromPeak(i: PlatformInstitute): number {
  if (i.usageTrend.length < 2) return 0;
  const peak = Math.max(...i.usageTrend);
  const last = i.usageTrend[i.usageTrend.length - 1]!;
  return peak - last;
}

function studentDeclineEstimate(i: PlatformInstitute): number {
  const drop = usageDropFromPeak(i);
  if (drop < 15) return 0;
  return -Math.round(i.studentCount * (drop / 100) * 0.35);
}

function storagePressurePct(i: PlatformInstitute): number {
  return Math.min(
    98,
    Math.round(
      i.activeUsagePct * 0.9 +
        (i.riskStatus === "high" || i.riskStatus === "critical" ? 12 : 0),
    ),
  );
}

function isoDaysAgo(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d.toISOString();
}

function levelTone(level: RiskLevel): "success" | "warning" | "danger" {
  if (level === "low") return "success";
  if (level === "medium") return "warning";
  return "danger";
}

function levelRank(level: RiskLevel): number {
  if (level === "high") return 0;
  if (level === "medium") return 1;
  return 2;
}

function buildInstituteRisks(institutes: PlatformInstitute[]): HealthRiskItem[] {
  const items: HealthRiskItem[] = [];

  for (const i of live(institutes)) {
    const loc = locationLabel(i);
    const delta = usageDeltaPts(i);
    const drop = usageDropFromPeak(i);

    // Usage suddenly declined
    if (delta <= -8 || drop >= 20) {
      items.push({
        id: `inst-usage-drop-${i.id}`,
        kind: "institute",
        instituteId: i.id,
        instituteName: i.name,
        location: loc,
        risk: "Usage suddenly declined",
        reason: `Active usage fell ${Math.abs(delta)} pts month-over-month (peak drop ${drop} pts).`,
        date: isoDaysAgo(2),
        level: drop >= 30 || delta <= -15 ? "high" : "medium",
        suggestedAction: "Send institute message",
        actionTo: "/institutes/$id",
      });
    }

    // Student count significantly declined
    const enrollDelta = studentDeclineEstimate(i);
    if (enrollDelta <= -40) {
      items.push({
        id: `inst-enroll-${i.id}`,
        kind: "institute",
        instituteId: i.id,
        instituteName: i.name,
        location: loc,
        risk: "Student count significantly declined",
        reason: `Estimated enrollment signal −${formatCount(Math.abs(enrollDelta))} vs recent peak (aggregate only).`,
        date: isoDaysAgo(5),
        level: Math.abs(enrollDelta) >= 120 ? "high" : "medium",
        suggestedAction: "Contact institute",
        actionTo: "/institutes/$id",
      });
    }

    // Very low activity
    if (i.activeUsagePct > 0 && i.activeUsagePct < 35 && i.usageStatus !== "inactive") {
      items.push({
        id: `inst-low-activity-${i.id}`,
        kind: "institute",
        instituteId: i.id,
        instituteName: i.name,
        location: loc,
        risk: "Very low activity",
        reason: `Active usage at ${i.activeUsagePct}% — below healthy platform threshold.`,
        date: isoDaysAgo(1),
        level: i.activeUsagePct < 20 ? "high" : "medium",
        suggestedAction: "Send institute message",
        actionTo: "/institutes/$id",
      });
    }

    // No meaningful recent usage
    if (i.usageStatus === "inactive" || i.activeUsagePct < 10 || i.status === "suspended") {
      items.push({
        id: `inst-no-usage-${i.id}`,
        kind: "institute",
        instituteId: i.id,
        instituteName: i.name,
        location: loc,
        risk: "No meaningful recent usage",
        reason:
          i.status === "suspended"
            ? "Institute is suspended — platform activity effectively stopped."
            : `Usage status “${i.usageStatus}” with ${i.activeUsagePct}% active signal.`,
        date: isoDaysAgo(3),
        level: "high",
        suggestedAction: "Contact institute",
        actionTo: "/institutes/$id",
      });
    }

    // Important module disabled (one highest-priority signal per institute)
    if (i.status === "active" || i.status === "trial") {
      const modules = resolveInstituteModules(i.id);
      const disabledImportant = IMPORTANT_MODULES.filter((m) => modules[m.id] === false);
      const primary = disabledImportant[0];
      if (primary) {
        items.push({
          id: `inst-mod-${i.id}-${primary.id}`,
          kind: "institute",
          instituteId: i.id,
          instituteName: i.name,
          location: loc,
          risk: "Important module disabled",
          reason: `${primary.label} entitlement is off for this institute (data retained).`,
          date: isoDaysAgo(4),
          level: primary.id === "student-attendance" || primary.id === "fees" ? "high" : "medium",
          suggestedAction: "Review modules",
          actionTo: "/modules",
        });
      }
    }

    // Storage approaching limit
    const pressure = storagePressurePct(i);
    if (resolveInstituteModules(i.id).storage !== false && pressure >= 70) {
      items.push({
        id: `inst-storage-${i.id}`,
        kind: "institute",
        instituteId: i.id,
        instituteName: i.name,
        location: loc,
        risk: "Storage approaching limit",
        reason: `Quota pressure estimate ${pressure}% of plan allocation.`,
        date: isoDaysAgo(1),
        level: pressure >= 85 ? "high" : "medium",
        suggestedAction: "Send institute message",
        actionTo: "/institutes/$id",
      });
    }

    // Support issue unresolved (demo signal from riskStatus)
    if (i.riskStatus === "high" || i.riskStatus === "critical") {
      items.push({
        id: `inst-support-${i.id}`,
        kind: "institute",
        instituteId: i.id,
        instituteName: i.name,
        location: loc,
        risk: "Support issue unresolved",
        reason:
          i.riskStatus === "critical"
            ? "Open platform support case(s) past SLA — institute flagged critical."
            : "Open support case(s) still unresolved for this institute.",
        date: isoDaysAgo(6),
        level: i.riskStatus === "critical" ? "high" : "medium",
        suggestedAction: "Review support ticket",
        actionTo: "/support",
      });
    }
  }

  return items;
}

function buildBusinessRisks(
  institutes: PlatformInstitute[],
  licenses: Record<string, InstituteLicense>,
): HealthRiskItem[] {
  const items: HealthRiskItem[] = [];
  const byId = new Map(live(institutes).map((i) => [i.id, i]));

  const reminders = listUpcomingReminders(
    licenses,
    live(institutes).map((i) => ({
      id: i.id,
      name: i.name,
      studentCount: i.studentCount,
      city: i.city,
    })),
  );

  for (const i of byId.values()) {
    const loc = locationLabel(i);
    const lic = licenses[i.id];

    // Payment overdue
    if (i.paymentStatus === "overdue" || (i.pendingAmountInr > 0 && i.renewalStatus === "overdue")) {
      items.push({
        id: `biz-pay-overdue-${i.id}`,
        kind: "business",
        instituteId: i.id,
        instituteName: i.name,
        location: loc,
        risk: "Payment overdue",
        reason: `Outstanding ${formatMoneyInr(i.pendingAmountInr || i.amountInr)} on ${i.plan.toUpperCase()} license.`,
        date: isoDaysAgo(7),
        level: "high",
        suggestedAction: "Send payment reminder",
        actionTo: "/billing",
      });
    } else if (i.paymentStatus === "partial" && i.pendingAmountInr > 0) {
      items.push({
        id: `biz-pay-partial-${i.id}`,
        kind: "business",
        instituteId: i.id,
        instituteName: i.name,
        location: loc,
        risk: "Payment overdue",
        reason: `Partial payment — ${formatMoneyInr(i.pendingAmountInr)} still pending.`,
        date: isoDaysAgo(4),
        level: "medium",
        suggestedAction: "Send payment reminder",
        actionTo: "/billing",
      });
    }

    // Renewal approaching (from reminders or renewalStatus)
    const reminder = reminders.find((r) => r.instituteId === i.id && r.status !== "overdue");
    if (
      reminder ||
      i.renewalStatus === "due_soon" ||
      i.renewalStatus === "due_today"
    ) {
      const days = reminder?.daysUntil;
      const when =
        i.renewalStatus === "due_today" || days === 0
          ? "due today"
          : days != null
            ? `in ${days} day${days === 1 ? "" : "s"}`
            : "soon";
      items.push({
        id: `biz-renewal-${i.id}`,
        kind: "business",
        instituteId: i.id,
        instituteName: i.name,
        location: loc,
        risk: "Renewal approaching",
        reason: `License renewal ${when}${lic ? ` · next ${formatDateTime(nextRenewalDate(lic) ?? i.billingStartAt)}` : ""}.`,
        date: isoDaysAgo(0),
        level: i.renewalStatus === "due_today" || (days != null && days <= 3) ? "high" : "medium",
        suggestedAction: "Send payment reminder",
        actionTo: "/billing",
      });
    }

    // Usage declining (commercial lens)
    const drop = usageDropFromPeak(i);
    if (drop >= 15 || usageDeltaPts(i) <= -6) {
      items.push({
        id: `biz-usage-${i.id}`,
        kind: "business",
        instituteId: i.id,
        instituteName: i.name,
        location: loc,
        risk: "Usage declining",
        reason: `Commercial usage signal down ${drop || Math.abs(usageDeltaPts(i))} pts — retention watch.`,
        date: isoDaysAgo(2),
        level: drop >= 25 ? "high" : "medium",
        suggestedAction: "Send institute message",
        actionTo: "/institutes/$id",
      });
    }

    // Institute likely to disengage
    const disengage =
      i.status === "suspended" ||
      (i.usageStatus === "inactive" && (i.paymentStatus === "overdue" || i.paymentStatus === "pending")) ||
      (i.activeUsagePct < 20 && i.pendingAmountInr > 0) ||
      (i.riskStatus === "critical" && drop >= 20);
    if (disengage) {
      items.push({
        id: `biz-disengage-${i.id}`,
        kind: "business",
        instituteId: i.id,
        instituteName: i.name,
        location: loc,
        risk: "Institute likely to disengage",
        reason: "Combined payment stress and low engagement — churn risk elevated.",
        date: isoDaysAgo(1),
        level: "high",
        suggestedAction: "Contact institute",
        actionTo: "/institutes/$id",
      });
    }

    // High support burden
    if (i.riskStatus === "critical" || (i.riskStatus === "high" && i.studentCount >= 800)) {
      items.push({
        id: `biz-support-${i.id}`,
        kind: "business",
        instituteId: i.id,
        instituteName: i.name,
        location: loc,
        risk: "High support burden",
        reason: `Elevated ticket load relative to ${formatCount(i.studentCount)} students on platform.`,
        date: isoDaysAgo(3),
        level: i.riskStatus === "critical" ? "high" : "medium",
        suggestedAction: "Review support ticket",
        actionTo: "/support",
      });
    }
  }

  // Soft low-level watch — at most two moderate paid institutes
  const soft = [...byId.values()]
    .filter((i) => i.paymentStatus === "paid" && i.usageStatus === "moderate" && i.riskStatus === "low")
    .slice(0, 2);
  for (const i of soft) {
    items.push({
      id: `biz-watch-${i.id}`,
      kind: "business",
      instituteId: i.id,
      instituteName: i.name,
      location: locationLabel(i),
      risk: "Usage declining",
      reason: "Moderate usage — early commercial watch, no payment issue.",
      date: isoDaysAgo(8),
      level: "low",
      suggestedAction: "Send institute message",
      actionTo: "/institutes/$id",
    });
  }

  return items;
}

function dedupePreferHigher(items: HealthRiskItem[]): HealthRiskItem[] {
  // Keep unique id; if duplicate risk+institute+title collide somehow, prefer higher severity
  const map = new Map<string, HealthRiskItem>();
  for (const item of items) {
    const prev = map.get(item.id);
    if (!prev || levelRank(item.level) < levelRank(prev.level)) map.set(item.id, item);
  }
  return [...map.values()].sort(
    (a, b) =>
      levelRank(a.level) - levelRank(b.level) ||
      a.instituteName.localeCompare(b.instituteName) ||
      a.risk.localeCompare(b.risk),
  );
}

export function buildHealthRisksSnapshot() {
  const institutes = listPlatformInstitutes();
  const licenses = loadLicenses();
  const instituteRisks = dedupePreferHigher(buildInstituteRisks(institutes));
  const businessRisks = dedupePreferHigher(buildBusinessRisks(institutes, licenses));

  const countByLevel = (rows: HealthRiskItem[]) => ({
    high: rows.filter((r) => r.level === "high").length,
    medium: rows.filter((r) => r.level === "medium").length,
    low: rows.filter((r) => r.level === "low").length,
    total: rows.length,
  });

  return {
    instituteRisks,
    businessRisks,
    instituteStats: countByLevel(instituteRisks),
    businessStats: countByLevel(businessRisks),
  };
}

export function labelRiskLevel(level: RiskLevel): string {
  if (level === "low") return "Low";
  if (level === "medium") return "Medium";
  return "High";
}

export function riskLevelTone(level: RiskLevel): "success" | "warning" | "danger" {
  return levelTone(level);
}

export function formatRiskDate(iso: string): string {
  return formatDateTime(iso);
}

export type { PlatformInstitute };
