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
      "Home is where you see today's school overview and shortcuts. Use this screen to stay on top of the related tasks in LumenX.",
    whatYouCanDo: [
      "View the latest home information",
      "Take the actions available for home",
      "Review status, filters, and details for this module",
      "Return here anytime from the app navigation",
    ],
    howToUse: [
      "Open Home from the navigation.",
      "Review the summary or list shown on the page.",
      "Use filters, search, or tabs if available to find what you need.",
      "Open an item for details, or use the primary action buttons on the page.",
      "When finished, use the bottom or side navigation to move to another module.",
    ],
  },
  "attendance": {
    id: "attendance",
    title: "Attendance",
    whatIs:
      "Attendance is where you check present/absent status. Use this screen to stay on top of the related tasks in LumenX.",
    whatYouCanDo: [
      "View the latest attendance information",
      "Take the actions available for attendance",
      "Review status, filters, and details for this module",
      "Return here anytime from the app navigation",
    ],
    howToUse: [
      "Open Attendance from the navigation.",
      "Review the summary or list shown on the page.",
      "Use filters, search, or tabs if available to find what you need.",
      "Open an item for details, or use the primary action buttons on the page.",
      "When finished, use the bottom or side navigation to move to another module.",
    ],
  },
  "transport": {
    id: "transport",
    title: "Transport",
    whatIs:
      "Transport is where you follow bus and trip updates. Use this screen to stay on top of the related tasks in LumenX.",
    whatYouCanDo: [
      "View the latest transport information",
      "Take the actions available for transport",
      "Review status, filters, and details for this module",
      "Return here anytime from the app navigation",
    ],
    howToUse: [
      "Open Transport from the navigation.",
      "Review the summary or list shown on the page.",
      "Use filters, search, or tabs if available to find what you need.",
      "Open an item for details, or use the primary action buttons on the page.",
      "When finished, use the bottom or side navigation to move to another module.",
    ],
  },
  "assignments": {
    id: "assignments",
    title: "Homework",
    whatIs:
      "Homework is where you view and submit assignments. Use this screen to stay on top of the related tasks in LumenX.",
    whatYouCanDo: [
      "View the latest homework information",
      "Take the actions available for homework",
      "Review status, filters, and details for this module",
      "Return here anytime from the app navigation",
    ],
    howToUse: [
      "Open Homework from the navigation.",
      "Review the summary or list shown on the page.",
      "Use filters, search, or tabs if available to find what you need.",
      "Open an item for details, or use the primary action buttons on the page.",
      "When finished, use the bottom or side navigation to move to another module.",
    ],
  },
  "marks": {
    id: "marks",
    title: "Marks",
    whatIs:
      "Marks is where you review scores and report cards. Use this screen to stay on top of the related tasks in LumenX.",
    whatYouCanDo: [
      "View the latest marks information",
      "Take the actions available for marks",
      "Review status, filters, and details for this module",
      "Return here anytime from the app navigation",
    ],
    howToUse: [
      "Open Marks from the navigation.",
      "Review the summary or list shown on the page.",
      "Use filters, search, or tabs if available to find what you need.",
      "Open an item for details, or use the primary action buttons on the page.",
      "When finished, use the bottom or side navigation to move to another module.",
    ],
  },
  "diary": {
    id: "diary",
    title: "Class Diary",
    whatIs:
      "Class Diary is where you read daily class notes and homework notes. Use this screen to stay on top of the related tasks in LumenX.",
    whatYouCanDo: [
      "View the latest class diary information",
      "Take the actions available for class diary",
      "Review status, filters, and details for this module",
      "Return here anytime from the app navigation",
    ],
    howToUse: [
      "Open Class Diary from the navigation.",
      "Review the summary or list shown on the page.",
      "Use filters, search, or tabs if available to find what you need.",
      "Open an item for details, or use the primary action buttons on the page.",
      "When finished, use the bottom or side navigation to move to another module.",
    ],
  },
  "timetable": {
    id: "timetable",
    title: "Timetable",
    whatIs:
      "Timetable is where you see the class schedule. Use this screen to stay on top of the related tasks in LumenX.",
    whatYouCanDo: [
      "View the latest timetable information",
      "Take the actions available for timetable",
      "Review status, filters, and details for this module",
      "Return here anytime from the app navigation",
    ],
    howToUse: [
      "Open Timetable from the navigation.",
      "Review the summary or list shown on the page.",
      "Use filters, search, or tabs if available to find what you need.",
      "Open an item for details, or use the primary action buttons on the page.",
      "When finished, use the bottom or side navigation to move to another module.",
    ],
  },
  "exams": {
    id: "exams",
    title: "Exams",
    whatIs:
      "Exams is where you track upcoming exams and results. Use this screen to stay on top of the related tasks in LumenX.",
    whatYouCanDo: [
      "View the latest exams information",
      "Take the actions available for exams",
      "Review status, filters, and details for this module",
      "Return here anytime from the app navigation",
    ],
    howToUse: [
      "Open Exams from the navigation.",
      "Review the summary or list shown on the page.",
      "Use filters, search, or tabs if available to find what you need.",
      "Open an item for details, or use the primary action buttons on the page.",
      "When finished, use the bottom or side navigation to move to another module.",
    ],
  },
  "alerts": {
    id: "alerts",
    title: "Alerts",
    whatIs:
      "Alerts is where you read urgent school alerts. Use this screen to stay on top of the related tasks in LumenX.",
    whatYouCanDo: [
      "View the latest alerts information",
      "Take the actions available for alerts",
      "Review status, filters, and details for this module",
      "Return here anytime from the app navigation",
    ],
    howToUse: [
      "Open Alerts from the navigation.",
      "Review the summary or list shown on the page.",
      "Use filters, search, or tabs if available to find what you need.",
      "Open an item for details, or use the primary action buttons on the page.",
      "When finished, use the bottom or side navigation to move to another module.",
    ],
  },
  "notifications": {
    id: "notifications",
    title: "Notifications",
    whatIs:
      "Notifications is where you catch up on app notifications. Use this screen to stay on top of the related tasks in LumenX.",
    whatYouCanDo: [
      "View the latest notifications information",
      "Take the actions available for notifications",
      "Review status, filters, and details for this module",
      "Return here anytime from the app navigation",
    ],
    howToUse: [
      "Open Notifications from the navigation.",
      "Review the summary or list shown on the page.",
      "Use filters, search, or tabs if available to find what you need.",
      "Open an item for details, or use the primary action buttons on the page.",
      "When finished, use the bottom or side navigation to move to another module.",
    ],
  },
  "announcements": {
    id: "announcements",
    title: "Announcements",
    whatIs:
      "Announcements is where you read school announcements. Use this screen to stay on top of the related tasks in LumenX.",
    whatYouCanDo: [
      "View the latest announcements information",
      "Take the actions available for announcements",
      "Review status, filters, and details for this module",
      "Return here anytime from the app navigation",
    ],
    howToUse: [
      "Open Announcements from the navigation.",
      "Review the summary or list shown on the page.",
      "Use filters, search, or tabs if available to find what you need.",
      "Open an item for details, or use the primary action buttons on the page.",
      "When finished, use the bottom or side navigation to move to another module.",
    ],
  },
  "messages": {
    id: "messages",
    title: "Messages",
    whatIs:
      "Messages is where you chat with teachers and school staff. Use this screen to stay on top of the related tasks in LumenX.",
    whatYouCanDo: [
      "View the latest messages information",
      "Take the actions available for messages",
      "Review status, filters, and details for this module",
      "Return here anytime from the app navigation",
    ],
    howToUse: [
      "Open Messages from the navigation.",
      "Review the summary or list shown on the page.",
      "Use filters, search, or tabs if available to find what you need.",
      "Open an item for details, or use the primary action buttons on the page.",
      "When finished, use the bottom or side navigation to move to another module.",
    ],
  },
  "academic-history": {
    id: "academic-history",
    title: "Academic History",
    whatIs:
      "Academic History is where you review past academic records. Use this screen to stay on top of the related tasks in LumenX.",
    whatYouCanDo: [
      "View the latest academic history information",
      "Take the actions available for academic history",
      "Review status, filters, and details for this module",
      "Return here anytime from the app navigation",
    ],
    howToUse: [
      "Open Academic History from the navigation.",
      "Review the summary or list shown on the page.",
      "Use filters, search, or tabs if available to find what you need.",
      "Open an item for details, or use the primary action buttons on the page.",
      "When finished, use the bottom or side navigation to move to another module.",
    ],
  },
  "achievements": {
    id: "achievements",
    title: "Achievements",
    whatIs:
      "Achievements is where you see awards and milestones. Use this screen to stay on top of the related tasks in LumenX.",
    whatYouCanDo: [
      "View the latest achievements information",
      "Take the actions available for achievements",
      "Review status, filters, and details for this module",
      "Return here anytime from the app navigation",
    ],
    howToUse: [
      "Open Achievements from the navigation.",
      "Review the summary or list shown on the page.",
      "Use filters, search, or tabs if available to find what you need.",
      "Open an item for details, or use the primary action buttons on the page.",
      "When finished, use the bottom or side navigation to move to another module.",
    ],
  },
  "growth": {
    id: "growth",
    title: "Growth",
    whatIs:
      "Growth is where you follow learning progress insights. Use this screen to stay on top of the related tasks in LumenX.",
    whatYouCanDo: [
      "View the latest growth information",
      "Take the actions available for growth",
      "Review status, filters, and details for this module",
      "Return here anytime from the app navigation",
    ],
    howToUse: [
      "Open Growth from the navigation.",
      "Review the summary or list shown on the page.",
      "Use filters, search, or tabs if available to find what you need.",
      "Open an item for details, or use the primary action buttons on the page.",
      "When finished, use the bottom or side navigation to move to another module.",
    ],
  },
  "events": {
    id: "events",
    title: "Events",
    whatIs:
      "Events is where you browse school events and calendars. Use this screen to stay on top of the related tasks in LumenX.",
    whatYouCanDo: [
      "View the latest events information",
      "Take the actions available for events",
      "Review status, filters, and details for this module",
      "Return here anytime from the app navigation",
    ],
    howToUse: [
      "Open Events from the navigation.",
      "Review the summary or list shown on the page.",
      "Use filters, search, or tabs if available to find what you need.",
      "Open an item for details, or use the primary action buttons on the page.",
      "When finished, use the bottom or side navigation to move to another module.",
    ],
  },
  "fees": {
    id: "fees",
    title: "Fees",
    whatIs:
      "Fees is where you view fee dues and payment status. Use this screen to stay on top of the related tasks in LumenX.",
    whatYouCanDo: [
      "View the latest fees information",
      "Take the actions available for fees",
      "Review status, filters, and details for this module",
      "Return here anytime from the app navigation",
    ],
    howToUse: [
      "Open Fees from the navigation.",
      "Review the summary or list shown on the page.",
      "Use filters, search, or tabs if available to find what you need.",
      "Open an item for details, or use the primary action buttons on the page.",
      "When finished, use the bottom or side navigation to move to another module.",
    ],
  },
  "activities": {
    id: "activities",
    title: "Activities",
    whatIs:
      "Activities is where you explore sports and co-curricular work. Use this screen to stay on top of the related tasks in LumenX.",
    whatYouCanDo: [
      "View the latest activities information",
      "Take the actions available for activities",
      "Review status, filters, and details for this module",
      "Return here anytime from the app navigation",
    ],
    howToUse: [
      "Open Activities from the navigation.",
      "Review the summary or list shown on the page.",
      "Use filters, search, or tabs if available to find what you need.",
      "Open an item for details, or use the primary action buttons on the page.",
      "When finished, use the bottom or side navigation to move to another module.",
    ],
  },
  "teachers": {
    id: "teachers",
    title: "Teachers",
    whatIs:
      "Teachers is where you see assigned teachers and contacts. Use this screen to stay on top of the related tasks in LumenX.",
    whatYouCanDo: [
      "View the latest teachers information",
      "Take the actions available for teachers",
      "Review status, filters, and details for this module",
      "Return here anytime from the app navigation",
    ],
    howToUse: [
      "Open Teachers from the navigation.",
      "Review the summary or list shown on the page.",
      "Use filters, search, or tabs if available to find what you need.",
      "Open an item for details, or use the primary action buttons on the page.",
      "When finished, use the bottom or side navigation to move to another module.",
    ],
  },
  "certificates": {
    id: "certificates",
    title: "Certificates",
    whatIs:
      "Certificates is where you access issued certificates. Use this screen to stay on top of the related tasks in LumenX.",
    whatYouCanDo: [
      "View the latest certificates information",
      "Take the actions available for certificates",
      "Review status, filters, and details for this module",
      "Return here anytime from the app navigation",
    ],
    howToUse: [
      "Open Certificates from the navigation.",
      "Review the summary or list shown on the page.",
      "Use filters, search, or tabs if available to find what you need.",
      "Open an item for details, or use the primary action buttons on the page.",
      "When finished, use the bottom or side navigation to move to another module.",
    ],
  },
  "id-card": {
    id: "id-card",
    title: "ID Card",
    whatIs:
      "ID Card is where you view or download the digital ID card. Use this screen to stay on top of the related tasks in LumenX.",
    whatYouCanDo: [
      "View the latest id card information",
      "Take the actions available for id card",
      "Review status, filters, and details for this module",
      "Return here anytime from the app navigation",
    ],
    howToUse: [
      "Open ID Card from the navigation.",
      "Review the summary or list shown on the page.",
      "Use filters, search, or tabs if available to find what you need.",
      "Open an item for details, or use the primary action buttons on the page.",
      "When finished, use the bottom or side navigation to move to another module.",
    ],
  },
  "complaints": {
    id: "complaints",
    title: "Complaints",
    whatIs:
      "Complaints is where you raise or track complaints. Use this screen to stay on top of the related tasks in LumenX.",
    whatYouCanDo: [
      "View the latest complaints information",
      "Take the actions available for complaints",
      "Review status, filters, and details for this module",
      "Return here anytime from the app navigation",
    ],
    howToUse: [
      "Open Complaints from the navigation.",
      "Review the summary or list shown on the page.",
      "Use filters, search, or tabs if available to find what you need.",
      "Open an item for details, or use the primary action buttons on the page.",
      "When finished, use the bottom or side navigation to move to another module.",
    ],
  },
  "leave": {
    id: "leave",
    title: "Leave",
    whatIs:
      "Leave is where you request or approve leave. Use this screen to stay on top of the related tasks in LumenX.",
    whatYouCanDo: [
      "View the latest leave information",
      "Take the actions available for leave",
      "Review status, filters, and details for this module",
      "Return here anytime from the app navigation",
    ],
    howToUse: [
      "Open Leave from the navigation.",
      "Review the summary or list shown on the page.",
      "Use filters, search, or tabs if available to find what you need.",
      "Open an item for details, or use the primary action buttons on the page.",
      "When finished, use the bottom or side navigation to move to another module.",
    ],
  },
  "students": {
    id: "students",
    title: "Students",
    whatIs:
      "Students is where you browse your class student directory. Use this screen to stay on top of the related tasks in LumenX.",
    whatYouCanDo: [
      "View the latest students information",
      "Take the actions available for students",
      "Review status, filters, and details for this module",
      "Return here anytime from the app navigation",
    ],
    howToUse: [
      "Open Students from the navigation.",
      "Review the summary or list shown on the page.",
      "Use filters, search, or tabs if available to find what you need.",
      "Open an item for details, or use the primary action buttons on the page.",
      "When finished, use the bottom or side navigation to move to another module.",
    ],
  },
  "classes": {
    id: "classes",
    title: "My Classes",
    whatIs:
      "My Classes is where you manage the classes you teach. Use this screen to stay on top of the related tasks in LumenX.",
    whatYouCanDo: [
      "View the latest my classes information",
      "Take the actions available for my classes",
      "Review status, filters, and details for this module",
      "Return here anytime from the app navigation",
    ],
    howToUse: [
      "Open My Classes from the navigation.",
      "Review the summary or list shown on the page.",
      "Use filters, search, or tabs if available to find what you need.",
      "Open an item for details, or use the primary action buttons on the page.",
      "When finished, use the bottom or side navigation to move to another module.",
    ],
  },
  "remarks": {
    id: "remarks",
    title: "Remarks",
    whatIs:
      "Remarks is where you add or review student remarks. Use this screen to stay on top of the related tasks in LumenX.",
    whatYouCanDo: [
      "View the latest remarks information",
      "Take the actions available for remarks",
      "Review status, filters, and details for this module",
      "Return here anytime from the app navigation",
    ],
    howToUse: [
      "Open Remarks from the navigation.",
      "Review the summary or list shown on the page.",
      "Use filters, search, or tabs if available to find what you need.",
      "Open an item for details, or use the primary action buttons on the page.",
      "When finished, use the bottom or side navigation to move to another module.",
    ],
  },
  "profile": {
    id: "profile",
    title: "Profile & Settings",
    whatIs:
      "Profile & Settings is where you manage your Connect profile and preferences. Use this screen to stay on top of the related tasks in LumenX.",
    whatYouCanDo: [
      "View the latest profile & settings information",
      "Take the actions available for profile & settings",
      "Review status, filters, and details for this module",
      "Return here anytime from the app navigation",
    ],
    howToUse: [
      "Open Profile & Settings from the navigation.",
      "Review the summary or list shown on the page.",
      "Use filters, search, or tabs if available to find what you need.",
      "Open an item for details, or use the primary action buttons on the page.",
      "When finished, use the bottom or side navigation to move to another module.",
    ],
  },
  "activity": {
    id: "activity",
    title: "Activity Home",
    whatIs:
      "Activity Home is where you run the activity workspace overview. Use this screen to stay on top of the related tasks in LumenX.",
    whatYouCanDo: [
      "View the latest activity home information",
      "Take the actions available for activity home",
      "Review status, filters, and details for this module",
      "Return here anytime from the app navigation",
    ],
    howToUse: [
      "Open Activity Home from the navigation.",
      "Review the summary or list shown on the page.",
      "Use filters, search, or tabs if available to find what you need.",
      "Open an item for details, or use the primary action buttons on the page.",
      "When finished, use the bottom or side navigation to move to another module.",
    ],
  },
  "activity-sports": {
    id: "activity-sports",
    title: "Sports",
    whatIs:
      "Sports is where you manage sports groups and sessions. Use this screen to stay on top of the related tasks in LumenX.",
    whatYouCanDo: [
      "View the latest sports information",
      "Take the actions available for sports",
      "Review status, filters, and details for this module",
      "Return here anytime from the app navigation",
    ],
    howToUse: [
      "Open Sports from the navigation.",
      "Review the summary or list shown on the page.",
      "Use filters, search, or tabs if available to find what you need.",
      "Open an item for details, or use the primary action buttons on the page.",
      "When finished, use the bottom or side navigation to move to another module.",
    ],
  },
  "activity-extra-curricular": {
    id: "activity-extra-curricular",
    title: "Extra-curricular",
    whatIs:
      "Extra-curricular is where you manage ECA groups and plans. Use this screen to stay on top of the related tasks in LumenX.",
    whatYouCanDo: [
      "View the latest extra-curricular information",
      "Take the actions available for extra-curricular",
      "Review status, filters, and details for this module",
      "Return here anytime from the app navigation",
    ],
    howToUse: [
      "Open Extra-curricular from the navigation.",
      "Review the summary or list shown on the page.",
      "Use filters, search, or tabs if available to find what you need.",
      "Open an item for details, or use the primary action buttons on the page.",
      "When finished, use the bottom or side navigation to move to another module.",
    ],
  },
  "activity-attendance": {
    id: "activity-attendance",
    title: "Activity Attendance",
    whatIs:
      "Activity Attendance is where you mark activity attendance. Use this screen to stay on top of the related tasks in LumenX.",
    whatYouCanDo: [
      "View the latest activity attendance information",
      "Take the actions available for activity attendance",
      "Review status, filters, and details for this module",
      "Return here anytime from the app navigation",
    ],
    howToUse: [
      "Open Activity Attendance from the navigation.",
      "Review the summary or list shown on the page.",
      "Use filters, search, or tabs if available to find what you need.",
      "Open an item for details, or use the primary action buttons on the page.",
      "When finished, use the bottom or side navigation to move to another module.",
    ],
  },
  "activity-diary": {
    id: "activity-diary",
    title: "Activity Diary",
    whatIs:
      "Activity Diary is where you log activity notes. Use this screen to stay on top of the related tasks in LumenX.",
    whatYouCanDo: [
      "View the latest activity diary information",
      "Take the actions available for activity diary",
      "Review status, filters, and details for this module",
      "Return here anytime from the app navigation",
    ],
    howToUse: [
      "Open Activity Diary from the navigation.",
      "Review the summary or list shown on the page.",
      "Use filters, search, or tabs if available to find what you need.",
      "Open an item for details, or use the primary action buttons on the page.",
      "When finished, use the bottom or side navigation to move to another module.",
    ],
  },
  "activity-achievements": {
    id: "activity-achievements",
    title: "Activity Achievements",
    whatIs:
      "Activity Achievements is where you record activity achievements. Use this screen to stay on top of the related tasks in LumenX.",
    whatYouCanDo: [
      "View the latest activity achievements information",
      "Take the actions available for activity achievements",
      "Review status, filters, and details for this module",
      "Return here anytime from the app navigation",
    ],
    howToUse: [
      "Open Activity Achievements from the navigation.",
      "Review the summary or list shown on the page.",
      "Use filters, search, or tabs if available to find what you need.",
      "Open an item for details, or use the primary action buttons on the page.",
      "When finished, use the bottom or side navigation to move to another module.",
    ],
  },
  "activity-messages": {
    id: "activity-messages",
    title: "Activity Messages",
    whatIs:
      "Activity Messages is where you message activity members. Use this screen to stay on top of the related tasks in LumenX.",
    whatYouCanDo: [
      "View the latest activity messages information",
      "Take the actions available for activity messages",
      "Review status, filters, and details for this module",
      "Return here anytime from the app navigation",
    ],
    howToUse: [
      "Open Activity Messages from the navigation.",
      "Review the summary or list shown on the page.",
      "Use filters, search, or tabs if available to find what you need.",
      "Open an item for details, or use the primary action buttons on the page.",
      "When finished, use the bottom or side navigation to move to another module.",
    ],
  },
  "activity-notifications": {
    id: "activity-notifications",
    title: "Activity Notifications",
    whatIs:
      "Activity Notifications is where you read activity notifications. Use this screen to stay on top of the related tasks in LumenX.",
    whatYouCanDo: [
      "View the latest activity notifications information",
      "Take the actions available for activity notifications",
      "Review status, filters, and details for this module",
      "Return here anytime from the app navigation",
    ],
    howToUse: [
      "Open Activity Notifications from the navigation.",
      "Review the summary or list shown on the page.",
      "Use filters, search, or tabs if available to find what you need.",
      "Open an item for details, or use the primary action buttons on the page.",
      "When finished, use the bottom or side navigation to move to another module.",
    ],
  },
  "activity-announcements": {
    id: "activity-announcements",
    title: "Activity Announcements",
    whatIs:
      "Activity Announcements is where you post or read activity announcements. Use this screen to stay on top of the related tasks in LumenX.",
    whatYouCanDo: [
      "View the latest activity announcements information",
      "Take the actions available for activity announcements",
      "Review status, filters, and details for this module",
      "Return here anytime from the app navigation",
    ],
    howToUse: [
      "Open Activity Announcements from the navigation.",
      "Review the summary or list shown on the page.",
      "Use filters, search, or tabs if available to find what you need.",
      "Open an item for details, or use the primary action buttons on the page.",
      "When finished, use the bottom or side navigation to move to another module.",
    ],
  },
  "activity-practice": {
    id: "activity-practice",
    title: "Practice",
    whatIs:
      "Practice is where you plan and track practice sessions. Use this screen to stay on top of the related tasks in LumenX.",
    whatYouCanDo: [
      "View the latest practice information",
      "Take the actions available for practice",
      "Review status, filters, and details for this module",
      "Return here anytime from the app navigation",
    ],
    howToUse: [
      "Open Practice from the navigation.",
      "Review the summary or list shown on the page.",
      "Use filters, search, or tabs if available to find what you need.",
      "Open an item for details, or use the primary action buttons on the page.",
      "When finished, use the bottom or side navigation to move to another module.",
    ],
  },
  "activity-calendar": {
    id: "activity-calendar",
    title: "Activity Calendar",
    whatIs:
      "Activity Calendar is where you see the activity calendar. Use this screen to stay on top of the related tasks in LumenX.",
    whatYouCanDo: [
      "View the latest activity calendar information",
      "Take the actions available for activity calendar",
      "Review status, filters, and details for this module",
      "Return here anytime from the app navigation",
    ],
    howToUse: [
      "Open Activity Calendar from the navigation.",
      "Review the summary or list shown on the page.",
      "Use filters, search, or tabs if available to find what you need.",
      "Open an item for details, or use the primary action buttons on the page.",
      "When finished, use the bottom or side navigation to move to another module.",
    ],
  },
  "activity-profile": {
    id: "activity-profile",
    title: "Activity Profile",
    whatIs:
      "Activity Profile is where you manage activity workspace profile settings. Use this screen to stay on top of the related tasks in LumenX.",
    whatYouCanDo: [
      "View the latest activity profile information",
      "Take the actions available for activity profile",
      "Review status, filters, and details for this module",
      "Return here anytime from the app navigation",
    ],
    howToUse: [
      "Open Activity Profile from the navigation.",
      "Review the summary or list shown on the page.",
      "Use filters, search, or tabs if available to find what you need.",
      "Open an item for details, or use the primary action buttons on the page.",
      "When finished, use the bottom or side navigation to move to another module.",
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
