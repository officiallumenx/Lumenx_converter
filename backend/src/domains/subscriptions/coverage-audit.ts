/**
 * Read-only subscription coverage audit for Nexus platform operators.
 * Does not create, repair, backfill, or delete any commercial rows.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { listInstitutes } from "../identity/repository.js";
import {
  findPeriodById,
  listPeriodsForSubscription,
  listSubscriptions,
} from "../nexus/repository.js";
import { listRenewalsByInstitute } from "../billing/repository.js";
import { countBillableStudentsForInstitute } from "./headcount.js";
import {
  accessModeForLifecycle,
  deriveSubscriptionLifecycle,
} from "./lifecycle.js";
import { DEFAULT_GRACE_DAYS } from "./pricing.js";

export type SubscriptionCoverageIssueCategory =
  | "missing_subscription"
  | "stale_lifecycle_status"
  | "missing_trial_dates"
  | "inconsistent_grace_window"
  | "stale_billable_count"
  | "multiple_current_periods"
  | "paid_renewal_without_period"
  | "active_without_current_period"
  | "expired_dates_not_synced";

export type SubscriptionCoverageIssue = {
  instituteId: string;
  instituteCode: string;
  instituteName: string;
  subscriptionId: string | null;
  category: SubscriptionCoverageIssueCategory;
  summary: string;
  recommendedAction: string;
  details: Record<string, string | number | boolean | null>;
};

export type SubscriptionCoverageAuditReport = {
  generatedAt: string;
  scannedInstitutes: number;
  scannedSubscriptions: number;
  issueCount: number;
  issues: SubscriptionCoverageIssue[];
};

function issue(
  partial: Omit<SubscriptionCoverageIssue, "details"> & {
    details?: SubscriptionCoverageIssue["details"];
  },
): SubscriptionCoverageIssue {
  return { details: {}, ...partial };
}

/**
 * Dry-run diagnostic: institutes with missing or inconsistent commercial state.
 * Platform-operator only (caller must authorize).
 */
export async function auditSubscriptionCoverage(
  admin: SupabaseClient,
  options?: { now?: Date; graceDays?: number },
): Promise<SubscriptionCoverageAuditReport> {
  const now = options?.now ?? new Date();
  const graceDays = options?.graceDays ?? DEFAULT_GRACE_DAYS;
  const institutes = await listInstitutes(admin);
  const subscriptions = await listSubscriptions(admin);
  const subByInstitute = new Map(
    subscriptions.map((s) => [s.institute_id, s] as const),
  );

  const issues: SubscriptionCoverageIssue[] = [];

  for (const inst of institutes) {
    const sub = subByInstitute.get(inst.id);
    if (!sub) {
      issues.push(
        issue({
          instituteId: inst.id,
          instituteCode: inst.code,
          instituteName: inst.name,
          subscriptionId: null,
          category: "missing_subscription",
          summary: "No live subscription row for this institute.",
          recommendedAction:
            "Nexus operator should review registration approval / manually assign a trial or paid subscription. Do not auto-backfill.",
        }),
      );
      continue;
    }

    let currentPeriod: {
      startsAt: string;
      endsAt: string;
      paymentStatus: string;
    } | null = null;
    if (sub.current_period_id) {
      const period = await findPeriodById(admin, sub.current_period_id);
      if (period) {
        currentPeriod = {
          startsAt: period.starts_at,
          endsAt: period.ends_at,
          paymentStatus: period.payment_status,
        };
      }
    }

    const derived = deriveSubscriptionLifecycle(
      {
        lifecycleStatus: sub.lifecycle_status,
        trialStartAt: sub.trial_start_at,
        trialEndAt: sub.trial_end_at,
        graceEndsAt: sub.grace_ends_at,
        currentPeriod,
      },
      now,
      graceDays,
    );

    if (derived !== sub.lifecycle_status) {
      issues.push(
        issue({
          instituteId: inst.id,
          instituteCode: inst.code,
          instituteName: inst.name,
          subscriptionId: sub.id,
          category: "stale_lifecycle_status",
          summary: `Stored lifecycle "${sub.lifecycle_status}" differs from derived "${derived}".`,
          recommendedAction:
            "Run POST /api/nexus/subscriptions/sync-lifecycle (ops flush). Worker should also converge within the hour.",
          details: {
            stored: sub.lifecycle_status,
            derived,
            accessMode: accessModeForLifecycle(derived),
          },
        }),
      );
    }

    if (
      (sub.lifecycle_status === "trial_active" ||
        sub.lifecycle_status === "trial_expiring" ||
        derived === "trial_active" ||
        derived === "trial_expiring") &&
      (!sub.trial_start_at || !sub.trial_end_at)
    ) {
      issues.push(
        issue({
          instituteId: inst.id,
          instituteCode: inst.code,
          instituteName: inst.name,
          subscriptionId: sub.id,
          category: "missing_trial_dates",
          summary: "Trial lifecycle without trial_start_at / trial_end_at.",
          recommendedAction:
            "Nexus commercial writer should set trial window or move institute onto a paid period.",
        }),
      );
    }

    if (sub.trial_end_at && sub.grace_ends_at) {
      const trialEnd = new Date(sub.trial_end_at).getTime();
      const graceEnd = new Date(sub.grace_ends_at).getTime();
      if (graceEnd < trialEnd) {
        issues.push(
          issue({
            instituteId: inst.id,
            instituteCode: inst.code,
            instituteName: inst.name,
            subscriptionId: sub.id,
            category: "inconsistent_grace_window",
            summary: "grace_ends_at is before trial_end_at.",
            recommendedAction:
              "Correct grace_ends_at to trial_end_at + 7 days (or paid period end + 7 days).",
            details: {
              trialEndAt: sub.trial_end_at,
              graceEndsAt: sub.grace_ends_at,
            },
          }),
        );
      }
    }

    const billable = await countBillableStudentsForInstitute(admin, inst.id);
    const storedCount = Number(sub.active_student_count) || 0;
    if (billable !== storedCount) {
      issues.push(
        issue({
          instituteId: inst.id,
          instituteCode: inst.code,
          instituteName: inst.name,
          subscriptionId: sub.id,
          category: "stale_billable_count",
          summary: `active_student_count=${storedCount} but billable enrollments=${billable}.`,
          recommendedAction:
            "Open Admin subscription detail or submit a quote (self-heals), or wait for next enrollment mutation sync. Do not invent a count.",
          details: { storedCount, billableCount: billable },
        }),
      );
    }

    const periods = await listPeriodsForSubscription(admin, sub.id);
    const currentPeriods = periods.filter((p) => p.is_current);
    if (currentPeriods.length > 1) {
      issues.push(
        issue({
          instituteId: inst.id,
          instituteCode: inst.code,
          instituteName: inst.name,
          subscriptionId: sub.id,
          category: "multiple_current_periods",
          summary: `${currentPeriods.length} periods marked is_current.`,
          recommendedAction:
            "Nexus ops: clearCurrentPeriods then set the intended paid period current.",
          details: { currentPeriodCount: currentPeriods.length },
        }),
      );
    }

    if (
      (derived === "active" || sub.lifecycle_status === "active") &&
      !sub.current_period_id
    ) {
      issues.push(
        issue({
          instituteId: inst.id,
          instituteCode: inst.code,
          instituteName: inst.name,
          subscriptionId: sub.id,
          category: "active_without_current_period",
          summary: "Lifecycle is active but current_period_id is null.",
          recommendedAction:
            "Verify a paid renewal (or attach the correct paid period) before treating access as paid.",
        }),
      );
    }

    if (
      (derived === "read_only" || derived === "grace_period") &&
      sub.lifecycle_status === "trial_active"
    ) {
      issues.push(
        issue({
          instituteId: inst.id,
          instituteCode: inst.code,
          instituteName: inst.name,
          subscriptionId: sub.id,
          category: "expired_dates_not_synced",
          summary: "Dates imply post-trial state but stored status is still trial_active.",
          recommendedAction: "Run lifecycle sync flush.",
          details: { stored: sub.lifecycle_status, derived },
        }),
      );
    }

    const renewals = await listRenewalsByInstitute(admin, inst.id);
    for (const renewal of renewals) {
      if (renewal.status === "paid" && !renewal.subscription_period_id) {
        issues.push(
          issue({
            instituteId: inst.id,
            instituteCode: inst.code,
            instituteName: inst.name,
            subscriptionId: sub.id,
            category: "paid_renewal_without_period",
            summary: `Renewal ${renewal.invoice_number} is paid without a linked subscription period.`,
            recommendedAction:
              "Investigate payment verification path; do not PATCH renewals to paid outside verify.",
            details: {
              renewalId: renewal.id,
              invoiceNumber: renewal.invoice_number,
            },
          }),
        );
      }
    }
  }

  return {
    generatedAt: now.toISOString(),
    scannedInstitutes: institutes.length,
    scannedSubscriptions: subscriptions.length,
    issueCount: issues.length,
    issues,
  };
}
