/**
 * Verified product landing content for Play Astro.
 * Claims are limited to implemented Admin / Connect / Transport / Admissions / Careers / Nexus surfaces.
 * Screenshot paths map to `public/assets/screenshots/`.
 */

import { PRODUCTS } from "./lumenx.js";

const byId = Object.fromEntries(PRODUCTS.map((p) => [p.id, p]));

function shot(src, title, caption, orientation = "landscape") {
  return { src, title, caption, orientation };
}

function moduleCard({ id, name, description, users, workflow, image = null, category = null }) {
  return { id, name, description, users, workflow, image, category };
}

/**
 * @typedef {Object} ProductPageData
 */

/** @type {Record<string, object>} */
export const PRODUCT_PAGES = {
  admin: {
    id: "admin",
    product: byId.admin,
    headline: "Run your institution from one operational core.",
    summary:
      "LumenX Admin is the institute console where the office manages people, academics, attendance, fees, communications, documents, and day-to-day operations. Connect, Transport, Admissions, and Careers read from this shared record — they do not keep a second roster.",
    delivery: "Browser console for the institute office. A Windows desktop shell opens the same Admin experience when published.",
    audience: "Principals, front office, accountants, and staff with assigned Admin roles.",
    problem: {
      eyebrow: "The problem",
      title: "Campus work spreads across notebooks, chats, and disconnected tools.",
      body: "People directories, fees, attendance, documents, and hiring often live in separate files. Staff chase updates across channels, and families wait on office hours for information that already exists somewhere on campus.",
      points: [
        {
          title: "Fragmented records",
          body: "Student, staff, and guardian details are retyped across sheets and message threads.",
        },
        {
          title: "Scattered day-to-day work",
          body: "Attendance, fees, notices, and approvals lack a single place for authorized staff to act.",
        },
        {
          title: "Hand-offs without context",
          body: "Transport, admissions, and hiring need the same institute directory — not a parallel database.",
        },
      ],
    },
    modules: [
      moduleCard({
        id: "people",
        category: "People",
        name: "People & accounts",
        description: "Students, teachers, parents, photos, and portal accounts with guardian linking.",
        users: "Office administrators",
        workflow: "Build and maintain the shared directory other products read.",
        image: "/assets/screenshots/admin/people.jpg",
      }),
      moduleCard({
        id: "academics",
        category: "Academics",
        name: "Classes & academics",
        description: "Classes, enrollments, subjects, timetable, exams, marks, homework, and diary visibility for the office.",
        users: "Academic office",
        workflow: "Structure the academic year and keep class records current.",
        image: "/assets/screenshots/admin/classes.png",
      }),
      moduleCard({
        id: "attendance",
        category: "Attendance",
        name: "Student & staff attendance",
        description: "Mark and review student and staff attendance with reports for authorized roles.",
        users: "Office and assigned staff",
        workflow: "Record presence and review attendance without chasing paper registers.",
        image: "/assets/screenshots/admin/command.png",
      }),
      moduleCard({
        id: "fees",
        category: "Fees",
        name: "Fees & dues",
        description: "Class fees, transport fees, extras, publish flows, and per-student dues overview.",
        users: "Accounts / office",
        workflow: "Publish structures and track dues from one fee workspace.",
        image: "/assets/screenshots/admin/fees.png",
      }),
      moduleCard({
        id: "communications",
        category: "Communications",
        name: "Communications",
        description: "Notifications, messages, announcements and alerts (Send), and complaints with clear ownership.",
        users: "Front office",
        workflow: "Reach campus roles and handle complaints inside the console.",
        image: "/assets/screenshots/admin/feedback.png",
      }),
      moduleCard({
        id: "documents",
        category: "Institute",
        name: "Documents & certificates",
        description: "Document requests, templates, generation, and issued copies for institute records.",
        users: "Front office",
        workflow: "Handle requests and certificates without a second document silo.",
      }),
      moduleCard({
        id: "leave",
        category: "Services",
        name: "Leave & approvals",
        description: "Leave requests and office approvals connected to the people directory.",
        users: "Office and staff",
        workflow: "Review leave without losing track of who approved what.",
      }),
      moduleCard({
        id: "transport-hub",
        category: "Services",
        name: "Transport coordination",
        description: "Vehicles, drivers, stops, routes, student assignment, trips, boarding, and emergency notes when Transport is enabled.",
        users: "Transport in-charge",
        workflow: "Assign fleet work in Admin; drivers execute trips in the Transport app.",
      }),
      moduleCard({
        id: "pipelines",
        category: "Services",
        name: "Admissions & Careers review",
        description: "Pipeline visibility with convert-to-student and convert-to-teacher when those modules are on.",
        users: "Office",
        workflow: "Bring accepted intake and hires into the institute directory.",
      }),
      moduleCard({
        id: "analytics",
        category: "Insights",
        name: "Analytics & reports",
        description: "Home overview, analytics dashboards, reports, and teacher performance views.",
        users: "Leadership and office",
        workflow: "See campus snapshots and export institute reports from Insights.",
        image: "/assets/screenshots/admin/analytics.png",
      }),
      moduleCard({
        id: "access",
        category: "Operations",
        name: "Roles, modules & settings",
        description: "Custom office roles, module toggles, subscription, storage, and institute settings.",
        users: "Administrators",
        workflow: "Control who can act and which modules are available.",
        image: "/assets/screenshots/admin/modules.png",
      }),
    ],
    workflows: [
      {
        title: "Set up the institute",
        body: "Build the shared record the rest of LumenX will read.",
        steps: [
          "Add students, teachers, parents, and accounts",
          "Create classes, subjects, and the timetable",
          "Publish fee structures",
          "Assign vehicles, stops, and routes when Transport is on",
        ],
      },
      {
        title: "Run the campus day",
        body: "Keep daily operations in one office console.",
        steps: [
          "Mark student and staff attendance",
          "Send announcements and handle complaints",
          "Track fees and dues",
          "Generate documents and issue certificates",
        ],
      },
      {
        title: "Hand off to the right door",
        body: "Other products show only what each role needs.",
        steps: [
          "Families and teachers open Connect",
          "Drivers run trips in Transport",
          "Accepted admissions convert to students here",
          "Approved hires convert to teachers here",
        ],
      },
    ],
    roles: [
      {
        title: "Principal & office",
        outcome: "Run the institute day from one authorized console.",
        points: ["People directory", "Classes and attendance", "Fees and documents", "Office roles and access"],
      },
      {
        title: "Accountant",
        outcome: "Manage structures, dues, and fee history families can also see.",
        points: ["Class fee structures", "Transport and extra fees", "Publish dues", "Student-level fee history"],
      },
      {
        title: "Front office",
        outcome: "Handle intake and certificates without a second database.",
        points: ["Convert admissions to students", "Document requests", "Issued certificates", "Complaints with a clear owner"],
      },
    ],
    experiences: null,
    gallery: [
      shot("/assets/screenshots/admin/command.png", "Today", "Home command console with institute overview and operations.", "landscape"),
      shot("/assets/screenshots/admin/analytics.png", "Analytics", "Institute totals and chart series for leadership review.", "landscape"),
      shot("/assets/screenshots/admin/classes.png", "Classes", "Class sections, capacity, and class teachers.", "landscape"),
      shot("/assets/screenshots/admin/people.jpg", "People", "Teachers and staff directory.", "landscape"),
      shot("/assets/screenshots/admin/fees.png", "Fees", "Structures, publish, and per-student dues.", "landscape"),
      shot("/assets/screenshots/admin/modules.png", "Modules", "Enable or disable modules for the institute.", "landscape"),
      shot("/assets/screenshots/admin/feedback.png", "Feedback", "Platform feedback from the institute office.", "landscape"),
    ],
    cta: {
      title: "Give the office one operational core.",
      body: "Book a demo to walk through Admin with your institute workflows. After verification, a 60-day trial can begin — this site does not collect payment.",
    },
  },

  connect: {
    id: "connect",
    product: byId.connect,
    headline: "One connected experience for teachers, parents and students.",
    summary:
      "LumenX Connect is the campus portal with strict role isolation. Teachers, parents, and students each see navigation and records relevant to their role — drawn from the Admin institute record, not a parallel database.",
    delivery: "Mobile-first portal for parents, teachers, and students. Android builds when published.",
    audience: "Teachers, parents, and students with institute-issued credentials.",
    problem: {
      eyebrow: "The problem",
      title: "Campus roles need different views of the same day.",
      body: "Teachers mark attendance and share class work. Parents follow linked children. Students need their own timetable and results. Shared logins and forwarded screenshots create confusion and oversharing.",
      points: [
        {
          title: "One-size portals fail",
          body: "Office tools are the wrong shape for parents and students — and classroom tools are wrong for the front office.",
        },
        {
          title: "Information arrives late",
          body: "Attendance, homework, and notices travel through chats instead of role-aware surfaces.",
        },
        {
          title: "Oversharing risk",
          body: "Without isolation, people see class lists or fee details that are not theirs.",
        },
      ],
    },
    modules: [
      moduleCard({
        id: "attendance",
        name: "Attendance",
        description: "Teachers mark class attendance. Parents and students see their own presence history.",
        users: "Teachers mark · parents & students view",
        workflow: "Keep presence current without paper registers or group chats.",
        image: "/assets/screenshots/connect/attendance.jpg",
      }),
      moduleCard({
        id: "homework",
        name: "Assignments & homework",
        description: "Teachers publish class work. Families and students read items for their own record.",
        users: "Teachers, parents, students",
        workflow: "Share homework in context of the class day.",
        image: "/assets/screenshots/connect/homework.jpg",
      }),
      moduleCard({
        id: "timetable",
        name: "Timetable",
        description: "Period schedules surfaced for the roles who need them.",
        users: "Teachers, parents, students",
        workflow: "See the day’s periods without a separate notice board.",
        image: "/assets/screenshots/connect/timetable.jpg",
      }),
      moduleCard({
        id: "results",
        name: "Marks & exams",
        description: "Published exams and marks for the student’s own academic record.",
        users: "Teachers, parents, students",
        workflow: "Review results without a separate public portal.",
        image: "/assets/screenshots/connect/marks.jpg",
      }),
      moduleCard({
        id: "fees",
        name: "Fees visibility",
        description: "Dues and history for parents and students. Fee structures still live in Admin.",
        users: "Parents, students",
        workflow: "Check what is due without calling the office.",
      }),
      moduleCard({
        id: "comms",
        name: "Messages & notifications",
        description: "In-app messages, notifications, and alerts for the people who need them.",
        users: "All Connect roles",
        workflow: "Receive campus updates inside the portal.",
        image: "/assets/screenshots/connect/notify.jpg",
      }),
      moduleCard({
        id: "transport-status",
        name: "Transport status",
        description: "Trip status and boarding timeline when Transport is enabled — not a driver control panel.",
        users: "Parents, students, teachers (view)",
        workflow: "Follow the bus without calling the office.",
        image: "/assets/screenshots/connect/transport.jpg",
      }),
    ],
    workflows: [
      {
        title: "Issue credentials",
        body: "The office creates the person in Admin and issues Connect access.",
        steps: ["Create the person record in Admin", "Issue portal credentials", "User signs in with institute → portal → credentials → OTP"],
      },
      {
        title: "Use the right surface",
        body: "Role decides navigation — not a shared menu for everyone.",
        steps: ["Parents switch between linked children", "Teachers mark class attendance and share work", "Students see their own timetable, homework, and results"],
      },
      {
        title: "Stay connected to Admin",
        body: "Connect reads what Admin allows. It does not become a second SIS.",
        steps: ["Directory and fees originate in Admin", "Transport status appears when the module is on", "Admissions and Careers open as their own portals when needed"],
      },
    ],
    roles: [
      {
        title: "Teachers",
        outcome: "Mark attendance and share class work from a phone-friendly portal.",
        points: ["Class roster and daily attendance", "Diary and homework in context", "No access to parent or student menus"],
      },
      {
        title: "Parents",
        outcome: "Follow linked children without calling the office.",
        points: ["Multi-child switch in one account", "Attendance, fees, homework, and messages", "Trip status when Transport is on"],
      },
      {
        title: "Students",
        outcome: "See personal academic information — nothing else.",
        points: ["Own timetable, homework, marks, and exams", "Fees and identity surfaces when available", "Never another role’s roster"],
      },
    ],
    experiences: [
      {
        id: "teachers",
        title: "Teachers",
        headline: "Run the class day from Connect.",
        body: "Teachers work with assigned classes — attendance, diary, homework, marks, exams, students, and messages. Classroom tools stay separate from parent and student navigation.",
        points: [
          "Mark class attendance for assigned sections",
          "Publish homework and diary updates",
          "Submit marks and review exam schedules for the class",
          "Optional activity workspace for coordinators with activity scope",
        ],
        image: "/assets/screenshots/connect/teacher-home.jpg",
        imageAlt: "LumenX Connect teacher home",
      },
      {
        id: "parents",
        title: "Parents",
        headline: "Stay informed for every linked child.",
        body: "Parents switch between children in one account and see attendance, fees, homework, marks, messages, and transport status that belong to those children — not school-wide rosters.",
        points: [
          "Multi-child home and switcher",
          "Attendance, fees, and academic updates for linked students",
          "Leave requests for children",
          "Trip status when Transport is enabled",
        ],
        image: "/assets/screenshots/connect/home.jpg",
        imageAlt: "LumenX Connect parent home",
      },
      {
        id: "students",
        title: "Students",
        headline: "Your timetable, work, and results in one place.",
        body: "Students see personal academic information — timetable, attendance history, assignments, marks, exams, and permitted updates — without access to teacher tools or other students’ records.",
        points: [
          "Personal timetable and attendance history",
          "Homework, marks, and exam schedules",
          "Fees visibility and identity surfaces when available",
          "Role isolation from teacher and parent menus",
        ],
        image: "/assets/screenshots/connect/timetable.jpg",
        imageAlt: "LumenX Connect timetable",
      },
    ],
    gallery: [
      shot("/assets/screenshots/connect/home.jpg", "Parent home", "Multi-child home for parents.", "portrait"),
      shot("/assets/screenshots/connect/teacher-home.jpg", "Teacher home", "Subject teacher day — classes and actions at a glance.", "portrait"),
      shot("/assets/screenshots/connect/attendance.jpg", "Attendance", "Teachers mark the class; families see their own record.", "portrait"),
      shot("/assets/screenshots/connect/homework.jpg", "Homework", "Published homework and submissions in one place.", "portrait"),
      shot("/assets/screenshots/connect/timetable.jpg", "Timetable", "Periods, subjects, and teachers for the day.", "portrait"),
      shot("/assets/screenshots/connect/exams.jpg", "Exams", "Published exam schedule.", "portrait"),
      shot("/assets/screenshots/connect/marks.jpg", "Marks", "Subject results for the child.", "portrait"),
      shot("/assets/screenshots/connect/notify.jpg", "Notifications", "In-app alerts — not a public SMS gateway.", "portrait"),
      shot("/assets/screenshots/connect/transport.jpg", "Transport status", "Trip status families see when Transport is on.", "portrait"),
    ],
    cta: {
      title: "Give every campus role the right door.",
      body: "Book a demo to see teacher, parent, and student experiences. Credentials are issued by the institute office — not this website.",
    },
  },

  transport: {
    id: "transport",
    product: byId.transport,
    headline: "Bring transport operations into a dedicated workflow.",
    summary:
      "LumenX Transport is the driver app for executing assigned trips — boarding, trip status, and emergency notes. Admin assigns vehicles, routes, and students. Parents follow trip status in Connect when the module is on.",
    delivery: "Android driver app when published. Fleet assignment and review live in Admin.",
    audience: "Drivers, transport in-charge (Admin), and parents who follow trip status in Connect.",
    problem: {
      eyebrow: "The problem",
      title: "Fleet days are hard to run from paper and phone calls.",
      body: "Drivers need today’s stops and boarding clarity. The office needs assignment and emergency visibility. Families want trip status without interrupting the driver or front desk.",
      points: [
        {
          title: "Paper manifests drift",
          body: "Boarding lists change, and the office cannot see what happened on the route.",
        },
        {
          title: "Calls interrupt the road",
          body: "Status updates and emergencies arrive as ad-hoc calls instead of structured notes.",
        },
        {
          title: "Family updates are inconsistent",
          body: "Parents lack a clear place to follow trip status when Transport is part of campus life.",
        },
      ],
    },
    modules: [
      moduleCard({
        id: "driver-home",
        name: "Driver home & trips",
        description: "Start and run assigned morning or afternoon trips from a dedicated driver home.",
        users: "Drivers",
        workflow: "Execute today’s trip without borrowing Admin or Connect.",
        image: "/assets/screenshots/transport/driver-home.jpg",
      }),
      moduleCard({
        id: "boarding",
        name: "Boarding",
        description: "Stop-ordered boarding marks and counts the office can review.",
        users: "Drivers · office review in Admin",
        workflow: "Replace paper pickup lists with clear boarding attendance.",
        image: "/assets/screenshots/transport/boarding.jpg",
      }),
      moduleCard({
        id: "fleet-admin",
        name: "Vehicles, drivers & routes",
        description: "Admin transport hub for vehicles, drivers, stops, routes, student assignment, publish, and trips.",
        users: "Transport in-charge",
        workflow: "Assign the fleet once; drivers run the day in Transport.",
      }),
      moduleCard({
        id: "emergency",
        name: "Emergency notes",
        description: "Drivers can raise an emergency note that reaches Admin and Connect. It is not SMS, a phone call, or a push gateway.",
        users: "Drivers · office · families (visibility)",
        workflow: "Record an on-road issue without inventing a dispatch network.",
        image: "/assets/screenshots/transport/emergency.jpg",
      }),
      moduleCard({
        id: "parent-status",
        name: "Parent trip status",
        description: "Connect shows bus, stop, timeline, and trip status when Transport is enabled — not a live telematics map product.",
        users: "Parents and students in Connect",
        workflow: "Follow the trip without calling the driver.",
        image: "/assets/screenshots/transport/parent-trip.jpg",
      }),
    ],
    workflows: [
      {
        title: "Assign",
        body: "Admin configures vehicles, drivers, stops, routes, and student transport assignments.",
        steps: ["Set up fleet records in Admin", "Publish routes and assignments", "Enable Transport for the institute"],
      },
      {
        title: "Run",
        body: "The driver starts the trip, marks boarding, and can raise an emergency note.",
        steps: ["Open today’s trip in Transport", "Mark boarding by stop", "Share emergency notes when needed"],
      },
      {
        title: "Follow",
        body: "Parents see trip status in Connect when Transport is on.",
        steps: ["Office reviews trips and boarding in Admin", "Families follow status in Connect", "Drivers keep a dedicated execution app"],
      },
    ],
    roles: [
      {
        title: "Drivers",
        outcome: "Execute today’s trip from a dedicated app.",
        points: ["Today’s stops and manifest", "Boarding marks the office can see", "Emergency note when something goes wrong"],
      },
      {
        title: "Transport in-charge",
        outcome: "Coordinate fleet work from Admin.",
        points: ["Vehicles, drivers, stops, and routes", "Trips and boarding review", "Emergency notes without a call tree"],
      },
      {
        title: "Parents",
        outcome: "See trip status without interrupting the road.",
        points: ["Trip status and boarding timeline in Connect", "SOS overlay when a note is raised", "Not positioned as live GPS map tracking"],
      },
    ],
    experiences: null,
    gallery: [
      shot("/assets/screenshots/transport/driver-home.jpg", "Driver home", "Start the shift when you are ready for the first stop.", "portrait"),
      shot("/assets/screenshots/transport/boarding.jpg", "Boarding", "Pickup attendance — clear boarded / not boarded actions.", "portrait"),
      shot("/assets/screenshots/transport/emergency.jpg", "Emergency", "SOS note to school Admin — not SMS dispatch.", "portrait"),
      shot("/assets/screenshots/transport/parent-trip.jpg", "Parent trip status", "Families follow trip status in Connect when Transport is on.", "portrait"),
    ],
    cta: {
      title: "Give drivers a dedicated workflow.",
      body: "Book a demo to see Admin assignment alongside the Transport driver app. Transport is enabled per institute after verification.",
    },
  },

  admissions: {
    id: "admissions",
    product: byId.admissions,
    headline: "Make the admissions journey more organized.",
    summary:
      "LumenX Admissions helps applicants discover programs, submit applications, and upload documents. The institute reviews intake in the admissions portal, then converts accepted applicants into student records in Admin.",
    delivery: "Standalone admissions web portal. Connect can link applicants here; there is no separate store APK required for the portal.",
    audience: "Applicants, parents, and institute admissions staff.",
    problem: {
      eyebrow: "The problem",
      title: "Applications arrive as inboxes and retyped registers.",
      body: "Program details, forms, documents, and decisions scatter across email and spreadsheets. Accepted applicants are retyped into the student directory — slowly and with errors.",
      points: [
        {
          title: "Discovery is unclear",
          body: "Families struggle to find programs and openings in one place.",
        },
        {
          title: "Documents get lost",
          body: "Files live in email threads instead of with the application.",
        },
        {
          title: "Accepted intake is retyped",
          body: "Moving an approved applicant into the student directory should not mean starting over.",
        },
      ],
    },
    modules: [
      moduleCard({
        id: "discover",
        name: "Programs & institute access",
        description: "Applicants browse institutes, programs, and openings before they apply.",
        users: "Applicants and parents",
        workflow: "Start the journey with clear program information.",
        image: "/assets/screenshots/admissions/institute-access.jpg",
      }),
      moduleCard({
        id: "apply",
        name: "Applications",
        description: "Submit and track applications. Institute staff review the same pipeline.",
        users: "Applicants · admissions office",
        workflow: "Keep application status on the file — not in a private inbox.",
        image: "/assets/screenshots/admissions/signin.jpg",
      }),
      moduleCard({
        id: "documents",
        name: "Document uploads",
        description: "Application documents stay with the file for review.",
        users: "Applicants · office",
        workflow: "Collect required documents without email attachments as the system of record.",
      }),
      moduleCard({
        id: "pipeline",
        name: "Review & status",
        description: "Office pipeline stages including waitlisted, with decisions on the same application.",
        users: "Admissions office",
        workflow: "Move files through review without a second waitlist product.",
      }),
      moduleCard({
        id: "convert",
        name: "Convert to student",
        description: "Admin converts accepted intake into a student record the rest of LumenX can use.",
        users: "Institute office",
        workflow: "Hand off to the directory — Admissions does not become a second SIS.",
      }),
    ],
    workflows: [
      {
        title: "Apply",
        body: "The applicant finds the institute and program, then submits through Admissions.",
        steps: ["Discover programs and openings", "Submit the application", "Upload required documents"],
      },
      {
        title: "Review",
        body: "The office reads documents and moves the file through review and decision.",
        steps: ["Review applications in the institute workspace", "Update status including waitlist when needed", "Record the decision on the same file"],
      },
      {
        title: "Join",
        body: "Admin writes the student. Connect credentials follow for the family.",
        steps: ["Convert accepted intake in Admin", "Issue Connect access", "Admissions remains the intake portal — not the parent app"],
      },
    ],
    roles: [
      {
        title: "Applicant / parent",
        outcome: "Submit an application that can become a student record.",
        points: ["Programs, apply, and documents", "Status without calling the front office", "Clear next step after conversion"],
      },
      {
        title: "Institute office",
        outcome: "Review intake, then convert — not retype.",
        points: ["Applications and openings in the portal", "Waitlist and decisions on the same file", "Convert to student in Admin"],
      },
    ],
    experiences: null,
    gallery: [
      shot("/assets/screenshots/admissions/signin.jpg", "Sign in", "Applicant or institute access to the Admissions portal.", "portrait"),
      shot("/assets/screenshots/admissions/institute-access.jpg", "Institute access", "Institute handoff and access paths into Admissions.", "portrait"),
    ],
    cta: {
      title: "Bring applications into the same institute family.",
      body: "Book a demo to see Admissions alongside Admin conversion. The module is enabled per institute after verification.",
    },
  },

  careers: {
    id: "careers",
    product: byId.careers,
    headline: "Connect opportunities with talent.",
    summary:
      "LumenX Careers is a recruitment and opportunity platform for institutes — jobs, applications, candidate profiles, and interview outcomes on the hiring file. Admin converts an approved hire into a teacher record. It is not payroll, attendance, or a full HRMS.",
    delivery: "Standalone Careers web app. Connect can link here; Android builds when published.",
    audience: "Candidates, recruiters, and the institute office.",
    problem: {
      eyebrow: "The problem",
      title: "Hiring often lives outside the institute record.",
      body: "Job posts, CVs, and interview notes scatter across channels. When someone is hired, the office retypes details into the staff directory and classroom systems.",
      points: [
        {
          title: "Side-channel applications",
          body: "Openings and CVs arrive in inboxes without a shared pipeline.",
        },
        {
          title: "Profiles leave the file",
          body: "Documents and history are hard to find when decisions need context.",
        },
        {
          title: "Hire hand-off is manual",
          body: "Approved candidates should become teacher records without starting from a blank form.",
        },
      ],
    },
    modules: [
      moduleCard({
        id: "jobs",
        name: "Jobs & opportunities",
        description: "Openings the institute publishes. Candidates browse, save, and apply.",
        users: "Candidates · recruiters",
        workflow: "List roles where applicants can find them.",
        image: "/assets/screenshots/careers/home.jpg",
      }),
      moduleCard({
        id: "applications",
        name: "Applications",
        description: "A pipeline recruiters and the office can review, including waitlist and approval stages.",
        users: "Recruiters · office",
        workflow: "Track candidates without a private spreadsheet.",
        image: "/assets/screenshots/careers/signin.jpg",
      }),
      moduleCard({
        id: "profiles",
        name: "Candidate profiles",
        description: "Profiles and documents that travel with the application.",
        users: "Candidates · recruiters",
        workflow: "Keep credentials and history with the hiring file.",
        image: "/assets/screenshots/careers/account-type.jpg",
      }),
      moduleCard({
        id: "interviews",
        name: "Interviews",
        description: "Interview outcomes on the application. This is not a campus-wide interview calendar product.",
        users: "Recruiters · candidates",
        workflow: "Record interview progress on the hiring file.",
      }),
      moduleCard({
        id: "recruiter",
        name: "Recruiter workspace",
        description: "Post and edit jobs, review applicants, and work a talent pool from the Careers app.",
        users: "Recruiters",
        workflow: "Run hiring here — not as an Admin leftover screen.",
      }),
      moduleCard({
        id: "convert-teacher",
        name: "Convert to teacher",
        description: "Admin turns an approved hire into a teacher record the rest of LumenX can use.",
        users: "Institute office",
        workflow: "Hand off to the staff directory after hiring decisions.",
      }),
    ],
    workflows: [
      {
        title: "Publish",
        body: "Recruiters post openings candidates can browse and save.",
        steps: ["Create the job in Careers", "Publish for applicants", "Collect applications on the role"],
      },
      {
        title: "Review",
        body: "Move candidates through application review and interview outcomes on the file.",
        steps: ["Review profiles and documents", "Update application status", "Record interview outcomes"],
      },
      {
        title: "Hire",
        body: "Admin converts an approved hire to a teacher record.",
        steps: ["Approve the hire in the pipeline", "Convert to teacher in Admin", "Classroom access continues in Admin and Connect — not Careers"],
      },
    ],
    roles: [
      {
        title: "Candidates",
        outcome: "Find roles and track applications in one portal.",
        points: ["Browse and apply to jobs", "Maintain profile and documents", "See interview-related updates on applications"],
      },
      {
        title: "Recruiters",
        outcome: "Run hiring without a side-channel inbox.",
        points: ["Post and manage jobs", "Review applicants and talent", "Keep decisions on the application file"],
      },
      {
        title: "Institute office",
        outcome: "Bring approved hires into the staff directory.",
        points: ["Pipeline visibility with Careers", "Convert to teacher in Admin", "Not a substitute for payroll or attendance"],
      },
    ],
    experiences: null,
    gallery: [
      shot("/assets/screenshots/careers/home.jpg", "Home", "Careers home for browsing opportunities.", "portrait"),
      shot("/assets/screenshots/careers/signin.jpg", "Sign in", "Access path into the Careers portal.", "portrait"),
      shot("/assets/screenshots/careers/account-type.jpg", "Account type", "Candidate and recruiter entry into Careers.", "portrait"),
    ],
    cta: {
      title: "Hire into the same institute family.",
      body: "Book a demo to see Careers with Admin conversion. Careers is enabled per institute after verification.",
    },
  },

  nexus: {
    id: "nexus",
    product: byId.nexus,
    headline: "Support the entire ecosystem.",
    summary:
      "LumenX Nexus is the platform operator console — institutes, registrations, licensing, modules, billing and renewals, support, and platform policies. It is not the school ERP. Day-to-day academics, fees, and attendance stay in Admin.",
    delivery: "Browser console for platform operators and groups.",
    audience: "Platform operators and group administrators — not classroom or parent users.",
    problem: {
      eyebrow: "The problem",
      title: "Running many institutes needs more than a school console.",
      body: "Operators need registration approval, module licensing, renewals, support, and cross-institute visibility. Putting that work inside Admin confuses school staff and platform staff.",
      points: [
        {
          title: "Licensing is separate work",
          body: "Enabling Transport, Admissions, or Careers is a platform decision — not a classroom task.",
        },
        {
          title: "Support needs a home",
          body: "Feedback, renewals, and platform health should not compete with attendance marking.",
        },
        {
          title: "School tools are the wrong shape",
          body: "Nexus must not pretend to be another place to run the campus day.",
        },
      ],
    },
    modules: [
      moduleCard({
        id: "institutes",
        name: "Institutes & registrations",
        description: "Institute directory plus registration approve/reject for new institute signup.",
        users: "Platform operators",
        workflow: "Onboard institutes without using Admin as a signup desk.",
      }),
      moduleCard({
        id: "modules-billing",
        name: "Modules, billing & renewals",
        description: "Enable modules per institute and manage billing and renewals at platform level.",
        users: "Platform operators",
        workflow: "License the ecosystem each campus is entitled to use.",
      }),
      moduleCard({
        id: "health",
        name: "Health, analytics & audit",
        description: "Cross-institute health and risks, analytics, audit log, storage quotas, and recycle bin.",
        users: "Platform operators",
        workflow: "Monitor platform posture without opening each school console.",
      }),
      moduleCard({
        id: "support",
        name: "Support & templates",
        description: "Support center, notification templates, and platform certificate template library.",
        users: "Platform operators",
        workflow: "Support institutes and maintain shared platform libraries.",
      }),
      moduleCard({
        id: "access-policies",
        name: "Access, policies & settings",
        description: "Platform users, platform access, policies and alerts, and platform settings.",
        users: "Platform operators",
        workflow: "Govern who operates Nexus and how platform rules apply.",
      }),
    ],
    workflows: [
      {
        title: "Register",
        body: "Review institute registrations and create platform access.",
        steps: ["Review signup requests", "Approve or reject registrations", "Manage platform users"],
      },
      {
        title: "License",
        body: "Enable modules and manage renewals for each institute.",
        steps: ["Toggle modules such as Transport, Admissions, and Careers", "Track billing and renewals", "Adjust storage quotas when needed"],
      },
      {
        title: "Support",
        body: "Help institutes from the platform layer — not from classroom screens.",
        steps: ["Use support and feedback tools", "Review health and audit signals", "Keep Admin as the school operational core"],
      },
    ],
    roles: [
      {
        title: "Platform operators",
        outcome: "License and support institutes from one operator console.",
        points: ["Registrations and institutes", "Modules and renewals", "Support, health, and audit"],
      },
      {
        title: "Group administrators",
        outcome: "Oversee multiple institutes without using Nexus as a school ERP.",
        points: ["Cross-institute visibility where provided", "Module entitlements", "Escalation to Admin for campus operations"],
      },
    ],
    experiences: null,
    gallery: [],
    screenshotPending: true,
    cta: {
      title: "Operate the platform around Admin.",
      body: "Book a demo to discuss operator workflows. Nexus supports licensing and platform service — campus academics stay in Admin.",
    },
  },
};

export function getProductPage(id) {
  return PRODUCT_PAGES[id] || null;
}

export function getAllProductPageIds() {
  return Object.keys(PRODUCT_PAGES);
}
