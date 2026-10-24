import {
  createGetModuleHelp,
  normalizeModuleHelpKey,
  type ModuleHelpContent,
  type ModuleHelpRegistry,
} from "@lumenx/module-help";

const _registry: Record<string, ModuleHelpContent> = {
  "home": {
    id: "home",
    title: "Admissions Home",
    whatIs:
      "Admissions Home is where you start. Find schools and programs, or check on your applications.",
    whatYouCanDo: [
      "Look for schools and programs",
      "Start a new application",
      "Check how your applications are going",
    ],
    howToUse: [
      "Open Admissions Home.",
      "Choose Find institutes or go to your applications.",
      "Pick the school or program you like.",
      "Follow the steps on that page.",
    ],
  },
  "institutes": {
    id: "institutes",
    title: "Institutes",
    whatIs:
      "Institutes lists the schools and colleges that are taking applications.",
    whatYouCanDo: [
      "Search by name or place",
      "Read about each institute",
      "See which programs they offer",
      "Start an application",
    ],
    howToUse: [
      "Open Institutes from the menu.",
      "Search or scroll to find an institute.",
      "Tap it to read about it.",
      "Tap Apply when you are ready.",
    ],
  },
  "programs": {
    id: "programs",
    title: "Programs",
    whatIs:
      "Programs lists the courses and classes you can apply to.",
    whatYouCanDo: [
      "Browse the courses on offer",
      "Read about duration and eligibility",
      "See which institute offers each program",
    ],
    howToUse: [
      "Open Programs from the menu.",
      "Search or use filters to narrow the list.",
      "Tap a program to read the details.",
      "Tap Apply if it is right for you.",
    ],
  },
  "dashboard": {
    id: "dashboard",
    title: "Dashboard",
    whatIs:
      "Dashboard gives you a quick look at your applications and anything that needs your attention.",
    whatYouCanDo: [
      "See how many applications you have sent",
      "Check which ones need more documents",
      "Spot new updates from institutes",
    ],
    howToUse: [
      "Open Dashboard from the menu.",
      "Look at the cards for each area.",
      "Tap a card to see more.",
      "Come back any time to check progress.",
    ],
  },
  "apply": {
    id: "apply",
    title: "Apply",
    whatIs:
      "Apply is where you fill in and send your application to an institute.",
    whatYouCanDo: [
      "Fill in the student's details",
      "Attach the documents asked for",
      "Save and finish later",
      "Send the application",
    ],
    howToUse: [
      "Choose an institute and tap Apply.",
      "Fill in the form and add your documents.",
      "Check everything once more.",
      "Tap Submit to send your application.",
    ],
  },
  "applications": {
    id: "applications",
    title: "Applications",
    whatIs:
      "Applications lists everything you have applied for and where each one stands.",
    whatYouCanDo: [
      "See the status of each application",
      "Open one to see what you sent",
      "Finish an application you saved earlier",
    ],
    howToUse: [
      "Open Applications from the menu.",
      "Find the application in the list.",
      "Tap it to see the status.",
      "Do any step it asks for, like adding a document.",
    ],
  },
  "documents": {
    id: "documents",
    title: "Documents",
    whatIs:
      "Documents is where you keep the papers institutes ask for, like certificates and photos.",
    whatYouCanDo: [
      "Upload a document",
      "See which documents are still needed",
      "Replace a wrong or old file",
    ],
    howToUse: [
      "Open Documents from the menu.",
      "Tap Upload next to the document you need.",
      "Choose the file from your phone or computer.",
      "Wait for it to finish, and it is saved.",
    ],
  },
  "inquiries": {
    id: "inquiries",
    title: "Inquiries",
    whatIs:
      "Inquiries is where you ask an institute a question before or after you apply.",
    whatYouCanDo: [
      "Send a question to an institute",
      "Read their replies",
      "See your earlier questions",
    ],
    howToUse: [
      "Open Inquiries from the menu.",
      "Tap New inquiry and choose the institute.",
      "Write your question and send it.",
      "Come back later to read the reply.",
    ],
  },
  "notifications": {
    id: "notifications",
    title: "Notifications",
    whatIs:
      "Notifications lists updates about your applications and questions.",
    whatYouCanDo: [
      "See new updates",
      "Open an update to go to the related page",
      "Mark updates as read",
    ],
    howToUse: [
      "Open Notifications from the menu.",
      "Look at the newest updates first.",
      "Tap one to read it.",
      "Mark it as read when you are done.",
    ],
  },
  "faq": {
    id: "faq",
    title: "FAQs",
    whatIs:
      "FAQs gives quick answers to common questions about applying.",
    whatYouCanDo: [
      "Search for your question",
      "Read short, simple answers",
      "Find out what to do next",
    ],
    howToUse: [
      "Open FAQs from the menu.",
      "Search or scroll for your question.",
      "Tap it to read the answer.",
      "If you still need help, go to Contact.",
    ],
  },
  "contact": {
    id: "contact",
    title: "Contact",
    whatIs:
      "Contact is where you reach the admissions team when you need help.",
    whatYouCanDo: [
      "Find phone and email details",
      "Send a message to the team",
      "Tell us about a problem",
    ],
    howToUse: [
      "Open Contact from the menu.",
      "Choose how you want to reach us.",
      "Write your message.",
      "Tap Send and wait for a reply.",
    ],
  },
  "profile": {
    id: "profile",
    title: "Profile",
    whatIs:
      "Profile is where you keep your own details, so you do not have to type them again on each application.",
    whatYouCanDo: [
      "Check your name and contact details",
      "Update your phone number or email",
      "Change your photo or password",
    ],
    howToUse: [
      "Open Profile from the menu.",
      "Find the detail you want to change.",
      "Type in the new information.",
      "Save, and you are done.",
    ],
  },
  "settings": {
    id: "settings",
    title: "Settings",
    whatIs:
      "Settings is where you choose how the app works for you.",
    whatYouCanDo: [
      "Choose which updates you receive",
      "Change your password",
      "Sign out",
    ],
    howToUse: [
      "Open Settings from the menu.",
      "Find the option you want to change.",
      "Switch it on or off, or enter a new value.",
      "Save, and you are done.",
    ],
  },
  "institute": {
    id: "institute",
    title: "Institute dashboard",
    whatIs:
      "Institute dashboard is the home page for school staff handling admissions. It shows new applications and open admissions.",
    whatYouCanDo: [
      "See how many applications have come in",
      "Check which ones need a decision",
      "Go to openings, the form, and your institute profile",
    ],
    howToUse: [
      "Open Institute dashboard from the menu.",
      "Look at the cards for new applications.",
      "Tap a card to open that page.",
      "Use the menu to move to another task.",
    ],
  },
  "institute-applications": {
    id: "institute-applications",
    title: "Institute applications",
    whatIs:
      "Institute applications is where staff read the applications that have come in and decide what happens next.",
    whatYouCanDo: [
      "See all applications for your institute",
      "Read an applicant's form and documents",
      "Accept, decline, or ask for more information",
    ],
    howToUse: [
      "Open Institute applications from the menu.",
      "Find the applicant in the list.",
      "Tap their name to read the form and documents.",
      "Choose Accept, Decline, or Ask for more information.",
    ],
  },
  "institute-openings": {
    id: "institute-openings",
    title: "Openings",
    whatIs:
      "Openings is where you tell families which classes or programs are taking applications, and for how long.",
    whatYouCanDo: [
      "Add a new opening",
      "Set the dates and number of seats",
      "Close an opening when it is full",
    ],
    howToUse: [
      "Open Openings from the menu.",
      "Tap New opening, or pick one to change.",
      "Fill in the program, dates, and seats.",
      "Save or publish to make it visible to families.",
    ],
  },
  "institute-form": {
    id: "institute-form",
    title: "Application form",
    whatIs:
      "Application form is where you choose what families must fill in and upload when they apply.",
    whatYouCanDo: [
      "Add or remove questions",
      "Choose which documents are needed",
      "Mark questions as required",
    ],
    howToUse: [
      "Open Application form from the menu.",
      "Tap Add question, or pick one to change.",
      "Choose if it is required.",
      "Save, and the form is updated.",
    ],
  },
  "institute-profile": {
    id: "institute-profile",
    title: "Institute profile",
    whatIs:
      "Institute profile is the page families see about your school. Keep it up to date so they know who you are.",
    whatYouCanDo: [
      "Change your school's name and description",
      "Add a logo and photos",
      "Update the address and contact details",
    ],
    howToUse: [
      "Open Institute profile from the menu.",
      "Tap Edit.",
      "Change the details or photos.",
      "Save, and families see the new page.",
    ],
  },
  "institute-settings": {
    id: "institute-settings",
    title: "Institute settings",
    whatIs:
      "Institute settings is where you choose how your admissions work, like who gets updates and when applications close.",
    whatYouCanDo: [
      "Choose who gets admission updates",
      "Set the default dates for applications",
      "Manage staff who can use admissions",
    ],
    howToUse: [
      "Open Institute settings from the menu.",
      "Find the option you want to change.",
      "Switch it on or off, or enter a new value.",
      "Save, and you are done.",
    ],
  },
};

export const MODULE_HELP_REGISTRY: ModuleHelpRegistry = _registry;

export const MODULE_HELP_REQUIRED_IDS = [
  "home",
  "institutes",
  "programs",
  "dashboard",
  "apply",
  "applications",
  "documents",
  "inquiries",
  "notifications",
  "faq",
  "contact",
  "profile",
  "settings",
  "institute",
  "institute-applications",
  "institute-openings",
  "institute-form",
  "institute-profile",
  "institute-settings"
] as const;

export { normalizeModuleHelpKey };
export const getModuleHelp = createGetModuleHelp(MODULE_HELP_REGISTRY);
