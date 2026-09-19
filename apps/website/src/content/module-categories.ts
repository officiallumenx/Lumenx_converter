/**
 * Public module directory — functional categories for marketing IA.
 * Names and blurbs are drawn from existing product modules only.
 */

export const MODULE_CATEGORY_IDS = [
  "academics",
  "administration",
  "finance",
  "communication",
  "transport",
  "documents",
  "admissions",
  "growth",
] as const;

export type ModuleCategoryId = (typeof MODULE_CATEGORY_IDS)[number];

export type ModuleDirectoryItem = {
  name: string;
  blurb: string;
  surfaces: string;
};

export type ModuleCategory = {
  id: ModuleCategoryId;
  title: string;
  /** Nav / short label (Admissions page uses longer title) */
  shortTitle: string;
  lede: string;
  path: `/modules/${ModuleCategoryId}`;
  items: readonly ModuleDirectoryItem[];
};

export function isModuleCategoryId(value: string): value is ModuleCategoryId {
  return (MODULE_CATEGORY_IDS as readonly string[]).includes(value);
}

export const MODULE_CATEGORIES: Record<ModuleCategoryId, ModuleCategory> = {
  academics: {
    id: "academics",
    title: "Academics",
    shortTitle: "Academics",
    lede: "The teaching rhythm — captured once, visible to the right role.",
    path: "/modules/academics",
    items: [
      { name: "Attendance", blurb: "Teachers mark the class. The office reads the same day. Families see their child.", surfaces: "Admin · Connect" },
      { name: "Homework", blurb: "Assignments written by the teacher, read by the family and student.", surfaces: "Admin · Connect" },
      { name: "Marks", blurb: "Enter, review, and publish results — not a public results website.", surfaces: "Admin · Connect" },
      { name: "Exams", blurb: "Exam scheduling and timetables the campus can follow.", surfaces: "Admin · Connect" },
      { name: "Timetable", blurb: "Conflict-aware schedules for classes and teachers.", surfaces: "Admin · Connect" },
      { name: "Subjects", blurb: "Subject catalog and teacher assignment.", surfaces: "Admin" },
      { name: "Classes & Sections", blurb: "Class structure and section assignments.", surfaces: "Admin" },
      { name: "Academic History", blurb: "Year-over-year academic record for the learner.", surfaces: "Connect" },
      { name: "Achievements", blurb: "Recognitions recorded for the student.", surfaces: "Connect" },
      { name: "Diary", blurb: "Daily class diary entries from teachers.", surfaces: "Admin · Connect" },
    ],
  },
  administration: {
    id: "administration",
    title: "Administration",
    shortTitle: "Administration",
    lede: "People, access, and the institute profile the rest of the platform reads.",
    path: "/modules/administration",
    items: [
      { name: "Students", blurb: "Directory, profiles, and the record Admissions converts into.", surfaces: "Admin · Connect" },
      { name: "Teachers", blurb: "Faculty records and class assignment. Hires can arrive from Careers.", surfaces: "Admin · Connect" },
      { name: "Parents", blurb: "Guardian accounts with child linking — one Connect login per family.", surfaces: "Admin · Connect" },
      { name: "Institute Profile", blurb: "Public institute identity and campus profile.", surfaces: "Admin" },
      { name: "Permissions", blurb: "Office roles with per-module access.", surfaces: "Admin" },
      { name: "Accounts & Access", blurb: "Login accounts for Connect and related portals.", surfaces: "Admin" },
      { name: "Settings", blurb: "Profile, appearance, and institute preferences.", surfaces: "Admin · Connect" },
      { name: "Leave", blurb: "Teacher leave requests and office approval.", surfaces: "Admin · Connect" },
      { name: "Staff Attendance", blurb: "Faculty daily attendance.", surfaces: "Admin" },
    ],
  },
  finance: {
    id: "finance",
    title: "Finance",
    shortTitle: "Finance",
    lede: "Fee structures and visibility — payment is arranged with your institute, not invented on this website.",
    path: "/modules/finance",
    items: [
      { name: "Fees", blurb: "Fee structures, publish, and collection status the office and families can see.", surfaces: "Admin · Connect" },
      { name: "Accounts", blurb: "Login and billing-related account visibility for the campus.", surfaces: "Admin" },
      { name: "Reporting", blurb: "Download and export — Excel, PDF, and CSV where enabled.", surfaces: "Admin" },
      { name: "Subscription", blurb: "Trial, renewal, and offline payment status for the institute.", surfaces: "Admin" },
    ],
  },
  communication: {
    id: "communication",
    title: "Communication",
    shortTitle: "Communication",
    lede: "Reach the people who need it — without another WhatsApp group.",
    path: "/modules/communication",
    items: [
      { name: "Messages", blurb: "Conversations between families, teachers, and the office.", surfaces: "Connect" },
      { name: "Notifications", blurb: "In-app notices; push, email, and SMS from the office when configured.", surfaces: "Admin · Connect" },
      { name: "Announcements", blurb: "Long-form notices with pinning.", surfaces: "Admin · Connect" },
      { name: "Events", blurb: "Institute-wide events for the right audience.", surfaces: "Admin · Connect" },
      { name: "Alerts", blurb: "Urgent notices and rule-based operational alerting.", surfaces: "Admin · Connect" },
      { name: "Complaints", blurb: "Case management with clear ownership.", surfaces: "Admin · Connect" },
    ],
  },
  transport: {
    id: "transport",
    title: "Transport",
    shortTitle: "Transport",
    lede: "Routes, boarding, and trip status — parents follow status in Connect, not a live GPS map on this site.",
    path: "/modules/transport",
    items: [
      { name: "Transport", blurb: "Routes, fleet, students, and trip oversight in Admin; drivers run the day in Transport.", surfaces: "Admin · Transport · Connect" },
      { name: "Trip status", blurb: "Parents see trip status and approach alerts when Transport is on.", surfaces: "Connect" },
      { name: "Boarding", blurb: "Drivers board students at each stop.", surfaces: "Transport" },
      { name: "Route Setup", blurb: "Propose stops and students for Admin approval.", surfaces: "Transport" },
      { name: "Emergency", blurb: "Escalate an on-road emergency to the office.", surfaces: "Transport" },
    ],
  },
  documents: {
    id: "documents",
    title: "Documents & Records",
    shortTitle: "Documents",
    lede: "Requests, certificates, and IDs that stay with the institute record.",
    path: "/modules/documents",
    items: [
      { name: "Documents & Records", blurb: "Requests, packages, templates, and generated files.", surfaces: "Admin" },
      { name: "Certificates", blurb: "Certificate designs, records, and issuance.", surfaces: "Admin · Connect" },
      { name: "ID Cards", blurb: "Digital ID for the linked student.", surfaces: "Connect" },
      { name: "Template Management", blurb: "Templates used when generating campus documents.", surfaces: "Admin" },
    ],
  },
  admissions: {
    id: "admissions",
    title: "Admissions & Careers",
    shortTitle: "Admissions & Careers",
    lede: "Intake and hiring in the same LumenX family — then Admin writes the student or teacher record.",
    path: "/modules/admissions",
    items: [
      { name: "Admissions", blurb: "Applications, openings, and convert-to-student in Admin.", surfaces: "Admissions · Admin" },
      { name: "Careers", blurb: "Jobs, applications, and convert-to-teacher in Admin.", surfaces: "Careers · Admin" },
      { name: "Application pipeline", blurb: "Review and progress applications on one file.", surfaces: "Admissions" },
      { name: "Openings", blurb: "Publish and manage intake openings.", surfaces: "Admissions" },
      { name: "Recruiter workspace", blurb: "Post jobs and review candidates in Careers.", surfaces: "Careers" },
    ],
  },
  growth: {
    id: "growth",
    title: "Growth & Analytics",
    shortTitle: "Growth & Analytics",
    lede: "Visibility for the office — dashboards and trends, not invented customer metrics.",
    path: "/modules/growth",
    items: [
      { name: "Analytics", blurb: "Live dashboard, charts, and institute insights.", surfaces: "Admin" },
      { name: "Growth", blurb: "Student growth tools when enabled for the learner.", surfaces: "Connect" },
      { name: "Teacher Performance", blurb: "Faculty ratings and trends across the institute.", surfaces: "Admin" },
      { name: "Reports", blurb: "Download and export — Excel, PDF, and CSV.", surfaces: "Admin" },
    ],
  },
};

export const MODULE_CATEGORY_LIST = MODULE_CATEGORY_IDS.map((id) => MODULE_CATEGORIES[id]);

/** Categories shown in the header dropdown (excludes Growth as secondary). */
export const MODULE_NAV_CATEGORY_IDS = [
  "academics",
  "administration",
  "finance",
  "communication",
  "transport",
  "documents",
  "admissions",
] as const satisfies readonly ModuleCategoryId[];
