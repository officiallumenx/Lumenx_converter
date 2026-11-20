import type { SupabaseClient } from "@supabase/supabase-js";
import {
  findSubscriptionByInstituteId,
  insertSubscription,
} from "../nexus/repository.js";
import {
  addUtcDays,
  DEFAULT_GRACE_DAYS,
  DEFAULT_PER_STUDENT_RATE_INR,
  DEFAULT_TRIAL_DAYS,
} from "./pricing.js";

/**
 * Seed a trial subscription when an institute is created/approved and none exists.
 * Idempotent: safe on retries and concurrent callers that race past the existence check.
 */
export async function ensureTrialSubscriptionForInstitute(
  admin: SupabaseClient,
  instituteId: string,
): Promise<void> {
  const existing = await findSubscriptionByInstituteId(admin, instituteId);
  if (existing) return;

  const trialStartAt = new Date().toISOString();
  const trialEndAt = addUtcDays(trialStartAt, DEFAULT_TRIAL_DAYS);
  const graceEndsAt = addUtcDays(trialEndAt, DEFAULT_GRACE_DAYS);

  await insertSubscription(admin, {
    instituteId,
    lifecycleStatus: "trial_active",
    assignedRateInr: DEFAULT_PER_STUDENT_RATE_INR,
    activeStudentCount: 0,
    trialStartAt,
    trialEndAt,
    graceEndsAt,
  });
}
