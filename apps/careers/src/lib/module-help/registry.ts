import {
  createGetModuleHelp,
  normalizeModuleHelpKey,
  type ModuleHelpContent,
  type ModuleHelpRegistry,
} from "@lumenx/module-help";

const _registry: Record<string, ModuleHelpContent> = {
  "home": {
    id: "home",
    title: "Careers Home",
    whatIs:
      "Careers Home is where you explore LumenX Careers and start job seeking or hiring. Use this screen to stay on top of the related tasks in LumenX.",
    whatYouCanDo: [
      "View the latest careers home information",
      "Take the actions available for careers home",
      "Review status, filters, and details for this module",
      "Return here anytime from the app navigation",
    ],
    howToUse: [
      "Open Careers Home from the navigation.",
      "Review the summary or list shown on the page.",
      "Use filters, search, or tabs if available to find what you need.",
      "Open an item for details, or use the primary action buttons on the page.",
      "When finished, use the bottom or side navigation to move to another module.",
    ],
  },
  "jobs": {
    id: "jobs",
    title: "Jobs",
    whatIs:
      "Jobs is where you browse open roles. Use this screen to stay on top of the related tasks in LumenX.",
    whatYouCanDo: [
      "View the latest jobs information",
      "Take the actions available for jobs",
      "Review status, filters, and details for this module",
      "Return here anytime from the app navigation",
    ],
    howToUse: [
      "Open Jobs from the navigation.",
      "Review the summary or list shown on the page.",
      "Use filters, search, or tabs if available to find what you need.",
      "Open an item for details, or use the primary action buttons on the page.",
      "When finished, use the bottom or side navigation to move to another module.",
    ],
  },
  "dashboard": {
    id: "dashboard",
    title: "Dashboard",
    whatIs:
      "Dashboard is where you see your careers overview. Use this screen to stay on top of the related tasks in LumenX.",
    whatYouCanDo: [
      "View the latest dashboard information",
      "Take the actions available for dashboard",
      "Review status, filters, and details for this module",
      "Return here anytime from the app navigation",
    ],
    howToUse: [
      "Open Dashboard from the navigation.",
      "Review the summary or list shown on the page.",
      "Use filters, search, or tabs if available to find what you need.",
      "Open an item for details, or use the primary action buttons on the page.",
      "When finished, use the bottom or side navigation to move to another module.",
    ],
  },
  "applications": {
    id: "applications",
    title: "Applications",
    whatIs:
      "Applications is where you track job applications. Use this screen to stay on top of the related tasks in LumenX.",
    whatYouCanDo: [
      "View the latest applications information",
      "Take the actions available for applications",
      "Review status, filters, and details for this module",
      "Return here anytime from the app navigation",
    ],
    howToUse: [
      "Open Applications from the navigation.",
      "Review the summary or list shown on the page.",
      "Use filters, search, or tabs if available to find what you need.",
      "Open an item for details, or use the primary action buttons on the page.",
      "When finished, use the bottom or side navigation to move to another module.",
    ],
  },
  "apply": {
    id: "apply",
    title: "Apply",
    whatIs:
      "Apply is where you start or continue a job application. Use this screen to stay on top of the related tasks in LumenX.",
    whatYouCanDo: [
      "View the latest apply information",
      "Take the actions available for apply",
      "Review status, filters, and details for this module",
      "Return here anytime from the app navigation",
    ],
    howToUse: [
      "Open Apply from the navigation.",
      "Review the summary or list shown on the page.",
      "Use filters, search, or tabs if available to find what you need.",
      "Open an item for details, or use the primary action buttons on the page.",
      "When finished, use the bottom or side navigation to move to another module.",
    ],
  },
  "saved": {
    id: "saved",
    title: "Saved jobs",
    whatIs:
      "Saved jobs is where you revisit roles you saved. Use this screen to stay on top of the related tasks in LumenX.",
    whatYouCanDo: [
      "View the latest saved jobs information",
      "Take the actions available for saved jobs",
      "Review status, filters, and details for this module",
      "Return here anytime from the app navigation",
    ],
    howToUse: [
      "Open Saved jobs from the navigation.",
      "Review the summary or list shown on the page.",
      "Use filters, search, or tabs if available to find what you need.",
      "Open an item for details, or use the primary action buttons on the page.",
      "When finished, use the bottom or side navigation to move to another module.",
    ],
  },
  "interviews": {
    id: "interviews",
    title: "Interviews",
    whatIs:
      "Interviews is where you manage interview schedules. Use this screen to stay on top of the related tasks in LumenX.",
    whatYouCanDo: [
      "View the latest interviews information",
      "Take the actions available for interviews",
      "Review status, filters, and details for this module",
      "Return here anytime from the app navigation",
    ],
    howToUse: [
      "Open Interviews from the navigation.",
      "Review the summary or list shown on the page.",
      "Use filters, search, or tabs if available to find what you need.",
      "Open an item for details, or use the primary action buttons on the page.",
      "When finished, use the bottom or side navigation to move to another module.",
    ],
  },
  "documents": {
    id: "documents",
    title: "Documents",
    whatIs:
      "Documents is where you upload resumes and supporting files. Use this screen to stay on top of the related tasks in LumenX.",
    whatYouCanDo: [
      "View the latest documents information",
      "Take the actions available for documents",
      "Review status, filters, and details for this module",
      "Return here anytime from the app navigation",
    ],
    howToUse: [
      "Open Documents from the navigation.",
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
      "Notifications is where you read careers notifications. Use this screen to stay on top of the related tasks in LumenX.",
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
  "profile": {
    id: "profile",
    title: "Profile",
    whatIs:
      "Profile is where you edit your careers profile. Use this screen to stay on top of the related tasks in LumenX.",
    whatYouCanDo: [
      "View the latest profile information",
      "Take the actions available for profile",
      "Review status, filters, and details for this module",
      "Return here anytime from the app navigation",
    ],
    howToUse: [
      "Open Profile from the navigation.",
      "Review the summary or list shown on the page.",
      "Use filters, search, or tabs if available to find what you need.",
      "Open an item for details, or use the primary action buttons on the page.",
      "When finished, use the bottom or side navigation to move to another module.",
    ],
  },
  "settings": {
    id: "settings",
    title: "Settings",
    whatIs:
      "Settings is where you manage careers account settings. Use this screen to stay on top of the related tasks in LumenX.",
    whatYouCanDo: [
      "View the latest settings information",
      "Take the actions available for settings",
      "Review status, filters, and details for this module",
      "Return here anytime from the app navigation",
    ],
    howToUse: [
      "Open Settings from the navigation.",
      "Review the summary or list shown on the page.",
      "Use filters, search, or tabs if available to find what you need.",
      "Open an item for details, or use the primary action buttons on the page.",
      "When finished, use the bottom or side navigation to move to another module.",
    ],
  },
  "recruiter": {
    id: "recruiter",
    title: "Recruiter workspace",
    whatIs:
      "Recruiter workspace is where you run hiring from your recruiter home. Use this screen to stay on top of the related tasks in LumenX.",
    whatYouCanDo: [
      "View the latest recruiter workspace information",
      "Take the actions available for recruiter workspace",
      "Review status, filters, and details for this module",
      "Return here anytime from the app navigation",
    ],
    howToUse: [
      "Open Recruiter workspace from the navigation.",
      "Review the summary or list shown on the page.",
      "Use filters, search, or tabs if available to find what you need.",
      "Open an item for details, or use the primary action buttons on the page.",
      "When finished, use the bottom or side navigation to move to another module.",
    ],
  },
  "recruiter-jobs": {
    id: "recruiter-jobs",
    title: "My jobs",
    whatIs:
      "My jobs is where you create and manage job postings. Use this screen to stay on top of the related tasks in LumenX.",
    whatYouCanDo: [
      "View the latest my jobs information",
      "Take the actions available for my jobs",
      "Review status, filters, and details for this module",
      "Return here anytime from the app navigation",
    ],
    howToUse: [
      "Open My jobs from the navigation.",
      "Review the summary or list shown on the page.",
      "Use filters, search, or tabs if available to find what you need.",
      "Open an item for details, or use the primary action buttons on the page.",
      "When finished, use the bottom or side navigation to move to another module.",
    ],
  },
  "recruiter-applicants": {
    id: "recruiter-applicants",
    title: "Applicants",
    whatIs:
      "Applicants is where you review candidates for your roles. Use this screen to stay on top of the related tasks in LumenX.",
    whatYouCanDo: [
      "View the latest applicants information",
      "Take the actions available for applicants",
      "Review status, filters, and details for this module",
      "Return here anytime from the app navigation",
    ],
    howToUse: [
      "Open Applicants from the navigation.",
      "Review the summary or list shown on the page.",
      "Use filters, search, or tabs if available to find what you need.",
      "Open an item for details, or use the primary action buttons on the page.",
      "When finished, use the bottom or side navigation to move to another module.",
    ],
  },
  "recruiter-talent": {
    id: "recruiter-talent",
    title: "Discover talent",
    whatIs:
      "Discover talent is where you search the talent pool. Use this screen to stay on top of the related tasks in LumenX.",
    whatYouCanDo: [
      "View the latest discover talent information",
      "Take the actions available for discover talent",
      "Review status, filters, and details for this module",
      "Return here anytime from the app navigation",
    ],
    howToUse: [
      "Open Discover talent from the navigation.",
      "Review the summary or list shown on the page.",
      "Use filters, search, or tabs if available to find what you need.",
      "Open an item for details, or use the primary action buttons on the page.",
      "When finished, use the bottom or side navigation to move to another module.",
    ],
  },
  "job-detail": {
    id: "job-detail",
    title: "Job details",
    whatIs:
      "Job details is where you read a role and apply or manage it. Use this screen to stay on top of the related tasks in LumenX.",
    whatYouCanDo: [
      "View the latest job details information",
      "Take the actions available for job details",
      "Review status, filters, and details for this module",
      "Return here anytime from the app navigation",
    ],
    howToUse: [
      "Open Job details from the navigation.",
      "Review the summary or list shown on the page.",
      "Use filters, search, or tabs if available to find what you need.",
      "Open an item for details, or use the primary action buttons on the page.",
      "When finished, use the bottom or side navigation to move to another module.",
    ],
  },
  "application-detail": {
    id: "application-detail",
    title: "Application details",
    whatIs:
      "Application details is where you review one application end to end. Use this screen to stay on top of the related tasks in LumenX.",
    whatYouCanDo: [
      "View the latest application details information",
      "Take the actions available for application details",
      "Review status, filters, and details for this module",
      "Return here anytime from the app navigation",
    ],
    howToUse: [
      "Open Application details from the navigation.",
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
  "jobs",
  "dashboard",
  "applications",
  "apply",
  "saved",
  "interviews",
  "documents",
  "notifications",
  "profile",
  "settings",
  "recruiter",
  "recruiter-jobs",
  "recruiter-applicants",
  "recruiter-talent",
  "job-detail",
  "application-detail"
] as const;

export { normalizeModuleHelpKey };
export const getModuleHelp = createGetModuleHelp(MODULE_HELP_REGISTRY);
