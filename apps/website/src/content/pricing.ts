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
  title: `Clear pricing for institutes — about ${formatInr(DEFAULT_PER_STUDENT_RATE_INR)} per student each month.`,
  lede: `One plan for your campus. Admin and Connect are included. Try free for ${DEFAULT_TRIAL_DAYS} days after approval. You arrange payment with us when you are ready — not on this website.`,
} as const;

export const PRICING_PILLARS = [
  {
    title: "Per student",
    body: `Most institutes pay about ${formatInr(DEFAULT_PER_STUDENT_RATE_INR)}–${formatInr(NORMAL_PER_STUDENT_RATE_MAX_INR)} per active student each month. As your roll grows, the monthly price follows.`,
  },
  {
    title: "One campus plan",
    body: "Admin and Connect are included. Transport, Admissions, and Careers can be turned on for your institute when you need them — without buying separate apps.",
  },
  {
    title: "Try before you pay",
    body: `${DEFAULT_TRIAL_DAYS} days of full access after your institute is approved. No payment is taken on this website.`,
  },
] as const;

export const PRICING_HOW_IT_WORKS = [
  {
    title: "Count your students",
    body: `We use your active student count and a per-student rate (typically ${formatInr(NORMAL_PER_STUDENT_RATE_MIN_INR)}–${formatInr(NORMAL_PER_STUDENT_RATE_MAX_INR)}).`,
  },
  {
    title: "Campus starting price",
    body: `Every institute starts from ${formatInr(MIN_MONTHLY_CHARGE_INR)} per month for the whole campus, so smaller schools still get the full platform.`,
  },
  {
    title: "Choose your tenure",
    body: "Pay monthly or for 6 months, or save with yearly (2 months free).",
  },
] as const;

export const PRICING_FAQ: { q: string; a: string }[] = [
  {
    q: "How much does LumenX cost?",
    a: `The estimate on this site is about ${formatInr(DEFAULT_PER_STUDENT_RATE_INR)} per student each month. Your confirmed rate is usually between ${formatInr(NORMAL_PER_STUDENT_RATE_MIN_INR)} and ${formatInr(NORMAL_PER_STUDENT_RATE_MAX_INR)}. We share an exact quote for your student count when you contact us.`,
  },
  {
    q: "What is the monthly campus price?",
    a: `It is students × per-student rate, or ${formatInr(MIN_MONTHLY_CHARGE_INR)} for the whole institute — whichever is higher. That keeps pricing simple and fair for both small and large campuses.`,
  },
  {
    q: "What is included in the plan?",
    a: "Admin (the office) and Connect (parents, teachers, and students) are included. Transport, Admissions, and Careers can be enabled for your institute when you need them.",
  },
  {
    q: "Do we pay separately for each app?",
    a: "No. You pay one campus subscription based on active students. Optional modules are enabled on that same plan — not sold as separate public products here.",
  },
  {
    q: "Is there a free trial?",
    a: `Yes. ${DEFAULT_TRIAL_DAYS} days of full access after your institute is approved. Payment is arranged later with our team — not on this website.`,
  },
  {
    q: "Can we pay online on this website?",
    a: "No. This site is for information and contact only. After approval, we arrange payment with your institute.",
  },
  {
    q: "What tenures can we choose?",
    a: "Monthly, 6 months, or yearly. Yearly includes 2 months free and is usually the best value for a full academic cycle.",
  },
  {
    q: "What happens when a period ends?",
    a: `You get ${DEFAULT_GRACE_DAYS} days of full access after expiry, then read-only access until you renew.`,
  },
  {
    q: "Does Transport, Admissions, or Careers cost extra?",
    a: "They are part of the same per-student campus model when enabled. We do not list separate public prices for each module on this site — ask us when you request a quote.",
  },
  {
    q: "Who is Nexus for?",
    a: "Nexus is for groups and LumenX operators — licensing, support, and service quality. A single campus usually works in Admin and Connect and may never open Nexus.",
  },
  {
    q: "How do we get an exact quote?",
    a: "Tell us your active student count (and whether you need Transport, Admissions, or Careers). We confirm your per-student rate and send a clear campus quote.",
  },
  {
    q: "Is the calculator on this page a final bill?",
    a: `No. It is an estimate using ${formatInr(DEFAULT_PER_STUDENT_RATE_INR)} per student. Your confirmed rate and enabled modules are finalized when you join.`,
  },
];

export const PRICING_INCLUSION = [
  {
    id: "admin",
    name: "Admin",
    access: "Included",
    note: "Office console — people, classes, fees, and daily operations.",
  },
  {
    id: "connect",
    name: "Connect",
    access: "Included",
    note: "Parents, teachers, and students on the same institute record.",
  },
  {
    id: "transport",
    name: "Transport",
    access: "On request",
    note: "Driver trips and boarding — enabled for your campus when needed.",
  },
  {
    id: "admissions",
    name: "Admissions",
    access: "On request",
    note: "Applications and intake in the same LumenX family.",
  },
  {
    id: "careers",
    name: "Careers",
    access: "On request",
    note: "Hiring and job applications — enabled when your institute needs it.",
  },
  {
    id: "nexus",
    name: "Nexus",
    access: "Groups",
    note: "Service platform for groups and operators. Most single schools use Admin instead.",
  },
] as const;
