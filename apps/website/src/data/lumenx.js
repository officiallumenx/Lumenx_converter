/** Verified LumenX marketing content — written in simple, relatable language for schools and institutions. */

export const SITE = {
  name: "LumenX",
  tagline: "Simple, connected software for schools and institutions",
  description:
    "Run your entire school from one connected system — daily office work, classes, attendance, fees, parent updates, bus routes, admissions, and teacher hiring.",
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
    category: "School Office",
    tagline: "Your school office in one clean workspace.",
    body: "Manage students, teachers, classes, attendance, fees, certificates, and daily announcements from a single dashboard.",
    href: "/platform/admin",
    image: "/assets/screenshots/admin/command.png",
    imageAlt: "LumenX Admin command console screenshot",
    role: "The central office dashboard for students, classes, fees, and daily school work.",
  },
  {
    id: "connect",
    name: "LumenX Connect",
    shortName: "Connect",
    category: "Teachers, Parents & Students",
    tagline: "Keep teachers, parents, and students in sync.",
    body: "A simple mobile app where teachers mark attendance and share homework, and parents and students check updates, timetables, marks, and fees.",
    href: "/platform/connect",
    image: "/assets/screenshots/connect/home.jpg",
    imageAlt: "LumenX Connect home screen screenshot",
    role: "Brings daily class updates, attendance, homework, and notices to teachers and families.",
  },
  {
    id: "transport",
    name: "LumenX Transport",
    shortName: "Transport",
    category: "School Buses",
    tagline: "Smooth, safer school bus trips every day.",
    body: "An easy app for bus drivers to start trips, mark student boarding at each stop, and share trip updates with the school and parents.",
    href: "/platform/transport",
    image: "/assets/screenshots/transport/driver-home.jpg",
    imageAlt: "LumenX Transport driver home screenshot",
    role: "Helps drivers run daily bus routes and boarding checklists while keeping parents informed.",
  },
  {
    id: "admissions",
    name: "LumenX Admissions",
    shortName: "Admissions",
    category: "New Student Intake",
    tagline: "Make student admissions simple and paper-free.",
    body: "Let families explore programs, apply online, and upload documents — then add accepted students to your school records in one click.",
    href: "/platform/admissions",
    image: "/assets/screenshots/admissions/institute-access.jpg",
    imageAlt: "LumenX Admissions institute access screenshot",
    role: "Collects student applications online and turns accepted applicants into enrolled students.",
  },
  {
    id: "careers",
    name: "LumenX Careers",
    shortName: "Careers",
    category: "Staff Hiring",
    tagline: "Hire great teachers and staff without the clutter.",
    body: "Post school job openings, review resumes, and track interviews in one place — then add hired candidates directly to your staff list.",
    href: "/platform/careers",
    image: "/assets/screenshots/careers/home.jpg",
    imageAlt: "LumenX Careers home screenshot",
    role: "Organizes job postings and applications, and adds hired teachers straight into Admin.",
  },
  {
    id: "nexus",
    name: "LumenX Nexus",
    shortName: "Nexus",
    category: "Platform & Groups",
    tagline: "Manage school licenses, modules, and support.",
    body: "Built for platform operators and school groups to onboard campuses, enable modules, manage renewals, and support institutions.",
    href: "/platform/nexus",
    image: null,
    imageAlt: "LumenX Nexus — authentic UI screenshot not yet available",
    role: "Manages campus onboarding, active modules, renewals, and support across institutions.",
  },
];

export const CAPABILITIES = [
  {
    title: "Classes & Academics",
    description: "Organize classes, sections, subjects, timetables, exams, homework, and year-end promotions easily.",
    href: "/platform/admin",
  },
  {
    title: "School Office",
    description: "Keep all student, teacher, and parent details, roles, and school certificates organized in one place.",
    href: "/platform/admin",
  },
  {
    title: "Fees & Dues",
    description: "Set up class and bus fees, publish fee schedules, and see pending dues clearly for every student.",
    href: "/platform/admin",
  },
  {
    title: "Daily Attendance",
    description: "Track student and staff attendance every day with instant summaries for the office and parents.",
    href: "/platform/admin",
  },
  {
    title: "Student & Staff Directory",
    description: "Maintain complete profiles for students, teachers, parents, and staff with the right access for each person.",
    href: "/platform/admin",
  },
  {
    title: "Exams & Report Cards",
    description: "Schedule exams, enter marks quickly, and share results directly with students and parents.",
    href: "/platform/admin",
  },
  {
    title: "Homework & Class Diary",
    description: "Teachers post daily homework and class notes in seconds so parents and students never miss an assignment.",
    href: "/platform/connect",
  },
  {
    title: "Announcements & Notices",
    description: "Send important school or class notices straight to parents, teachers, and students without messy chat groups.",
    href: "/platform/connect",
  },
  {
    title: "Timetables",
    description: "Give teachers and students a clear view of their daily class schedule and periods right on their phone.",
    href: "/platform/connect",
  },
  {
    title: "School Bus & Boarding",
    description: "Manage buses, stops, and routes in the office while drivers mark boarding and share trip updates on the road.",
    href: "/platform/transport",
  },
  {
    title: "Online Admissions",
    description: "Accept admission forms and documents online and enroll approved students without retyping their details.",
    href: "/platform/admissions",
  },
  {
    title: "Teacher & Staff Hiring",
    description: "Post open roles, review applicants, track interviews, and onboard hired teachers smoothly.",
    href: "/platform/careers",
  },
];

export const ROLES = [
  {
    title: "School Leaders & Principals",
    body: "See daily attendance, fee collection, academics, and campus activity at a glance from one dashboard.",
    href: "/solutions/institutions",
  },
  {
    title: "Office Administrators",
    body: "Manage student records, fee structures, certificates, bus routes, and announcements without juggling spreadsheets.",
    href: "/solutions/administrators",
  },
  {
    title: "Teachers",
    body: "Mark attendance, post homework, enter exam marks, and check class timetables quickly from your phone.",
    href: "/solutions/teachers",
  },
  {
    title: "Parents",
    body: "Stay updated on your child's attendance, homework, exam results, school notices, fees, and bus trip status.",
    href: "/solutions/parents",
  },
  {
    title: "Students",
    body: "Check your daily timetable, homework assignments, exam schedules, marks, and school announcements in one place.",
    href: "/solutions/students",
  },
  {
    title: "Bus Drivers",
    body: "View assigned stops, mark students as they board the bus, and send quick emergency alerts to the school office.",
    href: "/solutions/drivers",
  },
];

/** Re-export approved pricing constants for page/components. */
export { PRICING } from "../utils/pricing.js";

export const FAQS = [
  {
    title: "How does pricing work?",
    description:
      "You simply multiply your student count by your per-student rate (starting at ₹10/student per month). Your monthly subscription is either that amount or ₹8,000 — whichever is higher. Note that ₹8,000 is just the minimum monthly plan for smaller campuses, never an extra fee added on top. For example: 900 students × ₹10 = ₹9,000/month. If your calculation is ₹7,500 (e.g. 500 students × ₹15), your monthly plan is ₹8,000. You can choose 3-month, 6-month, or 12-month billing.",
  },
  {
    title: "How does the 2-months-free annual discount work?",
    description:
      "When you choose the 12-month Annual Plan, you get a full year of service while paying for only 10 months — giving you 2 months completely free. For example, at ₹9,000/month (900 students × ₹10), the regular 12-month cost of ₹1,08,000 drops by ₹18,000, so you pay ₹90,000. At the ₹8,000/month minimum, you save ₹16,000 and pay ₹80,000 for the year.",
  },
  {
    title: "Can we try LumenX before paying?",
    description:
      "Yes! Every verified school gets a 60-day free trial with full access so your office, teachers, and team can experience LumenX comfortably before starting a paid plan.",
  },
  {
    title: "Do I have to pay on this website?",
    description:
      "No. We never ask for credit cards or payments on this website. Simply book a demo or contact us first — we'll walk you through the platform, set up your school, and handle billing only after your onboarding is approved.",
  },
  {
    title: "Which apps are included in LumenX?",
    description:
      "LumenX Admin is your main school office dashboard, and LumenX Connect is the daily app for teachers, parents, and students. You can also turn on Transport (for school buses), Admissions (for new student applications), and Careers (for hiring teachers) whenever your school needs them.",
  },
  {
    title: "How do we get started?",
    description:
      "Just click 'Book a Demo' or reach out on our Contact page. After a quick verification call, we'll set up your school's 60-day trial and help your office team invite teachers, parents, and students.",
  },
  {
    title: "How do teachers, parents, and staff log in?",
    description:
      "Once your school is set up, your school office shares login details with staff, teachers, parents, and students. Office staff use LumenX Admin on the web or Windows, while teachers, parents, students, and drivers use the Connect and Transport Android apps.",
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
