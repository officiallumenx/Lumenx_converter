import type { SupabaseClient } from "@supabase/supabase-js";
import { listInstitutes } from "../identity/repository.js";
import { listLicenses, listSubscriptions } from "../nexus/repository.js";
import { listActiveAssetsAll } from "../storage/repository.js";
import { listOpenSupportThreadsForPlatform } from "../support/repository.js";
import { listPolicyRules, listStorageQuotas } from "./repository.js";
import type {
  PolicyRuleKind,
  PolicyRuleRow,
  PolicySeverity,
} from "./types.js";

/** Defaults until platform_setting backend exists (scope 1A). */
export const DERIVED_POLICY_DEFAULTS = {
  renewalWarningDays: 30,
  supportSlaHours: { high: 4, medium: 24, low: 72 } as const,
  usageRiskMinAgeDays: 30,
} as const;

const OVERDUE_LIFECYCLES = new Set([
  "trial_expired",
  "grace_period",
  "read_only",
]);

const RENEWAL_LIFECYCLES = new Set([
  "trial_active",
  "trial_expiring",
  "active",
]);

function daysUntil(iso: string | null, now = Date.now()): number | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - now;
  if (Number.isNaN(ms)) return null;
  return Math.ceil(ms / (24 * 60 * 60 * 1000));
}

function hoursSince(iso: string, now = Date.now()): number {
  const ms = now - new Date(iso).getTime();
  return ms / (60 * 60 * 1000);
}

function bytesToGb(bytes: number): number {
  return bytes / (1024 * 1024 * 1024);
}

function ruleByKind(
  rules: PolicyRuleRow[],
  kind: PolicyRuleKind,
): PolicyRuleRow | undefined {
  return rules.find((r) => r.kind === kind && r.enabled);
}

function pushAlert(
  out: DerivedPlatformAlertDto[],
  input: Omit<DerivedPlatformAlertDto, "detectedAt" | "handledAt" | "handledByUserId"> & {
    detectedAt?: string;
  },
): void {
  out.push({
    ...input,
    detectedAt: input.detectedAt ?? new Date().toISOString(),
    handledAt: null,
    handledByUserId: null,
  });
}

function severityRank(s: PolicySeverity): number {
  if (s === "critical") return 4;
  if (s === "high") return 3;
  if (s === "medium") return 2;
  return 1;
}

/**
 * Derive platform policy alerts at read time from subscriptions, support,
 * storage usage, and institute licenses. Respects enabled policy_rule rows.
 */
export async function derivePlatformAlerts(
  admin: SupabaseClient,
): Promise<DerivedPlatformAlertDto[]> {
  const ruleRows = await listPolicyRules(admin);
  const enabledRules = ruleRows.filter((r) => r.enabled);
  if (enabledRules.length === 0) return [];

  const [
    institutes,
    licenses,
    subscriptions,
    quotas,
    assets,
    threads,
  ] = await Promise.all([
    listInstitutes(admin),
    listLicenses(admin),
    listSubscriptions(admin),
    listStorageQuotas(admin),
    listActiveAssetsAll(admin),
    listOpenSupportThreadsForPlatform(admin),
  ]);

  const instituteById = new Map(institutes.map((i) => [i.id, i]));
  const licenseByInstitute = new Map(licenses.map((l) => [l.institute_id, l]));
  const subscriptionByInstitute = new Map(
    subscriptions.map((s) => [s.institute_id, s]),
  );
  const quotaByPlan = new Map(quotas.map((q) => [q.plan, q]));

  const bytesByInstitute = new Map<string, number>();
  for (const asset of assets) {
    const size = Number(asset.byte_size) || 0;
    bytesByInstitute.set(
      asset.institute_id,
      (bytesByInstitute.get(asset.institute_id) ?? 0) + size,
    );
  }

  const alerts: DerivedPlatformAlertDto[] = [];
  const now = Date.now();

  for (const institute of institutes) {
    if (institute.status !== "active") continue;
    const sub = subscriptionByInstitute.get(institute.id);
    const license = licenseByInstitute.get(institute.id);
    const plan = license?.plan ?? "core";

    const paymentRule = ruleByKind(enabledRules, "payment_overdue");
    if (
      paymentRule &&
      sub &&
      OVERDUE_LIFECYCLES.has(sub.lifecycle_status)
    ) {
      pushAlert(alerts, {
        id: `payment_overdue:${institute.id}`,
        kind: "payment_overdue",
        title: "Payment overdue",
        summary: `${institute.name} subscription is ${sub.lifecycle_status.replace(/_/g, " ")}.`,
        severity: paymentRule.severity_default,
        instituteId: institute.id,
        instituteName: institute.name,
        ruleId: paymentRule.id,
      });
    }

    const renewalRule = ruleByKind(enabledRules, "renewal_approaching");
    if (renewalRule && sub && RENEWAL_LIFECYCLES.has(sub.lifecycle_status)) {
      const endAt = sub.trial_end_at ?? sub.grace_ends_at;
      const daysLeft = daysUntil(endAt, now);
      if (
        daysLeft !== null &&
        daysLeft >= 0 &&
        daysLeft <= DERIVED_POLICY_DEFAULTS.renewalWarningDays
      ) {
        pushAlert(alerts, {
          id: `renewal_approaching:${institute.id}`,
          kind: "renewal_approaching",
          title: "Renewal approaching",
          summary: `${institute.name} renewal or trial ends in ${daysLeft} day${daysLeft === 1 ? "" : "s"}.`,
          severity:
            daysLeft <= 7 ? "high" : renewalRule.severity_default,
          instituteId: institute.id,
          instituteName: institute.name,
          ruleId: renewalRule.id,
        });
      }
    }

    const storageRule = ruleByKind(enabledRules, "storage_quota_exceeded");
    if (storageRule) {
      const quota = quotaByPlan.get(plan as "core" | "plus" | "max");
      if (quota) {
        const usedGb = bytesToGb(bytesByInstitute.get(institute.id) ?? 0);
        const limitGb = quota.limit_gb;
        const pct = limitGb > 0 ? (usedGb / limitGb) * 100 : 0;
        if (pct >= quota.warning_pct) {
          pushAlert(alerts, {
            id: `storage_quota_exceeded:${institute.id}`,
            kind: "storage_quota_exceeded",
            title:
              pct >= 100 ? "Storage quota exceeded" : "Storage quota warning",
            summary: `${institute.name} uses ${usedGb.toFixed(1)} GB of ${limitGb} GB (${Math.round(pct)}%).`,
            severity:
              pct >= 100
                ? storageRule.severity_default
                : pct >= quota.warning_pct
                  ? "medium"
                  : storageRule.severity_default,
            instituteId: institute.id,
            instituteName: institute.name,
            ruleId: storageRule.id,
          });
        }
      }
    }

    const usageRule = ruleByKind(enabledRules, "institute_usage_risk");
    if (usageRule && sub) {
      const ageDays =
        (now - new Date(sub.created_at).getTime()) / (24 * 60 * 60 * 1000);
      if (
        ageDays >= DERIVED_POLICY_DEFAULTS.usageRiskMinAgeDays &&
        sub.active_student_count === 0 &&
        sub.lifecycle_status !== "registered"
      ) {
        pushAlert(alerts, {
          id: `institute_usage_risk:${institute.id}`,
          kind: "institute_usage_risk",
          title: "Institute usage risk",
          summary: `${institute.name} has zero active students on a live subscription.`,
          severity: usageRule.severity_default,
          instituteId: institute.id,
          instituteName: institute.name,
          ruleId: usageRule.id,
        });
      }
    }
  }

  for (const thread of threads) {
    const institute = instituteById.get(thread.institute_id);
    const instituteName = institute?.name ?? thread.institute_id;

    const escRule = ruleByKind(enabledRules, "support_escalation");
    if (
      escRule &&
      thread.priority === "high" &&
      (thread.status === "open" || thread.status === "in_progress")
    ) {
      pushAlert(alerts, {
        id: `support_escalation:${thread.id}`,
        kind: "support_escalation",
        title: "Support escalation",
        summary: `High-priority support thread "${thread.subject}" for ${instituteName}.`,
        severity: escRule.severity_default,
        instituteId: thread.institute_id,
        instituteName,
        ruleId: escRule.id,
        detectedAt: thread.updated_at,
      });
    }

    const slaRule = ruleByKind(enabledRules, "sla_breach");
    if (
      slaRule &&
      (thread.status === "open" || thread.status === "in_progress")
    ) {
      const slaHours =
        DERIVED_POLICY_DEFAULTS.supportSlaHours[
          thread.priority as keyof typeof DERIVED_POLICY_DEFAULTS.supportSlaHours
        ] ?? DERIVED_POLICY_DEFAULTS.supportSlaHours.medium;
      const openHours = hoursSince(thread.created_at, now);
      if (openHours > slaHours) {
        pushAlert(alerts, {
          id: `sla_breach:${thread.id}`,
          kind: "sla_breach",
          title: "SLA breach",
          summary: `Support thread "${thread.subject}" open ${Math.round(openHours)}h (SLA ${slaHours}h).`,
          severity: slaRule.severity_default,
          instituteId: thread.institute_id,
          instituteName,
          ruleId: slaRule.id,
          detectedAt: thread.updated_at,
        });
      }
    }
  }

  return alerts.sort((a, b) => {
    const sev = severityRank(b.severity) - severityRank(a.severity);
    if (sev !== 0) return sev;
    return new Date(b.detectedAt).getTime() - new Date(a.detectedAt).getTime();
  });
}
