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
      "Careers Home is where you start. Look for a job here, or begin hiring for your school.",
    whatYouCanDo: [
      "Search for open jobs",
      "Go to your applications and saved jobs",
      "Recruiters can post jobs and see applicants",
    ],
    howToUse: [
      "Open Careers Home.",
      "Choose Find jobs, or go to your recruiter area to hire.",
      "Pick the job or page you want.",
      "Follow the steps on that page.",
    ],
  },
  "jobs": {
    id: "jobs",
    title: "Jobs",
    whatIs:
      "Jobs lists all the open positions you can apply for.",
    whatYouCanDo: [
      "Search jobs by title or place",
      "Narrow the list with filters",
      "Save jobs to look at later",
      "Open a job to read the details",
    ],
    howToUse: [
      "Open Jobs from the menu.",
      "Type a job title or choose a filter.",
      "Tap a job to read about it.",
      "Tap Apply, or Save to come back later.",
    ],
  },
  "dashboard": {
    id: "dashboard",
    title: "Dashboard",
    whatIs:
      "Dashboard gives you a quick look at your job search: applications, interviews, and updates.",
    whatYouCanDo: [
      "See how many applications you have sent",
      "Check upcoming interviews",
      "Spot new updates",
    ],
    howToUse: [
      "Open Dashboard from the menu.",
      "Look at the cards for each area.",
      "Tap a card to see more.",
      "Come back any time to check progress.",
    ],
  },
  "applications": {
    id: "applications",
    title: "Applications",
    whatIs:
      "Applications lists every job you have applied for and where each one stands.",
    whatYouCanDo: [
      "See the status of each application",
      "Open an application to see what you sent",
      "Withdraw an application if you change your mind",
    ],
    howToUse: [
      "Open Applications from the menu.",
      "Find the job in the list.",
      "Tap it to see its status.",
      "Take any step it asks for, like attending an interview.",
    ],
  },
  "apply": {
    id: "apply",
    title: "Apply",
    whatIs:
      "Apply is where you fill in and send your application for a job.",
    whatYouCanDo: [
      "Fill in your details for a job",
      "Attach your resume",
      "Save your work and finish later",
      "Send your application",
    ],
    howToUse: [
      "Open the job and tap Apply.",
      "Check your details and add your resume.",
      "Answer any questions on the form.",
      "Tap Submit to send your application.",
    ],
  },
  "saved": {
    id: "saved",
    title: "Saved jobs",
    whatIs:
      "Saved jobs keeps the jobs you liked so you can find them again easily.",
    whatYouCanDo: [
      "See all the jobs you saved",
      "Open a job to read it again",
      "Apply to a saved job",
      "Remove jobs you no longer want",
    ],
    howToUse: [
      "Open Saved jobs from the menu.",
      "Find the job you want.",
      "Tap it to read the details.",
      "Tap Apply, or remove it from the list.",
    ],
  },
  "interviews": {
    id: "interviews",
    title: "Interviews",
    whatIs:
      "Interviews shows the interviews that have been set up for you, with the date and time.",
    whatYouCanDo: [
      "See upcoming interviews",
      "Check the date, time, and place",
      "Confirm or ask for another time",
    ],
    howToUse: [
      "Open Interviews from the menu.",
      "Find the interview in the list.",
      "Tap it to see the details.",
      "Confirm that you can come, or ask for a new time.",
    ],
  },
  "documents": {
    id: "documents",
    title: "Documents",
    whatIs:
      "Documents is where you keep your resume and other files you want to share with employers.",
    whatYouCanDo: [
      "Upload your resume",
      "Add certificates or other files",
      "Replace or remove old files",
    ],
    howToUse: [
      "Open Documents from the menu.",
      "Tap Upload.",
      "Choose the file from your phone or computer.",
      "Wait for it to finish, and it is saved.",
    ],
  },
  "notifications": {
    id: "notifications",
    title: "Notifications",
    whatIs:
      "Notifications lists updates about your jobs, applications, and interviews.",
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
  "profile": {
    id: "profile",
    title: "Profile",
    whatIs:
      "Profile is where you share your skills, work history, and education. Employers see this when you apply.",
    whatYouCanDo: [
      "Add your skills and experience",
      "Update your education",
      "Change your photo and contact details",
    ],
    howToUse: [
      "Open Profile from the menu.",
      "Tap Edit on the part you want to change.",
      "Type in the new details.",
      "Save, and your profile is updated.",
    ],
  },
  "settings": {
    id: "settings",
    title: "Settings",
    whatIs:
      "Settings is where you manage your account and choose which updates you want.",
    whatYouCanDo: [
      "Change your password",
      "Choose which updates you receive",
      "Sign out",
    ],
    howToUse: [
      "Open Settings from the menu.",
      "Find the option you want to change.",
      "Switch it on or off, or enter a new value.",
      "Save, and you are done.",
    ],
  },
  "recruiter": {
    id: "recruiter",
    title: "Recruiter workspace",
    whatIs:
      "Recruiter workspace is the home page for hiring. You can see your jobs and the people who applied.",
    whatYouCanDo: [
      "See your open jobs",
      "Check new applicants",
      "Post a new job",
      "Find people who may fit your jobs",
    ],
    howToUse: [
      "Open Recruiter workspace from the menu.",
      "Look at the cards for your jobs and applicants.",
      "Tap a card to open that page.",
      "Tap Post a job to start hiring for a new role.",
    ],
  },
  "recruiter-jobs": {
    id: "recruiter-jobs",
    title: "My jobs",
    whatIs:
      "My jobs is where you post jobs and look after the ones you already posted.",
    whatYouCanDo: [
      "Post a new job",
      "Edit a job's details",
      "Close a job when it is filled",
      "See how many people applied",
    ],
    howToUse: [
      "Open My jobs from the menu.",
      "Tap New job, or pick one you already posted.",
      "Fill in or change the details.",
      "Save or publish, and the job is updated.",
    ],
  },
  "recruiter-applicants": {
    id: "recruiter-applicants",
    title: "Applicants",
    whatIs:
      "Applicants lists the people who applied to your jobs so you can review and respond.",
    whatYouCanDo: [
      "See who applied to each job",
      "Read their profile and resume",
      "Shortlist or decline an applicant",
      "Set up an interview",
    ],
    howToUse: [
      "Open Applicants from the menu.",
      "Pick a job to see its applicants.",
      "Tap a name to read their details.",
      "Choose Shortlist, Decline, or Schedule interview.",
    ],
  },
  "recruiter-talent": {
    id: "recruiter-talent",
    title: "Discover talent",
    whatIs:
      "Discover talent lets you look for people who might be right for your jobs, even before they apply.",
    whatYouCanDo: [
      "Search people by skill or experience",
      "Read their profile",
      "Invite someone to apply",
    ],
    howToUse: [
      "Open Discover talent from the menu.",
      "Type a skill or choose a filter.",
      "Tap a person to read their profile.",
      "Tap Invite to ask them to apply.",
    ],
  },
  "job-detail": {
    id: "job-detail",
    title: "Job details",
    whatIs:
      "Job details shows everything about one job. Job seekers can apply here, and recruiters can manage it.",
    whatYouCanDo: [
      "Read what the job is about and what is needed",
      "Save the job or apply for it",
      "Recruiters can edit or close the job",
    ],
    howToUse: [
      "Open a job from the list.",
      "Read the description and requirements.",
      "Job seekers tap Apply or Save.",
      "Recruiters tap Edit or Close to manage the job.",
    ],
  },
  "application-detail": {
    id: "application-detail",
    title: "Application details",
    whatIs:
      "Application details shows everything about one application, from the first step to the final answer.",
    whatYouCanDo: [
      "See what was sent and where it stands",
      "Read messages and interview details",
      "Recruiters can shortlist, decline, or hire",
    ],
    howToUse: [
      "Open an application from the list.",
      "Read the details and current status.",
      "Check for interview dates or messages.",
      "Recruiters choose the next step, such as Shortlist or Decline.",
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
