import {
  createGetModuleHelp,
  normalizeModuleHelpKey,
  type ModuleHelpContent,
  type ModuleHelpRegistry,
} from "@lumenx/module-help";

const _registry: Record<string, ModuleHelpContent> = {
  "home": {
    id: "home",
    title: "Home",
    whatIs:
      "Home is your starting page. It shows what matters today at school in one place.",
    whatYouCanDo: [
      "See today's attendance, homework, and notices at a glance",
      "Jump quickly to the page you need",
      "Spot anything new that needs your attention",
    ],
    howToUse: [
      "Open Home from the menu.",
      "Look at the cards to see today's updates.",
      "Tap a card to open the full page.",
      "Use the menu to go to another page when you are done.",
    ],
  },
  "attendance": {
    id: "attendance",
    title: "Attendance",
    whatIs:
      "Attendance shows whether a student was present or absent each day.",
    whatYouCanDo: [
      "Check who was present, absent, or late today",
      "Look back at earlier days and months",
      "Teachers can mark attendance for their class",
    ],
    howToUse: [
      "Open Attendance from the menu.",
      "Pick the day, month, or class you want to see.",
      "Read the status shown, or teachers tap to mark present or absent.",
      "Save if the page asks you to, and you are done.",
    ],
  },
  "transport": {
    id: "transport",
    title: "Transport",
    whatIs:
      "Transport shows school bus details and where the bus is on its trip.",
    whatYouCanDo: [
      "See which bus and stop a student uses",
      "Check if the bus has started its trip",
      "Find the driver's name and contact details",
    ],
    howToUse: [
      "Open Transport from the menu.",
      "Choose the student if you have more than one child.",
      "Read the bus, stop, and trip details.",
      "Come back any time to check the latest status.",
    ],
  },
  "assignments": {
    id: "assignments",
    title: "Homework",
    whatIs:
      "Homework lists the work teachers have given and when it is due.",
    whatYouCanDo: [
      "See new and pending homework",
      "Check due dates so nothing is missed",
      "Students can turn in their work",
      "Teachers can give homework and check what came in",
    ],
    howToUse: [
      "Open Homework from the menu.",
      "Find the subject or task you need.",
      "Open it to read the details.",
      "Turn in your work or add new homework, then save.",
    ],
  },
  "marks": {
    id: "marks",
    title: "Marks",
    whatIs:
      "Marks shows scores from tests and exams, and report cards.",
    whatYouCanDo: [
      "See marks for each subject",
      "Compare results across tests and exams",
      "View or download the report card",
      "Teachers can enter marks for their class",
    ],
    howToUse: [
      "Open Marks from the menu.",
      "Choose the exam, term, or subject.",
      "Read the marks shown, or teachers type in the marks.",
      "Save, or open the report card to download it.",
    ],
  },
  "diary": {
    id: "diary",
    title: "Class Diary",
    whatIs:
      "Class Diary holds the daily notes about what was taught and what to do at home.",
    whatYouCanDo: [
      "Read today's class notes",
      "See notes from earlier days",
      "Teachers can write a diary note for their class",
    ],
    howToUse: [
      "Open Class Diary from the menu.",
      "Pick the date or subject.",
      "Read the note, or teachers write a new one.",
      "Save if you wrote something, and you are done.",
    ],
  },
  "timetable": {
    id: "timetable",
    title: "Timetable",
    whatIs:
      "Timetable shows which class or subject happens at what time each day.",
    whatYouCanDo: [
      "See today's periods in order",
      "Look at the whole week",
      "Check which teacher takes each period",
    ],
    howToUse: [
      "Open Timetable from the menu.",
      "Choose the day or week you want.",
      "Read the subjects and times.",
      "Go back to Home when you are done.",
    ],
  },
  "exams": {
    id: "exams",
    title: "Exams",
    whatIs:
      "Exams shows upcoming exam dates and the results once they are ready.",
    whatYouCanDo: [
      "See the exam dates and subjects",
      "Check the time and place for each exam",
      "Look at results after they are published",
    ],
    howToUse: [
      "Open Exams from the menu.",
      "Choose Upcoming or Results.",
      "Tap an exam to see its details.",
      "Note the dates, then return to Home.",
    ],
  },
  "alerts": {
    id: "alerts",
    title: "Alerts",
    whatIs:
      "Alerts shows urgent messages from the school that you should read soon.",
    whatYouCanDo: [
      "Read urgent school notices",
      "See which alerts are new",
      "Open an alert for the full details",
    ],
    howToUse: [
      "Open Alerts from the menu.",
      "Look for new alerts at the top.",
      "Tap an alert to read it fully.",
      "Follow any steps mentioned in the alert.",
    ],
  },
  "notifications": {
    id: "notifications",
    title: "Notifications",
    whatIs:
      "Notifications collects all the updates sent to you in one list.",
    whatYouCanDo: [
      "Catch up on new updates",
      "See what you have already read",
      "Open a notification to go to the related page",
    ],
    howToUse: [
      "Open Notifications from the menu.",
      "Scroll through the newest updates.",
      "Tap one to read it or open the related page.",
      "Mark them as read when you are done.",
    ],
  },
  "announcements": {
    id: "announcements",
    title: "Announcements",
    whatIs:
      "Announcements shows news and notices shared by the school or teachers.",
    whatYouCanDo: [
      "Read the latest school news",
      "Find older notices when needed",
      "Teachers and staff can post a new announcement",
    ],
    howToUse: [
      "Open Announcements from the menu.",
      "Find the notice you want in the list.",
      "Tap it to read the full message.",
      "To post one, tap New, write your message, and send.",
    ],
  },
  "messages": {
    id: "messages",
    title: "Messages",
    whatIs:
      "Messages lets parents, students, and teachers chat with each other.",
    whatYouCanDo: [
      "Send a message to a teacher or staff member",
      "Read replies",
      "Look back at earlier chats",
    ],
    howToUse: [
      "Open Messages from the menu.",
      "Pick an existing chat or start a new one.",
      "Type your message.",
      "Tap Send. You will see replies in the same chat.",
    ],
  },
  "academic-history": {
    id: "academic-history",
    title: "Academic History",
    whatIs:
      "Academic History shows a student's records from earlier years.",
    whatYouCanDo: [
      "See past classes and years",
      "Look at earlier results",
      "Check progress over time",
    ],
    howToUse: [
      "Open Academic History from the menu.",
      "Choose the year you want to see.",
      "Read the results and details.",
      "Go back to Home when you are done.",
    ],
  },
  "achievements": {
    id: "achievements",
    title: "Achievements",
    whatIs:
      "Achievements shows awards, prizes, and special moments earned by a student.",
    whatYouCanDo: [
      "See awards and certificates won",
      "Look back at proud moments",
      "Teachers can add a new achievement for a student",
    ],
    howToUse: [
      "Open Achievements from the menu.",
      "Browse the list of awards.",
      "Tap one to see the details.",
      "Teachers can tap Add, fill in the details, and save.",
    ],
  },
  "growth": {
    id: "growth",
    title: "Growth",
    whatIs:
      "Growth shows how a student is improving over time.",
    whatYouCanDo: [
      "See progress in each subject",
      "Spot strong areas and areas that need help",
      "Compare this term with earlier ones",
    ],
    howToUse: [
      "Open Growth from the menu.",
      "Choose the student or time period.",
      "Read the progress shown.",
      "Talk to the teacher if something needs attention.",
    ],
  },
  "events": {
    id: "events",
    title: "Events",
    whatIs:
      "Events shows school programs, holidays, and important dates.",
    whatYouCanDo: [
      "See what is coming up at school",
      "Check dates on the calendar",
      "Read details about each event",
    ],
    howToUse: [
      "Open Events from the menu.",
      "Pick a month or scroll the list.",
      "Tap an event to see the date, time, and details.",
      "Note it in your own calendar if you need to.",
    ],
  },
  "fees": {
    id: "fees",
    title: "Fees",
    whatIs:
      "Fees shows what is due, what has been paid, and past receipts.",
    whatYouCanDo: [
      "See the amount due and the last date to pay",
      "Check which fees are already paid",
      "View or download receipts",
    ],
    howToUse: [
      "Open Fees from the menu.",
      "Look at the amount due and the due date.",
      "Open a fee to see its breakdown.",
      "Download the receipt after payment.",
    ],
  },
  "activities": {
    id: "activities",
    title: "Activities",
    whatIs:
      "Activities shows sports and other clubs a student can join or is already in.",
    whatYouCanDo: [
      "See the sports and clubs on offer",
      "Check which ones a student has joined",
      "Read about schedules and coaches",
    ],
    howToUse: [
      "Open Activities from the menu.",
      "Browse the list of sports and clubs.",
      "Tap one to read the details.",
      "Follow the steps shown if you want to join.",
    ],
  },
  "teachers": {
    id: "teachers",
    title: "Teachers",
    whatIs:
      "Teachers lists the teachers for a student and how to reach them.",
    whatYouCanDo: [
      "See each teacher and the subject they teach",
      "Find contact details",
      "Start a message to a teacher",
    ],
    howToUse: [
      "Open Teachers from the menu.",
      "Find the teacher in the list.",
      "Tap the name to see more details.",
      "Tap Message to write to them.",
    ],
  },
  "certificates": {
    id: "certificates",
    title: "Certificates",
    whatIs:
      "Certificates keeps the certificates the school has given to a student.",
    whatYouCanDo: [
      "See all certificates received",
      "Open a certificate to read it",
      "Download a copy to keep",
    ],
    howToUse: [
      "Open Certificates from the menu.",
      "Find the certificate in the list.",
      "Tap it to open.",
      "Tap Download to save a copy.",
    ],
  },
  "id-card": {
    id: "id-card",
    title: "ID Card",
    whatIs:
      "ID Card shows a student's school ID card on your phone.",
    whatYouCanDo: [
      "Show the ID card when needed",
      "Check the name, class, and photo on it",
      "Download a copy",
    ],
    howToUse: [
      "Open ID Card from the menu.",
      "Check that the details look correct.",
      "Show it at the gate or when asked.",
      "Tap Download if you want a copy.",
    ],
  },
  "complaints": {
    id: "complaints",
    title: "Complaints",
    whatIs:
      "Complaints is where you tell the school about a problem and follow what happens next.",
    whatYouCanDo: [
      "Write a new complaint",
      "See complaints you sent earlier",
      "Check if the school has replied",
    ],
    howToUse: [
      "Open Complaints from the menu.",
      "Tap New complaint.",
      "Describe the problem clearly and submit.",
      "Come back later to see the reply.",
    ],
  },
  "leave": {
    id: "leave",
    title: "Leave",
    whatIs:
      "Leave is where you ask for time off and see if it has been approved.",
    whatYouCanDo: [
      "Ask for leave for a student or yourself",
      "See if a request is approved or waiting",
      "Teachers can approve or decline requests",
    ],
    howToUse: [
      "Open Leave from the menu.",
      "Tap New request and choose the dates.",
      "Add a short reason and submit.",
      "Teachers open a request and tap Approve or Decline.",
    ],
  },
  "students": {
    id: "students",
    title: "Students",
    whatIs:
      "Students is the list of students in your classes.",
    whatYouCanDo: [
      "Find a student by name",
      "Open a student's details",
      "Go on to attendance, marks, or remarks for that student",
    ],
    howToUse: [
      "Open Students from the menu.",
      "Pick a class or search by name.",
      "Tap a student to see their details.",
      "Use the buttons on that page to do your next task.",
    ],
  },
  "classes": {
    id: "classes",
    title: "My Classes",
    whatIs:
      "My Classes lists the classes you teach, so you can start your daily work from here.",
    whatYouCanDo: [
      "See all your classes and sections",
      "Open a class to see its students",
      "Go on to attendance, homework, or marks",
    ],
    howToUse: [
      "Open My Classes from the menu.",
      "Pick the class you want.",
      "See the students and options for that class.",
      "Tap the task you want to do next.",
    ],
  },
  "remarks": {
    id: "remarks",
    title: "Remarks",
    whatIs:
      "Remarks is where teachers write short notes about a student, and parents can read them.",
    whatYouCanDo: [
      "Read remarks about a student",
      "Teachers can add a new remark",
      "Look back at earlier remarks",
    ],
    howToUse: [
      "Open Remarks from the menu.",
      "Choose the student.",
      "Read the notes, or teachers tap Add and write a remark.",
      "Save, and the remark is recorded.",
    ],
  },
  "profile": {
    id: "profile",
    title: "Profile & Settings",
    whatIs:
      "Profile & Settings is where you see your own details and choose how the app works for you.",
    whatYouCanDo: [
      "Check your name and contact details",
      "Change your photo or password",
      "Choose which updates you want to receive",
      "Sign out",
    ],
    howToUse: [
      "Open Profile & Settings from the menu.",
      "Find the detail or setting you want to change.",
      "Make the change.",
      "Save, and you are done.",
    ],
  },
  "activity": {
    id: "activity",
    title: "Activity Home",
    whatIs:
      "Activity Home is the starting page for sports and clubs. It shows what is happening today.",
    whatYouCanDo: [
      "See today's sessions and updates",
      "Jump to attendance, practice, or the calendar",
      "Spot new announcements and messages",
    ],
    howToUse: [
      "Open Activity Home from the menu.",
      "Read the cards for today.",
      "Tap a card to open that page.",
      "Use the menu to move around.",
    ],
  },
  "activity-sports": {
    id: "activity-sports",
    title: "Sports",
    whatIs:
      "Sports is where coaches look after their sports teams and sessions.",
    whatYouCanDo: [
      "See the sports teams you look after",
      "Check the players in each team",
      "Open upcoming sessions",
    ],
    howToUse: [
      "Open Sports from the menu.",
      "Choose a team.",
      "See the players and sessions.",
      "Tap a session to take attendance or add notes.",
    ],
  },
  "activity-extra-curricular": {
    id: "activity-extra-curricular",
    title: "Extra-curricular",
    whatIs:
      "Extra-curricular is where you look after clubs like music, art, and drama.",
    whatYouCanDo: [
      "See the clubs you run",
      "Check the members of each club",
      "Plan and review club sessions",
    ],
    howToUse: [
      "Open Extra-curricular from the menu.",
      "Choose a club.",
      "See its members and sessions.",
      "Tap a session to plan it or take attendance.",
    ],
  },
  "activity-attendance": {
    id: "activity-attendance",
    title: "Activity Attendance",
    whatIs:
      "Activity Attendance is where you mark who came to a sports or club session.",
    whatYouCanDo: [
      "Mark students present or absent",
      "Check who attended earlier",
      "Fix a mistake from a past session",
    ],
    howToUse: [
      "Open Activity Attendance from the menu.",
      "Choose the team or club and the date.",
      "Tap each student to mark present or absent.",
      "Save, and attendance is recorded.",
    ],
  },
  "activity-diary": {
    id: "activity-diary",
    title: "Activity Diary",
    whatIs:
      "Activity Diary is where you write short notes about what happened in a session.",
    whatYouCanDo: [
      "Write a note for today's session",
      "Read earlier notes",
      "Share what students should practise next",
    ],
    howToUse: [
      "Open Activity Diary from the menu.",
      "Choose the team or club.",
      "Tap Add note and write what happened.",
      "Save, and the note is stored.",
    ],
  },
  "activity-achievements": {
    id: "activity-achievements",
    title: "Activity Achievements",
    whatIs:
      "Activity Achievements is where you record wins and awards from sports and clubs.",
    whatYouCanDo: [
      "Add a new award or win",
      "See past achievements",
      "Celebrate a student's progress",
    ],
    howToUse: [
      "Open Activity Achievements from the menu.",
      "Tap Add.",
      "Choose the student and fill in the award details.",
      "Save, and it shows up in the list.",
    ],
  },
  "activity-messages": {
    id: "activity-messages",
    title: "Activity Messages",
    whatIs:
      "Activity Messages lets you chat with the members of a team or club.",
    whatYouCanDo: [
      "Send a message to a team or club",
      "Read replies",
      "Look back at earlier chats",
    ],
    howToUse: [
      "Open Activity Messages from the menu.",
      "Pick a chat or start a new one.",
      "Type your message.",
      "Tap Send.",
    ],
  },
  "activity-notifications": {
    id: "activity-notifications",
    title: "Activity Notifications",
    whatIs:
      "Activity Notifications collects updates about sports and clubs in one list.",
    whatYouCanDo: [
      "See new updates about sessions and teams",
      "Open an update for details",
      "Mark updates as read",
    ],
    howToUse: [
      "Open Activity Notifications from the menu.",
      "Scroll to see the newest updates.",
      "Tap one to read it.",
      "Mark them as read when you are done.",
    ],
  },
  "activity-announcements": {
    id: "activity-announcements",
    title: "Activity Announcements",
    whatIs:
      "Activity Announcements is where news for sports and clubs is posted and read.",
    whatYouCanDo: [
      "Read news about teams and clubs",
      "Post a new announcement for members",
      "Look back at older notices",
    ],
    howToUse: [
      "Open Activity Announcements from the menu.",
      "Find the notice you want, or tap New to write one.",
      "Choose who should see it and write your message.",
      "Tap Post to share it.",
    ],
  },
  "activity-practice": {
    id: "activity-practice",
    title: "Practice",
    whatIs:
      "Practice is where you plan practice sessions and see how they went.",
    whatYouCanDo: [
      "Plan a new practice session",
      "See upcoming and past sessions",
      "Add notes after a session",
    ],
    howToUse: [
      "Open Practice from the menu.",
      "Tap New session and choose the date and time.",
      "Add the plan for the session.",
      "Save, and add notes after the session ends.",
    ],
  },
  "activity-calendar": {
    id: "activity-calendar",
    title: "Activity Calendar",
    whatIs:
      "Activity Calendar shows all sports and club sessions and events by date.",
    whatYouCanDo: [
      "See what is planned this week or month",
      "Check the time and place of a session",
      "Spot matches and special events",
    ],
    howToUse: [
      "Open Activity Calendar from the menu.",
      "Pick the month or week.",
      "Tap a date or event to see details.",
      "Go back when you are done.",
    ],
  },
  "activity-profile": {
    id: "activity-profile",
    title: "Activity Profile",
    whatIs:
      "Activity Profile is where you see your own details for sports and clubs and change your settings.",
    whatYouCanDo: [
      "Check your name and contact details",
      "Choose which updates you want to get",
      "Sign out",
    ],
    howToUse: [
      "Open Activity Profile from the menu.",
      "Find the detail or setting you want to change.",
      "Make the change.",
      "Save, and you are done.",
    ],
  },
};

export const MODULE_HELP_REGISTRY: ModuleHelpRegistry = _registry;

export const MODULE_HELP_REQUIRED_IDS = [
  "home",
  "attendance",
  "transport",
  "assignments",
  "marks",
  "diary",
  "timetable",
  "exams",
  "alerts",
  "notifications",
  "announcements",
  "messages",
  "academic-history",
  "achievements",
  "growth",
  "events",
  "fees",
  "activities",
  "teachers",
  "certificates",
  "id-card",
  "complaints",
  "leave",
  "students",
  "classes",
  "remarks",
  "profile",
  "activity",
  "activity-sports",
  "activity-extra-curricular",
  "activity-attendance",
  "activity-diary",
  "activity-achievements",
  "activity-messages",
  "activity-notifications",
  "activity-announcements",
  "activity-practice",
  "activity-calendar",
  "activity-profile"
] as const;

export { normalizeModuleHelpKey };
export const getModuleHelp = createGetModuleHelp(MODULE_HELP_REGISTRY);
