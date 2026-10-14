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

type SubscriptionTable = {
  subscription: Array<Record<string, unknown>>;
};

/**
 * Seed writable trials for institutes that lack a live subscription row.
 * Does not replace existing rows (keeps intentional read-only / missing-sub tests intact
 * when they omit institutes from this call or pre-seed locked rows).
 */
export function ensureWritableTrials(
  db: SubscriptionTable,
  instituteIds: string[],
): void {
  if (!Array.isArray(db.subscription)) {
    db.subscription = [];
  }
  const have = new Set(
    db.subscription
      .filter((row) => row.deleted_at == null || row.deleted_at === undefined)
      .map((row) => String(row.institute_id)),
  );
  for (const [index, instituteId] of instituteIds.entries()) {
    if (!instituteId || have.has(instituteId)) continue;
    // Valid UUID; index nibble keeps ids unique within a fixture.
    const nibble = (index % 16).toString(16);
    const subscriptionId = `b${nibble}111111-1111-4111-8111-111111111111`;
    db.subscription.push(writableTrialSubscription(instituteId, subscriptionId));
    have.add(instituteId);
  }
}
