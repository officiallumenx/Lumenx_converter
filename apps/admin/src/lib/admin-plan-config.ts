/** Single source of truth for Admin plan tiers, module catalog, and storage quotas. */

export type PlanTier = "core" | "plus" | "max" | "custom";

export type BillingTerm = "6mo" | "1yr" | "2yr" | "5yr";

export type ModuleGroup = "Core" | "Operations" | "Communications" | "Intelligence" | "Infrastructure" | "Services" | "Institute";

export type ModuleDef = {
  id: string;
  label: string;
  route?: string;
  minPlan: PlanTier;
  group: ModuleGroup;
  description: string;
};

export const PLAN_ORDER: PlanTier[] = ["core", "plus", "max", "custom"];

export const PLAN_LABELS: Record<PlanTier, string> = {
  core: "Core",
  plus: "Plus",
  max: "Max",
  custom: "Custom",
};

export const PLAN_DETAILS: Record<
  PlanTier,
  { price: string; desc: string; studentLimit: number; branchLimit: number; customRoleCap: number; storageGb: number; features: string[] }
> = {
  core: {
    price: "₹49,999/yr",
    desc: "Essential people & academics for small institutes",
    studentLimit: 500,
    branchLimit: 1,
    customRoleCap: 2,
    storageGb: 500,
    features: ["Up to 500 students", "Single branch", "Core modules"],
  },
  plus: {
    price: "₹1,49,999/yr",
    desc: "Operational depth for growing institutes",
    studentLimit: 5000,
    branchLimit: 3,
    customRoleCap: 5,
    storageGb: 1024,
    features: ["Up to 5,000 students", "3 branches", "Timetable & analytics"],
  },
  max: {
    price: "₹3,99,999/yr",
    desc: "Full platform with services & insights",
    studentLimit: 20000,
    branchLimit: 10,
    customRoleCap: 10,
    storageGb: 2048,
    features: ["Up to 20,000 students", "10 branches", "All modules"],
  },
  custom: {
    price: "Contact sales",
    desc: "Unlimited scale with custom branding & IAM",
    studentLimit: Infinity,
    branchLimit: Infinity,
    customRoleCap: Infinity,
    storageGb: 5120,
    features: ["Unlimited students", "Unlimited branches", "Full IAM", "Custom branding"],
  },
};

export const BILLING_TERMS: { key: BillingTerm; label: string }[] = [
  { key: "6mo", label: "6 months" },
  { key: "1yr", label: "Yearly" },
  { key: "2yr", label: "2 years" },
  { key: "5yr", label: "5 years" },
];

export const MODULE_CATALOG: ModuleDef[] = [
  { id: "students", label: "Students", route: "/students", minPlan: "core", group: "Core", description: "Directory, admissions, 360 profiles" },
  { id: "teachers", label: "Teachers", route: "/teachers", minPlan: "core", group: "Core", description: "Faculty records and ratings" },
  { id: "parents", label: "Parents", route: "/parents", minPlan: "core", group: "Core", description: "Guardian accounts and child linking" },
  { id: "classes", label: "Classes & Sections", route: "/classes", minPlan: "core", group: "Core", description: "Class structure and section assignments" },
  { id: "subjects", label: "Subjects", route: "/subjects", minPlan: "core", group: "Core", description: "Subject catalog and teacher assignment" },
  { id: "attendance", label: "Attendance", route: "/attendance", minPlan: "core", group: "Operations", description: "Daily attendance capture and reports" },
  { id: "teacher-attendance", label: "Teacher Attendance", route: "/teacher-attendance", minPlan: "core", group: "Operations", description: "Faculty daily attendance" },
  { id: "timetable", label: "Timetable", route: "/timetable", minPlan: "plus", group: "Operations", description: "Conflict-aware schedule builder" },
  { id: "exams", label: "Exams", route: "/exams", minPlan: "plus", group: "Operations", description: "Exam scheduling and timetables" },
  { id: "marks", label: "Marks", route: "/marks", minPlan: "plus", group: "Operations", description: "Results ingestion and publish" },
  { id: "complaints", label: "Complaints", route: "/complaints", minPlan: "plus", group: "Operations", description: "Case management with SLAs" },
  { id: "notifications", label: "Notifications", route: "/notifications", minPlan: "core", group: "Communications", description: "Push/email/SMS messages" },
  { id: "announcements", label: "Announcements", route: "/announcements", minPlan: "plus", group: "Communications", description: "Long-form notices with pinning" },
  { id: "events", label: "Events", route: "/events", minPlan: "plus", group: "Communications", description: "Calendar, RSVPs, audience targeting" },
  { id: "alerts", label: "Alerts", route: "/alerts", minPlan: "max", group: "Communications", description: "Rule-based operational alerting" },
  { id: "analytics", label: "Analytics", route: "/analytics", minPlan: "plus", group: "Intelligence", description: "Cohort and performance intelligence" },
  { id: "permissions", label: "IAM & Permissions", route: "/permissions", minPlan: "max", group: "Infrastructure", description: "Roles, scopes, custom matrices" },
  { id: "storage", label: "Cloud Storage", route: "/storage", minPlan: "plus", group: "Infrastructure", description: "Archive, quotas, cleanup" },
  { id: "transport", label: "Transport", route: "/transport", minPlan: "plus", group: "Services", description: "Routes, fleet, assignments" },
  { id: "leave", label: "Leave Center", route: "/leave", minPlan: "plus", group: "Services", description: "Student & teacher leave approval" },
  { id: "fees", label: "Fees", route: "/fees", minPlan: "plus", group: "Services", description: "Fee structures and collection" },
  { id: "admissions", label: "Admissions", route: "/admissions", minPlan: "plus", group: "Services", description: "Application pipeline" },
  { id: "careers", label: "Careers", route: "/careers", minPlan: "max", group: "Services", description: "Hiring pipeline" },
  { id: "institute", label: "Institute Profile", route: "/institute", minPlan: "core", group: "Institute", description: "Public institute identity" },
  { id: "calendar", label: "Academic Calendar", route: "/calendar", minPlan: "core", group: "Institute", description: "Holidays and exam windows" },
  { id: "reports", label: "Reporting Center", route: "/reports", minPlan: "max", group: "Intelligence", description: "Centralized exports" },
  { id: "teacher-performance", label: "Teacher Performance", route: "/teacher-performance", minPlan: "max", group: "Intelligence", description: "Faculty ratings and trends" },
];

export function planIndex(tier: PlanTier): number {
  return PLAN_ORDER.indexOf(tier);
}

export function isModuleAvailable(mod: ModuleDef, plan: PlanTier): boolean {
  return planIndex(mod.minPlan) <= planIndex(plan);
}

export function defaultEnabledModules(plan: PlanTier): Record<string, boolean> {
  return Object.fromEntries(
    MODULE_CATALOG.map((m) => [m.id, isModuleAvailable(m, plan)]),
  );
}

export const STORAGE_MODULE_WEIGHTS: Record<string, number> = {
  Students: 0.18,
  Exams: 0.12,
  Marks: 0.08,
  Media: 0.24,
  Assignments: 0.14,
  Documents: 0.1,
  Transport: 0.04,
  Temp: 0.1,
};

export function storageQuotaGb(plan: PlanTier): number {
  return PLAN_DETAILS[plan].storageGb;
}
