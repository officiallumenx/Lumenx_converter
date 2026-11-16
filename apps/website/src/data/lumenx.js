/** Verified LumenX marketing content — concise, clear, and accurate. */

export const SITE = {
  name: "LumenX",
  tagline: "One Connected Ecosystem for Smarter Institutions",
  description:
    "Manage your institution, connect teachers and parents, and simplify everyday operations through one integrated digital platform.",
  productionOrigin: "https://lumenxtech.in",
};

/**
 * Product showcase data.
 * Each module has a clear title, one meaningful sentence, and a relevant visual.
 */
export const PRODUCTS = [
  {
    id: "admin",
    name: "LumenX Admin",
    shortName: "Admin",
    category: "Institution Management",
    tagline: "Centralize daily campus operations in one console.",
    body: "Manage students, staff, classes, attendance, fees, certificates, and announcements from a single institutional record.",
    href: "/platform/admin",
    logo: "/assets/brand/admin.png",
    image: "/assets/screenshots/admin/command.png",
    imageAlt: "LumenX Admin dashboard showing attendance, classes, and campus operations",
    role: "Central operational console for people, academics, attendance, and fees.",
  },
  {
    id: "connect",
    name: "LumenX Connect",
    shortName: "Connect",
    category: "Parent, Teacher & Student Communication",
    tagline: "Role-based mobile experience for classrooms and families.",
    body: "Give teachers, parents, and students dedicated access to daily attendance, homework, timetables, exam results, fees, and notices.",
    href: "/platform/connect",
    logo: "/assets/brand/connect.png",
    image: "/assets/screenshots/connect/home.jpg",
    imageAlt: "LumenX Connect mobile screen for parents, teachers, and students",
    role: "Connects teachers, parents, and students to daily classroom and campus updates.",
  },
  {
    id: "transport",
    name: "LumenX Transport",
    shortName: "Transport",
    category: "Bus, Driver & Student Transport Operations",
    tagline: "Structured route execution and boarding visibility.",
    body: "Equip drivers to run assigned bus routes, record stop-by-stop student boarding, and share trip status with the office and parents.",
    href: "/platform/transport",
    logo: "/assets/brand/transport.png",
    image: "/assets/screenshots/transport/driver-home.jpg",
    imageAlt: "LumenX Transport driver shift and boarding interface",
    role: "Executes daily bus trips, student boarding checklists, and route updates.",
  },
  {
    id: "nexus",
    name: "LumenX Nexus",
    shortName: "Nexus",
    category: "Central Service Platform",
    tagline: "Your Gateway to Smarter Services.",
    body: "Experience a smarter way to access LumenX services. Nexus brings service access, quick actions, and responsive assistance together to make every interaction simple, efficient, and reliable.",
    href: "/platform/nexus",
    logo: "/assets/logo/lumenx-mark.png",
    image: null,
    imageAlt: "LumenX Nexus central service platform gateway",
    role: "Access and manage LumenX services through a connected service platform.",
  },
  {
    id: "admissions",
    name: "LumenX Admissions",
    shortName: "Admissions",
    category: "Student Intake & Applications",
    tagline: "Streamline student applications from discovery to enrollment.",
    body: "Collect online admission applications and documents, review intake pipelines, and convert accepted applicants directly into student records.",
    href: "/platform/admissions",
    logo: "/assets/brand/admissions.png",
    image: "/assets/screenshots/admissions/institute-access.jpg",
    imageAlt: "LumenX Admissions portal interface",
    role: "Manages online student applications and converts accepted intake into Admin.",
  },
  {
    id: "careers",
    name: "LumenX Careers",
    shortName: "Careers",
    category: "Educator & Staff Recruitment",
    tagline: "Organize institutional hiring from job post to onboarding.",
    body: "Publish open roles, review candidate profiles and applications, track interviews, and onboard approved hires into the staff directory.",
    href: "/platform/careers",
    logo: "/assets/brand/careers.png",
    image: "/assets/screenshots/careers/home.jpg",
    imageAlt: "LumenX Careers recruitment portal interface",
    role: "Runs educator recruitment and converts approved hires into staff records.",
  },
];

export const CAPABILITIES = [
  {
    title: "Academics & Classes",
    description: "Manage classes, sections, subjects, timetables, exams, homework, and academic promotions in Admin.",
    href: "/platform/admin",
  },
  {
    title: "Institutional Administration",
    description: "Maintain student and staff directories, role permissions, certificates, and office workflows from one console.",
    href: "/platform/admin",
  },
  {
    title: "Fees & Dues",
    description: "Configure class and transport fee structures, publish schedules, and track student dues.",
    href: "/platform/admin",
  },
  {
    title: "Attendance Tracking",
    description: "Record daily student and staff attendance with clear summaries for the office and families.",
    href: "/platform/admin",
  },
  {
    title: "People & Role Access",
    description: "Keep student, teacher, parent, and staff profiles organized with strict role-based visibility.",
    href: "/platform/admin",
  },
  {
    title: "Exams & Results",
    description: "Schedule assessments, enter subject marks, and publish academic results to students and parents.",
    href: "/platform/admin",
  },
  {
    title: "Homework & Class Diary",
    description: "Publish daily class assignments and diary notes in Connect for students and parents.",
    href: "/platform/connect",
  },
  {
    title: "Campus Notices",
    description: "Deliver official institutional and class announcements directly to teachers, parents, and students.",
    href: "/platform/connect",
  },
  {
    title: "Daily Timetables",
    description: "Provide period schedules and class timings to administrators, teachers, and students.",
    href: "/platform/connect",
  },
  {
    title: "Transport & Boarding",
    description: "Coordinate buses, routes, stop boarding checklists, and emergency alerts across drivers and the office.",
    href: "/platform/transport",
  },
  {
    title: "Online Admissions",
    description: "Accept program applications and documents online and convert approved applicants into student profiles.",
    href: "/platform/admissions",
  },
  {
    title: "Faculty & Staff Hiring",
    description: "Publish institutional job openings, review applicants, and onboard selected educators.",
    href: "/platform/careers",
  },
];

export const ROLES = [
  {
    title: "Institutions & Leadership",
    body: "Oversee academics, attendance, fee collections, and daily campus operations from one unified record.",
    href: "/solutions/institutions",
  },
  {
    title: "Administrators",
    body: "Configure people directories, classes, fee structures, certificates, and role permissions in LumenX Admin.",
    href: "/solutions/administrators",
  },
  {
    title: "Teachers",
    body: "Mark class attendance, post homework, enter exam marks, and view daily schedules in LumenX Connect.",
    href: "/solutions/teachers",
  },
  {
    title: "Parents",
    body: "Track attendance, homework, exam results, fee dues, notices, and bus trip status for linked children.",
    href: "/solutions/parents",
  },
  {
    title: "Students",
    body: "View daily timetables, homework assignments, exam schedules, marks, and campus notices in one portal.",
    href: "/solutions/students",
  },
  {
    title: "Drivers",
    body: "Run assigned bus routes, mark student boarding by stop, and send route alerts in LumenX Transport.",
    href: "/solutions/drivers",
  },
];

/** Re-export approved pricing constants for page/components. */
export { PRICING } from "../utils/pricing.js";

export const FAQS = [
  {
    title: "How is pricing calculated?",
    description:
      "Multiply your student count by your custom per-student rate (starting at ₹10/student per month). Your monthly payable amount is the greater of that subtotal or ₹8,000 (the minimum monthly plan for smaller campuses — never added on top). For example, 900 students × ₹10 = ₹9,000/month. You can choose 3-month, 6-month, or 12-month billing.",
  },
  {
    title: "How does the annual plan discount work?",
    description:
      "A 12-month subscription gives you 12 months of service for the price of 10 months — two months free. At ₹9,000/month (900 students × ₹10), the regular ₹1,08,000 annual total is discounted by ₹18,000 to ₹90,000.",
  },
  {
    title: "Is there a free trial?",
    description:
      "Yes. After institutional verification, your campus receives a 60-day trial with full access before any billing begins.",
  },
  {
    title: "Does this website collect online payments?",
    description:
      "No. Use Contact Us or Book a Demo to speak with our team. Subscription billing is handled during approved institutional onboarding.",
  },
  {
    title: "Which modules and platforms are part of the LumenX ecosystem?",
    description:
      "LumenX includes Admin to manage institutional operations, Connect to connect parents, teachers, and students, Transport to simplify transport operations, Admissions for student intake, Careers for staff recruitment, and LumenX Nexus as the central service platform to access and manage LumenX services.",
  },
  {
    title: "How do users sign in?",
    description:
      "Login credentials are issued by your institution after onboarding. Office staff use LumenX Admin on the web, Windows, or Android, while teachers, parents, students, and drivers sign in through their respective apps.",
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
