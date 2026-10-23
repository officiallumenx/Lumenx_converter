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
      "Admissions Home is where you start exploring institutes and applications. Use this screen to stay on top of the related tasks in LumenX.",
    whatYouCanDo: [
      "View the latest admissions home information",
      "Take the actions available for admissions home",
      "Review status, filters, and details for this module",
      "Return here anytime from the app navigation",
    ],
    howToUse: [
      "Open Admissions Home from the navigation.",
      "Review the summary or list shown on the page.",
      "Use filters, search, or tabs if available to find what you need.",
      "Open an item for details, or use the primary action buttons on the page.",
      "When finished, use the bottom or side navigation to move to another module.",
    ],
  },
  "institutes": {
    id: "institutes",
    title: "Institutes",
    whatIs:
      "Institutes is where you browse institutes accepting applications. Use this screen to stay on top of the related tasks in LumenX.",
    whatYouCanDo: [
      "View the latest institutes information",
      "Take the actions available for institutes",
      "Review status, filters, and details for this module",
      "Return here anytime from the app navigation",
    ],
    howToUse: [
      "Open Institutes from the navigation.",
      "Review the summary or list shown on the page.",
      "Use filters, search, or tabs if available to find what you need.",
      "Open an item for details, or use the primary action buttons on the page.",
      "When finished, use the bottom or side navigation to move to another module.",
    ],
  },
  "programs": {
    id: "programs",
    title: "Programs",
    whatIs:
      "Programs is where you explore academic programs. Use this screen to stay on top of the related tasks in LumenX.",
    whatYouCanDo: [
      "View the latest programs information",
      "Take the actions available for programs",
      "Review status, filters, and details for this module",
      "Return here anytime from the app navigation",
    ],
    howToUse: [
      "Open Programs from the navigation.",
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
      "Dashboard is where you see your admissions overview. Use this screen to stay on top of the related tasks in LumenX.",
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
  "apply": {
    id: "apply",
    title: "Apply",
    whatIs:
      "Apply is where you start or continue an application. Use this screen to stay on top of the related tasks in LumenX.",
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
  "applications": {
    id: "applications",
    title: "Applications",
    whatIs:
      "Applications is where you track submitted applications. Use this screen to stay on top of the related tasks in LumenX.",
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
  "documents": {
    id: "documents",
    title: "Documents",
    whatIs:
      "Documents is where you upload admission documents. Use this screen to stay on top of the related tasks in LumenX.",
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
  "inquiries": {
    id: "inquiries",
    title: "Inquiries",
    whatIs:
      "Inquiries is where you ask institutes questions. Use this screen to stay on top of the related tasks in LumenX.",
    whatYouCanDo: [
      "View the latest inquiries information",
      "Take the actions available for inquiries",
      "Review status, filters, and details for this module",
      "Return here anytime from the app navigation",
    ],
    howToUse: [
      "Open Inquiries from the navigation.",
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
      "Notifications is where you read admissions notifications. Use this screen to stay on top of the related tasks in LumenX.",
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
  "faq": {
    id: "faq",
    title: "FAQs",
    whatIs:
      "FAQs is where you find answers to common admissions questions. Use this screen to stay on top of the related tasks in LumenX.",
    whatYouCanDo: [
      "View the latest faqs information",
      "Take the actions available for faqs",
      "Review status, filters, and details for this module",
      "Return here anytime from the app navigation",
    ],
    howToUse: [
      "Open FAQs from the navigation.",
      "Review the summary or list shown on the page.",
      "Use filters, search, or tabs if available to find what you need.",
      "Open an item for details, or use the primary action buttons on the page.",
      "When finished, use the bottom or side navigation to move to another module.",
    ],
  },
  "contact": {
    id: "contact",
    title: "Contact",
    whatIs:
      "Contact is where you reach admissions support. Use this screen to stay on top of the related tasks in LumenX.",
    whatYouCanDo: [
      "View the latest contact information",
      "Take the actions available for contact",
      "Review status, filters, and details for this module",
      "Return here anytime from the app navigation",
    ],
    howToUse: [
      "Open Contact from the navigation.",
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
      "Profile is where you manage your applicant profile. Use this screen to stay on top of the related tasks in LumenX.",
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
      "Settings is where you adjust admissions preferences. Use this screen to stay on top of the related tasks in LumenX.",
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
  "institute": {
    id: "institute",
    title: "Institute dashboard",
    whatIs:
      "Institute dashboard is where you run your institute admissions workspace. Use this screen to stay on top of the related tasks in LumenX.",
    whatYouCanDo: [
      "View the latest institute dashboard information",
      "Take the actions available for institute dashboard",
      "Review status, filters, and details for this module",
      "Return here anytime from the app navigation",
    ],
    howToUse: [
      "Open Institute dashboard from the navigation.",
      "Review the summary or list shown on the page.",
      "Use filters, search, or tabs if available to find what you need.",
      "Open an item for details, or use the primary action buttons on the page.",
      "When finished, use the bottom or side navigation to move to another module.",
    ],
  },
  "institute-applications": {
    id: "institute-applications",
    title: "Institute applications",
    whatIs:
      "Institute applications is where you review incoming applications. Use this screen to stay on top of the related tasks in LumenX.",
    whatYouCanDo: [
      "View the latest institute applications information",
      "Take the actions available for institute applications",
      "Review status, filters, and details for this module",
      "Return here anytime from the app navigation",
    ],
    howToUse: [
      "Open Institute applications from the navigation.",
      "Review the summary or list shown on the page.",
      "Use filters, search, or tabs if available to find what you need.",
      "Open an item for details, or use the primary action buttons on the page.",
      "When finished, use the bottom or side navigation to move to another module.",
    ],
  },
  "institute-openings": {
    id: "institute-openings",
    title: "Openings",
    whatIs:
      "Openings is where you publish and manage admission openings. Use this screen to stay on top of the related tasks in LumenX.",
    whatYouCanDo: [
      "View the latest openings information",
      "Take the actions available for openings",
      "Review status, filters, and details for this module",
      "Return here anytime from the app navigation",
    ],
    howToUse: [
      "Open Openings from the navigation.",
      "Review the summary or list shown on the page.",
      "Use filters, search, or tabs if available to find what you need.",
      "Open an item for details, or use the primary action buttons on the page.",
      "When finished, use the bottom or side navigation to move to another module.",
    ],
  },
  "institute-form": {
    id: "institute-form",
    title: "Application form",
    whatIs:
      "Application form is where you configure the application form. Use this screen to stay on top of the related tasks in LumenX.",
    whatYouCanDo: [
      "View the latest application form information",
      "Take the actions available for application form",
      "Review status, filters, and details for this module",
      "Return here anytime from the app navigation",
    ],
    howToUse: [
      "Open Application form from the navigation.",
      "Review the summary or list shown on the page.",
      "Use filters, search, or tabs if available to find what you need.",
      "Open an item for details, or use the primary action buttons on the page.",
      "When finished, use the bottom or side navigation to move to another module.",
    ],
  },
  "institute-profile": {
    id: "institute-profile",
    title: "Institute profile",
    whatIs:
      "Institute profile is where you edit your institute public profile. Use this screen to stay on top of the related tasks in LumenX.",
    whatYouCanDo: [
      "View the latest institute profile information",
      "Take the actions available for institute profile",
      "Review status, filters, and details for this module",
      "Return here anytime from the app navigation",
    ],
    howToUse: [
      "Open Institute profile from the navigation.",
      "Review the summary or list shown on the page.",
      "Use filters, search, or tabs if available to find what you need.",
      "Open an item for details, or use the primary action buttons on the page.",
      "When finished, use the bottom or side navigation to move to another module.",
    ],
  },
  "institute-settings": {
    id: "institute-settings",
    title: "Institute settings",
    whatIs:
      "Institute settings is where you manage institute admissions settings. Use this screen to stay on top of the related tasks in LumenX.",
    whatYouCanDo: [
      "View the latest institute settings information",
      "Take the actions available for institute settings",
      "Review status, filters, and details for this module",
      "Return here anytime from the app navigation",
    ],
    howToUse: [
      "Open Institute settings from the navigation.",
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
