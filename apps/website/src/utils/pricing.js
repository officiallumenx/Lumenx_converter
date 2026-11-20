/**
 * LumenX approved pricing helpers.
 * monthlyPayable = max(minimumMonthly, studentCount × ratePerStudent)
 * ₹8,000 is a minimum monthly amount — never added on top of the student calculation.
 * Custom per-student rate: any finite number ≥ rateMin (default ₹10). No upper limit.
 */

export const PRICING = {
  minimumMonthly: 8000,
  /** @deprecated use minimumMonthly — kept as alias for any legacy reads */
  instituteMonthly: 8000,
  /** Minimum permitted custom rate (₹ per student / month) */
  rateMin: 10,
  /** Default rate shown in the calculator */
  defaultRate: 10,
  /** @deprecated use defaultRate */
  perStudent: 10,
  trialDays: 60,
  yearlyFreeMonths: 2,
  durations: [
    {
      id: "3m",
      label: "3 Months",
      monthsPaid: 3,
      serviceMonths: 3,
    },
    {
      id: "6m",
      label: "6 Months",
      monthsPaid: 6,
      serviceMonths: 6,
    },
    {
      id: "12m",
      label: "Annual Plan",
      monthsPaid: 10,
      serviceMonths: 12,
      note: "12 months of service. Pay for only 10 months.",
    },
  ],
};

export function normalizeStudentCount(value) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.floor(n);
}

/**
 * Accept any finite numeric rate ≥ PRICING.rateMin.
 * Rejects blank, NaN, Infinity, and values below the minimum.
 */
export function normalizeRate(value) {
  if (value === "" || value === null || value === undefined) return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  if (n < PRICING.rateMin) return null;
  return n;
}

export function getDuration(durationId) {
  // Accept legacy "annual" id as alias for 12m
  const id = durationId === "annual" ? "12m" : durationId;
  return PRICING.durations.find((d) => d.id === id) || null;
}

/**
 * studentSubtotal = students × rate
 * monthlyPayable = Math.max(8000, studentSubtotal)
 *
 * Plan cards and totals MUST use monthlyPayable only — never the raw subtotal
 * when it is below the ₹8,000 minimum institute monthly price.
 */
export function calculateMonthly(students, rate) {
  const count = normalizeStudentCount(students);
  const r = normalizeRate(rate);
  if (count === null || r === null) return null;

  const studentSubtotal = count * r;
  const monthlyPayable = Math.max(PRICING.minimumMonthly, studentSubtotal);
  const minimumApplied = studentSubtotal < PRICING.minimumMonthly;

  return {
    students: count,
    rate: r,
    /** @deprecated prefer studentSubtotal */
    calculatedAmount: studentSubtotal,
    studentSubtotal,
    monthlyPayable,
    minimumApplied,
    minimumMonthly: PRICING.minimumMonthly,
  };
}

/**
 * Full quote for a duration.
 * 3m / 6m: total = monthly × months
 * 12m: normal = monthly×12, discount = monthly×2, final = monthly×10
 */
export function calculateQuote(students, rate, durationId) {
  const monthly = calculateMonthly(students, rate);
  const duration = getDuration(durationId);
  if (!monthly || !duration) return null;

  const isAnnual = duration.id === "12m";
  const normalAnnualAmount = isAnnual
    ? monthly.monthlyPayable * 12
    : null;
  const annualDiscount = isAnnual ? monthly.monthlyPayable * 2 : null;
  const totalPayable = monthly.monthlyPayable * duration.monthsPaid;

  return {
    ...monthly,
    durationId: duration.id,
    durationLabel: duration.label,
    monthsPaid: duration.monthsPaid,
    serviceMonths: duration.serviceMonths,
    isAnnual,
    normalAnnualAmount,
    annualDiscount,
    totalPayable,
    calculatedFormatted: formatInr(monthly.studentSubtotal),
    studentSubtotalFormatted: formatInr(monthly.studentSubtotal),
    monthlyFormatted: formatInr(monthly.monthlyPayable),
    totalFormatted: formatInr(totalPayable),
    normalAnnualFormatted: normalAnnualAmount !== null ? formatInr(normalAnnualAmount) : null,
    annualDiscountFormatted: annualDiscount !== null ? formatInr(annualDiscount) : null,
  };
}

export function formatInr(amount) {
  if (amount === null || amount === undefined || Number.isNaN(amount)) return "—";
  return `₹${Number(amount).toLocaleString("en-IN")}`;
}

/** @deprecated Use calculateMonthly / calculateQuote */
export function monthlyAmount(_model, students = 0, rate = PRICING.defaultRate) {
  const result = calculateMonthly(students, rate);
  return result ? result.monthlyPayable : null;
}

/** @deprecated Use calculateQuote */
export function totalPayable(_model, durationId, students = 0, rate = PRICING.defaultRate) {
  const quote = calculateQuote(students, rate, durationId);
  return quote ? quote.totalPayable : null;
}

/** @deprecated Use calculateQuote */
export function describeQuote(_model, durationId, students = 0, rate = PRICING.defaultRate) {
  return calculateQuote(students, rate, durationId);
}
