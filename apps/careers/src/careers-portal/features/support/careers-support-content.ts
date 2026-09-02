import { CAREERS_CONTACT, CAREERS_FAQS } from "@/lib/careers/mock-data";

export { CAREERS_CONTACT };

export const CAREERS_APP_VERSION = "1.0.0";

export const CAREERS_HELP_TOPICS = [
  {
    title: "Getting started",
    body: "Create a job seeker or recruiter account, verify mobile and email, then complete your profile. Browse jobs by city, institute, or category from the home and Jobs pages.",
  },
  {
    title: "Applying for jobs",
    body: "Use Apply to complete the 6-step wizard — personal details, professional background, teaching profile, documents, and review. Your saved profile pre-fills most fields.",
  },
  {
    title: "Tracking applications",
    body: "My Applications shows status for each role. Notifications alert you to shortlists, interviews, and offers. Open an application for timeline, documents, and interview details.",
  },
  {
    title: "Documents & profile",
    body: "Upload resume and certificates in your profile and Document center. Keep your profile updated for better job recommendations and faster applications.",
  },
  {
    title: "Recruiter accounts",
    body: "Recruiters sign up with organization details and access the Recruiter workspace. Full hiring tools are expanding in future releases.",
  },
  {
    title: "Settings & support",
    body: "Settings includes theme, FAQs, help articles, feedback, issue reporting, and contact details for the Careers support team.",
  },
] as const;

/** Flat FAQ list for settings dialogs (top questions across categories). */
export const CAREERS_SETTINGS_FAQS = CAREERS_FAQS.slice(0, 12).map((f) => ({
  q: f.question,
  a: f.answer,
}));
