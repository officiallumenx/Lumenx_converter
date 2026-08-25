/**
 * Self-test: online payment adapter — Coming Soon, no fake ACTIVE.
 * Run: npx tsx packages/utils/src/subscription/payment-adapter.selftest.ts
 */

import {
  ComingSoonOnlinePaymentAdapter,
  beginOnlineCheckout,
  getOnlinePaymentAdapter,
  getOnlinePaymentStatusMessage,
  isOnlinePaymentAvailable,
  resetOnlinePaymentAdapter,
  setOnlinePaymentAdapter,
  type OnlinePaymentAdapter,
} from "./payment-adapter";
import {
  getInstituteSubscription,
  startInstituteTrial,
  startOnlineCheckoutPlaceholder,
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

resetOnlinePaymentAdapter();

assert(getOnlinePaymentAdapter().id === "coming_soon", "default adapter");
assert(isOnlinePaymentAvailable() === false, "not available");
assert(
  getOnlinePaymentStatusMessage() === "Online payments are coming soon.",
  "status message",
);

const instituteId = "ins-online-adapter";
startInstituteTrial({
  instituteId,
  instituteName: "Adapter School",
  assignedRateInr: 12,
  activeStudentCount: 100,
});

const before = getInstituteSubscription(instituteId)!;
assert(before.lifecycleStatus !== "active", "not active before");

const result = beginOnlineCheckout({
  instituteId,
  durationMonths: 1,
  payableAmountInr: 8000,
  currency: "INR",
});
assert(!(result instanceof Promise), "coming soon is sync");
assert(result.ok === false, "no fake success");
assert(result.activatesSubscription === false, "never activates");
assert(result.message === "Online payments are coming soon.", "message");

const after = getInstituteSubscription(instituteId)!;
assert(after.lifecycleStatus === before.lifecycleStatus, "lifecycle unchanged");
assert(after.lifecycleStatus !== "active", "still not ACTIVE");

const legacy = startOnlineCheckoutPlaceholder({
  instituteId,
  durationMonths: 6,
});
assert(legacy.ok === false, "legacy placeholder fails");
assert(legacy.activatesSubscription === false, "legacy no activate");

// Registering a stub must still refuse client-side activation.
const stub: OnlinePaymentAdapter = {
  id: "stub_future",
  displayName: "Stub",
  isAvailable: false,
  statusMessage: "Stub unavailable",
  beginCheckout: () => ({
    ok: false,
    reason: "provider_unavailable",
    message: "Stub unavailable",
    activatesSubscription: false,
  }),
};
setOnlinePaymentAdapter(stub);
assert(getOnlinePaymentAdapter().id === "stub_future", "swapped");
resetOnlinePaymentAdapter();
assert(getOnlinePaymentAdapter().id === ComingSoonOnlinePaymentAdapter.id, "reset");

console.log("subscription/payment-adapter.selftest: OK");
