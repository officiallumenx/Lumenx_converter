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
      "Home is where a driver starts the day. It shows today's trips and what to do next.",
    whatYouCanDo: [
      "See today's route and bus",
      "Start a trip when you are ready",
      "End the trip when the last student is dropped",
      "Spot new alerts quickly",
    ],
    howToUse: [
      "Open Home from the menu.",
      "Check today's route and bus.",
      "Tap Start trip when the bus is ready to leave.",
      "Tap End trip after the last stop.",
    ],
  },
  "attendance": {
    id: "attendance",
    title: "Attendance",
    whatIs:
      "Attendance is where you mark which students got on and off the bus.",
    whatYouCanDo: [
      "Mark each student as boarded or absent",
      "Mark students as dropped at their stop",
      "See who is still on the bus",
    ],
    howToUse: [
      "Open Attendance from the menu.",
      "Pick today's trip.",
      "Tap each student as they get on or off.",
      "Check the list is right, then save.",
    ],
  },
  "alerts": {
    id: "alerts",
    title: "Alerts",
    whatIs:
      "Alerts shows messages and notices about your trips, buses, and routes.",
    whatYouCanDo: [
      "Read new notices from the school",
      "See changes to your route or stops",
      "Open an alert for the full message",
    ],
    howToUse: [
      "Open Alerts from the menu.",
      "Look for new alerts at the top.",
      "Tap an alert to read it.",
      "Follow any steps it mentions.",
    ],
  },
  "emergency": {
    id: "emergency",
    title: "Emergency",
    whatIs:
      "Emergency is where you ask for help right away if something goes wrong on the road.",
    whatYouCanDo: [
      "Tell the school about an emergency",
      "Call the school or emergency contacts",
      "See the safety steps to follow",
    ],
    howToUse: [
      "Open Emergency from the menu.",
      "Choose what has happened.",
      "Confirm to alert the school.",
      "Follow the safety steps shown on screen.",
    ],
  },
  "more": {
    id: "more",
    title: "More",
    whatIs:
      "More holds the other pages you need less often, all in one place.",
    whatYouCanDo: [
      "Open bus details and route setup",
      "Go to your profile and settings",
      "Reach support when you need help",
    ],
    howToUse: [
      "Open More from the menu.",
      "Find the page you want in the list.",
      "Tap it to open.",
      "Use the back button to return.",
    ],
  },
  "bus-information": {
    id: "bus-information",
    title: "Bus Information",
    whatIs:
      "Bus Information shows your bus, its route, and the list of stops.",
    whatYouCanDo: [
      "See the bus number and details",
      "View the route and stops in order",
      "Check the pickup and drop times",
    ],
    howToUse: [
      "Open Bus Information from the menu.",
      "Pick the bus or route if you have more than one.",
      "Read the stops and times.",
      "Go back to Home when you are done.",
    ],
  },
  "route-setup": {
    id: "route-setup",
    title: "Route Setup",
    whatIs:
      "Route Setup is where you add new stops and choose which students use them. The school checks and approves your changes.",
    whatYouCanDo: [
      "Add a new stop to a route",
      "Choose which students use each stop",
      "See which changes are waiting for approval",
    ],
    howToUse: [
      "Open Route Setup from the menu.",
      "Choose the route you want to change.",
      "Tap Add stop and select the students.",
      "Submit, and wait for the school to approve.",
    ],
  },
  "profile": {
    id: "profile",
    title: "Profile",
    whatIs:
      "Profile shows your own details as a driver, like your name and phone number.",
    whatYouCanDo: [
      "Check your name and contact details",
      "Update your phone number or photo",
      "Change your password",
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
      "Turn alerts on or off",
      "Choose your language",
      "Sign out of the app",
    ],
    howToUse: [
      "Open Settings from the menu.",
      "Find the option you want to change.",
      "Switch it on or off, or choose a new value.",
      "Go back, and your choice is saved.",
    ],
  },
  "support": {
    id: "support",
    title: "Support",
    whatIs:
      "Support is where you get help if you are stuck or something is not working.",
    whatYouCanDo: [
      "Read quick answers to common questions",
      "Contact the school's transport team",
      "Tell us about a problem",
    ],
    howToUse: [
      "Open Support from the menu.",
      "Look for your question in the list of answers.",
      "If you cannot find it, tap Contact.",
      "Write your problem and send it.",
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
