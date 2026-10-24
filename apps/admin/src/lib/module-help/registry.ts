import type { ModuleHelpContent, ModuleHelpRegistry } from "./types";

const _registry: Record<string, ModuleHelpContent> = {
  students: {
    id: "students",
    title: "Students",
    whatIs:
      "This is the list of all students in your school. Use it to look up a student and keep their details up to date.",
    whatYouCanDo: [
      "Find a student by name or class",
      "Add a new student, or add many at once from a spreadsheet file",
      "Fix a student's name, date of birth, phone number, or address",
      "Mark a student as active, transferred, or left the school",
      "Download the student list as a spreadsheet",
    ],
    howToUse: [
      "Open Students from the left menu.",
      "Type a name in the search box, or pick a class and section to narrow the list.",
      "Click a student to see their full details, then click Edit to change anything and Save when done.",
      "To add a new student, click Add Student and fill in the form.",
      "To download the list, click the Export button.",
    ],
  },
  teachers: {
    id: "teachers",
    title: "Teachers",
    whatIs:
      "This is the list of all teachers and staff at your school. Use it to keep their details and the subjects and classes they teach up to date.",
    whatYouCanDo: [
      "Find a teacher by name or subject",
      "Add a new teacher, or add many at once from a spreadsheet file",
      "Fix a teacher's name, email, phone number, or job title",
      "Choose which subjects and classes a teacher handles",
      "Download the teacher list as a spreadsheet",
    ],
    howToUse: [
      "Open Teachers from the left menu.",
      "Type a name or subject in the search box to find a teacher.",
      "Click a teacher to see their details, then click Edit to change anything and Save when done.",
      "To add a teacher, click Add Teacher and fill in their name, email, and subject.",
      "To give a teacher subjects or classes, open the teacher and choose them there.",
    ],
  },
  photos: {
    id: "photos",
    title: "Photos",
    whatIs:
      "This is where you manage profile photos of students and staff. A photo added here shows up wherever that person appears in the school apps.",
    whatYouCanDo: [
      "Look through the photos of students and staff",
      "Upload a photo or replace an old one",
      "Check photos that are waiting for your approval",
      "Remove photos that are wrong or out of date",
      "Narrow the list by class or by staff type",
    ],
    howToUse: [
      "Open Photos from the left menu.",
      "Choose Student or Staff using the tabs at the top.",
      "Pick a class or section to shorten the list.",
      "Click a person's photo, then choose a picture from your computer to upload.",
      "To delete a photo, click Remove.",
    ],
  },
  parents: {
    id: "parents",
    title: "Parents / Guardians",
    whatIs:
      "This is the list of parents and guardians of your students. You can see who belongs to which child and whether they have joined the parent app.",
    whatYouCanDo: [
      "Find a parent by name, email, or phone number",
      "See which children are linked to each parent",
      "Check whether a parent has joined the parent app",
      "Download the parent list as a spreadsheet",
    ],
    howToUse: [
      "Open Parents from the left menu.",
      "Search for the parent or scroll through the list.",
      "Click a parent to see their children and contact details.",
      "Look at the status tag to see if they have joined the parent app.",
      "To download the list, click the Export button.",
    ],
  },
  accounts: {
    id: "accounts",
    title: "Accounts",
    whatIs:
      "This is where you manage the office staff who log in to LumenX Admin. You can invite new people, give them a role, or stop their access when they leave.",
    whatYouCanDo: [
      "See everyone who has a login for the Admin app",
      "Invite a new staff member by email",
      "Give a person a role or change it",
      "Turn off the account of someone who has left",
      "Send an invitation email again",
    ],
    howToUse: [
      "Open Accounts from the left menu.",
      "Click Invite, type the staff member's email, and choose their role.",
      "Send the invitation. The person will get an email to set up their login.",
      "To change a role, click the person's name and pick a new role.",
      "To stop someone's access, open their row and choose Deactivate.",
    ],
  },
  classes: {
    id: "classes",
    title: "Classes",
    whatIs:
      "This is where you set up your classes and sections, such as Grade 5 – Section A. Each class shows its students, teachers, and timetable.",
    whatYouCanDo: [
      "See all classes and sections",
      "Add a new class or a new section",
      "Change the name or section label of a class",
      "See which students are in a class and view its timetable",
      "Delete a section that has no students",
    ],
    howToUse: [
      "Open Classes from the left menu.",
      "Look through the list and click a class to open it.",
      "Use the tabs inside the class to see its students and weekly timetable.",
      "To create a new grade, click Add Class and fill in the form.",
      "To add a section to an existing class, open the class and click Add Section.",
    ],
  },
  enrollments: {
    id: "enrollments",
    title: "Enrollments",
    whatIs:
      "This is where you place students into classes and sections for each school year. You can also move a student to another section or update their status.",
    whatYouCanDo: [
      "See the list of students in any class and section",
      "Put a student into a class and section",
      "Move a student to a different section",
      "Mark a student as active, transferred, or left the school",
      "Look at a past or current school year",
    ],
    howToUse: [
      "Open Enrollments from the left menu.",
      "Pick the school year at the top.",
      "Choose a class and section to see its students.",
      "To add a student, click Enrol Student and choose the student.",
      "To move or update a student, find them in the list and click Transfer, or change their status.",
    ],
  },
  "academic-management": {
    id: "academic-management",
    title: "Academic Management",
    whatIs:
      "This is where you set up each school year and move students up to the next class at the end of the year.",
    whatYouCanDo: [
      "Create a new school year",
      "Set the start and end dates of a school year",
      "Choose which school year is the current one",
      "Move students up to the next class at year end",
      "Handle students who should not move up with the rest",
    ],
    howToUse: [
      "Open Academic Management from the left menu.",
      "Choose Academic Years, click Add Academic Year, type the name and dates, then Save.",
      "To make a year the current one, open it and click Set Active.",
      "At year end, choose Student Promotion and pick the old class and the new class.",
      "Check the list of students, then confirm to move them up.",
    ],
  },
  subjects: {
    id: "subjects",
    title: "Subjects",
    whatIs:
      "This is the list of subjects your school teaches, such as Maths, English, or Science. Subjects are used for teachers, timetables, marks, and homework.",
    whatYouCanDo: [
      "Find a subject by name or code",
      "Add a new subject",
      "Change a subject's details",
      "Choose which teachers teach a subject",
      "Delete a subject you no longer teach",
    ],
    howToUse: [
      "Open Subjects from the left menu.",
      "Look through the list or search by name or code.",
      "To add a subject, click Add Subject and fill in the form.",
      "Open a subject and click Assign Teacher to choose who teaches it.",
      "To change details, open the subject, click Edit, and Save.",
    ],
  },
  timetable: {
    id: "timetable",
    title: "Timetable",
    whatIs:
      "This is where you plan the weekly class schedule, showing which subject and teacher is in each period. When you are happy with it, you publish it so everyone can see it.",
    whatYouCanDo: [
      "Start a draft timetable for a class and term",
      "Choose the subject and teacher for each period",
      "Check the full week and fix any clashes",
      "Publish the timetable so students and parents can see it",
      "Switch between terms",
    ],
    howToUse: [
      "Open Timetable from the left menu.",
      "Choose a class, section, and term.",
      "Click New Draft, then click each period box to choose a subject and teacher.",
      "Look over the whole week and fix any clashes.",
      "Click Publish. To change a published timetable later, make a new draft and publish it again.",
    ],
  },
  "student-attendance": {
    id: "student-attendance",
    title: "Student Attendance",
    whatIs:
      "This is the daily roll call for students, class by class. You can mark attendance, fix mistakes, and look at past days.",
    whatYouCanDo: [
      "See attendance for any class on any day",
      "Mark students as present, absent, late, or excused",
      "Look at a student's or class's attendance over time",
      "Fix an attendance entry that was marked wrongly",
      "Download attendance for your records",
    ],
    howToUse: [
      "Open Student Attendance from the left menu.",
      "Pick the date.",
      "Choose a class and section to see the student list.",
      "Click each student's status to mark present, absent, or late, then click Save.",
      "To see earlier days, open the History tab.",
    ],
  },
  attendance: {
    id: "attendance",
    title: "Attendance",
    whatIs:
      "This screen lets you look at student and teacher attendance together in one place. It is for viewing and checking only. To change attendance, go to the Student Attendance or Teacher Attendance screens.",
    whatYouCanDo: [
      "See student and teacher attendance side by side",
      "Pick a date range, class, or staff member",
      "Look at daily, weekly, and monthly totals",
      "Spot students or staff who are often absent",
    ],
    howToUse: [
      "Open Attendance from the left menu.",
      "Choose Student or Teacher at the top.",
      "Pick the dates and class you want to look at.",
      "Read the attendance table or the summary cards.",
      "To fix a mistake, go to Student Attendance or Teacher Attendance.",
    ],
  },
  "teacher-attendance": {
    id: "teacher-attendance",
    title: "Teacher Attendance",
    whatIs:
      "This is the daily attendance sheet for teachers and other staff. You can mark who is in today and look at earlier days.",
    whatYouCanDo: [
      "Mark attendance for each staff member every day",
      "Mark staff as present, absent, late, or on leave",
      "Look at past attendance",
      "Search by date or by staff member",
      "Download attendance for your records",
    ],
    howToUse: [
      "Open Teacher Attendance from the left menu.",
      "Pick the date.",
      "You will see the staff list. Click each row to choose present, absent, late, or on leave.",
      "Click Save.",
      "To see earlier days, open the History or Overview tab.",
    ],
  },
  exams: {
    id: "exams",
    title: "Exams",
    whatIs:
      "This is where you plan exam dates and timings for each class. Marks are not entered here. Use the Marks screen for that.",
    whatYouCanDo: [
      "Create an exam timetable for a term",
      "Add each paper with its subject, date, and time",
      "Change the date or time of a paper",
      "Share the exam timetable with students and parents",
      "See exams by class or by date",
    ],
    howToUse: [
      "Open Exams from the left menu.",
      "Click New Exam Timetable and type the exam name and term.",
      "Add each paper by choosing the subject, date, start time, and length.",
      "Choose which classes and sections write that paper.",
      "Check the full timetable, then click Publish to share it with students and parents.",
    ],
  },
  marks: {
    id: "marks",
    title: "Marks",
    whatIs:
      "This is where exam marks are kept. Teachers enter marks after exams, and you can check them, correct them, and download the mark sheets.",
    whatYouCanDo: [
      "See the marks teachers have entered for each exam",
      "Correct a mark that was entered wrongly",
      "See totals, percentages, and grades worked out for you",
      "Narrow the list by exam, class, or subject",
      "Download mark sheets as Excel or PDF files",
    ],
    howToUse: [
      "Open Marks from the left menu.",
      "Choose the school year and the exam.",
      "Pick a class and section to see the mark sheet.",
      "To correct a mark, click it and type the new value. Totals and grades update by themselves.",
      "To download the sheet, click the Export button.",
    ],
  },
  homework: {
    id: "homework",
    title: "Homework",
    whatIs:
      "This screen shows the homework teachers have given to classes. You can look through it, but teachers are the ones who add homework.",
    whatYouCanDo: [
      "See all homework given across the school",
      "See which class and subject each homework is for",
      "Narrow the list by class, subject, or date",
      "Check the last date and details of each homework",
    ],
    howToUse: [
      "Open Homework from the left menu.",
      "Pick a class, section, or subject to shorten the list.",
      "Click a homework to read the full details.",
      "Use the date filter to find homework that is coming up or already past.",
      "To add new homework, teachers do this in the LumenX Connect teacher portal.",
    ],
  },
  diary: {
    id: "diary",
    title: "Diary",
    whatIs:
      "This screen shows the daily class notes that teachers write in their diary. You can read them here, but you cannot add, change, or delete them.",
    whatYouCanDo: [
      "Read the diary notes teachers have written",
      "Narrow the list by class, teacher, or date",
      "See what each note says and when it was written",
    ],
    howToUse: [
      "Open Diary from the left menu.",
      "Pick a date and a class to find the notes you want.",
      "Click a note to read all of it.",
      "Remember that teachers write the notes in the LumenX app, so you can only read them here.",
    ],
  },
  notifications: {
    id: "notifications",
    title: "Notifications",
    whatIs:
      "This is your inbox of updates, such as alerts and news about what is happening in the school. It is only for reading. To send something to parents or students, use the Send screen.",
    whatYouCanDo: [
      "Read the updates that came to your account",
      "Mark updates as read",
      "Narrow the list by type or date",
      "See updates about transport, attendance, and other school activity",
    ],
    howToUse: [
      "Open Notifications from the left menu.",
      "Look through the list for new, unread items.",
      "Click an item to open it and read the details.",
      "Click Mark all as read to clear the new-item count.",
      "To send an announcement or alert, go to the Send screen instead.",
    ],
  },
  messages: {
    id: "messages",
    title: "Messages",
    whatIs:
      "This is where you chat with teachers, parents, and students. You can start a chat with one person or with a whole class, and reply to chats that have already started.",
    whatYouCanDo: [
      "Read your chats and reply",
      "Start a chat with one or more teachers, parents, or students",
      "Choose a whole class or section to chat with their students or their parents",
      "Start a group chat for a class and section",
      "Close, reopen, or archive a chat",
    ],
    howToUse: [
      "Open Messages and click Compose.",
      "Choose Direct message for individual people, or Class group chat for a whole class.",
      "For a direct message, pick the people or choose a class and section, check the number of people shown, then send.",
      "For a class group chat, type the class and section, then send.",
      "To reply later, open the chat and type your message. Use the buttons at the top of the chat to close or archive it.",
    ],
  },
  send: {
    id: "send",
    title: "Send",
    whatIs:
      "This is where you write and send announcements, alerts, holidays, and events to parents, students, and staff. First pick what type of message it is, then fill in the form and send it.",
    whatYouCanDo: [
      "Send an announcement with a title, message, and who should get it",
      "Send an urgent school alert to the people who need to know",
      "Add a holiday with its date",
      "Add a school event with its date and time",
      "Change the type any time using the first box on the form",
    ],
    howToUse: [
      "Open Send from the Communications section.",
      "Pick the type first: Announcements, Alerts, Holidays, or Events.",
      "Type the title and message, and fill in any dates or times that appear.",
      "Choose who should receive it.",
      "Click Send or Publish and wait for the success message. Do not click twice. To see what you sent before, open Announcements, Alerts, Calendar, or Events.",
    ],
  },
  announcements: {
    id: "announcements",
    title: "Announcements",
    whatIs:
      "This screen shows the announcements you have already sent to students and parents. To write a new one, go to the Send screen.",
    whatYouCanDo: [
      "See all announcements sent so far",
      "Search by date, audience, or status",
      "Read what each announcement said and who it went to",
      "Delete or archive old announcements",
    ],
    howToUse: [
      "Open Announcements from the Communications section.",
      "Look through the list of sent announcements.",
      "Click one to read the full message and see who received it.",
      "Use the date and status filters to find a particular one.",
      "To write a new announcement, go to Send and choose Announcements.",
    ],
  },
  alerts: {
    id: "alerts",
    title: "Alerts",
    whatIs:
      "This screen shows the alerts the school has sent before and lets you choose which events create an alert automatically. To send a new alert, go to the Send screen.",
    whatYouCanDo: [
      "See all alerts sent in the past",
      "Choose which routine, academic, and emergency events create alerts",
      "Turn a type of alert on or off",
      "Check whether alerts reached people",
    ],
    howToUse: [
      "Open Alerts from the Communications section.",
      "Switch between History and Rules at the top.",
      "In Rules, turn each alert on or off.",
      "In History, look through past alerts and click one to see more.",
      "To send a new alert, go to Send and choose Alerts.",
    ],
  },
  complaints: {
    id: "complaints",
    title: "Complaints",
    whatIs:
      "This is where you review and resolve complaints from parents and students. You can read each one, reply, and mark it as resolved when it is sorted out.",
    whatYouCanDo: [
      "See all complaints that have come in",
      "Narrow the list by open, in progress, or resolved",
      "Open a complaint to read the full details",
      "Update the status and write a note about how it was solved",
      "Add a complaint yourself for the school's records",
    ],
    howToUse: [
      "Open Complaints from the Communications section.",
      "Look through the list. Complaints not yet resolved are shown first.",
      "Click a complaint to read it.",
      "Change the status and write your reply or resolution note.",
      "Click Save. Use the status filter to hide resolved complaints.",
    ],
  },
  permissions: {
    id: "permissions",
    title: "Roles & Access",
    whatIs:
      "This is where you decide what each staff member can see and do in LumenX Admin. People get access based on the role you give them.",
    whatYouCanDo: [
      "See all the roles set up for your school",
      "Create a new role with the access you choose",
      "Change what an existing role can do",
      "Give roles to staff from the Accounts screen",
    ],
    howToUse: [
      "Open Roles & Access from the left menu.",
      "Look at the list of roles and click one to see what it allows.",
      "Turn access on or off for each screen, then click Save.",
      "To make a new role, click New Role, give it a name, choose its access, and Save.",
    ],
  },
  subscription: {
    id: "subscription",
    title: "Subscription",
    whatIs:
      "This screen shows your school's LumenX plan, trial period, and renewal date. You can also note down an offline payment when you renew for the year.",
    whatYouCanDo: [
      "See your current plan and when it ends",
      "Check how many trial days are left",
      "See the renewal price and quotation",
      "Record a payment you made outside the app",
    ],
    howToUse: [
      "Open Subscription from the left menu.",
      "Look at the plan card to see your current status.",
      "Check the end date and renewal choices.",
      "Click Renew to see the price and record your offline payment.",
      "For billing questions, use the support link on the page.",
    ],
  },
  modules: {
    id: "modules",
    title: "Modules",
    whatIs:
      "This screen lets you choose which screens your school wants to use in LumenX Admin. If you turn one off, it disappears from the left menu.",
    whatYouCanDo: [
      "Turn optional screens on or off",
      "See which screens are on right now",
      "Hide features your school does not use",
    ],
    howToUse: [
      "Open Modules from the left menu.",
      "Look through the list of available screens.",
      "Use the switch next to a screen to turn it on or off.",
      "A screen you turn off is removed from the left menu straight away.",
      "Some main screens cannot be turned off.",
    ],
  },
  storage: {
    id: "storage",
    title: "Storage",
    whatIs:
      "This screen shows how much of your school's file space is used by photos, documents, certificates, and attachments. It also shows whether data saved on this device is up to date.",
    whatYouCanDo: [
      "See how much space you have used and how much is left",
      "See space used by photos, documents, and other files",
      "Check whether anything saved on this device is still waiting to be uploaded",
      "Find large files you may not need",
    ],
    howToUse: [
      "Open Storage from the left menu.",
      "Read the summary at the top.",
      "Click a file type to see the files inside it.",
      "Check the status bar to see if any data on this device is waiting to be uploaded.",
      "If you need more space, contact support.",
    ],
  },
  transport: {
    id: "transport",
    title: "Transport",
    whatIs:
      "This is where you manage school buses: routes, stops, drivers, vehicles, and which students use the bus. It works together with the LumenX Transport driver app.",
    whatYouCanDo: [
      "Add and change bus routes and stops",
      "Put students on a bus route",
      "Choose the vehicle and driver for each route",
      "Check pick-up and drop-off records",
      "See where a bus is right now, as shown by the driver app",
    ],
    howToUse: [
      "Open Transport from the left menu.",
      "Choose a section at the top: Routes, Enrollments, Attendance, or Vehicles.",
      "In Routes, add or change bus routes and their stops.",
      "In Enrollments, choose a route and stop for each student.",
      "In Attendance, check pick-up and drop-off records for each route.",
    ],
  },
  leave: {
    id: "leave",
    title: "Leave",
    whatIs:
      "This is where teachers and staff ask for leave and you approve or decline it. You can also see who is away on a calendar.",
    whatYouCanDo: [
      "See leave requests waiting for you",
      "Approve or decline a leave request",
      "See who is away on the leave calendar",
      "Check how much leave each staff member has left",
      "Download leave records",
    ],
    howToUse: [
      "Open Leave from the left menu.",
      "Look through the requests waiting for a decision.",
      "Click a request to see the reason, dates, and type of leave.",
      "Click Approve or Reject, and add a note if you need to.",
      "Switch to the calendar to see everyone who is away soon.",
    ],
  },
  fees: {
    id: "fees",
    title: "Fees",
    whatIs:
      "This is where you set up school fees, record payments, and see who still owes money.",
    whatYouCanDo: [
      "Set up and change fee plans",
      "Record a fee payment from a student",
      "See how much each student still owes",
      "Print fee receipts and reports",
      "Narrow payments by class, term, or date",
    ],
    howToUse: [
      "Open Fees from the left menu.",
      "Choose a section: Plans, Payments, or Dues.",
      "In Plans, set up the fees for each class and term.",
      "In Payments, choose a student, type the amount, and record the payment.",
      "In Dues, see which students still have money to pay. Use Export to download a report.",
    ],
  },
  admissions: {
    id: "admissions",
    title: "Admissions",
    whatIs:
      "This is where you keep track of families who want to join your school, from the first enquiry to the day the child joins. Each applicant shows where they are in the process.",
    whatYouCanDo: [
      "See and manage enquiries and applications",
      "Move an applicant forward: enquiry, applied, interview, admitted, joined",
      "Write notes and reminders about each applicant",
      "Download the list of applicants",
      "Narrow the list by stage, class, or date",
    ],
    howToUse: [
      "Open Admissions from the left menu.",
      "Look through the list of applicants.",
      "Click an applicant to see their details.",
      "Use the stage box to move them to the next step.",
      "Once a child has joined, add them to the Students screen.",
    ],
  },
  careers: {
    id: "careers",
    title: "Careers",
    whatIs:
      "This is where you post teaching and staff jobs and look at the people who apply. You can follow each applicant from application to selection.",
    whatYouCanDo: [
      "Post a new job opening",
      "See and manage the people who applied",
      "Follow each applicant: applied, shortlisted, interviewed, selected",
      "Download the list of applicants",
    ],
    howToUse: [
      "Open Careers from the left menu.",
      "Look at the current job openings and how many people applied.",
      "To post a job, click New Vacancy and fill in the form.",
      "Click a job to see its applicants.",
      "Open an applicant to change their stage. Use filters to find people by stage or date.",
    ],
  },
  templates: {
    id: "templates",
    title: "Templates",
    whatIs:
      "This is where you design the layouts for school certificates and letters, such as bonafide certificates and transfer certificates. These layouts are used later to create documents for students.",
    whatYouCanDo: [
      "See the certificate and letter layouts that are ready to use",
      "Make a new layout",
      "Change a layout you already have",
      "Preview a layout with sample details",
      "Publish a layout so it can be used in Documents",
    ],
    howToUse: [
      "Open Templates from the left menu.",
      "Look through the list of layouts.",
      "Click one to preview or change it, or click New Template to start a fresh one.",
      "Add the spots where the student's or school's details should appear.",
      "Click Publish so the layout can be used in Documents.",
    ],
  },
  documents: {
    id: "documents",
    title: "Documents",
    whatIs:
      "This is where you create certificates, letters, and ID cards for students using the layouts from Templates. You can then download or share them.",
    whatYouCanDo: [
      "Create a document for a student",
      "Download a document as a PDF file",
      "See the documents created before",
      "Keep a record of documents given to students",
    ],
    howToUse: [
      "Open Documents from the left menu.",
      "Choose the kind of document you want to create.",
      "Search for the student the document is for.",
      "Check the preview to make sure the details are right.",
      "Click Generate, then click Download to save the PDF.",
    ],
  },
  calendar: {
    id: "calendar",
    title: "Calendar",
    whatIs:
      "This is the school year calendar with holidays, events, and term breaks. Anything you add here also shows in the app for students and parents.",
    whatYouCanDo: [
      "See the whole school year or one month at a time",
      "Add holidays and days off",
      "Add school events",
      "Change or delete calendar entries",
      "See what is coming up soon",
    ],
    howToUse: [
      "Open Calendar from the left menu.",
      "Use the year view to see the whole school year.",
      "Switch to the month view to add or change a date.",
      "Click a date, type the name, choose Holiday or Event, and click Save.",
      "Students and parents will see the change in their app.",
    ],
  },
  events: {
    id: "events",
    title: "Events",
    whatIs:
      "This is where you plan school events such as sports day or annual day and share them with students and parents.",
    whatYouCanDo: [
      "Create and publish a school event",
      "Add the date, time, place, and details",
      "Choose specific classes or the whole school",
      "Keep track of who is coming",
      "Change or cancel an upcoming event",
    ],
    howToUse: [
      "Open Events from the left menu.",
      "Click New Event.",
      "Fill in the event name, date, time, and place.",
      "Choose who should see it: everyone or only certain classes.",
      "Click Publish to share it with students and parents. To change it later, click the event and update it.",
    ],
  },
  reports: {
    id: "reports",
    title: "Reports",
    whatIs:
      "This is where you download ready-made reports as Excel, PDF, or spreadsheet files. It has no charts, only files to download.",
    whatYouCanDo: [
      "Download student lists, mark sheets, and attendance reports",
      "Download fee payments and unpaid fees",
      "Download teacher and staff reports",
      "Download transport attendance reports",
      "Choose the school year, class, and dates for a report",
    ],
    howToUse: [
      "Open Reports from the left menu.",
      "Choose the report you need from the list.",
      "Pick the school year, class, and dates.",
      "Click Generate or Export.",
      "The file will download to your computer.",
    ],
  },
  "teacher-performance": {
    id: "teacher-performance",
    title: "Teacher Performance",
    whatIs:
      "This screen shows how teachers are doing, using student feedback, homework completion, and attendance. It is for viewing only. To download the data, use the Reports screen.",
    whatYouCanDo: [
      "See each teacher's scores and how they change over time",
      "Read student ratings and comments about teachers",
      "Compare teachers by department or subject",
      "Spot teachers who are improving or slipping",
    ],
    howToUse: [
      "Open Teacher Performance from the left menu.",
      "Look through the list of teachers and their scores.",
      "Click a teacher to see their scores in more detail.",
      "Use the filters to compare by subject, class, or term.",
      "To download the data, go to Reports.",
    ],
  },
  settings: {
    id: "settings",
    title: "Settings",
    whatIs:
      "This is where you control how LumenX Admin works for your school. It covers school settings, your school's details, and help options.",
    whatYouCanDo: [
      "Change your school's logo and contact details",
      "Change school-wide choices for how the app works",
      "Open Roles & Access to decide what staff can do",
      "Find help and support",
      "Look at privacy and data options",
    ],
    howToUse: [
      "Open Settings from the left menu.",
      "Look through the groups of settings.",
      "Click a group to open it.",
      "Make your changes and click Save.",
      "Some items, like roles, open their own screen.",
    ],
  },
  "profile-settings": {
    id: "profile-settings",
    title: "Profile Settings",
    whatIs:
      "This is where you change your own settings: your name, how the app looks, your lock PIN, and choices for this device.",
    whatYouCanDo: [
      "Change your name and contact details",
      "Switch between light and dark appearance",
      "Set or change your lock PIN",
      "Choose settings for this device",
    ],
    howToUse: [
      "Open Profile Settings from the left menu or by clicking your picture.",
      "Change your name or email in the Profile section.",
      "Choose Light or Dark for how the app looks.",
      "Set your lock PIN in the Security section.",
      "Click Save in each section after you make a change.",
    ],
  },
  institute: {
    id: "institute",
    title: "Institute Profile",
    whatIs:
      "This is where you keep your school's official details: name, address, logo, and contact information. These details show on certificates and on the parent and student login pages.",
    whatYouCanDo: [
      "Change the school name, address, and contact details",
      "Upload or change the school logo",
      "Set the school's official email and phone number",
      "Choose how your school's name and logo look",
    ],
    howToUse: [
      "Open Institute Profile from Settings in the left menu.",
      "Look at the details that are there now.",
      "Click Edit to change the name, address, or contact details.",
      "Upload a new logo in the logo box.",
      "Click Save. The new details will show on certificates and in the parent and student app.",
    ],
  },
  setup: {
    id: "setup",
    title: "Setup",
    whatIs:
      "This is a step-by-step checklist to get your school ready when you first start using LumenX. Finishing it makes sure the Admin, parent, and driver apps all show the right information.",
    whatYouCanDo: [
      "Follow the checklist one step at a time",
      "See which steps are done and which are left",
      "Jump straight to the screen for each step",
      "Make sure your school is ready to use every day",
    ],
    howToUse: [
      "Open Setup from the left menu. It appears while you are getting started.",
      "Read through the checklist.",
      "Click any step that is not done to go to that screen.",
      "Finish each step: school details, school year, classes, teachers, and subjects.",
      "When every step is ticked, setup is done. You can come back to the checklist any time.",
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
