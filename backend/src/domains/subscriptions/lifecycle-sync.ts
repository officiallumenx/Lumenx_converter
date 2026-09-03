/**
 * Persist derived subscription lifecycle (trial → grace → read_only)
 * and mark overdue renewals. Used by the background worker and Nexus ops flush.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Logger } from "../../logger/logger.js";
import {
  findPeriodById,
  listSubscriptions,
  updateSubscriptionFields,
} from "../nexus/repository.js";
import type { SubscriptionLifecycle, SubscriptionRow } from "../nexus/types.js";
import {
  listRenewalsByInstitute,
  updateRenewalFields,
} from "../billing/repository.js";
import type { RenewalRecordRow } from "../billing/types.js";
import { DEFAULT_GRACE_DAYS } from "./pricing.js";
import { deriveSubscriptionLifecycle } from "./lifecycle.js";

const OPEN_RENEWAL_STATUSES = new Set(["issued", "pending"]);

export type LifecycleTransition = {
  subscriptionId: string;
  instituteId: string;
  from: SubscriptionLifecycle | string;
  to: SubscriptionLifecycle;
};

export type LifecycleSyncResult = {
  scanned: number;
  updated: number;
  unchanged: number;
  renewalsScanned: number;
  renewalsMarkedOverdue: number;
  transitions: LifecycleTransition[];
};

function periodInputFromRow(
  period: {
    starts_at: string;
    ends_at: string;
    payment_status: string;
  } | null,
): {
  startsAt: string;
  endsAt: string;
  paymentStatus: string;
} | null {
  if (!period) return null;
  return {
    startsAt: period.starts_at,
    endsAt: period.ends_at,
    paymentStatus: period.payment_status,
  };
}

export async function deriveLifecycleForSubscriptionRow(
  admin: SupabaseClient,
  row: SubscriptionRow,
  now: Date = new Date(),
  graceDays: number = DEFAULT_GRACE_DAYS,
): Promise<SubscriptionLifecycle> {
  let currentPeriod: {
    startsAt: string;
    endsAt: string;
    paymentStatus: string;
  } | null = null;

  if (row.current_period_id) {
    const period = await findPeriodById(admin, row.current_period_id);
    currentPeriod = periodInputFromRow(period);
  }

  return deriveSubscriptionLifecycle(
    {
      lifecycleStatus: row.lifecycle_status,
      trialStartAt: row.trial_start_at,
      trialEndAt: row.trial_end_at,
      graceEndsAt: row.grace_ends_at,
      currentPeriod,
    },
    now,
    graceDays,
  );
}

function shouldMarkRenewalOverdue(
  renewal: RenewalRecordRow,
  nowMs: number,
): boolean {
  if (!OPEN_RENEWAL_STATUSES.has(renewal.status)) return false;
  if (!renewal.due_at) return false;
  return new Date(renewal.due_at).getTime() < nowMs;
}

/**
 * Scan all subscriptions, persist derived lifecycle when it drifts,
 * and mark issued/pending renewals past due_at as overdue.
 */
export async function syncSubscriptionLifecycles(
  admin: SupabaseClient,
  options?: {
    now?: Date;
    graceDays?: number;
    logger?: Logger;
  },
): Promise<LifecycleSyncResult> {
  const now = options?.now ?? new Date();
  const graceDays = options?.graceDays ?? DEFAULT_GRACE_DAYS;
  const nowMs = now.getTime();

  const result: LifecycleSyncResult = {
    scanned: 0,
    updated: 0,
    unchanged: 0,
    renewalsScanned: 0,
    renewalsMarkedOverdue: 0,
    transitions: [],
  };

  const subscriptions = await listSubscriptions(admin);
  result.scanned = subscriptions.length;

  const instituteIds = new Set<string>();

  for (const row of subscriptions) {
    instituteIds.add(row.institute_id);
    const derived = await deriveLifecycleForSubscriptionRow(
      admin,
      row,
      now,
      graceDays,
    );

    if (derived === row.lifecycle_status) {
      result.unchanged += 1;
      continue;
    }

    const updated = await updateSubscriptionFields(admin, row.id, {
      lifecycle_status: derived,
      updated_at: now.toISOString(),
    });

    if (!updated) {
      options?.logger?.warn({
        msg: "subscription_lifecycle_update_missed",
        subscriptionId: row.id,
        instituteId: row.institute_id,
        from: row.lifecycle_status,
        to: derived,
      });
      continue;
    }

    result.updated += 1;
    result.transitions.push({
      subscriptionId: row.id,
      instituteId: row.institute_id,
      from: row.lifecycle_status,
      to: derived,
    });
  }

  for (const instituteId of instituteIds) {
    const renewals = await listRenewalsByInstitute(admin, instituteId);
    for (const renewal of renewals) {
      result.renewalsScanned += 1;
      if (!shouldMarkRenewalOverdue(renewal, nowMs)) continue;

      const marked = await updateRenewalFields(admin, renewal.id, {
        status: "overdue",
        updated_at: now.toISOString(),
      });
      if (marked) result.renewalsMarkedOverdue += 1;
    }
  }

  return result;
}
