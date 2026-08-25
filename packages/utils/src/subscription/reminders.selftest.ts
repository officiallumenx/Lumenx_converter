/**
 * Self-test: in-app renewal reminders (idempotent, no channel spam).
 * Run: npx tsx packages/utils/src/subscription/reminders.selftest.ts
 */

import { addUtcDays } from "./lifecycle";
import {
  buildReminderState,
  reminderKindForDaysRemaining,
  resolveReminderExpiryAt,
} from "./reminders";
import {
  activateSubscriptionManual,
  dismissRenewalReminder,
  ensureRenewalReminders,
  getActiveRenewalReminderView,
  getInstituteSubscription,
  listRenewalReminders,
  startInstituteTrial,
} from "./store";

function assert(cond: boolean, msg: string): void {
  if (!cond) throw new Error(msg);
}

const memory = new Map<string, string>();
(globalThis as { localStorage?: Storage }).localStorage = {
  getItem: (k) => memory.get(k) ?? null,
  setItem: (k, v) => {
    memory.set(k, String(v));
  },
  removeItem: (k) => {
    memory.delete(k);
  },
  clear: () => memory.clear(),
  key: () => null,
  get length() {
    return memory.size;
  },
} as Storage;

assert(reminderKindForDaysRemaining(45) === null, "outside window");
assert(reminderKindForDaysRemaining(30) === 30, "exact 30");
assert(reminderKindForDaysRemaining(28) === 30, "band 30");
assert(reminderKindForDaysRemaining(15) === 15, "exact 15");
assert(reminderKindForDaysRemaining(10) === 15, "band 15");
assert(reminderKindForDaysRemaining(7) === 7, "exact 7");
assert(reminderKindForDaysRemaining(3) === 3, "exact 3");
assert(reminderKindForDaysRemaining(1) === 1, "exact 1");
assert(reminderKindForDaysRemaining(0) === "expired", "expired 0");
assert(reminderKindForDaysRemaining(-2) === "expired", "expired neg");

memory.clear();
const instituteId = "ins-reminder-1";

startInstituteTrial({
  instituteId,
  instituteName: "Reminder School",
  assignedRateInr: 12,
  activeStudentCount: 100,
  trialStartAt: "2026-01-01T00:00:00.000Z",
});

activateSubscriptionManual({
  instituteId,
  durationMonths: 1,
  note: "MANUAL-REM-1",
});

const sub = getInstituteSubscription(instituteId);
assert(!!sub?.currentPeriod?.endAt, "paid period");
const periodEnd = resolveReminderExpiryAt(sub!);
assert(!!periodEnd, "paid period expiry");

// Day 30 before expiry
const day30 = addUtcDays(periodEnd!, -30);
ensureRenewalReminders(instituteId, new Date(day30));
ensureRenewalReminders(instituteId, new Date(day30));
ensureRenewalReminders(instituteId, new Date(addUtcDays(periodEnd!, -28)));
let rem = listRenewalReminders(instituteId);
assert(rem.length === 1, "idempotent at 30-day band");
assert(rem[0]!.kind === 30, "kind 30");

const built30 = buildReminderState({
  instituteId,
  targetExpiryAt: periodEnd!,
  now: new Date(day30),
});
assert(built30?.id === rem[0]!.id, "stable id");

// Day 15 — new kind, still no duplicates of 15
const day15 = addUtcDays(periodEnd!, -15);
ensureRenewalReminders(instituteId, new Date(day15));
ensureRenewalReminders(instituteId, new Date(day15));
rem = listRenewalReminders(instituteId);
assert(rem.filter((r) => r.kind === 15).length === 1, "one 15-day reminder");
assert(rem.filter((r) => r.kind === 30).length === 1, "30 kept");
assert(rem.length === 2, "two distinct reminders");

// Day 7 / 3 / 1
for (const d of [7, 3, 1] as const) {
  const at = addUtcDays(periodEnd!, -d);
  ensureRenewalReminders(instituteId, new Date(at));
  ensureRenewalReminders(instituteId, new Date(at));
  assert(
    listRenewalReminders(instituteId).filter((r) => r.kind === d).length === 1,
    `one ${d}-day reminder`,
  );
}

// Expired
const afterEnd = addUtcDays(periodEnd!, 1);
ensureRenewalReminders(instituteId, new Date(afterEnd));
ensureRenewalReminders(instituteId, new Date(afterEnd));
assert(
  listRenewalReminders(instituteId).filter((r) => r.kind === "expired").length === 1,
  "one expired reminder",
);

const view = getActiveRenewalReminderView(instituteId, new Date(afterEnd));
assert(!!view, "active view when expired");
assert(view!.showRenewCta === true, "renew CTA");
assert(view!.currentSubscriptionLabel === "Current subscription", "label");
assert(view!.daysRemaining === 0, "days remaining 0");

dismissRenewalReminder(view!.reminder.id);
assert(
  getActiveRenewalReminderView(instituteId, new Date(afterEnd)) === null,
  "dismissed hides view",
);
assert(
  listRenewalReminders(instituteId).filter((r) => r.kind === "expired").length === 1,
  "dismiss does not recreate",
);
ensureRenewalReminders(instituteId, new Date(afterEnd));
assert(
  listRenewalReminders(instituteId).filter((r) => r.kind === "expired").length === 1,
  "ensure after dismiss still idempotent",
);

console.log("reminders.selftest: ok");
