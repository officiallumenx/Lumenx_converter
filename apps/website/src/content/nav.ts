/** Primary SaaS navigation — five categories + CTAs. */

export const SITE_NAME = "LumenX";
export const SITE_TAGLINE = "Smart institute management platform";
export const SITE_DESCRIPTION =
  "LumenX is one connected platform for managing your entire institution — administration, academics, communication, transport, admissions, and careers.";

export type NavChild = {
  to: string;
  label: string;
  description?: string;
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
      description: "Outcomes for everyone who uses the campus",
    },
    children: [
      { to: "/solutions/institutions", label: "Institutions" },
      { to: "/solutions/administrators", label: "Administrators" },
      { to: "/solutions/teachers", label: "Teachers" },
      { to: "/solutions/parents", label: "Parents" },
      { to: "/solutions/students", label: "Students" },
      { to: "/solutions/drivers", label: "Drivers" },
    ],
  },
  {
    kind: "menu",
    id: "modules",
    label: "Modules",
    overview: {
      to: "/modules",
      title: "Module directory",
      description: "Capabilities grouped by how campuses work",
    },
    children: [
      { to: "/modules/academics", label: "Academics" },
      { to: "/modules/administration", label: "Administration" },
      { to: "/modules/finance", label: "Finance" },
      { to: "/modules/communication", label: "Communication" },
      { to: "/modules/transport", label: "Transport" },
      { to: "/modules/documents", label: "Documents" },
      { to: "/modules/admissions", label: "Admissions & Careers" },
      { to: "/modules/growth", label: "Growth & Analytics" },
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
      { to: "/resources/demo", label: "Demo" },
      { to: "/resources/help", label: "Help" },
      { to: "/resources/faq", label: "FAQs" },
      { to: "/resources/downloads", label: "Downloads" },
      { to: "/resources/blog", label: "Blog" },
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
  { to: "/solutions/institutions", label: "Institutions" },
  { to: "/solutions/administrators", label: "Administrators" },
  { to: "/solutions/teachers", label: "Teachers" },
  { to: "/solutions/parents", label: "Parents" },
  { to: "/solutions/students", label: "Students" },
  { to: "/solutions/drivers", label: "Drivers" },
] as const;

export const FOOTER_RESOURCES = [
  { to: "/resources/demo", label: "Demo" },
  { to: "/resources/help", label: "Help" },
  { to: "/resources/faq", label: "FAQs" },
  { to: "/resources/downloads", label: "Downloads" },
  { to: "/resources/blog", label: "Blog" },
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
