/**
 * Nexus institute billing — local/demo.
 * Config + immutable invoices + monthly renewals.
 * Overdue billing never auto-suspends an institute.
 */

import { formatDateTimeEnIn, formatInrOrDash } from "@lumenx/utils";
import { getPlatformInstitute, listPlatformInstitutes } from "@/lib/institute-directory-store";
import {
  DEFAULT_PER_STUDENT_RATE_INR,
  calculatePlanBill,
  clampPerStudentRate,
  labelBillingCostModel,
  labelDiscountKind,
  labelPlanTenure,
  labelRateQuotePeriod,
  maxFreeMonthsForPlan,
  parseDiscountKind,
  parsePlanTenure,
  parseRateQuotePeriod,
  validateBillingInputs,
  type BillingCalcResult,
  type DiscountKind,
  type PlanTenureMonths,
  type RateQuotePeriod,
} from "@/lib/billing/billing-calc";
import {
  buildIssuedInvoice,
  freezeIssuedInvoice,
  normalizeIssuedInvoice,
  outstandingOnInvoice,
  resolveBillingLifecycleStatus,
  resolvePaymentStatus,
  type IssuedInvoice,
} from "@/lib/billing/billing-invoice";
import {
  buildBillingHistoryEvents,
  billingLifecycleTone,
  labelBillingLifecycleStatus,
  type BillingHistoryEvent,
  type BillingLifecycleStatus,
  type BillingPaymentMethod,
  type BillingPaymentRecord,
} from "@/lib/billing/billing-history";
import {
  combineRenewalDisplayStatus,
  deriveRenewalStatus,
  nextBillingDateFromPeriodEnd,
  type RenewalStatus,
} from "@/lib/billing/billing-renewals";

export {
  BILLING_POLICY_DEFAULTS,
  DEFAULT_INSTITUTE_RATE_INR,
  DEFAULT_MINIMUM_MONTHLY_CHARGE_INR,
  DEFAULT_PER_STUDENT_RATE_INR,
  PER_STUDENT_RATE_MAX_INR,
  PER_STUDENT_RATE_MIN_INR,
  calculateMonthlyBill,
  calculateMonthlyBillStrict,
  calculatePlanBill,
  calculatePlanBillStrict,
  clampPerStudentRate,
  isPerStudentRateInRange,
  labelBillingCostModel,
  labelDiscountKind,
  labelPlanTenure,
  labelRateQuotePeriod,
  maxFreeMonthsForPlan,
  validateBillingInputs,
} from "@/lib/billing/billing-calc";
export type {
  BillingCalcInput,
  BillingCalcResult,
  BillingCostModel,
  BillingPolicyDefaults,
  BillingValidationIssue,
  BillingValidationResult,
  DiscountKind,
  PlanTenureMonths,
  RateQuotePeriod,
} from "@/lib/billing/billing-calc";

export {
  buildIssuedInvoice,
  commercialSnapshotOf,
  commercialSnapshotsEqual,
  freezeIssuedInvoice,
  invoicePaymentStatus,
  labelInvoicePaymentStatus,
  normalizeIssuedInvoice,
  outstandingOnInvoice,
  resolveBillingLifecycleStatus,
  resolvePaymentStatus,
} from "@/lib/billing/billing-invoice";
export type {
  IssuedInvoice,
  InvoiceCommercialSnapshot,
  InvoicePaymentStatus,
  IssueInvoiceInput,
  InvoiceDocStatus,
} from "@/lib/billing/billing-invoice";

export {
  BILLING_LIFECYCLE_STATUSES,
  billingLifecycleTone,
  buildBillingHistoryEvents,
  labelBillingLifecycleStatus,
  labelPaymentMethod,
} from "@/lib/billing/billing-history";
export type {
  BillingHistoryEvent,
  BillingLifecycleStatus,
  BillingPaymentMethod,
  BillingPaymentRecord,
} from "@/lib/billing/billing-history";

export {
  combineRenewalDisplayStatus,
  deriveRenewalStatus,
  labelRenewalStatus,
  renewalStatusTone,
} from "@/lib/billing/billing-renewals";
export type { RenewalStatus } from "@/lib/billing/billing-renewals";

/** v6: per-student plan pricing (quote period · tenure · XOR discount). */
export const NEXUS_BILLING_STORAGE_KEY = "lumenx.nexus.instituteBilling.v6";
export const NEXUS_BILLING_CHANGED_EVENT = "lumenx:nexus-billing-changed";
const LEGACY_BILLING_STORAGE_KEYS = [
  "lumenx.nexus.instituteBilling.v5",
  "lumenx.nexus.instituteBilling.v4",
  "lumenx.nexus.instituteBilling.v3",
  "lumenx.nexus.instituteBilling.v2",
  "lumenx.nexus.instituteBilling.v1",
] as const;

/** @deprecated Always per_student in plan model. */
export type BillingType = "per_student" | "per_institute";
export type InvoiceStatus = BillingLifecycleStatus | "none";
export type BillingPaymentStatus = BillingLifecycleStatus | "none";

/** @deprecated Use IssuedInvoice */
export type InstituteInvoice = IssuedInvoice;

export type InstituteBillingConfig = {
  instituteId: string;
  /** Quoted ₹ per student (monthly or yearly depending on rateQuotePeriod). */
  quotedRateInr: number;
  rateQuotePeriod: RateQuotePeriod;
  planTenureMonths: PlanTenureMonths;
  discountKind: DiscountKind;
  discountPercent: number;
  freeMonths: number;
  /** @deprecated Compat — monthly equivalent of quoted rate. */
  perStudentRateInr: number;
  /** @deprecated Always per_student. */
  billingType: BillingType;
  /** @deprecated Unused in plan model. */
  instituteRateInr: number;
  /** @deprecated Unused in plan model. */
  minimumMonthlyChargeInr: number;
  billingStartAt: string;
  autoRenew: boolean;
  updatedAt: string;
};

/** @deprecated Prefer BillingCalcResult */
export type BillingCalc = BillingCalcResult;

export type LastPaymentSummary = {
  amountInr: number;
  recordedAt: string;
  invoiceNumber: string;
};

export type InstituteRenewalView = {
  instituteId: string;
  currentBillingPeriodLabel: string;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  nextBillingDate: string;
  nextRenewalDate: string;
  renewalStatus: RenewalStatus;
  autoRenew: boolean;
  lastInvoice: IssuedInvoice | null;
  lastPayment: LastPaymentSummary | null;
  outstandingAmountInr: number;
};

export type InstituteBillingView = {
  instituteId: string;
  config: InstituteBillingConfig;
  calc: BillingCalcResult;
  billingPeriodLabel: string;
  periodStart: string;
  periodEnd: string;
  nextRenewalAt: string;
  currentInvoice: IssuedInvoice | null;
  invoiceStatus: InvoiceStatus;
  paymentStatus: BillingPaymentStatus;
  outstandingAmountInr: number;
  renewal: InstituteRenewalView;
};

type BillingState = {
  configs: Record<string, InstituteBillingConfig>;
  invoices: IssuedInvoice[];
  payments: BillingPaymentRecord[];
  nextInvoiceSeq: number;
  nextPaymentSeq: number;
};

type Listener = () => void;
const listeners = new Set<Listener>();

function nowIso(): string {
  return new Date().toISOString();
}

function parseDate(value: string): Date | null {
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function currentBillingPeriod(
  billingStartAt: string,
  now: Date = new Date(),
  planTenureMonths: number = 1,
): { start: Date; end: Date } {
  const anchor = parseDate(billingStartAt) ?? new Date(now.getFullYear(), now.getMonth(), 1);
  const day = Math.min(28, Math.max(1, anchor.getDate()));
  const tenure = planTenureMonths === 6 || planTenureMonths === 12 ? planTenureMonths : 1;
  let start = new Date(now.getFullYear(), now.getMonth(), day, 0, 0, 0, 0);
  if (start.getTime() > now.getTime()) {
    start = new Date(now.getFullYear(), now.getMonth() - 1, day, 0, 0, 0, 0);
  }
  const end = new Date(start.getFullYear(), start.getMonth() + tenure, day, 0, 0, 0, 0);
  return { start, end };
}

export function nextRenewalDateFrom(billingStartAt: string, now: Date = new Date(), planTenureMonths = 1): Date {
  return currentBillingPeriod(billingStartAt, now, planTenureMonths).end;
}

export function formatBillingMoney(amountInr: number): string {
  return formatInrOrDash(amountInr);
}

export function formatBillingDateTime(value: string | Date): string {
  const d = typeof value === "string" ? parseDate(value) : value;
  if (!d) return "—";
  return formatDateTimeEnIn(d);
}

export function formatPeriodLabel(start: Date | string, end: Date | string): string {
  const s = typeof start === "string" ? parseDate(start) : start;
  const e = typeof end === "string" ? parseDate(end) : end;
  if (!s || !e) return "—";
  const opts: Intl.DateTimeFormatOptions = { day: "numeric", month: "short", year: "numeric" };
  return `${s.toLocaleDateString("en-IN", opts)} – ${e.toLocaleDateString("en-IN", opts)}`;
}

export function labelBillingType(_type?: BillingType): string {
  return "Per Student";
}

export function labelBillingPlanSummary(config: InstituteBillingConfig): string {
  const rate =
    config.rateQuotePeriod === "yearly"
      ? `₹${config.quotedRateInr}/yr`
      : `₹${config.quotedRateInr}/mo`;
  return `${rate} · ${labelPlanTenure(config.planTenureMonths)}`;
}

export function labelInvoiceStatus(status: InvoiceStatus | string): string {
  if (status === "none") return "No invoice";
  if (status === "partially_paid") return "Pending";
  if (status === "void") return "Cancelled";
  return labelBillingLifecycleStatus(status as BillingLifecycleStatus);
}

export function invoiceStatusTone(
  status: InvoiceStatus | string,
): "success" | "warning" | "danger" | "info" | "neutral" {
  if (status === "none") return "neutral";
  if (status === "partially_paid") return "warning";
  if (status === "void") return "danger";
  return billingLifecycleTone(status as BillingLifecycleStatus);
}

export function labelBillingPaymentStatus(status: BillingPaymentStatus | string): string {
  if (status === "none") return "No invoice";
  if (status === "partial") return "Pending";
  return labelBillingLifecycleStatus(status as BillingLifecycleStatus);
}

export function billingPaymentTone(
  status: BillingPaymentStatus | string,
): "success" | "warning" | "danger" | "info" | "neutral" {
  if (status === "none") return "neutral";
  if (status === "partial") return "warning";
  return billingLifecycleTone(status as BillingLifecycleStatus);
}

function activeStudentCountFor(instituteId: string): number {
  return Math.max(0, getPlatformInstitute(instituteId)?.studentCount ?? 0);
}

function instituteNameFor(instituteId: string): string {
  return getPlatformInstitute(instituteId)?.name ?? instituteId;
}

function defaultConfigFor(instituteId: string): InstituteBillingConfig {
  const inst = getPlatformInstitute(instituteId);
  const quotedRateInr = DEFAULT_PER_STUDENT_RATE_INR;
  return {
    instituteId,
    quotedRateInr,
    rateQuotePeriod: "monthly",
    planTenureMonths: 1,
    discountKind: "none",
    discountPercent: 0,
    freeMonths: 0,
    perStudentRateInr: quotedRateInr,
    billingType: "per_student",
    instituteRateInr: 25000,
    minimumMonthlyChargeInr: 8000,
    billingStartAt: inst?.billingStartAt || inst?.createdAt || nowIso(),
    autoRenew: true,
    updatedAt: nowIso(),
  };
}

function billFromConfig(
  instituteId: string,
  config: InstituteBillingConfig,
): BillingCalcResult {
  return calculatePlanBill({
    activeStudentCount: activeStudentCountFor(instituteId),
    quotedRateInr: config.quotedRateInr,
    rateQuotePeriod: config.rateQuotePeriod,
    planTenureMonths: config.planTenureMonths,
    discountKind: config.discountKind,
    discountPercent: config.discountPercent,
    freeMonths: config.freeMonths,
  });
}

function nextInvoiceNumber(seq: number, at: Date = new Date()): string {
  const year = at.getFullYear();
  return `LX-INV-${year}-${String(seq).padStart(5, "0")}`;
}

function seedInvoice(
  instituteId: string,
  config: InstituteBillingConfig,
  opts: { paidRatio?: number; overdue?: boolean; seq: number },
): IssuedInvoice {
  const { start, end } = currentBillingPeriod(
    config.billingStartAt,
    new Date(),
    config.planTenureMonths,
  );
  const calc = billFromConfig(instituteId, config);
  const amountDue = calc.finalAmountInr;
  const paidRatio = opts.paidRatio ?? 0;
  const amountPaidInr = Math.min(amountDue, Math.round(amountDue * paidRatio));

  const issuedAt = new Date(start);
  issuedAt.setHours(9, 0, 0, 0);
  let dueAt = new Date(end);
  dueAt.setDate(dueAt.getDate() - 1);
  if (opts.overdue) {
    dueAt = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  }

  return buildIssuedInvoice({
    instituteId,
    instituteName: instituteNameFor(instituteId),
    activeStudentCount: calc.activeStudentCount,
    quotedRateInr: calc.quotedRateInr,
    rateQuotePeriod: calc.rateQuotePeriod,
    planTenureMonths: calc.planTenureMonths,
    discountKind: calc.discountKind,
    discountPercent: calc.discountPercent,
    freeMonths: calc.freeMonths,
    billingPeriodStart: start,
    billingPeriodEnd: end,
    invoiceNumber: nextInvoiceNumber(opts.seq, issuedAt),
    issueDate: issuedAt,
    dueDate: dueAt,
    amountPaidInr,
  });
}

function buildSeedState(): BillingState {
  const institutes = listPlatformInstitutes().filter((i) => i.status !== "archived");
  const configs: Record<string, InstituteBillingConfig> = {};
  const rateById: Record<string, number> = {
    "ins-test1school": 12,
    "ins-test1school": 14,
    "ins-test1school": 11,
    "ins-test1school": 15,
    "ins-test1school": 10,
    "ins-test1school": 12,
    "ins-test1school": 13,
    "ins-test1school": 12,
    "ins-test1school": 10,
  };

  for (const inst of institutes) {
    const base = defaultConfigFor(inst.id);
    const quotedRateInr = clampPerStudentRate(rateById[inst.id] ?? DEFAULT_PER_STUDENT_RATE_INR);
    configs[inst.id] = {
      ...base,
      quotedRateInr,
      perStudentRateInr: quotedRateInr,
      billingStartAt: inst.billingStartAt || base.billingStartAt,
    };
  }

  const invoices: IssuedInvoice[] = [];
  const payments: BillingPaymentRecord[] = [];
  let seq = 1;
  let paySeq = 1;
  const delhi = configs["ins-test1school"];
  if (delhi) {
    const inv = seedInvoice("ins-test1school", delhi, { paidRatio: 1, seq: seq++ });
    invoices.push(inv);
    if (inv.amountPaidInr > 0) {
      payments.push({
        id: `pay-${String(paySeq++).padStart(5, "0")}`,
        instituteId: inv.instituteId,
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        amountInr: inv.amountPaidInr,
        recordedAt: inv.lastPaymentAt ?? inv.issueDate,
        method: "bank_transfer",
        note: "Seed mock payment — not a gateway charge",
      });
    }
  }
  const harbor = configs["ins-test1school"];
  if (harbor) {
    const inv = seedInvoice("ins-test1school", harbor, { paidRatio: 0.45, seq: seq++ });
    invoices.push(inv);
    if (inv.amountPaidInr > 0) {
      payments.push({
        id: `pay-${String(paySeq++).padStart(5, "0")}`,
        instituteId: inv.instituteId,
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        amountInr: inv.amountPaidInr,
        recordedAt: inv.lastPaymentAt ?? inv.issueDate,
        method: "upi",
        note: "Partial mock payment",
      });
    }
  }
  const chennai = configs["ins-test1school"];
  if (chennai) {
    invoices.push(seedInvoice("ins-test1school", chennai, { paidRatio: 0, overdue: true, seq: seq++ }));
  }
  const pune = configs["ins-test1school"];
  if (pune) invoices.push(seedInvoice("ins-test1school", pune, { paidRatio: 0, seq: seq++ }));

  return { configs, invoices, payments, nextInvoiceSeq: seq, nextPaymentSeq: paySeq };
}

function coerceState(raw: unknown): BillingState | null {
  if (!raw || typeof raw !== "object") return null;
  const parsed = raw as {
    configs?: Record<string, InstituteBillingConfig & { autoRenew?: boolean }>;
    invoices?: unknown[];
    payments?: BillingPaymentRecord[];
    nextInvoiceSeq?: number;
    nextPaymentSeq?: number;
  };
  const configs: Record<string, InstituteBillingConfig> = {};
  for (const [id, c] of Object.entries(parsed.configs ?? {})) {
    configs[id] = normalizeBillingConfig(id, c);
  }
  const invoices = (parsed.invoices ?? [])
    .map((i) => normalizeIssuedInvoice(i))
    .filter((i): i is IssuedInvoice => i !== null)
    .map((i) => freezeIssuedInvoice(i));
  let nextInvoiceSeq = parsed.nextInvoiceSeq ?? 1;
  for (const inv of invoices) {
    const m = /-(\d+)$/.exec(inv.invoiceNumber);
    if (m) nextInvoiceSeq = Math.max(nextInvoiceSeq, Number(m[1]) + 1);
  }
  const payments = Array.isArray(parsed.payments) ? parsed.payments.slice() : [];
  // Backfill mock payments from invoices that already show paid amounts.
  if (payments.length === 0) {
    let paySeq = 1;
    for (const inv of invoices) {
      if (inv.amountPaidInr <= 0) continue;
      payments.push({
        id: `pay-${String(paySeq++).padStart(5, "0")}`,
        instituteId: inv.instituteId,
        invoiceId: inv.id,
        invoiceNumber: inv.invoiceNumber,
        amountInr: inv.amountPaidInr,
        recordedAt: inv.lastPaymentAt ?? inv.issueDate,
        method: "bank_transfer",
        note: "Migrated mock payment",
      });
    }
  }
  let nextPaymentSeq = parsed.nextPaymentSeq ?? 1;
  for (const p of payments) {
    const m = /(\d+)$/.exec(p.id);
    if (m) nextPaymentSeq = Math.max(nextPaymentSeq, Number(m[1]) + 1);
  }
  return { configs, invoices, payments, nextInvoiceSeq, nextPaymentSeq };
}

function readState(): BillingState | null {
  if (typeof localStorage === "undefined") return null;
  try {
    let raw = localStorage.getItem(NEXUS_BILLING_STORAGE_KEY);
    if (!raw) {
      for (const key of LEGACY_BILLING_STORAGE_KEYS) {
        raw = localStorage.getItem(key);
        if (raw) break;
      }
    }
    if (!raw) return null;
    return coerceState(JSON.parse(raw));
  } catch {
    return null;
  }
}

let memory: BillingState | null = null;

function ensureState(): BillingState {
  if (memory) return memory;
  const fromDisk = readState();
  if (fromDisk && Object.keys(fromDisk.configs).length > 0) {
    memory = fromDisk;
    return memory;
  }
  memory = buildSeedState();
  persist(memory);
  return memory;
}

function persist(state: BillingState, opts?: { silent?: boolean }): void {
  memory = state;
  if (typeof localStorage !== "undefined") {
    // Serialize plain copies (frozen objects JSON fine)
    localStorage.setItem(
      NEXUS_BILLING_STORAGE_KEY,
      JSON.stringify({
        configs: state.configs,
        invoices: state.invoices.map((i) => ({ ...i })),
        payments: state.payments,
        nextInvoiceSeq: state.nextInvoiceSeq,
        nextPaymentSeq: state.nextPaymentSeq,
      }),
    );
  }
  if (opts?.silent) return;
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(NEXUS_BILLING_CHANGED_EVENT));
  }
  for (const l of listeners) l();
}

export function subscribeInstituteBilling(listener: Listener): () => void {
  listeners.add(listener);
  if (typeof window !== "undefined") {
    const onStorage = (e: StorageEvent) => {
      if (e.key === NEXUS_BILLING_STORAGE_KEY || LEGACY_BILLING_STORAGE_KEYS.includes(e.key as typeof LEGACY_BILLING_STORAGE_KEYS[number])) {
        memory = null;
        listener();
      }
    };
    const onCustom = () => listener();
    window.addEventListener("storage", onStorage);
    window.addEventListener(NEXUS_BILLING_CHANGED_EVENT, onCustom);
    return () => {
      listeners.delete(listener);
      window.removeEventListener("storage", onStorage);
      window.removeEventListener(NEXUS_BILLING_CHANGED_EVENT, onCustom);
    };
  }
  return () => {
    listeners.delete(listener);
  };
}

function normalizeBillingConfig(
  instituteId: string,
  raw?: Partial<InstituteBillingConfig> & Record<string, unknown> | null,
): InstituteBillingConfig {
  const base = defaultConfigFor(instituteId);
  if (!raw) return base;

  const quotedFromLegacy =
    typeof raw.quotedRateInr === "number" && Number.isFinite(raw.quotedRateInr)
      ? raw.quotedRateInr
      : typeof raw.perStudentRateInr === "number" && Number.isFinite(raw.perStudentRateInr)
        ? raw.perStudentRateInr
        : base.quotedRateInr;
  const quotedRateInr = clampPerStudentRate(quotedFromLegacy);
  const rateQuotePeriod = parseRateQuotePeriod(raw.rateQuotePeriod);
  const planTenureMonths =
    parsePlanTenure(raw.planTenureMonths) ?? base.planTenureMonths;
  let discountKind = parseDiscountKind(raw.discountKind);
  let discountPercent = Math.max(
    0,
    Math.min(100, Math.round(Number(raw.discountPercent) || 0)),
  );
  let freeMonths = Math.max(0, Math.round(Number(raw.freeMonths) || 0));
  const maxFree = maxFreeMonthsForPlan(planTenureMonths);
  if (discountKind === "free_months") {
    freeMonths = Math.min(maxFree, freeMonths);
    discountPercent = 0;
    if (maxFree === 0) discountKind = "none";
  } else if (discountKind === "percent") {
    freeMonths = 0;
  } else {
    discountKind = "none";
    discountPercent = 0;
    freeMonths = 0;
  }

  const monthlyRateInr =
    rateQuotePeriod === "yearly"
      ? Math.round((quotedRateInr / 12) * 100) / 100
      : quotedRateInr;

  return {
    ...base,
    instituteId,
    quotedRateInr,
    rateQuotePeriod,
    planTenureMonths,
    discountKind,
    discountPercent,
    freeMonths,
    perStudentRateInr: monthlyRateInr,
    billingType: "per_student",
    instituteRateInr:
      typeof raw.instituteRateInr === "number" && raw.instituteRateInr > 0
        ? raw.instituteRateInr
        : base.instituteRateInr,
    minimumMonthlyChargeInr:
      typeof raw.minimumMonthlyChargeInr === "number" && raw.minimumMonthlyChargeInr >= 0
        ? raw.minimumMonthlyChargeInr
        : base.minimumMonthlyChargeInr,
    billingStartAt:
      typeof raw.billingStartAt === "string" && raw.billingStartAt
        ? raw.billingStartAt
        : base.billingStartAt,
    autoRenew: raw.autoRenew !== false,
    updatedAt: typeof raw.updatedAt === "string" ? raw.updatedAt : base.updatedAt,
  };
}

export function getBillingConfig(instituteId: string): InstituteBillingConfig {
  const state = ensureState();
  const normalized = normalizeBillingConfig(instituteId, state.configs[instituteId]);
  if (
    !state.configs[instituteId] ||
    state.configs[instituteId]!.quotedRateInr !== normalized.quotedRateInr ||
    state.configs[instituteId]!.planTenureMonths !== normalized.planTenureMonths ||
    state.configs[instituteId]!.rateQuotePeriod !== normalized.rateQuotePeriod
  ) {
    state.configs[instituteId] = normalized;
    persist({ ...state, configs: { ...state.configs } }, { silent: true });
  }
  return state.configs[instituteId]!;
}

export function listInvoicesForInstitute(instituteId: string): IssuedInvoice[] {
  return ensureState()
    .invoices.filter((i) => i.instituteId === instituteId)
    .slice()
    .sort((a, b) => b.issueDate.localeCompare(a.issueDate));
}

export function getInvoice(invoiceId: string): IssuedInvoice | null {
  return ensureState().invoices.find((i) => i.id === invoiceId || i.invoiceNumber === invoiceId) ?? null;
}

/** Latest non-void invoice for the institute. */
function isOpenInvoice(i: IssuedInvoice): boolean {
  return i.status !== "cancelled" && i.status !== "draft";
}

export function getCurrentInvoice(instituteId: string): IssuedInvoice | null {
  return listInvoicesForInstitute(instituteId).find((i) => isOpenInvoice(i) || i.status === "paid") ?? null;
}

function outstandingForInstitute(instituteId: string): number {
  return listInvoicesForInstitute(instituteId).reduce(
    (sum, i) => sum + outstandingOnInvoice(i),
    0,
  );
}

function lastPaymentForInstitute(instituteId: string): LastPaymentSummary | null {
  const fromLedger = listPaymentsForInstitute(instituteId)[0];
  if (fromLedger) {
    return {
      amountInr: fromLedger.amountInr,
      recordedAt: fromLedger.recordedAt,
      invoiceNumber: fromLedger.invoiceNumber,
    };
  }
  return null;
}

function hasOverdueInvoice(instituteId: string, now: Date): boolean {
  return listInvoicesForInstitute(instituteId).some(
    (i) => resolveBillingLifecycleStatus(i, now) === "overdue",
  );
}

export function listPaymentsForInstitute(instituteId: string): BillingPaymentRecord[] {
  return ensureState()
    .payments.filter((p) => p.instituteId === instituteId)
    .slice()
    .sort((a, b) => b.recordedAt.localeCompare(a.recordedAt));
}

export type InvoiceHistoryRow = {
  invoice: IssuedInvoice;
  lifecycleStatus: BillingLifecycleStatus;
  paymentStatus: BillingLifecycleStatus;
  outstandingInr: number;
};

export function listInvoiceHistory(instituteId: string, now = new Date()): InvoiceHistoryRow[] {
  return listInvoicesForInstitute(instituteId).map((invoice) => ({
    invoice,
    lifecycleStatus: resolveBillingLifecycleStatus(invoice, now),
    paymentStatus: resolvePaymentStatus(invoice, now),
    outstandingInr: outstandingOnInvoice(invoice),
  }));
}

export function listBillingHistory(
  instituteId: string,
  now = new Date(),
): BillingHistoryEvent[] {
  return buildBillingHistoryEvents({
    instituteId,
    invoices: listInvoicesForInstitute(instituteId),
    payments: listPaymentsForInstitute(instituteId),
    now,
  });
}

export type RecordMockPaymentInput = {
  invoiceId: string;
  amountInr: number;
  method?: BillingPaymentMethod;
  note?: string;
  recordedAt?: string;
};

export type RecordMockPaymentResult =
  | { ok: true; payment: BillingPaymentRecord; invoice: IssuedInvoice }
  | {
      ok: false;
      reason: "invoice_not_found" | "cancelled" | "draft" | "invalid_amount" | "already_paid";
    };

/**
 * Record a mock payment against an invoice (local ledger only).
 * Does not call any payment gateway. Does not change commercial snapshot fields.
 */
export function recordMockPayment(input: RecordMockPaymentInput): RecordMockPaymentResult {
  const state = ensureState();
  const idx = state.invoices.findIndex(
    (i) => i.id === input.invoiceId || i.invoiceNumber === input.invoiceId,
  );
  if (idx < 0) return { ok: false, reason: "invoice_not_found" };
  const current = state.invoices[idx]!;
  if (current.status === "cancelled") return { ok: false, reason: "cancelled" };
  if (current.status === "draft") return { ok: false, reason: "draft" };

  const amount = Math.round(Number(input.amountInr) || 0);
  if (!Number.isFinite(amount) || amount <= 0) return { ok: false, reason: "invalid_amount" };

  const balance = outstandingOnInvoice(current);
  if (balance <= 0) return { ok: false, reason: "already_paid" };

  const applied = Math.min(amount, balance);
  const amountPaidInr = current.amountPaidInr + applied;
  const recordedAt = input.recordedAt ?? nowIso();
  const status =
    amountPaidInr >= current.finalAmountInr ? ("paid" as const) : ("issued" as const);

  const nextInvoice = freezeIssuedInvoice({
    ...current,
    amountPaidInr,
    lastPaymentAt: recordedAt,
    status,
  });

  const payment: BillingPaymentRecord = {
    id: `pay-${String(state.nextPaymentSeq).padStart(5, "0")}`,
    instituteId: current.instituteId,
    invoiceId: current.id,
    invoiceNumber: current.invoiceNumber,
    amountInr: applied,
    recordedAt,
    method: input.method ?? "bank_transfer",
    note: input.note ?? "Mock payment — no gateway",
  };

  const invoices = state.invoices.slice();
  invoices[idx] = nextInvoice;

  persist({
    ...state,
    invoices,
    payments: [...state.payments, payment],
    nextPaymentSeq: state.nextPaymentSeq + 1,
  });

  return { ok: true, payment, invoice: nextInvoice };
}

export type CancelInvoiceResult =
  | { ok: true; invoice: IssuedInvoice }
  | { ok: false; reason: "invoice_not_found" | "already_cancelled" };

/** Cancel an invoice. Commercial snapshot stays; status becomes Cancelled. */
export function cancelInvoice(invoiceId: string, reason?: string): CancelInvoiceResult {
  const state = ensureState();
  const idx = state.invoices.findIndex(
    (i) => i.id === invoiceId || i.invoiceNumber === invoiceId,
  );
  if (idx < 0) return { ok: false, reason: "invoice_not_found" };
  const current = state.invoices[idx]!;
  if (current.status === "cancelled") return { ok: false, reason: "already_cancelled" };

  const nextInvoice = freezeIssuedInvoice({
    ...current,
    status: "cancelled",
    voidedAt: nowIso(),
    voidReason: reason ?? "Cancelled",
  });
  const invoices = state.invoices.slice();
  invoices[idx] = nextInvoice;
  persist({
    ...state,
    invoices,
    payments: state.payments.slice(),
  });
  return { ok: true, invoice: nextInvoice };
}

export function getInstituteRenewalView(
  instituteId: string,
  now: Date = new Date(),
): InstituteRenewalView {
  const config = getBillingConfig(instituteId);
  const { start, end } = currentBillingPeriod(
    config.billingStartAt,
    now,
    config.planTenureMonths,
  );
  const nextBilling = nextBillingDateFromPeriodEnd(end);
  const nextRenewal = nextBilling;
  let renewalStatus = deriveRenewalStatus(nextRenewal, now);
  renewalStatus = combineRenewalDisplayStatus(
    renewalStatus,
    hasOverdueInvoice(instituteId, now),
  );

  return {
    instituteId,
    currentBillingPeriodLabel: formatPeriodLabel(start, end),
    currentPeriodStart: start.toISOString(),
    currentPeriodEnd: end.toISOString(),
    nextBillingDate: nextBilling.toISOString(),
    nextRenewalDate: nextRenewal.toISOString(),
    renewalStatus,
    autoRenew: config.autoRenew,
    lastInvoice: getCurrentInvoice(instituteId),
    lastPayment: lastPaymentForInstitute(instituteId),
    outstandingAmountInr: outstandingForInstitute(instituteId),
  };
}

export function setAutoRenew(instituteId: string, autoRenew: boolean): InstituteBillingConfig {
  const state = ensureState();
  const prev = state.configs[instituteId] ?? defaultConfigFor(instituteId);
  const invoicesSnapshot = state.invoices.map((i) => freezeIssuedInvoice({ ...i }));
  const next: InstituteBillingConfig = {
    ...prev,
    autoRenew,
    updatedAt: nowIso(),
  };
  persist({
    ...state,
    configs: { ...state.configs, [instituteId]: next },
    invoices: invoicesSnapshot,
  });
  return next;
}

export type ProcessRenewalResult =
  | { ok: true; invoice: IssuedInvoice; preservedInvoiceCount: number }
  | {
      ok: false;
      reason: "institute_not_found" | "not_due" | "period_already_invoiced";
    };

/**
 * Begin the next monthly billing period:
 * 1. Read live active student count
 * 2. Read current billing rate / minimum
 * 3. Calculate the new bill
 * 4. Generate a new immutable invoice
 * 5. Leave all previous invoices unchanged
 *
 * Never suspends an institute — overdue is billing status only.
 */
export function processMonthlyRenewal(
  instituteId: string,
  options: { now?: Date; force?: boolean } = {},
): ProcessRenewalResult {
  const now = options.now ?? new Date();
  const force = options.force === true;
  const inst = getPlatformInstitute(instituteId);
  if (!inst) return { ok: false, reason: "institute_not_found" };

  const config = getBillingConfig(instituteId);
  const { start: currentStart, end: currentEnd } = currentBillingPeriod(
    config.billingStartAt,
    now,
    config.planTenureMonths,
  );

  if (!force && now.getTime() < currentEnd.getTime()) {
    return { ok: false, reason: "not_due" };
  }

  // New period begins at the end of the current period.
  const newStart = new Date(currentEnd.getTime());
  const newEnd = new Date(
    newStart.getFullYear(),
    newStart.getMonth() + config.planTenureMonths,
    newStart.getDate(),
    0,
    0,
    0,
    0,
  );
  const periodKey = `${newStart.toISOString()}|${newEnd.toISOString()}`;

  const existingForNewPeriod = listInvoicesForInstitute(instituteId).find(
    (i) =>
      i.status !== "cancelled" &&
      i.status !== "draft" &&
      `${i.billingPeriodStart}|${i.billingPeriodEnd}` === periodKey,
  );
  if (existingForNewPeriod) {
    return { ok: false, reason: "period_already_invoiced" };
  }

  const preserved = ensureState().invoices.map((i) => freezeIssuedInvoice({ ...i }));
  const preservedInvoiceCount = preserved.length;

  // 1–3: live students + rate → calculate
  const calc = billFromConfig(instituteId, config);

  const state = ensureState();
  const seq = state.nextInvoiceSeq;
  const due = new Date(newEnd);
  due.setDate(due.getDate() - 1);

  // 4: new invoice only
  const invoice = buildIssuedInvoice({
    instituteId,
    instituteName: inst.name,
    activeStudentCount: calc.activeStudentCount,
    quotedRateInr: calc.quotedRateInr,
    rateQuotePeriod: calc.rateQuotePeriod,
    planTenureMonths: calc.planTenureMonths,
    discountKind: calc.discountKind,
    discountPercent: calc.discountPercent,
    freeMonths: calc.freeMonths,
    billingPeriodStart: newStart,
    billingPeriodEnd: newEnd,
    invoiceNumber: nextInvoiceNumber(seq, now),
    issueDate: now,
    dueDate: due,
    amountPaidInr: 0,
  });

  // Advance billing anchor so "current period" tracks the new month.
  // 5: previous invoices array reused unchanged (+ append new).
  const nextConfig: InstituteBillingConfig = {
    ...config,
    billingStartAt: newStart.toISOString(),
    updatedAt: nowIso(),
  };

  persist({
    ...state,
    configs: { ...state.configs, [instituteId]: nextConfig },
    invoices: [...preserved, invoice],
    nextInvoiceSeq: seq + 1,
  });

  // Explicit invariant: never call suspendInstitute / change institute status.
  void currentStart;

  return { ok: true, invoice, preservedInvoiceCount };
}

/**
 * Process renewals for institutes with autoRenew when the period has ended.
 * Does not suspend any institute.
 */
export function processDueAutoRenewals(now: Date = new Date()): IssuedInvoice[] {
  const created: IssuedInvoice[] = [];
  for (const inst of listPlatformInstitutes()) {
    if (inst.status === "archived") continue;
    const config = getBillingConfig(inst.id);
    if (!config.autoRenew) continue;
    const result = processMonthlyRenewal(inst.id, { now, force: false });
    if (result.ok) created.push(result.invoice);
  }
  return created;
}

export type IssueInvoiceResult =
  | { ok: true; invoice: IssuedInvoice }
  | { ok: false; reason: "institute_not_found" | "period_already_invoiced" };

/**
 * Issue an immutable invoice for the current billing period.
 * Snapshots students, rate, min charge, and final amount at issue time.
 */
export function issueInvoice(instituteId: string, now: Date = new Date()): IssueInvoiceResult {
  const inst = getPlatformInstitute(instituteId);
  if (!inst) return { ok: false, reason: "institute_not_found" };

  const config = getBillingConfig(instituteId);
  const { start, end } = currentBillingPeriod(
    config.billingStartAt,
    now,
    config.planTenureMonths,
  );
  const periodKey = `${start.toISOString()}|${end.toISOString()}`;

  const existing = listInvoicesForInstitute(instituteId).find(
    (i) =>
      i.status !== "cancelled" &&
      i.status !== "draft" &&
      `${i.billingPeriodStart}|${i.billingPeriodEnd}` === periodKey,
  );
  if (existing) {
    return { ok: false, reason: "period_already_invoiced" };
  }

  const calc = billFromConfig(instituteId, config);

  const state = ensureState();
  const seq = state.nextInvoiceSeq;
  const due = new Date(end);
  due.setDate(due.getDate() - 1);
  const preserved = state.invoices.map((i) => freezeIssuedInvoice({ ...i }));

  const invoice = buildIssuedInvoice({
    instituteId,
    instituteName: inst.name,
    activeStudentCount: calc.activeStudentCount,
    quotedRateInr: calc.quotedRateInr,
    rateQuotePeriod: calc.rateQuotePeriod,
    planTenureMonths: calc.planTenureMonths,
    discountKind: calc.discountKind,
    discountPercent: calc.discountPercent,
    freeMonths: calc.freeMonths,
    billingPeriodStart: start,
    billingPeriodEnd: end,
    invoiceNumber: nextInvoiceNumber(seq, now),
    issueDate: now,
    dueDate: due,
    amountPaidInr: 0,
  });

  persist({
    ...state,
    invoices: [...preserved, invoice],
    nextInvoiceSeq: seq + 1,
  });

  return { ok: true, invoice };
}

export function getInstituteBillingView(instituteId: string, now = new Date()): InstituteBillingView {
  const config = getBillingConfig(instituteId);
  const calc = billFromConfig(instituteId, config);
  const { start, end } = currentBillingPeriod(
    config.billingStartAt,
    now,
    config.planTenureMonths,
  );
  const currentInvoice = getCurrentInvoice(instituteId);
  const renewal = getInstituteRenewalView(instituteId, now);

  return {
    instituteId,
    config,
    calc,
    billingPeriodLabel: formatPeriodLabel(start, end),
    periodStart: start.toISOString(),
    periodEnd: end.toISOString(),
    nextRenewalAt: end.toISOString(),
    currentInvoice,
    invoiceStatus: currentInvoice
      ? resolveBillingLifecycleStatus(currentInvoice, now)
      : "none",
    paymentStatus: currentInvoice ? resolvePaymentStatus(currentInvoice, now) : "none",
    outstandingAmountInr: renewal.outstandingAmountInr,
    renewal,
  };
}

export type UpdateBillingPlanInput = {
  quotedRateInr: number;
  rateQuotePeriod: RateQuotePeriod;
  planTenureMonths: PlanTenureMonths;
  discountKind: DiscountKind;
  discountPercent?: number;
  freeMonths?: number;
};

/**
 * Edit live per-student plan pricing for an institute.
 * Never mutates issued invoice commercial snapshots.
 */
export function updateBillingPlan(
  instituteId: string,
  input: UpdateBillingPlanInput,
): InstituteBillingConfig | null {
  const validation = validateBillingInputs({
    activeStudentCount: activeStudentCountFor(instituteId),
    quotedRateInr: input.quotedRateInr,
    rateQuotePeriod: input.rateQuotePeriod,
    planTenureMonths: input.planTenureMonths,
    discountKind: input.discountKind,
    discountPercent: input.discountPercent ?? 0,
    freeMonths: input.freeMonths ?? 0,
  });
  if (!validation.ok) return null;

  const state = ensureState();
  const beforeSnapshots = state.invoices.map((i) => ({ ...i }));

  const prev = state.configs[instituteId] ?? defaultConfigFor(instituteId);
  const n = validation.normalized;
  const monthlyRateInr =
    n.rateQuotePeriod === "yearly"
      ? Math.round((n.quotedRateInr / 12) * 100) / 100
      : n.quotedRateInr;

  const next: InstituteBillingConfig = {
    ...prev,
    quotedRateInr: n.quotedRateInr,
    rateQuotePeriod: n.rateQuotePeriod,
    planTenureMonths: n.planTenureMonths,
    discountKind: n.discountKind,
    discountPercent: n.discountPercent,
    freeMonths: n.freeMonths,
    perStudentRateInr: monthlyRateInr,
    billingType: "per_student",
    updatedAt: nowIso(),
  };

  persist({
    ...state,
    configs: { ...state.configs, [instituteId]: next },
    invoices: beforeSnapshots.map((i) => freezeIssuedInvoice(i)),
  });
  return next;
}

