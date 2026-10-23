import type { ModuleHelpContent, ModuleHelpRegistry } from "./types";

const _registry: Record<string, ModuleHelpContent> = {
  students: {
    id: "students",
    title: "Students",
    whatIs:
      "The Students module is the central directory of all enrolled learners in your institute. It stores each student's profile, contact details, academic history, and enrolment status.",
    whatYouCanDo: [
      "View and search all student records",
      "Add new students individually or via bulk import",
      "Edit student profile fields (name, DOB, contact, address)",
      "Manage enrolment status (active, transferred, withdrawn)",
      "Upload or update profile photos",
      "Export the student list to CSV or Excel",
    ],
    howToUse: [
      "Open Students from the left navigation.",
      "Use the search bar or class/section filter to find a student.",
      "Click a student row to open their detail view.",
      "Tap 'Edit' to update profile fields; tap 'Save' to confirm.",
      "To add a new student, click the '+ Add Student' button and fill the form.",
      "For bulk imports, use the import action and upload a CSV template.",
      "Use the export button to download the filtered list.",
    ],
  },
  teachers: {
    id: "teachers",
    title: "Teachers",
    whatIs:
      "The Teachers module manages all teaching staff records — profiles, subjects assigned, and class associations. It serves as the staff directory for academic coordination.",
    whatYouCanDo: [
      "View and search all teacher profiles",
      "Add teachers individually or via bulk import",
      "Edit teacher profile details (name, email, phone, designation)",
      "Assign subjects and class sections to a teacher",
      "Track which classes each teacher covers",
      "Export the teacher list",
    ],
    howToUse: [
      "Open Teachers from the left navigation.",
      "Use the search bar to locate a teacher by name or subject.",
      "Click a teacher row to open their profile.",
      "Tap 'Edit' to modify details, then 'Save'.",
      "To add a teacher, click '+ Add Teacher' and fill in name, email, and subject fields.",
      "Assign subjects from the teacher detail view.",
      "Use the bulk import to upload multiple teachers via CSV.",
    ],
  },
  photos: {
    id: "photos",
    title: "Photos",
    whatIs:
      "The Photos module provides a centralised interface for managing profile photos for students and staff. Photos uploaded here appear across Connect and Transport apps.",
    whatYouCanDo: [
      "Browse profile photos for all students and staff",
      "Upload or replace individual profile photos",
      "Review photos pending approval",
      "Remove inappropriate or outdated photos",
      "Filter by class or staff type",
    ],
    howToUse: [
      "Open Photos from the navigation.",
      "Select the person type (Student or Staff) using the tabs.",
      "Use class/section filters to narrow the list.",
      "Click a photo card to open upload or replace options.",
      "Drag-and-drop or browse to upload a new image file.",
      "Click 'Remove' to delete an existing photo.",
    ],
  },
  parents: {
    id: "parents",
    title: "Parents / Guardians",
    whatIs:
      "The Parents module lists all guardian accounts linked to students. It shows guardian contact details, linked children, and Connect app account status.",
    whatYouCanDo: [
      "View all guardian records linked to students",
      "Search guardians by name, email, or phone",
      "View which students a guardian is linked to",
      "Check Connect app registration status per guardian",
      "Export the guardian directory",
    ],
    howToUse: [
      "Open Parents from the navigation.",
      "Search or scroll to find a guardian.",
      "Click a row to see their linked students and contact details.",
      "Review the Connect status badge to see if they have the app.",
      "Use the export action to download the list.",
    ],
  },
  accounts: {
    id: "accounts",
    title: "Accounts",
    whatIs:
      "The Accounts module manages Admin app staff accounts — the admin users who log in to LumenX Admin. It covers account creation, role assignment, and membership to the institute.",
    whatYouCanDo: [
      "View all staff Admin accounts for the institute",
      "Invite new staff members to Admin",
      "Assign or change account roles",
      "Deactivate accounts for staff who have left",
      "Resend invitation emails",
    ],
    howToUse: [
      "Open Accounts from the navigation.",
      "Click '+ Invite' to send an invitation to a new staff email.",
      "Select the appropriate role from the role dropdown before sending.",
      "Find an existing account and click it to view or change their role.",
      "To deactivate an account, open the account row and choose 'Deactivate'.",
      "Roles and permissions are managed under Settings → Roles & Access.",
    ],
  },
  classes: {
    id: "classes",
    title: "Classes",
    whatIs:
      "The Classes module defines the class-section structure of your institute — for example, Grade 5 – Section A. Each class-section links to enrolled students, assigned teachers, and the timetable.",
    whatYouCanDo: [
      "View and manage all class-sections",
      "Create new classes and sections",
      "Edit class name, level, and section label",
      "View students enrolled in a class",
      "View the timetable for a class",
      "Delete empty class-sections",
    ],
    howToUse: [
      "Open Classes from the navigation.",
      "Browse the grid or list of class-sections.",
      "Click a class card to open the detail view.",
      "View enrolled students and the weekly timetable from the detail tabs.",
      "Click '+ Add Class' to create a new grade level.",
      "Add sections to an existing class using the 'Add Section' button inside the class detail.",
    ],
  },
  enrollments: {
    id: "enrollments",
    title: "Enrollments",
    whatIs:
      "The Enrollments module manages the assignment of students to class-sections for each academic year. It controls rosters, transfers between sections, and enrolment status.",
    whatYouCanDo: [
      "View the enrolment roster for any class-section",
      "Enrol a student into a class-section",
      "Transfer a student to a different section",
      "Update a student's enrolment status (active, transferred, withdrawn)",
      "Filter enrolments by academic year",
    ],
    howToUse: [
      "Open Enrollments from the navigation.",
      "Select the academic year from the year picker.",
      "Choose a class-section to see its roster.",
      "Click 'Enrol Student' to add a student to the section.",
      "To transfer, find the student in the roster and click 'Transfer'.",
      "To change status, open the student row and update the status field.",
    ],
  },
  "academic-management": {
    id: "academic-management",
    title: "Academic Management",
    whatIs:
      "The Academic Management hub covers academic year setup and student promotion. It is the starting point for configuring academic cycles and moving students to the next grade at year-end.",
    whatYouCanDo: [
      "Create and manage academic years",
      "Set start and end dates for each academic year",
      "Mark an academic year as active",
      "Promote students from one grade to the next",
      "Configure promotion rules and exceptions",
    ],
    howToUse: [
      "Open Academic Management from the navigation.",
      "Select 'Academic Years' to add or edit years.",
      "Click '+ Add Academic Year', enter the label and date range, then save.",
      "To set an active year, open the year and click 'Set Active'.",
      "Switch to 'Student Promotion' to run end-of-year promotions.",
      "Choose the source and target classes, review the list, then confirm promotion.",
    ],
  },
  subjects: {
    id: "subjects",
    title: "Subjects",
    whatIs:
      "The Subjects module manages the academic subjects offered by the institute — such as Mathematics, English, or Science. Subjects are assigned to teachers and referenced in timetables, marks, and homework.",
    whatYouCanDo: [
      "View and search all subjects",
      "Add new subjects with a name, code, and category",
      "Edit subject details",
      "Assign a subject to one or more teachers",
      "View which classes and teachers are linked to a subject",
      "Delete subjects that are no longer taught",
    ],
    howToUse: [
      "Open Subjects from the navigation.",
      "Browse the subject list or search by name or code.",
      "Click a subject to view its details and linked teachers.",
      "Click '+ Add Subject' to create a new one.",
      "From the subject detail, assign teachers using the 'Assign Teacher' option.",
      "To edit, open the subject and click 'Edit'; save when done.",
    ],
  },
  timetable: {
    id: "timetable",
    title: "Timetable",
    whatIs:
      "The Timetable module lets you build, edit, and publish weekly class schedules. Timetables define which subjects are taught in which periods for each class-section.",
    whatYouCanDo: [
      "Create draft timetables for each class-section and term",
      "Assign subjects and teachers to periods manually",
      "Review and publish timetables to make them live",
      "Switch between terms to manage seasonal schedules",
      "View the timetable grid for any class",
    ],
    howToUse: [
      "Open Timetable from the navigation.",
      "Select a class-section and term from the pickers.",
      "Click '+ New Draft' to start a new timetable.",
      "Click any period cell to assign a subject and teacher.",
      "Review the complete grid; resolve any conflicts.",
      "Click 'Publish' to make the timetable live for students and parents.",
      "To edit a published timetable, create a new draft and re-publish.",
    ],
  },
  "student-attendance": {
    id: "student-attendance",
    title: "Student Attendance",
    whatIs:
      "The Student Attendance module is the daily roll-call tool for teachers to mark student attendance class-by-class. Admins can view, correct, and report on attendance records.",
    whatYouCanDo: [
      "View daily attendance records for any class-section",
      "Mark or update attendance (present, absent, late, excused)",
      "View attendance history and trends by student or class",
      "Generate attendance summaries",
      "Correct erroneous attendance entries",
    ],
    howToUse: [
      "Open Student Attendance from the navigation.",
      "Select the date using the date picker.",
      "Choose a class-section to see the roll.",
      "Click each student's status to mark present, absent, or late.",
      "Save the session when done.",
      "Switch to History view to review past records.",
      "Use the summary panel to export attendance data.",
    ],
  },
  attendance: {
    id: "attendance",
    title: "Attendance",
    whatIs:
      "The Attendance hub provides a read-only consolidated view of all attendance data across student and teacher attendance modules. It is the reporting and audit layer.",
    whatYouCanDo: [
      "View combined student and teacher attendance in one place",
      "Filter by date range, class, or staff member",
      "Review daily, weekly, and monthly summaries",
      "Identify patterns of absenteeism",
    ],
    howToUse: [
      "Open Attendance from the navigation.",
      "Select the attendance type (Student or Teacher) from the hub nav.",
      "Apply date and class filters.",
      "Review the attendance grid or summary cards.",
      "This module is read-only — edits must be made in Student Attendance or Teacher Attendance.",
    ],
  },
  "teacher-attendance": {
    id: "teacher-attendance",
    title: "Teacher Attendance",
    whatIs:
      "The Teacher Attendance module tracks whether teaching and non-teaching staff are present each day. Admins mark attendance and can view historical records.",
    whatYouCanDo: [
      "Mark daily attendance for each staff member",
      "Record present, absent, late, or on-leave status",
      "View teacher attendance history",
      "Filter by date and staff member",
      "Export teacher attendance records",
    ],
    howToUse: [
      "Open Teacher Attendance from the navigation.",
      "Select the date using the date picker.",
      "The staff list appears with their status for that day.",
      "Click each row to mark the appropriate status.",
      "Save the session.",
      "Switch to History or Overview tabs for past data.",
    ],
  },
  exams: {
    id: "exams",
    title: "Exams",
    whatIs:
      "The Exams module manages examination timetables — scheduling when each exam paper will be held for each class. It does not handle marks; use the Marks module for that.",
    whatYouCanDo: [
      "Create exam timetables for a term",
      "Add exam sessions (subject, date, time, class)",
      "Edit or reschedule existing exam slots",
      "Publish exam timetables to students via Connect",
      "View exam schedules by class or date",
    ],
    howToUse: [
      "Open Exams from the navigation.",
      "Click '+ New Exam Timetable' and enter the exam name and term.",
      "Add exam slots: select a subject, date, start time, and duration.",
      "Assign the exam slot to one or more class-sections.",
      "Review the full timetable grid.",
      "Click 'Publish' to share it with students and parents.",
    ],
  },
  marks: {
    id: "marks",
    title: "Marks",
    whatIs:
      "The Marks module stores and manages student exam results. Teachers enter marks after exams, and admins can review, edit, and export grade reports.",
    whatYouCanDo: [
      "View marks entered by teachers for each exam",
      "Edit or correct individual mark entries",
      "Calculate totals, percentages, and grades automatically",
      "Filter marks by exam, class, and subject",
      "Export mark sheets to Excel or PDF",
    ],
    howToUse: [
      "Open Marks from the navigation.",
      "Select the academic year and exam from the dropdowns.",
      "Choose a class-section to see the mark sheet.",
      "Click a mark cell to edit the value.",
      "Grades and totals update automatically.",
      "Use the export button to download the mark sheet.",
    ],
  },
  homework: {
    id: "homework",
    title: "Homework",
    whatIs:
      "The Homework module lets teachers assign homework tasks to class-sections and students to view them in the Connect app. Admins can view all homework assigned across the institute.",
    whatYouCanDo: [
      "View all homework assignments across the institute",
      "See which class and subject each task belongs to",
      "Filter homework by class, subject, or date",
      "Review submission deadlines and descriptions",
    ],
    howToUse: [
      "Open Homework from the navigation.",
      "Use the class-section and subject filters to narrow results.",
      "Click a homework row to view its full details.",
      "Homework is created by teachers — to add homework, teachers use the LumenX Connect teacher portal.",
      "Use the date range filter to find upcoming or past assignments.",
    ],
  },
  diary: {
    id: "diary",
    title: "Diary",
    whatIs:
      "The Diary module provides a read-only view of teacher diary entries — daily class notes submitted by teachers. Admin cannot add, edit, or delete diary entries.",
    whatYouCanDo: [
      "View diary entries submitted by teachers",
      "Filter by class, teacher, and date",
      "Review the content and date of each diary note",
    ],
    howToUse: [
      "Open Diary from the navigation.",
      "Use the date picker and class filter to find entries.",
      "Click a diary row to read the full entry.",
      "Entries are submitted by teachers in the LumenX app.",
      "This module is read-only for Admin users.",
    ],
  },
  notifications: {
    id: "notifications",
    title: "Notifications",
    whatIs:
      "The Notifications module is the Admin inbox — showing system alerts, status updates, and activity notifications received by Admin. To send announcements or alerts to students and parents, use the Send module.",
    whatYouCanDo: [
      "View all incoming notifications for your Admin account",
      "Mark notifications as read",
      "Filter notifications by type or date",
      "See transport, attendance, and system event alerts",
    ],
    howToUse: [
      "Open Notifications from the navigation.",
      "Browse the inbox list for unread items.",
      "Click a notification to expand and read its details.",
      "Use the 'Mark all as read' option to clear the badge.",
      "To send a broadcast or announcement, go to the Send module instead.",
    ],
  },
  messages: {
    id: "messages",
    title: "Messages",
    whatIs:
      "Messages is the admin oversight inbox for direct and class-group threads. Compose supports multi-select teachers, parents, and students plus class/section targeting with an explicit student vs parent audience type.",
    whatYouCanDo: [
      "Browse threads and reply",
      "Compose to one or many individuals with search and filters",
      "Add whole classes/sections as students or parents (explicit type; selections dedupe by user id)",
      "Create a class group thread by class + section labels",
      "Close, reopen, or archive threads",
    ],
    howToUse: [
      "Open Messages and click Compose.",
      "Choose Direct message or Class group thread.",
      "For Direct: filter by role/class/section, select people or add class/section buckets, confirm the recipient count, then send.",
      "Each selected person starts a direct thread — the server validates institute membership.",
      "For Class group: enter class and section labels, then send one group thread.",
      "Open a thread to reply; use close/archive on the thread header.",
    ],
  },
  send: {
    id: "send",
    title: "Send",
    whatIs:
      "Send is the outbound communications composer. Category chooses an existing API: Announcements, school Alerts, Calendar holidays, or Events — they are not interchangeable generic notifications.",
    whatYouCanDo: [
      "Send Announcements (title, body, audience scopes, optional schedule/draft)",
      "Broadcast school Alerts (severity, alert type, audience, optional single-student target)",
      "Publish Calendar holidays (title, date, optional details)",
      "Publish Events (title, schedule, audience, then publish)",
      "Switch categories with the Category selector (first field)",
    ],
    howToUse: [
      "Open Send from Communications.",
      "Choose Category: Announcements, Alerts, Holidays, or Events.",
      "Enter Title, then Body/message (and date/schedule fields when shown).",
      "Set recipient/audience controls for that category only.",
      "Publish/Send — wait for success; avoid double-submit while loading.",
      "History: Announcements, Alerts, Calendar, or Events; inbox under Notifications.",
    ],
  },
  announcements: {
    id: "announcements",
    title: "Announcements",
    whatIs:
      "The Announcements module shows the history and management of published announcements sent to students and parents via the Connect app. To compose a new announcement, use the Send module.",
    whatYouCanDo: [
      "View the full history of published announcements",
      "Search and filter by date, audience, or status",
      "View the content and delivery status of each announcement",
      "Delete or archive old announcements",
    ],
    howToUse: [
      "Open Announcements from the Communications section.",
      "Browse the list of published announcements.",
      "Click any announcement to see its full content and audience.",
      "Use date and status filters to narrow results.",
      "To create a new announcement, go to Send → Category: Announcements.",
    ],
  },
  alerts: {
    id: "alerts",
    title: "Alerts",
    whatIs:
      "The Alerts module manages alert rules and the history of school alert broadcasts. Configure which events trigger automatic alerts and review past broadcasts. Compose new alerts via the Send module.",
    whatYouCanDo: [
      "View the history of all alert broadcasts",
      "Configure operational, academic, and emergency alert rules",
      "Enable or disable specific alert types",
      "Review broadcast delivery statuses",
    ],
    howToUse: [
      "Open Alerts from the Communications section.",
      "Switch between 'History' and 'Rules' views using the hub nav.",
      "In Rules view, toggle individual alert rules on or off.",
      "In History view, browse past broadcasts; click one to see details.",
      "To send a new alert, go to Send → Category: Alerts.",
    ],
  },
  complaints: {
    id: "complaints",
    title: "Complaints",
    whatIs:
      "The Complaints module is a triage tool for managing grievances submitted by parents, students, or staff. Admins can review, respond to, and resolve complaints.",
    whatYouCanDo: [
      "View all submitted complaints",
      "Filter by status (open, in-progress, resolved)",
      "Open a complaint to read the full description",
      "Update the status and add a resolution note",
      "Create internal complaint records",
    ],
    howToUse: [
      "Open Complaints from the Communications section.",
      "Browse the list; unresolved complaints appear at the top.",
      "Click a complaint to open the detail view.",
      "Update the status field and add a response or resolution note.",
      "Click 'Save' to record the update.",
      "Resolved complaints can be filtered out using the status filter.",
    ],
  },
  permissions: {
    id: "permissions",
    title: "Roles & Access",
    whatIs:
      "The Permissions (Roles & Access) module defines what each Admin account can see and do within the LumenX Admin app. It controls access on a role basis.",
    whatYouCanDo: [
      "View all admin roles defined for the institute",
      "Create new custom roles with specific permissions",
      "Edit the permissions assigned to an existing role",
      "Assign roles to accounts in the Accounts module",
    ],
    howToUse: [
      "Open Roles & Access from the navigation.",
      "See the list of current roles.",
      "Click a role to view its permissions.",
      "Toggle permissions on or off for any module.",
      "Click 'Save' to apply changes.",
      "To create a new role, click '+ New Role', name it, set permissions, and save.",
    ],
  },
  subscription: {
    id: "subscription",
    title: "Subscription",
    whatIs:
      "The Subscription module shows your institute's current LumenX plan, trial status, and renewal details. It supports offline payment tracking for annual renewals.",
    whatYouCanDo: [
      "View current plan and subscription expiry date",
      "Check trial status and days remaining",
      "View renewal pricing and quotation",
      "Record an offline payment submission",
    ],
    howToUse: [
      "Open Subscription from the navigation.",
      "View your current plan status card.",
      "Check the expiry date and renewal options.",
      "Click 'Renew' to see pricing and submit an offline payment.",
      "For billing queries, contact LumenX support using the link on the page.",
    ],
  },
  modules: {
    id: "modules",
    title: "Modules",
    whatIs:
      "The Modules module controls which feature modules are enabled or disabled for your Admin app installation. Disabling a module hides it from the navigation.",
    whatYouCanDo: [
      "Enable or disable feature modules for the Admin app",
      "View which modules are currently active",
      "Quickly toggle optional features on or off",
    ],
    howToUse: [
      "Open Modules from the navigation.",
      "See the list of all available feature modules.",
      "Toggle the switch next to a module to enable or disable it.",
      "Disabled modules are hidden from the navigation immediately.",
      "Some core modules cannot be disabled.",
    ],
  },
  storage: {
    id: "storage",
    title: "Storage",
    whatIs:
      "The Storage module shows the institute's file storage usage — photos, documents, certificates, and attachments. It provides an overview of quota consumption and synced offline data.",
    whatYouCanDo: [
      "View total storage used vs quota",
      "See a breakdown by file category (photos, documents, etc.)",
      "Monitor offline sync status",
      "Identify large or unused files",
    ],
    howToUse: [
      "Open Storage from the navigation.",
      "Review the usage summary at the top.",
      "Drill into a category to see individual files.",
      "Check the offline sync status bar for local data.",
      "Contact support if you need a quota increase.",
    ],
  },
  transport: {
    id: "transport",
    title: "Transport",
    whatIs:
      "The Transport module manages the school bus fleet — routes, stops, drivers, vehicles, and student enrolments. It connects with the LumenX Transport driver app for real-time tracking.",
    whatYouCanDo: [
      "View and manage bus routes and stops",
      "Enrol students onto transport routes",
      "Assign vehicles and drivers to routes",
      "Track transport attendance and drop-off records",
      "View real-time bus location from the driver app",
    ],
    howToUse: [
      "Open Transport from the navigation.",
      "Select a view from the hub nav: Routes, Enrollments, Attendance, or Vehicles.",
      "In Routes, add or edit bus routes and their stops.",
      "In Enrollments, assign students to a route and stop.",
      "In Attendance, review pick-up and drop-off records per route.",
      "The driver app updates attendance in real time.",
    ],
  },
  leave: {
    id: "leave",
    title: "Leave",
    whatIs:
      "The Leave module tracks teacher and staff leave requests. Admins can approve or reject requests and view the leave calendar and summaries.",
    whatYouCanDo: [
      "View pending leave requests from staff",
      "Approve or reject leave applications",
      "View the leave calendar and scheduled absences",
      "See leave balance summaries per staff member",
      "Export leave records",
    ],
    howToUse: [
      "Open Leave from the navigation.",
      "Review pending requests in the list.",
      "Click a request to see the reason, dates, and type.",
      "Click 'Approve' or 'Reject' and add a note if needed.",
      "Switch to the calendar view to see all upcoming leaves.",
      "Use the export action to download leave records.",
    ],
  },
  fees: {
    id: "fees",
    title: "Fees",
    whatIs:
      "The Fees module manages student fee structures, payment collection, and fee balance tracking. It covers fee plans, payment records, and outstanding dues.",
    whatYouCanDo: [
      "View and manage fee plans and structures",
      "Record student fee payments",
      "Track outstanding dues per student",
      "Generate fee receipts and reports",
      "Filter payments by class, term, or date",
    ],
    howToUse: [
      "Open Fees from the navigation.",
      "Select a view: Plans, Payments, or Dues.",
      "In Plans, create or edit fee structures for each class and term.",
      "In Payments, record a new payment by selecting a student and amount.",
      "In Dues, review which students have outstanding balances.",
      "Export payment or dues reports using the export button.",
    ],
  },
  admissions: {
    id: "admissions",
    title: "Admissions",
    whatIs:
      "The Admissions module manages the student enquiry and admission pipeline — from initial application through interview and enrolment. It tracks each applicant's stage in the process.",
    whatYouCanDo: [
      "View and manage admission enquiries and applications",
      "Move applicants through admission stages (enquiry, applied, interview, admitted, enrolled)",
      "Add notes and follow-up actions to each application",
      "Export the admissions pipeline",
      "Filter by stage, class applied, or date",
    ],
    howToUse: [
      "Open Admissions from the navigation.",
      "Browse the applicant list or kanban.",
      "Click an applicant to view their details.",
      "Use the stage selector to advance or change their stage.",
      "Add internal notes from the applicant detail view.",
      "Once admitted and enrolled, the student can be added to the Students module.",
    ],
  },
  careers: {
    id: "careers",
    title: "Careers",
    whatIs:
      "The Careers module manages job postings and candidate applications for staff and teacher recruitment. Admins post vacancies and review candidate submissions.",
    whatYouCanDo: [
      "Post new job vacancies",
      "View and manage candidate applications",
      "Track application stages (applied, shortlisted, interviewed, selected)",
      "Export the candidate list",
    ],
    howToUse: [
      "Open Careers from the navigation.",
      "View current vacancies and their applicant counts.",
      "Click '+ New Vacancy' to post a new job listing.",
      "Click a vacancy to see its applicants.",
      "Update an applicant's stage by opening their record.",
      "Use filters to find candidates by stage or application date.",
    ],
  },
  templates: {
    id: "templates",
    title: "Templates",
    whatIs:
      "The Templates module manages certificate and document templates used for generating official institute documents such as bonafide certificates, transfer certificates, and custom letters.",
    whatYouCanDo: [
      "View published certificate and document templates",
      "Create new templates using the template builder",
      "Edit existing templates and manage versions",
      "Preview templates with sample data",
      "Publish templates for use in the Documents module",
    ],
    howToUse: [
      "Open Templates from the navigation.",
      "Browse the template catalog.",
      "Click a template to preview or edit it.",
      "Click '+ New Template' to create one from scratch.",
      "Use the editor to add placeholders for student and institute data.",
      "Click 'Publish' to make the template available in Documents.",
    ],
  },
  documents: {
    id: "documents",
    title: "Documents",
    whatIs:
      "The Documents module generates and manages official student documents using published templates. Admins generate individual documents such as certificates, letters, or ID cards and can download or share them.",
    whatYouCanDo: [
      "Generate documents for individual students from templates",
      "Download generated documents as PDF",
      "View the history of generated documents",
      "Manage document issuance records",
    ],
    howToUse: [
      "Open Documents from the navigation.",
      "Select the document type (template) you want to generate.",
      "Search for the student to generate the document for.",
      "Review the preview with populated data.",
      "Click 'Generate' to create the document.",
      "Download the PDF using the download button.",
    ],
  },
  calendar: {
    id: "calendar",
    title: "Calendar",
    whatIs:
      "The Calendar module shows the academic year calendar including holidays, events, and term breaks. Admins add holidays and events here which appear on the Connect student app.",
    whatYouCanDo: [
      "View the academic year calendar in year and month views",
      "Add holidays and non-school days",
      "Add institute events to the calendar",
      "Edit or delete calendar entries",
      "View upcoming events at a glance",
    ],
    howToUse: [
      "Open Calendar from the navigation.",
      "Use the year view for an overview of the academic cycle.",
      "Switch to month view to add or edit specific dates.",
      "Click a date to add a holiday or event.",
      "Fill in the label, type (holiday or event), and click 'Save'.",
      "Changes appear in the Connect app calendar for students and parents.",
    ],
  },
  events: {
    id: "events",
    title: "Events",
    whatIs:
      "The Events module manages school events that are published to students and parents. It allows admins to create, edit, and track attendance for institute events.",
    whatYouCanDo: [
      "Create and publish school events",
      "Set event date, time, venue, and description",
      "Target events to specific classes or the whole school",
      "Track RSVPs or attendance for events",
      "Edit or cancel upcoming events",
    ],
    howToUse: [
      "Open Events from the navigation.",
      "Click '+ New Event' to create an event.",
      "Fill in the event name, date, time, and venue.",
      "Select the audience (all or specific classes).",
      "Click 'Publish' to send it to students and parents via Connect.",
      "Edit an event by clicking it and updating the details.",
    ],
  },
  reports: {
    id: "reports",
    title: "Reports",
    whatIs:
      "The Reports module is the download and export centre for admin data. It provides pre-built reports in Excel, PDF, and CSV — no charts or live dashboards here.",
    whatYouCanDo: [
      "Download student lists, mark sheets, and attendance reports",
      "Export fee payment records and outstanding dues",
      "Generate teacher and staff reports",
      "Download transport attendance summaries",
      "Filter reports by academic year, class, and date range",
    ],
    howToUse: [
      "Open Reports from the navigation.",
      "Choose the report type from the list.",
      "Set the required filters (academic year, class, date range).",
      "Click 'Generate' or 'Export'.",
      "The file downloads automatically in your chosen format.",
    ],
  },
  "teacher-performance": {
    id: "teacher-performance",
    title: "Teacher Performance",
    whatIs:
      "The Teacher Performance module provides analytics on teacher effectiveness — based on student feedback scores, homework completion rates, and attendance trends. It is an analytics-only view; exports are in the Reports module.",
    whatYouCanDo: [
      "View performance scores and trends per teacher",
      "See student feedback ratings and comments",
      "Compare performance across departments or subjects",
      "Identify teachers with declining or improving trends",
    ],
    howToUse: [
      "Open Teacher Performance from the navigation.",
      "Browse the faculty performance index.",
      "Click a teacher to see their detailed score breakdown.",
      "Use the filters to compare by subject, class, or term.",
      "Switch between student feedback and operational index views.",
      "To export performance data, go to Reports.",
    ],
  },
  settings: {
    id: "settings",
    title: "Settings",
    whatIs:
      "The Settings module covers school-wide Admin configuration — platform settings, institute profile, and support options. It is the control panel for how the Admin app behaves.",
    whatYouCanDo: [
      "Update institute branding and contact details",
      "Configure platform-wide preferences",
      "Manage roles and access permissions",
      "View support and help resources",
      "Access data and privacy settings",
    ],
    howToUse: [
      "Open Settings from the navigation.",
      "Browse the settings categories.",
      "Click a category to open its options.",
      "Make changes and click 'Save'.",
      "Some settings (e.g. roles) link to dedicated modules.",
    ],
  },
  "profile-settings": {
    id: "profile-settings",
    title: "Profile Settings",
    whatIs:
      "The Profile Settings module manages your personal Admin account preferences — appearance, lock PIN, device settings, and your own profile details.",
    whatYouCanDo: [
      "Update your display name and contact info",
      "Change the app appearance (light/dark mode)",
      "Set or change your Admin lock PIN",
      "Manage device-specific preferences",
    ],
    howToUse: [
      "Open Profile Settings from the navigation or your avatar menu.",
      "Update your name or email in the Profile section.",
      "Toggle the appearance between Light and Dark.",
      "Set a lock PIN in the Security section.",
      "Save each section individually after making changes.",
    ],
  },
  institute: {
    id: "institute",
    title: "Institute Profile",
    whatIs:
      "The Institute Profile module stores and manages the official details of your school or institution — name, address, logo, contact information, and branding. These details appear on certificates, Connect login pages, and verification pages.",
    whatYouCanDo: [
      "Update the institute name, address, and contact details",
      "Upload or change the institute logo",
      "Set the official email and phone for Connect and document generation",
      "Configure institute-specific branding",
    ],
    howToUse: [
      "Open Institute Profile from Settings in the navigation.",
      "Review the current profile details.",
      "Click 'Edit' to update the name, address, or contact fields.",
      "Upload a new logo using the logo upload area.",
      "Click 'Save' to apply changes — they will reflect on certificates and Connect.",
    ],
  },
  setup: {
    id: "setup",
    title: "Setup",
    whatIs:
      "The Setup module provides a guided checklist for first-time institute configuration. Completing setup ensures that Admin, Connect, and Transport apps can share live data correctly.",
    whatYouCanDo: [
      "Follow a step-by-step setup checklist",
      "Track which setup steps are complete vs pending",
      "Navigate directly to each setup task from the checklist",
      "Ensure the institute is ready for live use",
    ],
    howToUse: [
      "Open Setup from the navigation (appears during onboarding).",
      "Review the checklist items.",
      "Click any incomplete item to jump directly to the configuration screen.",
      "Complete each step: institute profile, academic year, classes, teachers, and subjects.",
      "Once all items are checked, the setup is complete.",
      "The checklist remains accessible for reference after completion.",
    ],
  },
};

export const MODULE_HELP_REGISTRY: ModuleHelpRegistry = _registry;

export const MODULE_HELP_REQUIRED_IDS: readonly string[] = Object.keys(
  _registry,
).sort((a, b) => a.localeCompare(b));

export function normalizeModuleHelpKey(key: string): string {
  const trimmed = key.trim();
  if (!trimmed) return trimmed;
  return trimmed.startsWith("/") ? trimmed.slice(1) : trimmed;
}

export function getModuleHelp(id: string): ModuleHelpContent | null {
  const bare = normalizeModuleHelpKey(id);
  return _registry[bare] ?? _registry[id] ?? null;
}
