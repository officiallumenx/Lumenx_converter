import type { ProductId } from "@/theme/products";

export const HOW_STEP_IDS = [
  "institute",
  "admin",
  "academic",
  "connect",
  "transport",
  "admissions",
  "careers",
  "nexus",
] as const;

export type HowStepId = (typeof HOW_STEP_IDS)[number];

export type HowStep = {
  id: HowStepId;
  title: string;
  kicker: string;
  body: string;
  does: string;
  doesNot: string;
  product?: ProductId;
};

export const HOW_STEPS: HowStep[] = [
  {
    id: "institute",
    title: "Institute",
    kicker: "The organisation",
    body: "LumenX starts with the institute as a tenant — not a pile of logins. Registration is approved, a 60-day trial can begin, and the school gets a record every product will share.",
    does: "Onboard one campus or a group of campuses.",
    doesNot: "Does not replace the principal’s day-to-day console. That is Admin.",
  },
  {
    id: "admin",
    title: "Admin",
    kicker: "Source of truth",
    body: "The office writes people, classes, fees, documents, and permissions in Admin. Other products read what Admin allows. This is where the institute is configured.",
    does: "Directory, operations, roles, and conversion of intake and hires.",
    doesNot: "Does not replace the parent, teacher, student, or driver app.",
    product: "admin",
  },
  {
    id: "academic",
    title: "Academic operations",
    kicker: "The teaching day",
    body: "Attendance, timetable, exams, marks, homework, and diary live on the same student record. Teachers mark in Connect. The office sees the same day in Admin. Families see only their child.",
    does: "Capture the class once. Show the right slice to each role.",
    doesNot: "Does not live in Nexus. Nexus is not the school ERP.",
    product: "admin",
  },
  {
    id: "connect",
    title: "Connect",
    kicker: "How people use it",
    body: "Parents, teachers, and students enter Connect with credentials the office issues. Role isolation is strict. Admissions and Careers are separate products in this family, served as Connect portals.",
    does: "Multi-child parent home, teacher class work, student identity.",
    doesNot: "Does not configure fees, routes, or modules. That stays in Admin and Nexus.",
    product: "connect",
  },
  {
    id: "transport",
    title: "Transport",
    kicker: "The day’s trips",
    body: "When the module is on, Admin assigns routes. Drivers run boarding and trip status in Transport. Parents get 30 / 15 / 5 minute approach alerts, arrival, boarding, and school or drop status in Connect.",
    does: "A dedicated driver app plus parent trip status.",
    doesNot: "Does not stream live GPS to families. Device location is for setup and readiness.",
    product: "transport",
  },
  {
    id: "admissions",
    title: "Admissions",
    kicker: "Intake",
    body: "Applicants discover programs, apply, and attach documents in the Admissions portal. The office reviews, waitlists, and decides on that file. Admin converts accepted intake to a student.",
    does: "A pipeline into the student directory.",
    doesNot: "Does not keep a second student database, and does not ship a separate interview calendar.",
    product: "admissions",
  },
  {
    id: "careers",
    title: "Careers",
    kicker: "Hiring",
    body: "Jobs, applications, profiles, and interview detail live in the Careers portal. Recruiters post there. Admin converts an approved hire to a teacher. Your institute can enable Careers when hiring needs it.",
    does: "Hiring that writes into the same faculty directory.",
    doesNot: "Does not become the teacher class app after the hire.",
    product: "careers",
  },
  {
    id: "nexus",
    title: "Nexus",
    kicker: "Service platform",
    body: "Nexus is the LumenX service platform. It licenses institutes, turns modules on, and then keeps quality high — support, institute feedback, renewals, and platform health. A single school may never open it; a group or operator will.",
    does: "Deliver licensing plus ongoing service quality and feedback.",
    doesNot: "Does not take attendance, collect fees, or replace Admin.",
    product: "nexus",
  },
];

export function isHowStepId(value: string): value is HowStepId {
  return (HOW_STEP_IDS as readonly string[]).includes(value);
}

export const HOW_COMPARE: { before: string; after: string }[] = [
  {
    before: "Attendance in a register. Parents call the office.",
    after: "The teacher marks in Connect. The office and the family see the same day.",
  },
  {
    before: "Fee dues in a spreadsheet. WhatsApp reminders from the accountant.",
    after: "Structures live in Admin. Families see balances in Connect. No public checkout on this site.",
  },
  {
    before: "Bus location guessed from a driver thread.",
    after: "The driver runs trip status in Transport. Parents get approach alerts in Connect — not a live GPS map.",
  },
  {
    before: "Admissions and hiring in a second database that never becomes a student or teacher.",
    after: "Admissions and Careers write into the same directory Admin already uses.",
  },
];
