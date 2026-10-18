import {
  DEFAULT_GRACE_DAYS,
  DEFAULT_PER_STUDENT_RATE_INR,
  DEFAULT_TRIAL_DAYS,
  MIN_MONTHLY_CHARGE_INR,
  NORMAL_PER_STUDENT_RATE_MAX_INR,
  NORMAL_PER_STUDENT_RATE_MIN_INR,
} from "@lumenx/utils/subscription/policy";
import { formatInr } from "@/lib/format";

export const PRICING_HERO = {
  eyebrow: "Pricing",
  title: `Monthly from ${formatInr(DEFAULT_PER_STUDENT_RATE_INR)} per student.`,
  lede: `Starts from ${formatInr(DEFAULT_PER_STUDENT_RATE_INR)} / student / month. Your rate is set for your campus (often ${formatInr(NORMAL_PER_STUDENT_RATE_MIN_INR)}–${formatInr(NORMAL_PER_STUDENT_RATE_MAX_INR)}). You pay students × that rate, or ${formatInr(MIN_MONTHLY_CHARGE_INR)} — whichever is higher. Never both. ${DEFAULT_TRIAL_DAYS}-day free trial after approval.`,
} as const;

export const PRICING_FORMULA = [
  {
    value: `From ${formatInr(DEFAULT_PER_STUDENT_RATE_INR)}`,
    note: "per student / month",
  },
  {
    value: "or",
    note: `${formatInr(MIN_MONTHLY_CHARGE_INR)} campus minimum`,
  },
  {
    value: `${DEFAULT_TRIAL_DAYS} days`,
    note: "free trial after approval",
  },
] as const;

export const PRICING_RULE = {
  title: "How the bill is calculated",
  body: `Monthly price = the higher of (students × your per-student rate) or ${formatInr(MIN_MONTHLY_CHARGE_INR)}. Pricing starts from ${formatInr(DEFAULT_PER_STUDENT_RATE_INR)} / student / month. Your confirmed rate is set for your campus — typically ${formatInr(NORMAL_PER_STUDENT_RATE_MIN_INR)}–${formatInr(NORMAL_PER_STUDENT_RATE_MAX_INR)}.`,
  examples: [
    {
      label: "Small campus",
      detail: `400 students × ${formatInr(DEFAULT_PER_STUDENT_RATE_INR)} = ${formatInr(400 * DEFAULT_PER_STUDENT_RATE_INR)} → you pay ${formatInr(MIN_MONTHLY_CHARGE_INR)} (minimum).`,
    },
    {
      label: "Larger campus",
      detail: `1,000 students × ${formatInr(DEFAULT_PER_STUDENT_RATE_INR)} = ${formatInr(1000 * DEFAULT_PER_STUDENT_RATE_INR)} → you pay ${formatInr(1000 * DEFAULT_PER_STUDENT_RATE_INR)} at that rate.`,
    },
  ],
  note: `If students × rate is under ${formatInr(MIN_MONTHLY_CHARGE_INR)}, the campus minimum applies. Above that, you pay per student at your assigned rate.`,
} as const;

export const PRICING_INCLUDED = [
  {
    title: "Included",
    items: [
      "Admin — office console for the institute",
      "Connect — parents, teachers, and students",
    ],
  },
  {
    title: "Add when you need them",
    items: [
      "Transport — driver trips and boarding",
      "Admissions — applications and intake",
      "Careers — hiring and job applications",
    ],
  },
] as const;

export const PRICING_FAQ: { q: string; a: string }[] = [
  {
    q: "Does monthly pricing start from ₹12?",
    a: `Yes — public pricing starts from ${formatInr(DEFAULT_PER_STUDENT_RATE_INR)} / student / month. Your institute’s confirmed rate is set for your campus and is often between ${formatInr(NORMAL_PER_STUDENT_RATE_MIN_INR)} and ${formatInr(NORMAL_PER_STUDENT_RATE_MAX_INR)}.`,
  },
  {
    q: "Do we pay per-student rate plus ₹8,000?",
    a: `No. You pay one monthly amount — whichever is higher: students × your rate, or ${formatInr(MIN_MONTHLY_CHARGE_INR)}. The two are never added.`,
  },
  {
    q: "How much does it cost?",
    a: `From ${formatInr(DEFAULT_PER_STUDENT_RATE_INR)} per student each month, or ${formatInr(MIN_MONTHLY_CHARGE_INR)} if students × rate is lower. Typical rates are ${formatInr(NORMAL_PER_STUDENT_RATE_MIN_INR)}–${formatInr(NORMAL_PER_STUDENT_RATE_MAX_INR)} per student.`,
  },
  {
    q: "What is included?",
    a: "Admin and Connect are included. Transport, Admissions, and Careers can be turned on for your campus when you need them — still one campus plan.",
  },
  {
    q: "Is there a free trial?",
    a: `Yes. ${DEFAULT_TRIAL_DAYS} days of full access after your institute is approved. This website does not take payment.`,
  },
  {
    q: "Can we pay yearly?",
    a: "Yes. Monthly, 6 months, or yearly. Yearly includes 2 months free.",
  },
  {
    q: "Is the estimate on this page final?",
    a: `No. The calculator lets you try a rate; your confirmed per-student rate is set for your institute when you join.`,
  },
  {
    q: "What happens when a period ends?",
    a: `You get ${DEFAULT_GRACE_DAYS} days of full access after expiry, then read-only access until you renew.`,
  },
];
