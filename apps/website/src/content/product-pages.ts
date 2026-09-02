import { PRODUCT_FAMILY, PRODUCT_IDS, type ProductId } from "@/theme/products";
import { isProductSlug, PRODUCTS, type ProductSlug } from "./products";

export const PREVIEW_PANEL_IDS = [
  "admin-command",
  "admin-people",
  "admin-attendance",
  "admin-fees",
  "admin-roles",
  "admin-docs",
  "connect-home",
  "connect-teacher",
  "connect-student",
  "connect-homework",
  "connect-notify",
  "transport-trip",
  "transport-stops",
  "transport-boarding",
  "transport-gps",
  "transport-sos",
  "admissions-discover",
  "admissions-apply",
  "admissions-pipeline",
  "admissions-waitlist",
  "careers-jobs",
  "careers-apply",
  "careers-recruiter",
  "careers-interview",
  "nexus-institutes",
  "nexus-sub",
  "nexus-modules",
  "nexus-support",
] as const;

export type PreviewPanelId = (typeof PREVIEW_PANEL_IDS)[number];
export type ProductDevice = "phone" | "tablet" | "browser";

export type ProductDelivery = "app" | "connect-portal" | "platform";

export type ProductPageFeature = {
  title: string;
  body: string;
};

export type ProductPageRole = {
  title: string;
  outcome: string;
  points: readonly string[];
};

export type ProductPageConnection = {
  product: ProductId;
  body: string;
};

export type ProductPreviewTab = {
  id: string;
  label: string;
  panel: PreviewPanelId;
};

export type ProductShot = {
  title: string;
  caption: string;
  panel: PreviewPanelId;
  device?: ProductDevice;
};

export type ProductPageContent = {
  id: ProductId;
  name: string;
  shortName: string;
  tagline: string;
  audience: string;
  purpose: string;
  replaces: string;
  doesNotReplace: string;
  delivery: ProductDelivery;
  deliveryNote: string;
  device: ProductDevice;
  android: boolean;
  demoProduct?: ProductSlug;
  capabilities: readonly ProductPageFeature[];
  previewTabs: readonly ProductPreviewTab[];
  workflows: readonly { title: string; body: string }[];
  roles: readonly ProductPageRole[];
  connections: readonly ProductPageConnection[];
  highlights: readonly ProductPageFeature[];
  shots: readonly ProductShot[];
  getStarted: { title: string; body: string };
};

function family(id: ProductId) {
  return PRODUCT_FAMILY[id];
}

const adminApp = PRODUCTS.admin;
const connectApp = PRODUCTS.connect;
const transportApp = PRODUCTS.transport;
const nexusApp = PRODUCTS.nexus;

export const PRODUCT_PAGES: Record<ProductId, ProductPageContent> = {
  admin: {
    id: "admin",
    name: adminApp.name,
    shortName: adminApp.shortName,
    tagline: adminApp.tagline,
    audience: adminApp.users,
    purpose:
      "Admin is the institute console — the place the office writes people, classes, fees, and operations. Connect, Transport, Admissions, and Careers read what Admin allows. It is not the parent, teacher, or student app.",
    replaces: adminApp.replaces,
    doesNotReplace: adminApp.doesNotReplace,
    delivery: "app",
    deliveryNote: "Browser console for the institute office. Android when a public build is published.",
    device: "tablet",
    android: true,
    demoProduct: "admin",
    capabilities: [
      {
        title: "People",
        body: "Students, teachers, parents, and accounts in one directory — including guardian linking.",
      },
      {
        title: "Academics",
        body: "Classes, years, subjects, timetable, exams, marks, homework, diary, promotion, and graduation.",
      },
      {
        title: "Attendance",
        body: "Student and staff attendance, plus monitor, reports, and analytics views.",
      },
      {
        title: "Fees",
        body: "Class fees, transport fees, extras, publish, and per-student dues — not a public payment gateway claim.",
      },
      {
        title: "Transport",
        body: "When the module is on: vehicles, drivers, stops, routes, student assignment, trips, and emergencies.",
      },
      {
        title: "Documents & certificates",
        body: "Document requests, packages, templates, generate and issue. Certificate library, builder, and issued copies.",
      },
      {
        title: "Admissions & careers review",
        body: "Pipeline visibility and convert-to-student / convert-to-teacher. Day-to-day review lives in the Connect portals.",
      },
      {
        title: "Roles & access",
        body: "Custom office roles with per-module access — not another person’s Connect portal.",
      },
      {
        title: "Reports & insights",
        body: "Home, analytics, reports, and teacher performance for the institute — not Nexus service tooling.",
      },
    ],
    previewTabs: [
      { id: "command", label: "Command", panel: "admin-command" },
      { id: "people", label: "People", panel: "admin-people" },
      { id: "attendance", label: "Attendance", panel: "admin-attendance" },
      { id: "fees", label: "Fees", panel: "admin-fees" },
      { id: "roles", label: "Roles", panel: "admin-roles" },
    ],
    workflows: [
      { title: "Configure", body: "The office sets people, classes, fees, and — when Transport is on — routes." },
      { title: "Run the day", body: "Attendance, announcements, complaints, and documents stay in one console." },
      { title: "Share outward", body: "Families and teachers see only their slice in Connect. Drivers run Transport." },
    ],
    roles: [
      {
        title: "Principal & office",
        outcome: "Run the institute day without chasing notebooks.",
        points: ["Directory, classes, and attendance in one place", "Fees and documents without parallel sheets", "Roles that match the office, not a leftover menu"],
      },
      {
        title: "Accountant",
        outcome: "See structures, dues, and history the families also see.",
        points: ["Class, transport, and extra fee structures", "Publish and student-level dues", "No claim of a public checkout on this site"],
      },
      {
        title: "Front office",
        outcome: "Intake and certificates without a second database.",
        points: ["Admissions conversion into the student record", "Document requests and issued certificates", "Complaints with a clear owner"],
      },
    ],
    connections: [
      { product: "connect", body: "Connect shows what Admin wrote — attendance, fees, timetable, messages — by role." },
      { product: "transport", body: "Admin assigns students to routes. Drivers execute the trip in Transport." },
      { product: "admissions", body: "Applications arrive from the Admissions portal. Admin converts intake to a student." },
      { product: "careers", body: "Hiring runs in the Careers portal. Admin converts a hire to a teacher record." },
      {
        product: "nexus",
        body: "Nexus is the service platform — licensing, support, and feedback. Admin is where the school works.",
      },
    ],
    highlights: [
      { title: "Source of truth", body: "People and operations are written here. Other products do not keep a parallel roster." },
      { title: "Module-aware", body: "Transport, Admissions, and Careers appear when your institute turns them on." },
      { title: "Office-shaped access", body: "Permissions are for Admin modules — not a parent or driver leftover screen." },
    ],
    shots: [
      { title: "Today", caption: "Home command — illustrative, not live institute data.", panel: "admin-command", device: "tablet" },
      { title: "Directory", caption: "People the rest of the platform reads.", panel: "admin-people", device: "tablet" },
      { title: "Certificates", caption: "Templates and issued documents in Admin.", panel: "admin-docs", device: "browser" },
    ],
    getStarted: {
      title: "Give the office one console.",
      body: "Start a 60-day trial after verification. Admin is provisioned with the institute — this site does not collect payment.",
    },
  },
  connect: {
    id: "connect",
    name: connectApp.name,
    shortName: connectApp.shortName,
    tagline: connectApp.tagline,
    audience: connectApp.users,
    purpose:
      "Connect is how parents, teachers, and students use the institute. One mobile-first portal with strict role isolation. Admissions and Careers are separate products in the family, delivered as Connect portals — they are not mixed into another role’s navigation.",
    replaces: connectApp.replaces,
    doesNotReplace: connectApp.doesNotReplace,
    delivery: "app",
    deliveryNote: "Parent, teacher, and student portal. Android when a public build is published.",
    device: "phone",
    android: true,
    demoProduct: "connect",
    capabilities: [
      { title: "Parent", body: "Multi-child switch, attendance, fees, transport status, homework, marks, messages, and ID." },
      { title: "Student", body: "Own timetable, attendance, homework, marks, exams, and identity — never another role’s roster." },
      { title: "Teacher", body: "Class attendance, diary, homework, marks, exams, students, and messages for assigned classes." },
      { title: "Activity", body: "A coordinator workspace for sports, ECA, activity attendance, diary, and practice — not the office ERP." },
      { title: "Homework", body: "Assignments the class already runs. Teachers write; families and students read their own." },
      { title: "Attendance", body: "Teachers mark the class. Parents and students see presence for their own record." },
      { title: "Fees", body: "Dues and history for the family — structures still live in Admin." },
      { title: "Communication", body: "Messages, notifications, and alerts for the people who need them." },
      { title: "Results", body: "Marks, exams, and academic history — not a separate public results portal." },
      { title: "Notifications", body: "In-app alerts from attendance, fees, transport, and the office." },
    ],
    previewTabs: [
      { id: "parent", label: "Parent", panel: "connect-home" },
      { id: "teacher", label: "Teacher", panel: "connect-teacher" },
      { id: "student", label: "Student", panel: "connect-student" },
      { id: "homework", label: "Homework", panel: "connect-homework" },
      { id: "alerts", label: "Notifications", panel: "connect-notify" },
    ],
    workflows: [
      { title: "Issue", body: "The office creates the person in Admin and issues Connect credentials." },
      { title: "Enter", body: "Institute → portal → credentials → OTP. The role decides the navigation." },
      { title: "Use", body: "Parents switch children. Teachers mark the class. Students see their own day." },
    ],
    roles: [
      {
        title: "Parent",
        outcome: "See attendance, fees, homework, and the bus without calling the office.",
        points: ["Switch between children in one account", "Attendance, fees, and messages without office hours", "Trip status when Transport is on"],
      },
      {
        title: "Teacher",
        outcome: "Mark attendance and share class work from a phone.",
        points: ["Class roster and daily attendance", "Diary and homework in context", "No access to another role’s portal"],
      },
      {
        title: "Student",
        outcome: "See your timetable, marks, and identity — nothing else.",
        points: ["Timetable, homework, marks, and ID", "Never another role’s navigation", "Credentials issued by the office"],
      },
      {
        title: "Activity coordinator",
        outcome: "Run sports and ECA from a dedicated workspace in Connect.",
        points: ["Activity attendance and diary", "Achievements, practice, and calendar", "Not a substitute for Admin operations"],
      },
    ],
    connections: [
      { product: "admin", body: "Admin writes the directory, fees, and timetable Connect is allowed to show." },
      { product: "transport", body: "Parents and students see trip status here when Transport is enabled — not a driver menu." },
      { product: "admissions", body: "The Admissions product is a Connect portal. Converted families then use this parent/student app." },
      { product: "careers", body: "The Careers product is a Connect portal for hiring — separate from teacher class navigation." },
      { product: "nexus", body: "Nexus turns Connect on for the institute. It does not log in as a parent." },
    ],
    highlights: [
      { title: "Role isolation", body: "Parent, teacher, student, activity, admissions, and careers do not share each other’s menus." },
      { title: "One family account", body: "Parents switch children instead of collecting extra logins." },
      { title: "OTP entry", body: "Institute → portal → credentials → OTP. Real login details come from your institute — not from this website." },
    ],
    shots: [
      { title: "Parent home", caption: "Multi-child home — illustrative.", panel: "connect-home", device: "phone" },
      { title: "Teacher attendance", caption: "Class mark from Connect.", panel: "connect-teacher", device: "phone" },
      { title: "Notifications", caption: "In-app alerts, not a public SMS gateway claim.", panel: "connect-notify", device: "phone" },
    ],
    getStarted: {
      title: "Give families and teachers their own door.",
      body: "Connect is provisioned with the institute trial. Credentials come from the office — not this website.",
    },
  },
  transport: {
    id: "transport",
    name: transportApp.name,
    shortName: transportApp.shortName,
    tagline: "Fleet, routes, and the day’s trips",
    audience: transportApp.users,
    purpose:
      "Transport is a dedicated driver app for executing the trip. Admin assigns students to routes. Drivers run boarding and trip status. Parents see that status in Connect when the module is on. It is not a live telematics product for families, and it is not the fee office.",
    replaces: transportApp.replaces,
    doesNotReplace: transportApp.doesNotReplace,
    delivery: "app",
    deliveryNote: "Driver and fleet operations. Android when a public build is published.",
    device: "phone",
    android: true,
    demoProduct: "transport",
    capabilities: [
      { title: "Driver", body: "Home, trip attendance, notifications, emergency, bus information, route setup, and profile." },
      { title: "Routes", body: "Route setup in the driver app; office review of routes, vehicles, and drivers in Admin." },
      { title: "Stops", body: "Stop lists on the trip. Device location can be used when a stop is saved during setup." },
      { title: "Trips", body: "Morning and afternoon execution with delay and status the office can see." },
      { title: "Boarding", body: "Student boarding marks and counts — not a paper manifest." },
      {
        title: "GPS",
        body: "The device location is used for stop capture and trip readiness. Families follow trip status, boarding, and ETA in Connect — not a live parent map stream.",
      },
      {
        title: "Emergency / SOS",
        body: "An emergency note from the driver reaches Admin and Connect. It is not SMS, a phone call, or a push gateway.",
      },
      {
        title: "Parent visibility",
        body: "Connect shows bus, stop, timeline, trip status, and an SOS overlay when a shared trip exists.",
      },
    ],
    previewTabs: [
      { id: "trip", label: "Trip", panel: "transport-trip" },
      { id: "stops", label: "Stops", panel: "transport-stops" },
      { id: "board", label: "Boarding", panel: "transport-boarding" },
      { id: "gps", label: "GPS", panel: "transport-gps" },
      { id: "sos", label: "Emergency", panel: "transport-sos" },
    ],
    workflows: [
      { title: "Assign", body: "Admin assigns students to routes, stops, and vehicles." },
      { title: "Run", body: "The driver starts the trip, marks boarding, and can raise an emergency note." },
      { title: "Follow", body: "Parents see trip status in Connect when Transport is on — not a leftover Admin menu." },
    ],
    roles: [
      {
        title: "Driver",
        outcome: "Execute today’s trip from a dedicated app.",
        points: ["Today’s manifest and stops", "Boarding counts the office can see", "Large controls built for the road"],
      },
      {
        title: "Transport in-charge",
        outcome: "See routes, trips, and emergencies from Admin when the module is on.",
        points: ["Vehicles, drivers, stops, and routes", "Trips, pending, and attendance", "Emergency notes without a call tree"],
      },
      {
        title: "Parent",
        outcome: "See the bus without calling the office.",
        points: ["Trip status and boarding timeline in Connect", "SOS overlay when a note is raised", "Not a live GPS map"],
      },
    ],
    connections: [
      { product: "admin", body: "Admin owns assignment: students, routes, vehicles, drivers, and emergency review." },
      { product: "connect", body: "Parents and students follow the trip in Connect — Transport does not become their app." },
      { product: "nexus", body: "Nexus enables the Transport module per institute. It does not drive the bus." },
    ],
    highlights: [
      { title: "A real driver app", body: "Not a leftover item inside Admin or Connect." },
      { title: "Honest location", body: "Device GPS for setup and readiness. Parent visibility is trip status, not telematics." },
      { title: "Emergency that reaches the office", body: "A note, not a claimed SMS or dispatch network." },
    ],
    shots: [
      { title: "Today’s trip", caption: "Driver home — illustrative.", panel: "transport-trip", device: "phone" },
      { title: "Boarding", caption: "Counts the office can read.", panel: "transport-boarding", device: "phone" },
      { title: "Emergency", caption: "SOS note — not SMS or a phone call.", panel: "transport-sos", device: "phone" },
    ],
    getStarted: {
      title: "Give drivers their own app.",
      body: "Transport is enabled per institute. Start a trial, then turn the module on — no invented store listing here.",
    },
  },
  admissions: {
    id: "admissions",
    name: family("admissions").name,
    shortName: family("admissions").shortName,
    tagline: "Applications that become student records",
    audience: "Applicants, parents, and the institute office",
    purpose:
      "Admissions helps applicants discover programs, apply, and upload documents. The office reviews intake here, then creates the student record in Admin. It is not a second student database.",
    replaces: "Inbox applications and retyped admission registers",
    doesNotReplace: "The student directory in Admin, or the parent app after joining",
    delivery: "connect-portal",
    deliveryNote: "Connect portal. There is no separate APK or store URL.",
    device: "tablet",
    android: false,
    demoProduct: "connect",
    capabilities: [
      { title: "Institute & program discovery", body: "Applicants browse institutes, programs, and openings before they apply." },
      { title: "Applications", body: "Submit and track applications from the portal. The office sees the same pipeline." },
      { title: "Documents", body: "Application documents stay with the file — they are not trapped in email." },
      { title: "Waitlist", body: "Waitlisted is a real pipeline stage, with office visibility — not a separate waitlist product." },
      {
        title: "Interviews",
        body: "Interview outcomes fold into application review and verification. This release does not ship a separate interview calendar.",
      },
      { title: "Decisions", body: "Approved, rejected, withdrawn, waitlisted, and parent confirmation — on the same application." },
      { title: "Conversion", body: "Admin converts accepted intake to a student record. The family then uses Connect." },
    ],
    previewTabs: [
      { id: "discover", label: "Discover", panel: "admissions-discover" },
      { id: "apply", label: "Apply", panel: "admissions-apply" },
      { id: "pipeline", label: "Pipeline", panel: "admissions-pipeline" },
      { id: "waitlist", label: "Waitlist", panel: "admissions-waitlist" },
    ],
    workflows: [
      { title: "Apply", body: "The applicant finds the institute and program, then submits through the Admissions portal." },
      { title: "Review", body: "The office reads documents and moves the file through review, verification, and decision." },
      { title: "Join", body: "Admin writes the student. Connect credentials follow — Admissions does not become the parent app." },
    ],
    roles: [
      {
        title: "Applicant / parent",
        outcome: "Submit an application that can become a student record.",
        points: ["Institutes, programs, apply, and documents", "Status without calling the front office", "No separate product login island after conversion"],
      },
      {
        title: "Institute office",
        outcome: "Review intake, then convert — not retype.",
        points: ["Applications, openings, and institute profile in the portal", "Waitlist and decisions on the same file", "Convert to student in Admin"],
      },
    ],
    connections: [
      { product: "connect", body: "Admissions is served as a Connect portal. After conversion, the family uses Connect as a parent." },
      { product: "admin", body: "Admin converts accepted applications into the student directory." },
      { product: "nexus", body: "Nexus enables Admissions per institute. It does not process applications." },
    ],
    highlights: [
      { title: "A product, not a menu leftover", body: "Its own portal shell — still one LumenX family." },
      { title: "Pipeline, not a second SIS", body: "Waitlist and decisions live on the application until Admin converts it." },
      { title: "Honest interviews", body: "Outcomes on the file. No invented interview scheduler on this site." },
    ],
    shots: [
      { title: "Discovery", caption: "Institutes and programs — illustrative.", panel: "admissions-discover", device: "tablet" },
      { title: "Pipeline", caption: "Office review of applications.", panel: "admissions-pipeline", device: "browser" },
      { title: "Waitlist", caption: "A stage on the same file.", panel: "admissions-waitlist", device: "tablet" },
    ],
    getStarted: {
      title: "Take applications into the same institute record.",
      body: "Admissions is enabled per institute and opens as a Connect portal. Start a trial, then turn the module on.",
    },
  },
  careers: {
    id: "careers",
    name: family("careers").name,
    shortName: family("careers").shortName,
    tagline: "Hiring in the same institute family",
    audience: "Candidates, recruiters, and the institute office",
    purpose:
      "Careers helps institutes hire — jobs, applications, profiles, and interviews in one place. Admin turns an approved hire into a teacher. It is not the teacher classroom app.",
    replaces: "Side-channel job posts and CV inboxes",
    doesNotReplace: "Teacher records and class assignment in Admin",
    delivery: "app",
    deliveryNote: "Standalone Careers web app. Connect links here; there is no separate store listing yet.",
    device: "tablet",
    android: false,
    demoProduct: "careers",
    capabilities: [
      { title: "Jobs", body: "Openings the institute publishes. Candidates browse, save, and apply." },
      { title: "Applications", body: "A pipeline the recruiter and the office can see — including waitlist and approval stages." },
      { title: "Candidate profiles", body: "Profiles and documents that travel with the application." },
      { title: "Interviews", body: "Candidates have an interviews surface on their applications. This is not a campus-wide calendar product." },
      { title: "Recruiter workflow", body: "Workspace, my jobs, applications, and discover talent — posting and review live here, not as an Admin leftover." },
      { title: "Hiring", body: "Admin converts an approved hire to a teacher record the rest of the platform can use." },
    ],
    previewTabs: [
      { id: "jobs", label: "Jobs", panel: "careers-jobs" },
      { id: "apply", label: "Apply", panel: "careers-apply" },
      { id: "recruiter", label: "Recruiter", panel: "careers-recruiter" },
      { id: "interview", label: "Interviews", panel: "careers-interview" },
    ],
    workflows: [
      { title: "Post", body: "The recruiter publishes a job from the Careers portal." },
      { title: "Apply & interview", body: "Candidates apply, attach documents, and see interview detail on the application." },
      { title: "Hire", body: "Admin converts the hire to a teacher. Careers does not become the teacher Connect app." },
    ],
    roles: [
      {
        title: "Candidate",
        outcome: "Find a role and track the application.",
        points: ["Jobs, saved roles, and apply", "Documents and interview detail", "Notifications in the same portal"],
      },
      {
        title: "Recruiter",
        outcome: "Run hiring without a side inbox.",
        points: ["My jobs and applications", "Discover talent", "Not the school office ERP"],
      },
      {
        title: "Institute office",
        outcome: "Convert a hire into the teacher directory.",
        points: ["Pipeline visibility in Admin", "Convert to teacher", "Day-to-day posting stays in the Careers portal"],
      },
    ],
    connections: [
      { product: "connect", body: "Connect can link to the Careers portal for hiring — separate from parent or student navigation." },
      { product: "admin", body: "Admin converts approved hires to teachers. It does not replace the recruiter workspace." },
      { product: "nexus", body: "Nexus enables Careers per institute. It does not screen candidates." },
    ],
    highlights: [
      { title: "Hiring in the same family", body: "Turn Careers on for your institute alongside other modules when you need hiring." },
      { title: "Recruiter, not leftover Admin", body: "Jobs and applications are posted in the portal the candidate also uses." },
      { title: "Hire becomes a teacher", body: "Conversion writes the directory Connect teachers will use." },
    ],
    shots: [
      { title: "Jobs", caption: "Openings — illustrative.", panel: "careers-jobs", device: "tablet" },
      { title: "Recruiter", caption: "Applications in the Careers workspace.", panel: "careers-recruiter", device: "browser" },
      { title: "Interviews", caption: "Detail on the application, not a campus calendar claim.", panel: "careers-interview", device: "phone" },
    ],
    getStarted: {
      title: "Hire into the same institute directory.",
      body: "Careers is enabled per institute and opens as the standalone Careers app. Start a trial, then turn the module on.",
    },
  },
  nexus: {
    id: "nexus",
    name: nexusApp.name,
    shortName: nexusApp.shortName,
    tagline: "Service platform for quality, support, and feedback",
    audience: nexusApp.users,
    purpose:
      "Nexus is the LumenX service platform — not another school ERP. It licenses institutes, turns modules on, and then keeps the experience strong: support, feedback, renewals, and platform health. Groups and LumenX operators use it so campuses get reliable service. Admin still runs the institute day.",
    replaces: nexusApp.replaces,
    doesNotReplace: nexusApp.doesNotReplace,
    delivery: "platform",
    deliveryNote: "Web only in this release. There is no Nexus Android app.",
    device: "browser",
    android: false,
    demoProduct: "nexus",
    capabilities: [
      {
        title: "Support & feedback",
        body: "A platform support center and feedback from institutes — so issues and requests improve the shared experience, not sit in a private inbox.",
      },
      {
        title: "Quality of service",
        body: "Health, risks, and renewals across institutes. Operators see where service needs attention before a campus is left guessing.",
      },
      {
        title: "Institutes",
        body: "A multi-institute directory. Operational school modules are not hosted here — Admin still runs the campus.",
      },
      {
        title: "Registrations",
        body: "Onboarding and approval that start the institute — including the 60-day trial — with a clear path into licensed service.",
      },
      {
        title: "Licensing",
        body: "Billing, renewals, per-student rate, and tenure — one clear commercial model for institutes.",
      },
      {
        title: "Modules",
        body: "Activate Transport, Admissions, Careers, and others per institute without shipping a new app.",
      },
      {
        title: "Platform operations",
        body: "Platform users, policies and alerts, audit log, storage quotas, and templates that keep service consistent.",
      },
      {
        title: "Platform intelligence",
        body: "Analytics across institutes for operators and groups — not class attendance for a single school.",
      },
    ],
    previewTabs: [
      { id: "support", label: "Support", panel: "nexus-support" },
      { id: "institutes", label: "Institutes", panel: "nexus-institutes" },
      { id: "license", label: "Licensing", panel: "nexus-sub" },
      { id: "modules", label: "Modules", panel: "nexus-modules" },
    ],
    workflows: [
      {
        title: "Onboard",
        body: "Approve the institute, start the trial, and set rate, tenure, and modules — service begins with a clear entitlement.",
      },
      {
        title: "Serve",
        body: "Support tickets and institute feedback land in Nexus. Operators resolve them without mixing into Admin classroom work.",
      },
      {
        title: "Improve",
        body: "Health, renewals, and recurring feedback show where quality needs attention. The campus still works in Admin and Connect.",
      },
    ],
    roles: [
      {
        title: "LumenX operator",
        outcome: "Deliver quality platform service — not mark a single class.",
        points: [
          "Support and feedback across institutes",
          "Licensing, modules, and renewals",
          "Health and audit for consistent service",
        ],
      },
      {
        title: "Group / trust head",
        outcome: "See service quality across campuses without logging into each Admin as a teacher.",
        points: [
          "Directory and entitlements",
          "Support and health across institutes",
          "Never a replacement for the school office",
        ],
      },
    ],
    connections: [
      {
        product: "admin",
        body: "Admin runs the institute day. Nexus licenses, supports, and improves the platform around it — it does not take attendance or collect fees.",
      },
      {
        product: "connect",
        body: "Nexus entitles Connect and hears platform feedback. Families still sign in to Connect, not Nexus.",
      },
      {
        product: "transport",
        body: "The Transport module is turned on here. Drivers still use Transport; service issues can surface in Nexus support.",
      },
      {
        product: "admissions",
        body: "Admissions is enabled per institute from Nexus. Intake work stays in the Admissions portal.",
      },
      {
        product: "careers",
        body: "Careers is enabled per institute from Nexus. Hiring stays in the Careers portal.",
      },
    ],
    highlights: [
      {
        title: "Service, not just signup",
        body: "Licensing starts the relationship. Support, feedback, and health keep the experience strong after go-live.",
      },
      {
        title: "Quality across the portfolio",
        body: "Operators and groups see where institutes need attention — without turning Nexus into a school ERP.",
      },
      {
        title: "One clear commercial model",
        body: "Per student, with a campus starting price. Choose monthly, 6 months, or yearly. Modules turn on when the institute needs them.",
      },
    ],
    shots: [
      {
        title: "Support",
        caption: "Platform support and feedback — illustrative.",
        panel: "nexus-support",
        device: "browser",
      },
      {
        title: "Institutes",
        caption: "Service directory across campuses.",
        panel: "nexus-institutes",
        device: "browser",
      },
      {
        title: "Licensing",
        caption: "Rate and tenure, not plan cards.",
        panel: "nexus-sub",
        device: "browser",
      },
    ],
    getStarted: {
      title: "Put service quality on the same platform as licensing.",
      body: "Groups and operators use Nexus for entitlements, support, and feedback. A single campus lives in Admin. Talk to us after verification.",
    },
  },
};

export const PRODUCT_PAGE_LIST = PRODUCT_IDS.map((id) => PRODUCT_PAGES[id]);

export function isProductPageSlug(value: string): value is ProductId {
  return (PRODUCT_IDS as readonly string[]).includes(value);
}

export function relatedProductPages(id: ProductId): ProductPageContent[] {
  return PRODUCT_PAGE_LIST.filter((page) => page.id !== id);
}

export function productDemoSlug(id: ProductId): ProductSlug | undefined {
  const page = PRODUCT_PAGES[id];
  if (page.demoProduct) return page.demoProduct;
  return isProductSlug(id) ? id : undefined;
}
