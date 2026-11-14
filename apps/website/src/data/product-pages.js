/**
 * Verified product landing content for LumenX.
 * Written in clear, simple, relatable language for school leaders, staff, teachers, and families.
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
    headline: "Run your entire school office from one clean dashboard.",
    summary:
      "LumenX Admin is the central workspace where your school office manages students, teachers, classes, attendance, fees, announcements, and certificates — all in one place, so nothing gets lost across spreadsheets or paper files.",
    delivery: "Available on the web, Android, and as a Windows desktop app for your school office.",
    audience: "Built for principals, school administrators, accountants, and front-office staff.",
    problem: {
      eyebrow: "Why schools switch",
      title: "Running a school shouldn't mean chasing files across ten different places.",
      body: "In most schools, student lists live in one spreadsheet, fee tracking in another, and daily notices in endless chat groups. Office staff spend hours retyping the same details, and parents have to call the front desk for simple answers.",
      points: [
        {
          title: "No more duplicate typing",
          body: "Stop re-entering student, parent, and teacher details into separate registers and sheets.",
        },
        {
          title: "One place for daily office work",
          body: "Check attendance, manage fees, send notices, and approve leave requests from a single screen.",
        },
        {
          title: "Everything stays connected",
          body: "When you update a class, fee, or bus route in Admin, teachers and parents see the right info automatically.",
        },
      ],
    },
    modules: [
      moduleCard({
        id: "people",
        category: "People",
        name: "Students, Teachers & Parents",
        description: "Keep complete profiles, photos, and parent-student links organized in one central school directory.",
        users: "School office team",
        workflow: "Add a student or teacher once and give them instant access to their app.",
        image: "/assets/screenshots/admin/people.jpg",
      }),
      moduleCard({
        id: "academics",
        category: "Academics",
        name: "Classes, Timetables & Exams",
        description: "Set up classes, sections, subjects, daily timetables, exam schedules, marks, and homework views.",
        users: "Academic coordinators & office",
        workflow: "Organize the school year clearly and monitor class progress effortlessly.",
        image: "/assets/screenshots/admin/classes.png",
      }),
      moduleCard({
        id: "attendance",
        category: "Attendance",
        name: "Student & Staff Attendance",
        description: "View and mark daily attendance for both students and staff with easy-to-read reports.",
        users: "Office & assigned staff",
        workflow: "See who is present or absent across the campus without collecting paper registers.",
        image: "/assets/screenshots/admin/command.png",
      }),
      moduleCard({
        id: "fees",
        category: "Fees",
        name: "Fees & Dues Tracking",
        description: "Create class fees, bus fees, and extra charges, publish them to families, and track pending dues per student.",
        users: "Accounts & fee desk",
        workflow: "Know exactly which fees are paid and what is due without manual tallying.",
        image: "/assets/screenshots/admin/fees.png",
      }),
      moduleCard({
        id: "communications",
        category: "Communications",
        name: "Announcements & Support",
        description: "Send school-wide or class-specific notices and alerts, and track parent or staff queries to resolution.",
        users: "Front office & leadership",
        workflow: "Reach parents and teachers reliably and make sure every question gets answered.",
        image: "/assets/screenshots/admin/feedback.png",
      }),
      moduleCard({
        id: "documents",
        category: "Certificates",
        name: "Documents & Certificates",
        description: "Manage document requests, ready-to-use templates, and issued certificates for students and staff.",
        users: "Front office",
        workflow: "Generate bonafide, transfer, and school certificates in minutes.",
      }),
      moduleCard({
        id: "leave",
        category: "Approvals",
        name: "Leave Requests & Approvals",
        description: "Review and approve leave requests from staff and students in one organized queue.",
        users: "Principal & office team",
        workflow: "Approve leaves quickly with a clear record of who approved what.",
      }),
      moduleCard({
        id: "transport-hub",
        category: "Transport",
        name: "School Bus Management",
        description: "Manage buses, drivers, stops, routes, and student bus assignments, plus review daily trip logs.",
        users: "Transport coordinator",
        workflow: "Plan routes in the office while drivers run daily trips in the Transport app.",
      }),
      moduleCard({
        id: "pipelines",
        category: "Admissions & Hiring",
        name: "Admissions & Staff Onboarding",
        description: "Convert accepted student applicants and approved teacher hires into active school records in one click.",
        users: "Admissions & HR office",
        workflow: "Enroll new students and staff without typing their forms all over again.",
      }),
      moduleCard({
        id: "analytics",
        category: "Insights",
        name: "School Reports & Analytics",
        description: "Visual dashboards and downloadable reports covering attendance, fees, classes, and staff overview.",
        users: "Principals & management",
        workflow: "Get a clear snapshot of how your school is doing every day.",
        image: "/assets/screenshots/admin/analytics.png",
      }),
      moduleCard({
        id: "access",
        category: "Settings",
        name: "Staff Roles & School Settings",
        description: "Control which office staff can view or edit each section, manage active modules, and update school details.",
        users: "School administrators",
        workflow: "Give your accountant, receptionist, and coordinators the exact access they need.",
        image: "/assets/screenshots/admin/modules.png",
      }),
    ],
    workflows: [
      {
        title: "Set up your school",
        body: "Put your core school records in place once.",
        steps: [
          "Add students, teachers, parents, and staff",
          "Create classes, sections, subjects, and timetables",
          "Set up class and transport fee structures",
          "Assign bus routes and stops if your school runs transport",
        ],
      },
      {
        title: "Manage the school day",
        body: "Handle everyday office work from a single dashboard.",
        steps: [
          "Check daily student and staff attendance",
          "Send announcements and respond to parent queries",
          "Track fee collections and pending dues",
          "Issue student certificates and approve leave requests",
        ],
      },
      {
        title: "Keep everyone connected",
        body: "Updates in Admin automatically reach the right people.",
        steps: [
          "Teachers and parents see updates in LumenX Connect",
          "Bus drivers get their route and stop list in LumenX Transport",
          "Approved admission forms become student profiles in one click",
          "Selected job candidates become teacher profiles without retyping",
        ],
      },
    ],
    roles: [
      {
        title: "Principals & School Heads",
        outcome: "See how your entire campus is running at a glance.",
        points: ["Daily attendance and campus overview", "Academic and class summaries", "Fee collection and pending dues", "Custom staff permissions"],
      },
      {
        title: "Accountants & Fee Desk",
        outcome: "Keep fee structures and student dues crystal clear.",
        points: ["Class, bus, and extra fee setup", "Publish dues straight to parents", "Per-student payment and due history", "Easy-to-export fee reports"],
      },
      {
        title: "Front Office Staff",
        outcome: "Help parents and students faster without paperwork.",
        points: ["One-click student enrollment from Admissions", "Quick certificate generation", "School announcements and notices", "Organized parent helpdesk"],
      },
    ],
    experiences: null,
    gallery: [
      shot("/assets/screenshots/admin/command.png", "Daily Dashboard", "See today's attendance, quick actions, and school activity in one view.", "landscape"),
      shot("/assets/screenshots/admin/analytics.png", "Analytics & Reports", "Clear visual charts and totals for school leadership.", "landscape"),
      shot("/assets/screenshots/admin/classes.png", "Classes & Sections", "View class capacity, sections, and assigned class teachers.", "landscape"),
      shot("/assets/screenshots/admin/people.jpg", "People Directory", "Search and manage teachers, staff, students, and parents.", "landscape"),
      shot("/assets/screenshots/admin/fees.png", "Fees & Dues", "Set up fee plans and track student dues effortlessly.", "landscape"),
      shot("/assets/screenshots/admin/modules.png", "Active Modules", "Turn school modules on or off as your campus grows.", "landscape"),
      shot("/assets/screenshots/admin/feedback.png", "Support & Feedback", "Reach support and share feedback right from the console.", "landscape"),
    ],
    cta: {
      title: "Ready to simplify your school office?",
      body: "Book a friendly walkthrough to see how LumenX Admin fits your school's daily routine — then try it free for 60 days.",
    },
  },

  connect: {
    id: "connect",
    product: byId.connect,
    headline: "One simple app for teachers, parents, and students.",
    summary:
      "LumenX Connect brings the classroom and home together. Teachers mark attendance and post homework from their phone, parents follow their children's daily progress, and students check their own timetable, assignments, and results.",
    delivery: "Easy-to-use mobile app for teachers, parents, and students on Android.",
    audience: "Teachers, parents, and students using login details provided by their school.",
    problem: {
      eyebrow: "Why families & teachers love it",
      title: "Important school updates shouldn't get buried in noisy chat groups.",
      body: "When homework, notices, and attendance updates are sent over personal messaging apps, messages get lost, phone numbers are exposed, and parents with more than one child have to juggle multiple groups.",
      points: [
        {
          title: "Tailored for each person",
          body: "Teachers get classroom tools, parents see their children's updates, and students see their own schedule and work.",
        },
        {
          title: "Instant, organized updates",
          body: "Attendance, homework, exam schedules, and school notices appear neatly in the right place.",
        },
        {
          title: "Private and safe",
          body: "Everyone sees only their own classes, children, or records — never other families' personal details.",
        },
      ],
    },
    modules: [
      moduleCard({
        id: "attendance",
        name: "Daily Attendance",
        description: "Teachers mark class attendance in seconds, and parents and students can check attendance history anytime.",
        users: "Teachers, parents & students",
        workflow: "Replace paper attendance registers with quick mobile marking.",
        image: "/assets/screenshots/connect/attendance.jpg",
      }),
      moduleCard({
        id: "homework",
        name: "Homework & Class Diary",
        description: "Teachers post daily homework and notes for their class so students and parents always know what's due.",
        users: "Teachers, parents & students",
        workflow: "Share assignments clearly without forwarding photos in chat groups.",
        image: "/assets/screenshots/connect/homework.jpg",
      }),
      moduleCard({
        id: "timetable",
        name: "Class Timetable",
        description: "A clean daily schedule showing periods, subjects, and teachers for the day.",
        users: "Teachers, parents & students",
        workflow: "Always know which class or subject is next.",
        image: "/assets/screenshots/connect/timetable.jpg",
      }),
      moduleCard({
        id: "results",
        name: "Exams & Marks",
        description: "View upcoming exam dates and check published subject marks and report cards right on the phone.",
        users: "Teachers, parents & students",
        workflow: "Keep track of exam schedules and academic progress effortlessly.",
        image: "/assets/screenshots/connect/marks.jpg",
      }),
      moduleCard({
        id: "fees",
        name: "Fee Dues & History",
        description: "Parents and students can view fee breakdowns, due dates, and past fee records anytime.",
        users: "Parents & students",
        workflow: "Check fee details from home without calling or visiting the school office.",
      }),
      moduleCard({
        id: "comms",
        name: "School Notices & Alerts",
        description: "Receive official school announcements, holiday notices, and reminders directly in the app.",
        users: "Teachers, parents & students",
        workflow: "Make sure every family gets important school news on time.",
        image: "/assets/screenshots/connect/notify.jpg",
      }),
      moduleCard({
        id: "transport-status",
        name: "Bus Trip Status",
        description: "When the school uses LumenX Transport, parents can see when the bus trip starts and when their child boards.",
        users: "Parents & students",
        workflow: "Follow your child's morning and afternoon bus trip with peace of mind.",
        image: "/assets/screenshots/connect/transport.jpg",
      }),
    ],
    workflows: [
      {
        title: "School shares login details",
        body: "Your school office sets up accounts and shares login credentials.",
        steps: ["School adds teachers, parents, and students in Admin", "Login details are shared with families and staff", "Sign in easily on the Connect app"],
      },
      {
        title: "Personalized home screen",
        body: "The app automatically adapts to who is signed in.",
        steps: ["Parents can switch between all their children in one login", "Teachers mark attendance, post homework, and enter marks", "Students check their timetable, homework, and exam scores"],
      },
      {
        title: "Always in sync with the office",
        body: "Everything connects smoothly with LumenX Admin.",
        steps: ["Class lists, timetables, and fees stay updated from the office", "Bus boarding status appears live when Transport is enabled", "Zero duplicate work for teachers or administrators"],
      },
    ],
    roles: [
      {
        title: "Teachers",
        outcome: "Spend less time on paperwork and more time teaching.",
        points: ["Mark class attendance in under a minute", "Post homework and class diary updates from your phone", "Enter exam marks and view your daily teaching schedule"],
      },
      {
        title: "Parents",
        outcome: "Stay involved in your child's school life effortlessly.",
        points: ["Switch between multiple children with one tap", "See daily attendance, homework, exam marks, and fees", "Check school bus trip and boarding status"],
      },
      {
        title: "Students",
        outcome: "Keep all your classes, assignments, and results in one place.",
        points: ["Daily period timetable and subject list", "Homework reminders and exam schedules", "Personal attendance and subject marks"],
      },
    ],
    experiences: [
      {
        id: "teachers",
        title: "For Teachers",
        headline: "Manage your classroom right from your phone.",
        body: "Teachers see their assigned classes, mark daily attendance, post homework and diary notes, enter exam marks, and read school announcements — all in a clean, distraction-free workspace.",
        points: [
          "Quick daily attendance marking for assigned classes",
          "Share homework and daily diary notes with students and parents",
          "Enter student marks and check upcoming exam schedules",
          "Dedicated activity workspace for sports and club coordinators",
        ],
        image: "/assets/screenshots/connect/teacher-home.jpg",
        imageAlt: "LumenX Connect teacher home",
      },
      {
        id: "parents",
        title: "For Parents",
        headline: "Every update for all your children, in one account.",
        body: "Parents can easily switch between their children and check today's attendance, homework, exam marks, fee dues, school announcements, and bus boarding updates without calling the school desk.",
        points: [
          "One login for all your children studying at the school",
          "Real-time attendance, homework, marks, and fee visibility",
          "Submit student leave requests directly to the school",
          "Follow morning and afternoon school bus boarding status",
        ],
        image: "/assets/screenshots/connect/home.jpg",
        imageAlt: "LumenX Connect parent home",
      },
      {
        id: "students",
        title: "For Students",
        headline: "Know your schedule, homework, and exam results.",
        body: "Students get their own simple portal showing today's periods, pending assignments, exam timetables, marks, and school notices — helping them stay organized every day.",
        points: [
          "Daily class timetable and attendance record",
          "Clear list of homework assignments and exam dates",
          "Subject marks, report cards, and student ID details",
          "Private view showing only the student's own information",
        ],
        image: "/assets/screenshots/connect/timetable.jpg",
        imageAlt: "LumenX Connect timetable",
      },
    ],
    gallery: [
      shot("/assets/screenshots/connect/home.jpg", "Parent Home", "Parents can switch between children and see daily updates at a glance.", "portrait"),
      shot("/assets/screenshots/connect/teacher-home.jpg", "Teacher Home", "Teachers see today's classes, attendance tasks, and quick actions.", "portrait"),
      shot("/assets/screenshots/connect/attendance.jpg", "Attendance", "Simple attendance marking for teachers and clear history for families.", "portrait"),
      shot("/assets/screenshots/connect/homework.jpg", "Homework", "Daily class assignments and notes organized by subject.", "portrait"),
      shot("/assets/screenshots/connect/timetable.jpg", "Timetable", "Clear daily period schedule with subjects and teachers.", "portrait"),
      shot("/assets/screenshots/connect/exams.jpg", "Exams", "Upcoming exam dates and syllabus details.", "portrait"),
      shot("/assets/screenshots/connect/marks.jpg", "Marks & Results", "Subject-wise marks and performance summaries.", "portrait"),
      shot("/assets/screenshots/connect/notify.jpg", "Notifications", "Instant school announcements and alerts right in the app.", "portrait"),
      shot("/assets/screenshots/connect/transport.jpg", "Bus Trip Status", "Parents can see trip progress and stop boarding updates.", "portrait"),
    ],
    cta: {
      title: "Bring teachers, parents, and students closer together.",
      body: "Book a live demo to see the teacher, parent, and student screens in action.",
    },
  },

  transport: {
    id: "transport",
    product: byId.transport,
    headline: "Make every school bus trip safer and easier to manage.",
    summary:
      "LumenX Transport gives bus drivers a simple app to start trips, check off students at each stop, and alert the school if there's an delay or emergency — while the office and parents stay updated automatically.",
    delivery: "Simple Android app for bus drivers, connected to LumenX Admin and Connect.",
    audience: "Bus drivers, transport coordinators, and parents following their child's bus trip.",
    problem: {
      eyebrow: "Why school transport needs this",
      title: "Paper bus lists and phone calls while driving don't mix.",
      body: "Drivers need a clear list of stops and students without fumbling with paper sheets. The school office needs to know buses are running smoothly, and parents just want to know their child boarded safely.",
      points: [
        {
          title: "No messy paper sheets",
          body: "Drivers always have the latest stop list and student pickup roster right on their phone.",
        },
        {
          title: "Fewer phone calls on the road",
          body: "Parents and office staff see trip progress automatically instead of calling the driver.",
        },
        {
          title: "Quick emergency alerts",
          body: "If a bus has a breakdown or delay, the driver can alert the school and parents in seconds.",
        },
      ],
    },
    modules: [
      moduleCard({
        id: "driver-home",
        name: "One-Tap Trip Start",
        description: "Drivers see their assigned morning or afternoon route and start the trip with a single tap.",
        users: "Bus drivers",
        workflow: "Simple, large buttons designed specifically for drivers on shift.",
        image: "/assets/screenshots/transport/driver-home.jpg",
      }),
      moduleCard({
        id: "boarding",
        name: "Student Boarding Checklist",
        description: "Stops appear in order so drivers or attendants can quickly mark each student as boarded or absent.",
        users: "Drivers & transport desk",
        workflow: "Know exactly which students got on the bus at every stop.",
        image: "/assets/screenshots/transport/boarding.jpg",
      }),
      moduleCard({
        id: "fleet-admin",
        name: "Buses, Routes & Stops Setup",
        description: "The school office sets up vehicles, drivers, stops, routes, and student bus assignments inside Admin.",
        users: "Transport coordinator",
        workflow: "Update a route once in the office and the driver's app updates automatically.",
      }),
      moduleCard({
        id: "emergency",
        name: "Instant Emergency / Delay Note",
        description: "Drivers can send an urgent SOS or breakdown note that immediately notifies the school office and parents in Connect.",
        users: "Drivers, office & parents",
        workflow: "Keep everyone informed during traffic delays or vehicle issues without making dozens of calls.",
        image: "/assets/screenshots/transport/emergency.jpg",
      }),
      moduleCard({
        id: "parent-status",
        name: "Parent Bus Updates",
        description: "Parents open LumenX Connect to see whether the trip has started, stop progress, and their child's boarding status.",
        users: "Parents & students",
        workflow: "Give families peace of mind every morning and afternoon.",
        image: "/assets/screenshots/transport/parent-trip.jpg",
      }),
    ],
    workflows: [
      {
        title: "Plan routes in the office",
        body: "Your transport coordinator sets up buses, stops, and student lists in Admin.",
        steps: ["Add buses, drivers, and route stops in Admin", "Assign students to their pickup and drop stops", "Publish routes so drivers are ready to roll"],
      },
      {
        title: "Run the trip on the road",
        body: "Drivers use the Transport app for each morning and afternoon shift.",
        steps: ["Open today's assigned trip", "Mark students as boarded at each stop", "Send a quick emergency or delay note if needed"],
      },
      {
        title: "Keep parents & office informed",
        body: "Everyone sees what they need without interrupting the driver.",
        steps: ["Office monitors active trips and boarding counts in Admin", "Parents check their child's boarding timeline in Connect", "Complete trip history stays saved for the school"],
      },
    ],
    roles: [
      {
        title: "Bus Drivers",
        outcome: "A clear, stress-free app built for the road.",
        points: ["Stops and students listed in exact route order", "One-tap student boarding check-ins", "Quick SOS / delay alert to the school office"],
      },
      {
        title: "Transport Coordinator",
        outcome: "Full visibility over every bus, route, and trip.",
        points: ["Manage buses, drivers, stops, and routes in Admin", "Review daily boarding logs and trip completion", "Receive instant alerts if a driver reports an issue"],
      },
      {
        title: "Parents",
        outcome: "Know your child's bus trip and boarding status.",
        points: ["See trip status and stop timeline inside Connect", "Get notified if the driver posts an emergency/delay note", "No need to call the driver or school office every morning"],
      },
    ],
    experiences: null,
    gallery: [
      shot("/assets/screenshots/transport/driver-home.jpg", "Driver Home", "Clean shift screen to start the morning or afternoon bus trip.", "portrait"),
      shot("/assets/screenshots/transport/boarding.jpg", "Boarding Checklist", "Mark students as boarded or absent stop by stop.", "portrait"),
      shot("/assets/screenshots/transport/emergency.jpg", "Emergency Alert", "Send an urgent note to the school office and families if something happens on route.", "portrait"),
      shot("/assets/screenshots/transport/parent-trip.jpg", "Parent View in Connect", "Parents follow trip progress and boarding status right in Connect.", "portrait"),
    ],
    cta: {
      title: "Make school bus operations effortless.",
      body: "Book a demo to see how Admin route planning, the Driver app, and Parent updates work together.",
    },
  },

  admissions: {
    id: "admissions",
    product: byId.admissions,
    headline: "A welcoming, paper-free admissions experience for new families.",
    summary:
      "LumenX Admissions lets parents explore your school's programs, submit applications online, and upload required documents — while your office reviews everything in one place and enrolls accepted students with a single click.",
    delivery: "Available as a web portal and Android app for applicants and admissions staff.",
    audience: "Applying families, prospective students, and your school admissions team.",
    problem: {
      eyebrow: "Why admissions gets messy",
      title: "Paper forms and email attachments slow down your admissions season.",
      body: "When families apply through paper forms, emails, and spreadsheets, documents go missing, parents keep calling for status updates, and office staff have to retype every accepted student's details into the school register.",
      points: [
        {
          title: "Easy for parents to apply",
          body: "Families can view available classes and programs and apply from their phone or computer.",
        },
        {
          title: "Documents stay with the form",
          body: "Birth certificates, photos, and past report cards stay attached to the student's application.",
        },
        {
          title: "Zero retyping after approval",
          body: "Accepted applicants convert directly into student records in LumenX Admin.",
        },
      ],
    },
    modules: [
      moduleCard({
        id: "discover",
        name: "School & Program Discovery",
        description: "Families can browse your school's programs, classes, and open seats before starting their application.",
        users: "Parents & applicants",
        workflow: "Give prospective families clear information from day one.",
        image: "/assets/screenshots/admissions/institute-access.jpg",
      }),
      moduleCard({
        id: "apply",
        name: "Online Application & Tracking",
        description: "Parents fill out the application online and check their status anytime without calling the front desk.",
        users: "Parents & admissions office",
        workflow: "Keep every application organized in one shared dashboard.",
        image: "/assets/screenshots/admissions/signin.jpg",
      }),
      moduleCard({
        id: "documents",
        name: "Simple Document Uploads",
        description: "Applicants upload required documents directly onto their application file for easy office verification.",
        users: "Applicants & admissions team",
        workflow: "No more hunting through email threads for missing attachments.",
      }),
      moduleCard({
        id: "pipeline",
        name: "Application Review & Waitlist",
        description: "Your admissions team can review forms, shortlist, waitlist, or approve applicants step by step.",
        users: "Admissions office",
        workflow: "Move applications smoothly from submission to final decision.",
      }),
      moduleCard({
        id: "convert",
        name: "One-Click Student Enrollment",
        description: "Once an applicant is accepted, convert their application into an official student profile in LumenX Admin.",
        users: "School office",
        workflow: "Save hours of manual data entry during peak admission months.",
      }),
    ],
    workflows: [
      {
        title: "Families apply online",
        body: "Parents explore your programs and submit their child's application from home.",
        steps: ["Browse open programs and classes", "Fill in student and parent details", "Upload required documents and submit"],
      },
      {
        title: "Office reviews & decides",
        body: "Your admissions team reviews applications and documents in one tidy list.",
        steps: ["Check submitted details and uploaded documents", "Update status (under review, waitlisted, or approved)", "Families see status updates automatically"],
      },
      {
        title: "Welcome to the school",
        body: "Approved applicants become enrolled students in LumenX Admin.",
        steps: ["Convert accepted applications to students in Admin", "Share LumenX Connect login details with the family", "Ready for classes, attendance, and fees from day one"],
      },
    ],
    roles: [
      {
        title: "Parents & Applicants",
        outcome: "Apply easily from home and always know where your application stands.",
        points: ["Clear program and class information", "Simple online form and document upload", "Live application status updates"],
      },
      {
        title: "Admissions Office",
        outcome: "Handle hundreds of applications without drowning in paperwork.",
        points: ["All applications and documents in one place", "Clear review, waitlist, and approval stages", "Instant conversion into LumenX Admin student records"],
      },
    ],
    experiences: null,
    gallery: [
      shot("/assets/screenshots/admissions/signin.jpg", "Applicant Sign-In", "Simple sign-in for families and admissions staff.", "portrait"),
      shot("/assets/screenshots/admissions/institute-access.jpg", "Explore & Apply", "Families can find your institution and start their application easily.", "portrait"),
    ],
    cta: {
      title: "Make your next admissions season smooth and paper-free.",
      body: "Book a demo to see how online applications flow straight into your school directory.",
    },
  },

  careers: {
    id: "careers",
    product: byId.careers,
    headline: "Hire great teachers and school staff without the inbox chaos.",
    summary:
      "LumenX Careers gives your school a dedicated hiring portal to post open positions, collect resumes, and track interviews — then turn hired candidates into teacher profiles in LumenX Admin in one click.",
    delivery: "Available on the web and Android for job candidates and school hiring teams.",
    audience: "Teachers and staff looking for roles, school recruiters, and principals.",
    problem: {
      eyebrow: "Why school hiring feels scattered",
      title: "Resumes buried in emails make it hard to hire the best teachers.",
      body: "When job applications arrive across emails, WhatsApp messages, and paper CVs, great candidates get overlooked, interview feedback gets lost, and the office has to retype everything once someone is hired.",
      points: [
        {
          title: "One clear place for job openings",
          body: "Publish teaching and staff vacancies where candidates can easily browse and apply.",
        },
        {
          title: "Resumes & notes stay together",
          body: "Every candidate's profile, CV, and interview status stays attached to their application.",
        },
        {
          title: "Instant staff onboarding",
          body: "When you hire a candidate, add them straight into your LumenX Admin teacher directory.",
        },
      ],
    },
    modules: [
      moduleCard({
        id: "jobs",
        name: "Job Postings",
        description: "Publish open teaching and non-teaching roles so candidates can discover, save, and apply online.",
        users: "Candidates & school recruiters",
        workflow: "Attract qualified educators with a clean, professional job board.",
        image: "/assets/screenshots/careers/home.jpg",
      }),
      moduleCard({
        id: "applications",
        name: "Application Tracking",
        description: "Review all applicants for each role and move them through shortlist, waitlist, or approval stages.",
        users: "Hiring team & school office",
        workflow: "See every applicant's status clearly without maintaining spreadsheets.",
        image: "/assets/screenshots/careers/signin.jpg",
      }),
      moduleCard({
        id: "profiles",
        name: "Candidate Profiles & Resumes",
        description: "Candidates maintain their qualifications, experience, and documents in one reusable profile.",
        users: "Candidates & hiring team",
        workflow: "Review complete educator credentials in a consistent format.",
        image: "/assets/screenshots/careers/account-type.jpg",
      }),
      moduleCard({
        id: "interviews",
        name: "Interview Progress",
        description: "Record interview stages and outcomes right on the candidate's application file.",
        users: "Recruiters & candidates",
        workflow: "Keep your principal and hiring panel aligned on every candidate.",
      }),
      moduleCard({
        id: "recruiter",
        name: "Recruiter Workspace",
        description: "A dedicated workspace for your hiring team to post jobs, review applicants, and browse talent.",
        users: "School recruiters & HR",
        workflow: "Manage all school recruitment in one focused portal.",
      }),
      moduleCard({
        id: "convert-teacher",
        name: "One-Click Teacher Onboarding",
        description: "Turn an approved candidate into an active teacher record in LumenX Admin without retyping.",
        users: "School office",
        workflow: "Get new teachers ready for classes and Connect access right away.",
      }),
    ],
    workflows: [
      {
        title: "Post open roles",
        body: "List your school's teaching and staff vacancies online.",
        steps: ["Create the job opening in Careers", "Publish requirements and role details", "Receive organized applications online"],
      },
      {
        title: "Review & interview",
        body: "Shortlist candidates and track interview outcomes in one place.",
        steps: ["Review candidate profiles and resumes", "Update application status as interviews progress", "Select and approve the right candidate"],
      },
      {
        title: "Welcome to the team",
        body: "Add your new hire straight into LumenX Admin.",
        steps: ["Approve the candidate in the hiring pipeline", "Convert them to a teacher profile in Admin", "Assign classes and issue their Connect login"],
      },
    ],
    roles: [
      {
        title: "Educators & Candidates",
        outcome: "Apply to school roles easily and track your application status.",
        points: ["Browse and save teaching and staff openings", "Build your profile and upload your resume once", "See clear updates on your application and interviews"],
      },
      {
        title: "Principals & Hiring Teams",
        outcome: "Find and shortlist the right teachers without sorting through email clutter.",
        points: ["Publish and manage job openings easily", "Review candidate profiles and CVs side by side", "Track interview decisions on every application"],
      },
      {
        title: "School Office",
        outcome: "Onboard newly hired teachers in seconds.",
        points: ["See approved hires directly in Admin", "Convert candidates into staff records with one click", "No manual re-entry of personal details"],
      },
    ],
    experiences: null,
    gallery: [
      shot("/assets/screenshots/careers/home.jpg", "Careers Home", "Browse open teaching and school staff opportunities.", "portrait"),
      shot("/assets/screenshots/careers/signin.jpg", "Simple Sign-In", "Quick access for job seekers and school hiring teams.", "portrait"),
      shot("/assets/screenshots/careers/account-type.jpg", "Candidate & Recruiter Views", "Tailored experience whether you are applying or hiring.", "portrait"),
    ],
    cta: {
      title: "Make hiring great teachers simpler.",
      body: "Book a demo to see how LumenX Careers connects your hiring process directly with your school office.",
    },
  },

  nexus: {
    id: "nexus",
    product: byId.nexus,
    headline: "Manage school onboarding, active modules, and platform support.",
    summary:
      "LumenX Nexus is the control center for platform operators and multi-school groups — handling new school approvals, module activation, subscription renewals, templates, and campus support.",
    delivery: "Available on Android and Windows for authorized platform operators.",
    audience: "Platform operators and multi-institution group administrators.",
    problem: {
      eyebrow: "Built for platform & group management",
      title: "Managing multiple institutions requires its own dedicated control center.",
      body: "Approving new campuses, turning modules like Transport or Admissions on and off, tracking renewals, and supporting schools shouldn't be mixed into a single school's daily attendance dashboard.",
      points: [
        {
          title: "Simple module activation",
          body: "Enable or disable Transport, Admissions, or Careers for any campus as their needs grow.",
        },
        {
          title: "Dedicated support & renewals",
          body: "Handle school support tickets, subscription renewals, and shared certificate templates in one place.",
        },
        {
          title: "Clean separation from daily school work",
          body: "School staff get a focused Admin dashboard, while operators manage licensing and platform health in Nexus.",
        },
      ],
    },
    modules: [
      moduleCard({
        id: "institutes",
        name: "Campus Onboarding & Directory",
        description: "Review new institution sign-ups, verify details, and approve campuses to start their trial.",
        users: "Platform operators",
        workflow: "Onboard new schools smoothly with a clear verification process.",
      }),
      moduleCard({
        id: "modules-billing",
        name: "Modules, Subscriptions & Renewals",
        description: "Turn modules on or off for each institution and manage subscription plans and renewals.",
        users: "Platform operators",
        workflow: "Give every school the exact apps and modules they need.",
      }),
      moduleCard({
        id: "health",
        name: "Platform Health & Audit Logs",
        description: "Monitor system health, storage usage, audit logs, and cross-institution analytics.",
        users: "Platform operators",
        workflow: "Keep the entire LumenX ecosystem running reliably and securely.",
      }),
      moduleCard({
        id: "support",
        name: "Support Center & Shared Templates",
        description: "Respond to school support requests and maintain ready-to-use notification and certificate templates.",
        users: "Platform operators",
        workflow: "Help schools quickly and provide helpful templates out of the box.",
      }),
      moduleCard({
        id: "access-policies",
        name: "Operator Access & Platform Settings",
        description: "Manage operator permissions, security policies, alerts, and global platform settings.",
        users: "Platform administrators",
        workflow: "Control who manages the platform and keep governance clear.",
      }),
    ],
    workflows: [
      {
        title: "Verify & onboard schools",
        body: "Review new school requests and get their campus workspace ready.",
        steps: ["Review new institution requests", "Approve verified campuses for their 60-day trial", "Set up initial administrator access"],
      },
      {
        title: "Manage modules & plans",
        body: "Activate the right apps and manage renewals for each school.",
        steps: ["Enable Transport, Admissions, or Careers when requested", "Track subscription plans and renewal dates", "Manage storage and campus entitlements"],
      },
      {
        title: "Support every campus",
        body: "Help school teams succeed while keeping their daily workspace clean.",
        steps: ["Answer support and feedback tickets from schools", "Monitor platform health and security logs", "Publish shared certificate and notice templates"],
      },
    ],
    roles: [
      {
        title: "Platform Operators",
        outcome: "Onboard, license, and support every school from one console.",
        points: ["New school verification and onboarding", "Module activation and subscription renewals", "Support desk, health monitoring, and audit logs"],
      },
      {
        title: "School Group Leaders",
        outcome: "Oversee licensing and status across your institutions.",
        points: ["High-level visibility across campuses", "Clear module and subscription management", "Dedicated daily operations stay neatly inside each school's Admin"],
      },
    ],
    experiences: null,
    gallery: [],
    screenshotPending: true,
    cta: {
      title: "Managing a school group or platform?",
      body: "Talk with our team to see how LumenX Nexus supports multi-campus licensing and operations.",
    },
  },
};

export function getProductPage(id) {
  return PRODUCT_PAGES[id] || null;
}

export function getAllProductPageIds() {
  return Object.keys(PRODUCT_PAGES);
}
