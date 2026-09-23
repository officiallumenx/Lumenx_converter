/** Primary SaaS navigation — five categories + CTAs. */

export const SITE_NAME = "LumenX";
export const SITE_TAGLINE = "Smart institute management platform";
export const SITE_DESCRIPTION =
  "LumenX is one connected platform for managing your entire institution — administration, academics, communication, transport, admissions, and careers.";

export type NavChild = {
  to: string;
  label: string;
  description?: string;
  search?: Record<string, string>;
};

export type NavItem =
  | { kind: "link"; to: string; label: string }
  | {
      kind: "menu";
      id: "platform" | "solutions" | "modules" | "resources";
      label: string;
      overview?: { to: string; title: string; description: string };
      children: readonly NavChild[];
      footerLink?: { to: string; label: string };
    };

export const PRIMARY_NAV: readonly NavItem[] = [
  {
    kind: "menu",
    id: "platform",
    label: "Platform",
    overview: {
      to: "/platform",
      title: "LumenX Platform",
      description: "See how everything connects",
    },
    children: [
      { to: "/platform/admin", label: "Admin", description: "Institute operations console" },
      { to: "/platform/connect", label: "Connect", description: "Parents, teachers, and students" },
      { to: "/platform/transport", label: "Transport", description: "Fleet and daily trips" },
      { to: "/platform/admissions", label: "Admissions", description: "Applications and intake" },
      { to: "/platform/careers", label: "Careers", description: "Hiring and opportunity boards" },
    ],
  },
  {
    kind: "menu",
    id: "solutions",
    label: "Solutions",
    overview: {
      to: "/solutions",
      title: "Solutions by role",
      description: "All audiences on one page",
    },
    children: [
      { to: "/solutions", label: "All solutions", description: "Full directory on one page" },
      {
        to: "/solutions",
        label: "Institutions",
        description: "Whole-campus platform",
        search: { role: "institutions" },
      },
      {
        to: "/solutions",
        label: "Administrators",
        description: "Office day in Admin",
        search: { role: "administrators" },
      },
      {
        to: "/solutions",
        label: "Teachers",
        description: "Connect classroom work",
        search: { role: "teachers" },
      },
      {
        to: "/solutions",
        label: "Parents",
        description: "Family view in Connect",
        search: { role: "parents" },
      },
      {
        to: "/solutions",
        label: "Students",
        description: "Learner portal",
        search: { role: "students" },
      },
      {
        to: "/solutions",
        label: "Drivers",
        description: "Transport trip app",
        search: { role: "drivers" },
      },
    ],
  },
  {
    kind: "menu",
    id: "modules",
    label: "Modules",
    overview: {
      to: "/modules",
      title: "Module directory",
      description: "All modules in one place by app",
    },
    children: [
      { to: "/modules", label: "All modules", description: "Full catalogue on one page" },
      { to: "/modules", label: "Admin", description: "Office console modules", search: { section: "admin" } },
      {
        to: "/modules",
        label: "Connect",
        description: "Parent, teacher, and student",
        search: { section: "connect" },
      },
      { to: "/modules", label: "Transport", description: "Driver trip modules", search: { section: "transport" } },
      {
        to: "/modules",
        label: "Admissions",
        description: "Applicant and institute intake",
        search: { section: "admissions" },
      },
      { to: "/modules", label: "Careers", description: "Hiring and recruiters", search: { section: "careers" } },
    ],
    footerLink: { to: "/modules", label: "View all modules →" },
  },
  { kind: "link", to: "/pricing", label: "Pricing" },
  {
    kind: "menu",
    id: "resources",
    label: "Resources",
    overview: {
      to: "/resources",
      title: "Resources",
      description: "Explore, learn, and get help",
    },
    children: [
      { to: "/resources/help", label: "Help" },
      { to: "/resources/faq", label: "FAQs" },
      { to: "/resources/downloads", label: "Downloads" },
    ],
  },
] as const;

/** @deprecated Prefer PRIMARY_NAV — kept for gradual migration of explorers */
export const NAV_LINKS = [
  { to: "/platform", label: "Platform" },
  { to: "/solutions", label: "Solutions" },
  { to: "/modules", label: "Modules" },
  { to: "/pricing", label: "Pricing" },
  { to: "/resources", label: "Resources" },
] as const;

export const EXPLORE_LINKS = [
  { to: "/solutions", label: "Solutions" },
  { to: "/modules", label: "Modules" },
  { to: "/platform", label: "Platform" },
] as const;

export const FOOTER_PLATFORM = [
  { to: "/platform/admin", label: "Admin" },
  { to: "/platform/connect", label: "Connect" },
  { to: "/platform/transport", label: "Transport" },
  { to: "/platform/admissions", label: "Admissions" },
  { to: "/platform/careers", label: "Careers" },
] as const;

export const FOOTER_SOLUTIONS = [
  { to: "/solutions", label: "All solutions" },
  { to: "/solutions", label: "Institutions", search: { role: "institutions" } },
  { to: "/solutions", label: "Administrators", search: { role: "administrators" } },
  { to: "/solutions", label: "Teachers", search: { role: "teachers" } },
  { to: "/solutions", label: "Parents", search: { role: "parents" } },
  { to: "/solutions", label: "Students", search: { role: "students" } },
  { to: "/solutions", label: "Drivers", search: { role: "drivers" } },
] as const;

export const FOOTER_RESOURCES = [
  { to: "/resources/help", label: "Help" },
  { to: "/resources/faq", label: "FAQs" },
  { to: "/resources/downloads", label: "Downloads" },
] as const;

export const FOOTER_COMPANY = [
  { to: "/about", label: "About" },
  { to: "/contact", label: "Contact" },
] as const;

export const FOOTER_LEGAL = [
  { to: "/privacy", label: "Privacy" },
  { to: "/terms", label: "Terms" },
  { to: "/cookies", label: "Cookies" },
  { to: "/data-request", label: "Data Request" },
] as const;
