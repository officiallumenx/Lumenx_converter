export const RESOURCES_HERO = {
  eyebrow: "Resources",
  title: "Explore LumenX before you commit.",
  lede: "Open a mock demo, read FAQs, check downloads when they exist, or get help. Nothing here invents store listings or live institute data.",
} as const;

export const RESOURCE_CARDS = [
  {
    to: "/resources/demo",
    title: "Demo",
    body: "Tap through mock product screens — labelled as previews, no account required.",
  },
  {
    to: "/resources/help",
    title: "Help",
    body: "Getting started, product guidance, logins, and privacy — based on how LumenX actually works.",
  },
  {
    to: "/resources/faq",
    title: "FAQs",
    body: "Plain answers on products, pricing, trial, demos, and getting started.",
  },
  {
    to: "/resources/downloads",
    title: "Downloads",
    body: "Web apps and store links only when a real URL is configured — otherwise Coming soon.",
  },
  {
    to: "/resources/blog",
    title: "Blog",
    body: "Product notes and platform updates. New posts appear here when published.",
  },
] as const;

export type HelpCategory = {
  id: string;
  title: string;
  items: { title: string; body: string }[];
};

export const HELP_CATEGORIES: HelpCategory[] = [
  {
    id: "getting-started",
    title: "Getting Started",
    items: [
      {
        title: "How do we begin?",
        body: "Use Book a Demo, Get Started, or Contact to tell us about your institute. A 60-day trial begins after approval. This website does not create a live institute account by itself.",
      },
      {
        title: "What should we explore first?",
        body: "Most campuses start with LumenX Admin and LumenX Connect. Open the Platform pages, then try the labelled mock demos under Resources.",
      },
    ],
  },
  {
    id: "admin",
    title: "Admin",
    items: [
      {
        title: "Who uses Admin?",
        body: "Institution heads, principals, and office staff. Admin is the operations console — people, classes, attendance, fees, documents, and day-to-day management.",
      },
      {
        title: "Is Admin the parent or teacher app?",
        body: "No. Families and teachers use LumenX Connect. Admin writes the institute record those apps read.",
      },
    ],
  },
  {
    id: "connect",
    title: "Connect",
    items: [
      {
        title: "Who uses Connect?",
        body: "Parents, teachers, and students — each with strict role isolation. One family account can switch between children.",
      },
      {
        title: "Where do login details come from?",
        body: "Your institute office issues Connect credentials. This marketing site does not publish passwords.",
      },
    ],
  },
  {
    id: "transport",
    title: "Transport",
    items: [
      {
        title: "What does Transport do?",
        body: "Drivers run boarding and trip status in the Transport app. Parents follow trip status in Connect when the module is on.",
      },
      {
        title: "Is there a live parent GPS map?",
        body: "No. This website does not claim live GPS tracking for families. Parent visibility is trip status and approach alerts when enabled.",
      },
    ],
  },
  {
    id: "admissions",
    title: "Admissions",
    items: [
      {
        title: "How does intake work?",
        body: "Applicants discover, apply, and submit documents. The office reviews the same file. Admin converts accepted intake into a student record.",
      },
      {
        title: "Is there a separate Admissions APK?",
        body: "No. Admissions is delivered as a Connect portal. There is no separate store listing for Admissions.",
      },
    ],
  },
  {
    id: "careers",
    title: "Careers",
    items: [
      {
        title: "What is Careers for?",
        body: "Careers is the LumenX hiring and opportunity web app — jobs, applications, and recruiter review. Admin turns an approved hire into a teacher.",
      },
      {
        title: "Is Careers an HR system?",
        body: "No. It is not general employee HR. It is institute hiring that feeds the teacher directory in Admin.",
      },
    ],
  },
  {
    id: "account-privacy",
    title: "Account & Privacy",
    items: [
      {
        title: "How do I request data changes or deletion?",
        body: "Use the Data Request page, or the privacy contacts listed in our Privacy Policy. Institute-controlled student data may need to go through the school administrator.",
      },
      {
        title: "Where are the legal documents?",
        body: "Privacy, Terms, Cookies, and Data Request are linked in the site footer.",
      },
    ],
  },
];

/** @deprecated Prefer HELP_CATEGORIES */
export const HELP_SECTIONS = HELP_CATEGORIES.flatMap((category) =>
  category.items.map((item) => ({ title: `${category.title}: ${item.title}`, body: item.body })),
);

export const BLOG_EMPTY = {
  title: "LumenX Insights",
  lede: "Articles and product updates are coming soon.",
} as const;
