import type { ProductId } from "@/theme/products";
import { PRODUCT_FAMILY } from "@/theme/products";
import { PRODUCTS } from "./products";

export const HOME_PROBLEM = [
  {
    id: "administration",
    title: "Administration",
    body: "People, classes, and fees live in spreadsheets the office cannot share safely.",
  },
  {
    id: "communication",
    title: "Communication",
    body: "Announcements and complaints scatter across WhatsApp groups with no owner.",
  },
  {
    id: "transport",
    title: "Transport",
    body: "Drivers run the day from paper manifests. Parents call the office for the bus.",
  },
  {
    id: "admissions",
    title: "Admissions",
    body: "Applications sit in inboxes until someone retypes them into a student record.",
  },
  {
    id: "careers",
    title: "Careers",
    body: "Hiring is a side channel — not linked to the same institute directory.",
  },
] as const;

export const HOME_SHOWCASE: {
  id: ProductId;
  tagline: string;
  description: string;
  points: readonly string[];
  preview: "admin" | "connect" | "transport" | "nexus" | "admissions" | "careers";
}[] = [
  {
    id: "admin",
    tagline: PRODUCTS.admin.tagline,
    description: PRODUCTS.admin.narrative,
    points: PRODUCTS.admin.capabilities.slice(0, 3),
    preview: "admin",
  },
  {
    id: "connect",
    tagline: PRODUCTS.connect.tagline,
    description: PRODUCTS.connect.narrative,
    points: PRODUCTS.connect.capabilities.slice(0, 3),
    preview: "connect",
  },
  {
    id: "transport",
    tagline: PRODUCTS.transport.tagline,
    description: PRODUCTS.transport.narrative,
    points: PRODUCTS.transport.capabilities.slice(0, 3),
    preview: "transport",
  },
  {
    id: "admissions",
    tagline: PRODUCT_FAMILY.admissions.role,
    description:
      "Admissions is a first-class product in the family. Applicants discover, apply, and track intake; Admin converts accepted applications into student records.",
    points: [
      "Application pipeline into the student record",
      "Office review stays with the same file",
      "After conversion, families use Connect",
    ],
    preview: "admissions",
  },
  {
    id: "careers",
    tagline: PRODUCT_FAMILY.careers.role,
    description:
      "Careers is the LumenX hiring and opportunity board. Recruiters post and review roles; Admin turns an approved hire into a teacher record.",
    points: [
      "Jobs and applications in one place",
      "Standalone Careers web app",
      "Approved hires become teachers in Admin",
    ],
    preview: "careers",
  },
  {
    id: "nexus",
    tagline: PRODUCTS.nexus.tagline,
    description: PRODUCTS.nexus.narrative,
    points: PRODUCTS.nexus.capabilities.slice(0, 3),
    preview: "nexus",
  },
];

export const HOME_FLOWS: {
  id: string;
  title: string;
  lede: string;
  steps: { product: ProductId; title: string; body: string }[];
}[] = [
  {
    id: "trial",
    title: "Trial",
    lede: "The institute is approved. Admin configures. Families and drivers use their own apps.",
    steps: [
      { product: "admin", title: "Start", body: "After approval, a 60-day trial can begin and Admin is ready to configure." },
      { product: "admin", title: "Configure", body: "Admin sets people, classes, fees, and routes." },
      { product: "connect", title: "Use", body: "Families open Connect. Drivers open Transport when enabled." },
    ],
  },
  {
    id: "attendance",
    title: "Attendance",
    lede: "The teacher marks the class. The office sees the same day. The parent sees their child — not another role’s roster.",
    steps: [
      { product: "connect", title: "Mark", body: "A teacher marks class attendance in Connect." },
      { product: "admin", title: "See", body: "The office reads the same record in Admin." },
      { product: "connect", title: "Share", body: "The parent sees presence for their child in Connect." },
    ],
  },
  {
    id: "transport",
    title: "Transport",
    lede: "Admin assigns the route. Transport executes the trip. Parents see status in Connect when the module is on.",
    steps: [
      { product: "admin", title: "Assign", body: "Admin assigns students to routes, stops, and vehicles." },
      { product: "transport", title: "Run", body: "The driver runs boarding and trip status in Transport." },
      { product: "connect", title: "Follow", body: "Parents see trip status in Connect — not a driver leftover menu." },
    ],
  },
  {
    id: "admissions",
    title: "Admissions",
    lede: "The application is intake. Admin converts it to a student. Connect then shows the family what they are allowed to see.",
    steps: [
      { product: "admissions", title: "Apply", body: "The applicant submits through the Admissions portal." },
      { product: "admin", title: "Convert", body: "The office reviews and writes the student record in Admin." },
      { product: "connect", title: "Join", body: "The family uses Connect with the credentials the office issues." },
    ],
  },
];

export const HOME_FEATURE_GROUPS: {
  id: string;
  title: string;
  lede: string;
  items: { name: string; blurb: string; surfaces: string }[];
}[] = [
  {
    id: "academic",
    title: "Academic",
    lede: "The daily teaching rhythm — captured once, visible to the right role.",
    items: [
      { name: "Attendance", blurb: "Daily capture and parent visibility.", surfaces: "Admin · Connect" },
      { name: "Timetable", blurb: "Conflict-aware schedules.", surfaces: "Admin · Connect" },
      { name: "Exams & marks", blurb: "Schedules, marks, and report cards.", surfaces: "Admin · Connect" },
    ],
  },
  {
    id: "administration",
    title: "Administration",
    lede: "The directory the rest of the platform reads.",
    items: [
      { name: "Students", blurb: "Directory, profiles, and guardians.", surfaces: "Admin · Connect" },
      { name: "Teachers", blurb: "Faculty records and class assignment.", surfaces: "Admin · Connect" },
      { name: "Parents", blurb: "Guardian accounts and child linking.", surfaces: "Admin · Connect" },
    ],
  },
  {
    id: "communication",
    title: "Communication",
    lede: "Reach the people who need it — without another WhatsApp group.",
    items: [
      { name: "Notifications", blurb: "In-app alerts for the people who need them.", surfaces: "All apps" },
      { name: "Complaints", blurb: "Cases with a clear owner.", surfaces: "Admin · Connect" },
    ],
  },
  {
    id: "operations",
    title: "Operations",
    lede: "Money, movement, and a view across the institute.",
    items: [
      { name: "Fees", blurb: "Structures, dues, and history.", surfaces: "Admin · Connect" },
      { name: "Transport", blurb: "Routes, trips, and parent status.", surfaces: "Admin · Transport · Connect" },
      { name: "Analytics", blurb: "Institute dashboards and reports for the office.", surfaces: "Admin" },
    ],
  },
  {
    id: "admissions",
    title: "Admissions",
    lede: "Intake that becomes a student record — not a second database.",
    items: [
      { name: "Applications", blurb: "Application pipeline into the student record.", surfaces: "Admissions · Admin" },
    ],
  },
  {
    id: "careers",
    title: "Careers",
    lede: "Hiring in the same family, enabled per institute.",
    items: [{ name: "Hiring", blurb: "Jobs and applications in the Careers app.", surfaces: "Careers · Admin" }],
  },
  {
    id: "documents",
    title: "Documents",
    lede: "Templates the office issues — not files trapped in email.",
    items: [{ name: "Certificates", blurb: "Templates and issued documents.", surfaces: "Admin · Connect" }],
  },
  {
    id: "activities",
    title: "Activities",
    lede: "Class work the office already runs in Admin.",
    items: [
      { name: "Diary", blurb: "Day book for the class, written in Admin.", surfaces: "Admin · Connect" },
      { name: "Homework", blurb: "Assignments in the academic workflow.", surfaces: "Admin · Connect" },
    ],
  },
];

export const HOME_ROLES: {
  id: string;
  title: string;
  product: ProductId;
  outcome: string;
  points: readonly string[];
}[] = [
  {
    id: "admin",
    title: "Admin",
    product: "admin",
    outcome: "Run the institute day without chasing notebooks.",
    points: [
      "People, classes, and attendance in one console",
      "Fees and documents without parallel spreadsheets",
      "Route assignment when Transport is on",
    ],
  },
  {
    id: "teacher",
    title: "Teacher",
    product: "connect",
    outcome: "Mark attendance and share class work from a phone.",
    points: [
      "Class roster and daily attendance",
      "Assignments and timetable in context",
      "No access to another role’s portal",
    ],
  },
  {
    id: "parent",
    title: "Parent",
    product: "connect",
    outcome: "See attendance, fees, and the bus without calling the office.",
    points: [
      "Switch between children in one account",
      "Attendance and fee status without office hours",
      "Trip status when Transport is on",
    ],
  },
  {
    id: "student",
    title: "Student",
    product: "connect",
    outcome: "See your own timetable, marks, and identity — nothing else.",
    points: ["Timetable, marks, profile, and ID", "Never another role’s navigation", "Credentials issued by the office"],
  },
  {
    id: "driver",
    title: "Driver",
    product: "transport",
    outcome: "Execute the trip from a dedicated app — not a leftover menu.",
    points: [
      "Today’s manifest and stops",
      "Boarding counts the office can see",
      "Large controls built for the road",
    ],
  },
  {
    id: "applicant",
    title: "Applicant",
    product: "admissions",
    outcome: "Submit an application that can become a student record.",
    points: [
      "Discover programs and apply online",
      "Track status without calling the office",
      "After joining, the family uses Connect",
    ],
  },
  {
    id: "careers",
    title: "Careers",
    product: "careers",
    outcome: "Find a role, apply, and track hiring in one place.",
    points: [
      "Browse jobs and submit applications",
      "Documents and interview updates in Careers",
      "Admin turns an approved hire into a teacher",
    ],
  },
];

export const HOME_DOWNLOAD_ORDER: ProductId[] = ["connect", "transport", "admin", "admissions", "careers"];

export const HOME_FAQ: { q: string; a: string }[] = [
  {
    q: "What is LumenX?",
    a: "LumenX is one connected platform for managing an institution. LumenX Admin runs the campus day. LumenX Connect is for parents, teachers, and students. Transport, Admissions, and Careers can be added when you need them.",
  },
  {
    q: "Who can use LumenX?",
    a: "Institution heads, administrators, teachers, parents, students, and transport staff. Schools, colleges, and institute groups that want one shared record instead of scattered spreadsheets and chat groups.",
  },
  {
    q: "What products are included?",
    a: "The public platform includes Admin, Connect, Transport, Admissions, and Careers. Most campuses start with Admin and Connect; the others turn on when needed.",
  },
  {
    q: "What is LumenX Admin?",
    a: "Admin is the office console — students, teachers, parents, attendance, timetable, fees, documents, and day-to-day operations. It is the source of truth for the institute.",
  },
  {
    q: "What is LumenX Connect?",
    a: "Connect is how parents, teachers, and students use the same institute record. Each role sees only what they need — never another role’s screens.",
  },
  {
    q: "What are Admissions and Careers?",
    a: "Admissions handles applications and intake (as a Connect portal). Careers is the hiring and opportunity web app. Admin creates the student or teacher record when someone joins.",
  },
  {
    q: "How do parents see the bus?",
    a: "When Transport is on, Admin assigns students to routes, drivers run the trip in Transport, and parents see trip status in Connect. This website does not claim live GPS tracking.",
  },
  {
    q: "How is pricing calculated?",
    a: "About ₹12 per student each month on the estimate we show here (typical band ₹12–₹15). The whole campus starts from ₹8,000 per month. You can choose monthly, 6-month, or yearly tenure.",
  },
  {
    q: "Is there a trial?",
    a: "Yes. 60 days of full access after your institute is approved. This website does not take payment.",
  },
  {
    q: "Does LumenX take payments on this website?",
    a: "No. Use Book a Demo, Get Started, or Contact to begin. Payment is arranged with our team after approval.",
  },
  {
    q: "How do demos work?",
    a: "Interactive demos use labelled mock screens. They are not live campus data, they do not save, and they do not take payment.",
  },
  {
    q: "How do I get started?",
    a: "Book a demo, open Get Started, or Contact us with your institute details. After verification, a 60-day trial can begin. You can also explore mock demos with no login.",
  },
  {
    q: "How do I contact LumenX?",
    a: "Use the Contact page for messages, demos, trials, quotes, and partnerships. Privacy and data requests use the Data Request page and the addresses in our Privacy Policy.",
  },
];
