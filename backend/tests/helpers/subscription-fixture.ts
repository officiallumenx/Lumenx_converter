/**
 * Writable trial subscription for institute-scoped mutation tests.
 * Dates are far enough ahead of 2026 that deriveSubscriptionLifecycle → trial_active.
 */
export function writableTrialSubscription(
  instituteId: string,
  subscriptionId: string,
) {
  return {
    id: subscriptionId,
    institute_id: instituteId,
    lifecycle_status: "trial_active" as const,
    assigned_rate_inr: 12,
    active_student_count: 0,
    trial_start_at: "2026-01-01T00:00:00.000Z",
    trial_end_at: "2027-12-31T00:00:00.000Z",
    grace_ends_at: "2028-01-07T00:00:00.000Z",
    current_period_id: null,
    deleted_at: null,
    created_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
  };
}
