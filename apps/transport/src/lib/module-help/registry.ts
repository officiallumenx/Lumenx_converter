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
      "Home is where you start trips and see today's transport overview. Use this screen to stay on top of the related tasks in LumenX.",
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
      "Attendance is where you mark student boarding and attendance. Use this screen to stay on top of the related tasks in LumenX.",
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
  "alerts": {
    id: "alerts",
    title: "Alerts",
    whatIs:
      "Alerts is where you read transport alerts and notifications. Use this screen to stay on top of the related tasks in LumenX.",
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
  "emergency": {
    id: "emergency",
    title: "Emergency",
    whatIs:
      "Emergency is where you raise or follow emergency protocols. Use this screen to stay on top of the related tasks in LumenX.",
    whatYouCanDo: [
      "View the latest emergency information",
      "Take the actions available for emergency",
      "Review status, filters, and details for this module",
      "Return here anytime from the app navigation",
    ],
    howToUse: [
      "Open Emergency from the navigation.",
      "Review the summary or list shown on the page.",
      "Use filters, search, or tabs if available to find what you need.",
      "Open an item for details, or use the primary action buttons on the page.",
      "When finished, use the bottom or side navigation to move to another module.",
    ],
  },
  "more": {
    id: "more",
    title: "More",
    whatIs:
      "More is where you open additional transport tools. Use this screen to stay on top of the related tasks in LumenX.",
    whatYouCanDo: [
      "View the latest more information",
      "Take the actions available for more",
      "Review status, filters, and details for this module",
      "Return here anytime from the app navigation",
    ],
    howToUse: [
      "Open More from the navigation.",
      "Review the summary or list shown on the page.",
      "Use filters, search, or tabs if available to find what you need.",
      "Open an item for details, or use the primary action buttons on the page.",
      "When finished, use the bottom or side navigation to move to another module.",
    ],
  },
  "bus-information": {
    id: "bus-information",
    title: "Bus Information",
    whatIs:
      "Bus Information is where you review bus, route, and stop details. Use this screen to stay on top of the related tasks in LumenX.",
    whatYouCanDo: [
      "View the latest bus information information",
      "Take the actions available for bus information",
      "Review status, filters, and details for this module",
      "Return here anytime from the app navigation",
    ],
    howToUse: [
      "Open Bus Information from the navigation.",
      "Review the summary or list shown on the page.",
      "Use filters, search, or tabs if available to find what you need.",
      "Open an item for details, or use the primary action buttons on the page.",
      "When finished, use the bottom or side navigation to move to another module.",
    ],
  },
  "route-setup": {
    id: "route-setup",
    title: "Route Setup",
    whatIs:
      "Route Setup is where you add stops and assign students for approval. Use this screen to stay on top of the related tasks in LumenX.",
    whatYouCanDo: [
      "View the latest route setup information",
      "Take the actions available for route setup",
      "Review status, filters, and details for this module",
      "Return here anytime from the app navigation",
    ],
    howToUse: [
      "Open Route Setup from the navigation.",
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
      "Profile is where you manage your driver profile. Use this screen to stay on top of the related tasks in LumenX.",
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
      "Settings is where you adjust Transport app preferences. Use this screen to stay on top of the related tasks in LumenX.",
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
  "support": {
    id: "support",
    title: "Support",
    whatIs:
      "Support is where you get help with the Transport app. Use this screen to stay on top of the related tasks in LumenX.",
    whatYouCanDo: [
      "View the latest support information",
      "Take the actions available for support",
      "Review status, filters, and details for this module",
      "Return here anytime from the app navigation",
    ],
    howToUse: [
      "Open Support from the navigation.",
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
  "alerts",
  "emergency",
  "more",
  "bus-information",
  "route-setup",
  "profile",
  "settings",
  "support"
] as const;

export { normalizeModuleHelpKey };

const baseGetModuleHelp = createGetModuleHelp(MODULE_HELP_REGISTRY);

/** Notifications share the Alerts module help (same inbox surface). */
export function getModuleHelp(id: string) {
  const bare = normalizeModuleHelpKey(id);
  if (bare === "notifications") return baseGetModuleHelp("alerts");
  return baseGetModuleHelp(id);
}
