/** Verified LumenX marketing content for Play Astro customization. */

export const SITE = {
  name: "LumenX",
  tagline: "Institute management ecosystem",
  description:
    "From academics and administration to communication, transport, admissions, and hiring — LumenX brings your institution's essential workflows together in one connected ecosystem.",
  productionOrigin: "https://lumenxtech.in",
};

/**
 * Product showcase data.
 * `image` is optional — Nexus has no authentic UI screenshots in the asset set yet.
 */
export const PRODUCTS = [
  {
    id: "admin",
    name: "LumenX Admin",
    shortName: "Admin",
    category: "Operations",
    tagline: "Your institution's operational core.",
    body: "Institutional operations for academics, attendance, fees, records, and office communications — the source of truth for the campus day.",
    href: "/platform/admin",
    image: "/assets/screenshots/admin/command.png",
    imageAlt: "LumenX Admin command console screenshot",
    role: "Hub for people, classes, fees, and day-to-day campus operations.",
  },
  {
    id: "connect",
    name: "LumenX Connect",
    shortName: "Connect",
    category: "Campus",
    tagline: "Keep your campus connected.",
    body: "Role-based experiences for teachers, parents, and students — attendance, notices, timetable, and academic updates with clear isolation.",
    href: "/platform/connect",
    image: "/assets/screenshots/connect/home.jpg",
    imageAlt: "LumenX Connect home screen screenshot",
    role: "Surfaces Admin records to the right campus roles.",
  },
  {
    id: "transport",
    name: "LumenX Transport",
    shortName: "Transport",
    category: "Fleet",
    tagline: "Bring transport workflows together.",
    body: "Transport workflows and driver operations for routes, trips, boarding, and day-of fleet execution.",
    href: "/platform/transport",
    image: "/assets/screenshots/transport/driver-home.jpg",
    imageAlt: "LumenX Transport driver home screenshot",
    role: "Runs assigned trips when Transport is enabled for the institute.",
  },
  {
    id: "admissions",
    name: "LumenX Admissions",
    shortName: "Admissions",
    category: "Intake",
    tagline: "Simplify the admissions journey.",
    body: "Admissions information and application workflows — programs, applications, and documents that feed the institute directory.",
    href: "/platform/admissions",
    image: "/assets/screenshots/admissions/institute-access.jpg",
    imageAlt: "LumenX Admissions institute access screenshot",
    role: "Turns applicant files into student records in Admin.",
  },
  {
    id: "careers",
    name: "LumenX Careers",
    shortName: "Careers",
    category: "Hiring",
    tagline: "Connect opportunities with talent.",
    body: "Hiring and opportunity management — jobs, applications, profiles, and interviews for institute staffing.",
    href: "/platform/careers",
    image: "/assets/screenshots/careers/home.jpg",
    imageAlt: "LumenX Careers home screenshot",
    role: "Keeps hiring in the same institute family as Admin.",
  },
  {
    id: "nexus",
    name: "LumenX Nexus",
    shortName: "Nexus",
    category: "Service",
    tagline: "Support the entire ecosystem.",
    body: "Platform services for support, feedback, renewals, licensing, and module management for operators and groups — not the school ERP.",
    href: "/platform/nexus",
    image: null,
    imageAlt: "LumenX Nexus — authentic UI screenshot not yet available",
    role: "Licenses institutes, enables modules, and supports the platform around Admin.",
  },
];

export const CAPABILITIES = [
  {
    title: "Academics",
    description: "Classes, subjects, timetable, exams, marks, homework, and promotion workflows in Admin.",
    href: "/platform/admin",
  },
  {
    title: "Administration",
    description: "People directory, roles, documents, and office operations from one console.",
    href: "/platform/admin",
  },
  {
    title: "Fees",
    description: "Class fees, transport fees, dues, and collection overview for the institute office.",
    href: "/platform/admin",
  },
  {
    title: "Attendance",
    description: "Student and staff attendance with reports available to the right roles.",
    href: "/platform/admin",
  },
  {
    title: "People & roles",
    description: "Students, teachers, parents, and staff records with clear role-based access.",
    href: "/platform/admin",
  },
  {
    title: "Exams & marks",
    description: "Assessments, mark entry, and academic progress snapshots shared with the right roles.",
    href: "/platform/admin",
  },
  {
    title: "Homework & diary",
    description: "Class homework and diary updates for teachers, parents, and students in Connect.",
    href: "/platform/connect",
  },
  {
    title: "Notices",
    description: "Institute and class notices delivered to campus roles without separate chat threads.",
    href: "/platform/connect",
  },
  {
    title: "Timetable",
    description: "Period schedules and class timing surfaces for the office, teachers, and students.",
    href: "/platform/connect",
  },
  {
    title: "Transport",
    description: "Vehicles, routes, trips, boarding, and emergency workflows for drivers and the office.",
    href: "/platform/transport",
  },
  {
    title: "Admissions",
    description: "Program discovery, applications, and document uploads that convert into student records.",
    href: "/platform/admissions",
  },
  {
    title: "Careers",
    description: "Jobs, applications, profiles, and interviews for institute hiring.",
    href: "/platform/careers",
  },
];

export const ROLES = [
  {
    title: "Institutions",
    body: "Run academics, fees, attendance, and operations from one connected record.",
    href: "/solutions/institutions",
  },
  {
    title: "Administrators",
    body: "Configure people, classes, fees, and access in LumenX Admin.",
    href: "/solutions/administrators",
  },
  {
    title: "Teachers",
    body: "Mark attendance, share homework, and work with class records in Connect.",
    href: "/solutions/teachers",
  },
  {
    title: "Parents",
    body: "Follow attendance, notices, and academic updates for linked students.",
    href: "/solutions/parents",
  },
  {
    title: "Students",
    body: "See timetable, homework, marks, and institute notices in one portal.",
    href: "/solutions/students",
  },
  {
    title: "Drivers",
    body: "Run assigned trips and boarding workflows in LumenX Transport.",
    href: "/solutions/drivers",
  },
];

/** Re-export approved pricing constants for page/components. */
export { PRICING } from "../utils/pricing.js";

export const FAQS = [
  {
    title: "How is pricing calculated?",
    description:
      "Student subtotal = students × your custom rate (₹10 or more). Monthly payable = the greater of that subtotal or ₹8,000. ₹8,000 is a minimum monthly payable amount — never a fixed institute price and never added on top of the student subtotal. Example: 900 students × ₹10 = ₹9,000 monthly (above the minimum). Example: 500 students × ₹15 = ₹7,500 subtotal → ₹8,000 monthly. Billing: 3 months, 6 months, or 12 months (annual: pay 10 for 12 months of service).",
  },
  {
    title: "What does the annual offer include?",
    description:
      "A 12-month subscription charges 10 months of the applicable monthly amount and provides 12 months of service — two months free. At 900 students × ₹10 (monthly ₹9,000): normal ₹1,08,000, two-month discount −₹18,000, final ₹90,000. When the ₹8,000 minimum applies (for example 500 × ₹15): normal ₹96,000, discount −₹16,000, final ₹80,000.",
  },
  {
    title: "Is there a free trial?",
    description:
      "Yes. After verification you get 60 days of full access. There is no payment on this marketing site. The annual two free months are a billing offer, not a second trial.",
  },
  {
    title: "Does LumenX take payments on the website?",
    description:
      "No. Use Book a Demo, Get Started, or Contact. Payment happens after approval through the onboarding process — not as a self-serve checkout on the marketing pages.",
  },
  {
    title: "What products are included?",
    description:
      "LumenX Admin is the institute console. Connect serves teachers, parents, and students. Transport, Admissions, and Careers extend operations when you need them. Nexus supports licensing, modules, and platform service for operators and groups.",
  },
  {
    title: "How do I get started?",
    description:
      "Book a demo or contact us. After verification, your institute can begin a 60-day trial. Login details are issued by your institute office — they are not published on the website.",
  },
  {
    title: "Where do users sign in?",
    description:
      "Admin and Nexus use browser consoles when published. Connect and Transport are Android apps. Admissions and Careers are web portals (with Android builds when published). The Login page lists the live destinations.",
  },
];

export const NAV = [
  { title: "Platform", path: "/platform" },
  {
    title: "Solutions",
    path: "javascript:void(0)",
    children: [
      { title: "Institutions", path: "/solutions/institutions" },
      { title: "Administrators", path: "/solutions/administrators" },
      { title: "Teachers", path: "/solutions/teachers" },
      { title: "Parents", path: "/solutions/parents" },
      { title: "Students", path: "/solutions/students" },
      { title: "Drivers", path: "/solutions/drivers" },
    ],
  },
  { title: "Modules", path: "/modules" },
  { title: "Pricing", path: "/pricing" },
  { title: "Downloads", path: "/downloads" },
  { title: "Resources", path: "/resources" },
];

/** Products that still need authentic UI screenshots. */
export const MISSING_SCREENSHOTS = ["nexus"];
