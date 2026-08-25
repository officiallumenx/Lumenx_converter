import type { ProductId } from "@/theme/products";

/** Public modules catalog — school apps only. Nexus is intentionally excluded. */
export const MODULE_SECTION_IDS = [
  "admin",
  "connect",
  "transport",
  "admissions",
  "careers",
] as const;

export type ModuleSectionId = (typeof MODULE_SECTION_IDS)[number];

export type ModuleItem = {
  name: string;
  blurb: string;
};

export type ModuleBucket = {
  id: string;
  title: string;
  lede?: string;
  items: ModuleItem[];
};

export type ModuleSection = {
  id: ModuleSectionId;
  title: string;
  lede: string;
  product: Exclude<ProductId, "nexus">;
  buckets: ModuleBucket[];
};

export function isModuleSectionId(value: string): value is ModuleSectionId {
  return (MODULE_SECTION_IDS as readonly string[]).includes(value);
}

export const MODULE_SECTIONS: ModuleSection[] = [
  {
    id: "admin",
    title: "Admin",
    lede: "The institute office console — every module the campus runs day to day.",
    product: "admin",
    buckets: [
      {
        id: "admin-intelligence",
        title: "Intelligence",
        items: [
          { name: "Home", blurb: "Today’s attention, reviews, and shortcuts for the office." },
          { name: "Analytics", blurb: "Live dashboard, charts, and institute insights." },
          { name: "Reports", blurb: "Download and export — Excel, PDF, and CSV." },
          { name: "Performance", blurb: "Faculty ratings and trends across the institute." },
        ],
      },
      {
        id: "admin-people",
        title: "People",
        items: [
          { name: "Students", blurb: "Directory, admissions link, and 360 profiles." },
          { name: "Teachers", blurb: "Faculty records, assignment, and ratings." },
          { name: "Parents", blurb: "Guardian accounts and child linking." },
          { name: "Accounts", blurb: "Login accounts for Connect and related portals." },
        ],
      },
      {
        id: "admin-academics",
        title: "Academics",
        items: [
          { name: "Classes", blurb: "Class structure and section assignments." },
          { name: "Academics", blurb: "Years, promotion, graduation, and status." },
          { name: "Subjects", blurb: "Subject catalog and teacher assignment." },
          { name: "Timetable", blurb: "Conflict-aware schedule builder." },
          { name: "Attendance", blurb: "Central student attendance workspace." },
          { name: "Attendance Reports", blurb: "Monitor, reports, and attendance analytics." },
          { name: "Staff Attendance", blurb: "Faculty daily attendance." },
          { name: "Exams", blurb: "Exam scheduling and timetables." },
          { name: "Marks", blurb: "Review submissions and publish results." },
          { name: "Homework", blurb: "View teacher homework logs from the office." },
          { name: "Diary", blurb: "View submitted diary days from teachers." },
        ],
      },
      {
        id: "admin-communications",
        title: "Communications",
        items: [
          { name: "Notifications", blurb: "Push, email, and SMS from the office." },
          { name: "Announcements", blurb: "Long-form notices with pinning." },
          { name: "Alerts", blurb: "Rule-based operational alerting." },
          { name: "Complaints", blurb: "Case management with clear ownership." },
        ],
      },
      {
        id: "admin-operations",
        title: "Operations",
        items: [
          { name: "Roles", blurb: "Custom office roles and per-module access." },
          { name: "Subscription", blurb: "Trial, renewal, and offline payment status." },
          { name: "Modules", blurb: "Module toggles and entitlements for this institute." },
          { name: "Storage", blurb: "Archive, quotas, and cleanup." },
          { name: "Settings", blurb: "Profile, appearance, and support." },
        ],
      },
      {
        id: "admin-services",
        title: "Services",
        items: [
          { name: "Transport", blurb: "Routes, fleet, students, and trip oversight." },
          { name: "Leave", blurb: "Teacher leave approval." },
          { name: "Fees", blurb: "Fee structures, publish, and collection." },
          { name: "Admissions", blurb: "Application pipeline and convert-to-student." },
          { name: "Careers", blurb: "Hiring pipeline and convert-to-teacher." },
        ],
      },
      {
        id: "admin-institute",
        title: "Institute",
        items: [
          { name: "Institute", blurb: "Public institute identity and profile." },
          { name: "Certificates", blurb: "Certificate designs, records, and issuance." },
          { name: "Documents", blurb: "Requests, packages, templates, and generated files." },
          { name: "Calendar", blurb: "Holidays and exam windows." },
          { name: "Events", blurb: "Institute-wide events." },
        ],
      },
    ],
  },
  {
    id: "connect",
    title: "Connect",
    lede: "How families and staff use the same institute record — separated by role.",
    product: "connect",
    buckets: [
      {
        id: "connect-parent",
        title: "Parent",
        lede: "Guardian view of each linked child — attendance, fees, messages, and more.",
        items: [
          { name: "Home", blurb: "Daily overview for linked children." },
          { name: "Alerts", blurb: "Urgent notices that need a parent’s attention." },
          { name: "Attendance", blurb: "Each child’s attendance history." },
          { name: "Transport", blurb: "Trip status when Transport is on." },
          { name: "Leave", blurb: "Leave requests and responses for the child." },
          { name: "Homework", blurb: "Assignments the teacher published." },
          { name: "Marks", blurb: "Published marks and report cards." },
          { name: "Academic History", blurb: "Year-over-year academic record." },
          { name: "Achievements", blurb: "Recognitions recorded for the child." },
          { name: "Certificates", blurb: "Issued certificates the family can open." },
          { name: "Exams", blurb: "Upcoming and past exam schedules." },
          { name: "Fees", blurb: "Balances and fee history — no public checkout on this site." },
          { name: "Messages", blurb: "Conversation with the institute." },
          { name: "Timetable", blurb: "The class schedule the child follows." },
          { name: "ID Card", blurb: "Digital ID for the linked student." },
          { name: "Notifications", blurb: "In-app notices for the family." },
          { name: "Events", blurb: "Institute events for parents." },
          { name: "Teachers", blurb: "Teachers linked to the child’s classes." },
          { name: "Sports", blurb: "Sports activity visibility when enabled." },
          { name: "Complaints", blurb: "Raise and track a case with a clear owner." },
          { name: "Growth", blurb: "On-behalf student growth tools when delegated." },
          { name: "Settings", blurb: "Profile and family account preferences." },
        ],
      },
      {
        id: "connect-teacher",
        title: "Teacher",
        lede: "Classroom work — attendance, diary, homework, marks — without the office console.",
        items: [
          { name: "Dashboard", blurb: "Today’s teaching priorities." },
          { name: "Attendance", blurb: "Mark the class; the office reads the same day." },
          { name: "Diary Book", blurb: "Daily class diary entries." },
          { name: "Homework", blurb: "Assign and track homework." },
          { name: "Leave", blurb: "Request leave the office can approve." },
          { name: "Marks", blurb: "Enter and submit marks for review." },
          { name: "Exams", blurb: "Exam schedule for assigned classes." },
          { name: "Students", blurb: "Students in the teacher’s classes." },
          { name: "My Classes", blurb: "Sections and subjects assigned to the teacher." },
          { name: "Remarks", blurb: "Notes on student progress." },
          { name: "Timetable", blurb: "The teacher’s teaching schedule." },
          { name: "Messages", blurb: "Messages with families and the office." },
          { name: "Notifications", blurb: "In-app notices for faculty." },
          { name: "Events", blurb: "Institute events for teachers." },
          { name: "Fees", blurb: "Fee visibility relevant to the teacher role." },
          { name: "Transport", blurb: "Transport visibility when the module is turned on." },
          { name: "Complaints", blurb: "Cases assigned to or raised by faculty." },
          { name: "Settings", blurb: "Profile and account preferences." },
        ],
      },
      {
        id: "connect-student",
        title: "Student",
        lede: "The learner’s own slice — attendance, homework, marks, and campus life.",
        items: [
          { name: "Home", blurb: "Personal daily overview." },
          { name: "Attendance", blurb: "Own attendance history." },
          { name: "Transport", blurb: "Trip status when Transport is on." },
          { name: "Homework", blurb: "Assignments to complete." },
          { name: "Marks", blurb: "Published marks and results." },
          { name: "Timetable", blurb: "Class schedule." },
          { name: "Exams", blurb: "Exam schedule and details." },
          { name: "Alerts", blurb: "Urgent notices for the student." },
          { name: "Notifications", blurb: "In-app notices." },
          { name: "Messages", blurb: "Messages with teachers and the office." },
          { name: "Academic History", blurb: "Past years and progress." },
          { name: "Achievements", blurb: "Awards and recognitions." },
          { name: "Growth", blurb: "Personal growth tools when enabled." },
          { name: "Events", blurb: "Institute events for students." },
          { name: "Fees", blurb: "Fee visibility for the student account." },
          { name: "Sports", blurb: "Sports activity when enabled." },
          { name: "Teachers", blurb: "Teachers for the student’s classes." },
          { name: "Certificates", blurb: "Issued certificates." },
          { name: "ID Card", blurb: "Digital student ID." },
          { name: "Complaints", blurb: "Raise and track a complaint." },
          { name: "Settings", blurb: "Profile and account preferences." },
        ],
      },
    ],
  },
  {
    id: "transport",
    title: "Transport",
    lede: "The driver app for today’s trip — boarding, emergency, and route tools.",
    product: "transport",
    buckets: [
      {
        id: "transport-primary",
        title: "Driver modules",
        items: [
          { name: "Home", blurb: "Today’s trip overview and next actions." },
          { name: "Attendance", blurb: "Board students at each stop." },
          { name: "Notifications", blurb: "Trip and fleet notices." },
          { name: "Emergency", blurb: "Escalate an on-road emergency." },
          { name: "More", blurb: "Hub for bus, route, profile, and support." },
          { name: "Bus Information", blurb: "Assigned bus, route, and stops." },
          { name: "Route Setup", blurb: "Propose stops and students for Admin approval." },
          { name: "Profile", blurb: "Driver photo and account details." },
          { name: "Settings", blurb: "Theme and notification preferences." },
          { name: "Support", blurb: "Help, FAQ, and contacts." },
        ],
      },
    ],
  },
  {
    id: "admissions",
    title: "Admissions",
    lede: "Intake that becomes a student record — applicant portal and institute review.",
    product: "admissions",
    buckets: [
      {
        id: "admissions-applicant",
        title: "Applicant & parent",
        lede: "Public Connect portal for exploring institutes and submitting applications.",
        items: [
          { name: "Institutes", blurb: "Browse institutes offering intake." },
          { name: "Programs", blurb: "Programs and openings available to apply." },
          { name: "Dashboard", blurb: "Signed-in overview of applications." },
          { name: "Apply", blurb: "Start or continue an application." },
          { name: "Applications", blurb: "Track submitted applications." },
          { name: "Documents", blurb: "Upload and manage application documents." },
          { name: "Inquiries", blurb: "Ask the institute about intake." },
          { name: "Notifications", blurb: "Application status notices." },
          { name: "FAQs", blurb: "Common admissions questions." },
          { name: "Contact", blurb: "Reach the institute admissions desk." },
          { name: "Profile", blurb: "Applicant profile." },
          { name: "Settings", blurb: "Account preferences." },
        ],
      },
      {
        id: "admissions-institute",
        title: "Institute admissions",
        lede: "Day-to-day review in the Admissions portal; convert-to-student stays in Admin.",
        items: [
          { name: "Dashboard", blurb: "Pipeline overview for the institute." },
          { name: "Applications", blurb: "Review and progress applications." },
          { name: "Openings", blurb: "Publish and manage intake openings." },
          { name: "Application form", blurb: "Configure the form applicants complete." },
          { name: "Institute profile", blurb: "Public admissions profile for the campus." },
        ],
      },
    ],
  },
  {
    id: "careers",
    title: "Careers",
    lede: "Hiring and opportunity boards — job seekers and recruiters in Connect portals.",
    product: "careers",
    buckets: [
      {
        id: "careers-seeker",
        title: "Job seeker",
        lede: "Find roles, apply, and track interviews.",
        items: [
          { name: "Home", blurb: "Careers landing for candidates." },
          { name: "Jobs", blurb: "Browse open roles." },
          { name: "Dashboard", blurb: "Signed-in candidate overview." },
          { name: "Applications", blurb: "Track applications in progress." },
          { name: "Apply", blurb: "Submit an application." },
          { name: "Saved jobs", blurb: "Roles kept for later." },
          { name: "Interviews", blurb: "Interview schedule and status." },
          { name: "Documents", blurb: "CV and supporting files." },
          { name: "Notifications", blurb: "Hiring notices." },
          { name: "Profile", blurb: "Candidate profile." },
          { name: "Settings", blurb: "Account preferences." },
        ],
      },
      {
        id: "careers-recruiter",
        title: "Recruiter",
        lede: "Institute hiring workspace; convert-to-teacher stays in Admin.",
        items: [
          { name: "Workspace", blurb: "Recruiter home for open roles." },
          { name: "My jobs", blurb: "Jobs the institute is hiring for." },
          { name: "Applications", blurb: "Review candidates for each role." },
          { name: "Discover talent", blurb: "Find candidates beyond a single posting." },
          { name: "Careers home", blurb: "Public careers landing." },
          { name: "Settings", blurb: "Recruiter account preferences." },
        ],
      },
    ],
  },
];
