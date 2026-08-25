/**
 * Reproduce institute detail data path (same calls as institutes.$id.tsx).
 * Run: npx tsx --tsconfig tsconfig.json src/lib/institute-detail.selftest.ts
 */
import { listPlatformInstitutes, getPlatformInstitute } from "./institute-directory-store";
import { getLicense, resolveInstituteModules, adminModulesForUi } from "./institute-licensing-store";
import { getInstituteBillingView, getBillingConfig } from "./institute-billing-store";

const store = new Map<string, string>();
const localStorageMock = {
  get length() {
    return store.size;
  },
  clear: () => store.clear(),
  getItem: (k: string) => store.get(k) ?? null,
  setItem: (k: string, v: string) => {
    store.set(k, String(v));
  },
  removeItem: (k: string) => {
    store.delete(k);
  },
  key: (i: number) => [...store.keys()][i] ?? null,
};

Object.defineProperty(globalThis, "localStorage", { value: localStorageMock, configurable: true });
Object.defineProperty(globalThis, "window", {
  value: {
    dispatchEvent: () => true,
    addEventListener: () => {},
    removeEventListener: () => {},
  },
  configurable: true,
});

function assert(cond: boolean, msg: string) {
  if (!cond) throw new Error(msg);
}

const institutes = listPlatformInstitutes();
assert(institutes.length > 0, "expected seeded institutes");
console.log(`institutes: ${institutes.length}`);

// Simulate legacy license without connect/apps
const first = institutes[0]!;
const legacyMap: Record<string, unknown> = {};
for (const i of institutes) {
  const lic = getLicense(i.id);
  const { connect: _c, apps: _a, ...rest } = lic as typeof lic & {
    connect?: unknown;
    apps?: unknown;
  };
  legacyMap[i.id] = rest;
}
store.set("lumenx.nexus.instituteLicenses.v4", JSON.stringify(legacyMap));

// Clear any in-memory by re-importing isn't possible; getLicense reads disk each time via loadLicenses
for (const i of institutes) {
  try {
    const inst = getPlatformInstitute(i.id);
    assert(!!inst, `missing institute ${i.id}`);
    const license = getLicense(i.id);
    assert(!!license.connect, `connect missing for ${i.id}`);
    assert(!!license.apps, `apps missing for ${i.id}`);
    assert(license.connect.teachers != null, `teachers portal missing for ${i.id}`);
    const modules = resolveInstituteModules(i.id);
    const billing = getInstituteBillingView(i.id);
    assert(Number.isFinite(billing.calc.finalAmountInr), `bad bill for ${i.id}`);
    const cfg = getBillingConfig(i.id);
    assert(cfg.planTenureMonths === 1 || cfg.planTenureMonths === 6 || cfg.planTenureMonths === 12, "bad tenure");
    assert(cfg.rateQuotePeriod === "monthly" || cfg.rateQuotePeriod === "yearly", "bad quote period");
    void modules;
    console.log(`OK ${i.id} · ${inst!.name} · bill=${billing.calc.finalAmountInr}`);
  } catch (e) {
    console.error(`FAIL ${i.id}`, e);
    throw e;
  }
}

const catalog = adminModulesForUi();
assert(catalog.every((m) => m.id !== "transport"), "transport should not be in admin UI catalog");
assert(catalog.length > 0, "admin catalog empty");

console.log("institute-detail.selftest: all assertions passed");
