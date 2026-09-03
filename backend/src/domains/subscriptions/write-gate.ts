/**
 * Resolve whether an institute may accept mutating API calls.
 */
import type { SupabaseClient } from "@supabase/supabase-js";
import { AppError } from "../../errors/app-error.js";
import {
  findPeriodById,
  findSubscriptionByInstituteId,
} from "../nexus/repository.js";
import type { SubscriptionLifecycle } from "../nexus/types.js";
import {
  deriveSubscriptionLifecycle,
  shouldEnforceSubscriptionReadOnly,
} from "./lifecycle.js";

export type InstituteWriteGateResult = {
  instituteId: string;
  lifecycleStatus: SubscriptionLifecycle;
  writeLocked: boolean;
};

export async function resolveInstituteWriteGate(
  admin: SupabaseClient,
  instituteId: string,
  now: Date = new Date(),
): Promise<InstituteWriteGateResult> {
  const id = instituteId.trim();
  const sub = await findSubscriptionByInstituteId(admin, id);

  // No commercial row yet — do not block bootstrap / legacy tenants.
  if (!sub) {
    return {
      instituteId: id,
      lifecycleStatus: "approved",
      writeLocked: false,
    };
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

  const lifecycleStatus = deriveSubscriptionLifecycle(
    {
      lifecycleStatus: sub.lifecycle_status,
      trialStartAt: sub.trial_start_at,
      trialEndAt: sub.trial_end_at,
      graceEndsAt: sub.grace_ends_at,
      currentPeriod,
    },
    now,
  );

  return {
    instituteId: id,
    lifecycleStatus,
    writeLocked: shouldEnforceSubscriptionReadOnly(lifecycleStatus),
  };
}

export async function assertInstituteSubscriptionWritable(
  admin: SupabaseClient,
  instituteId: string,
  now: Date = new Date(),
): Promise<InstituteWriteGateResult> {
  const gate = await resolveInstituteWriteGate(admin, instituteId, now);
  if (gate.writeLocked) {
    throw AppError.forbidden(
      "Institute subscription is read-only. Renew billing to restore edits.",
      {
        reason: "SUBSCRIPTION_READ_ONLY",
        lifecycleStatus: gate.lifecycleStatus,
        instituteId: gate.instituteId,
      },
    );
  }
  return gate;
}
