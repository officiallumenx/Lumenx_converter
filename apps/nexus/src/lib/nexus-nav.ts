/**
 * Nexus navigation & route architecture.
 *
 * Product boundary:
 * - Admin  = operates one institute
 * - Nexus  = manages the LumenX platform and all institutes
 *
 * Operational institute modules are excluded from the sidebar.
 * Legacy paths redirect to platform surfaces (no Admin UI in Nexus).
 */

import {
  LayoutDashboard,
  Building2,
  Layers,
  CreditCard,
  KeyRound,
  ShieldAlert,
  ScrollText,
  HardDrive,
  Trash2,
  LifeBuoy,
  BarChart3,
  Settings,
  LayoutTemplate,
  Award,
  Users,
  AlertTriangle,
  ClipboardList,
  type LucideIcon,
} from "lucide-react";

export type NexusNavItem = {
  to: string;
  label: string;
  icon: LucideIcon;
  responsibility: string;
};

export type NexusNavGroup = {
  label: string;
  items: readonly NexusNavItem[];
};

/** Primary Nexus sidebar — platform business management only. */
export const nexusNav: readonly NexusNavGroup[] = [
  {
    label: "Platform",
    items: [
      {
        to: "/",
        label: "Command Center",
        icon: LayoutDashboard,
        responsibility: "Multi-institute platform overview and health",
      },
      {
        to: "/institutes",
        label: "Institutes",
        icon: Building2,
        responsibility: "Create, monitor, and manage all institutes",
      },
      {
        to: "/registrations",
        label: "Registrations",
        icon: ClipboardList,
        responsibility: "Review Admin self-registration · Approve / Reject",
      },
      {
        to: "/platform-users",
        label: "Platform Users",
        icon: Users,
        responsibility: "Aggregate user counts across institutes · no person profiles",
      },
      {
        to: "/health-risks",
        label: "Health & Risks",
        icon: AlertTriangle,
        responsibility: "Institute operational risk and Nexus commercial risk",
      },
      {
        to: "/analytics",
        label: "Analytics",
        icon: BarChart3,
        responsibility: "Network analytics — cross-institute platform performance",
      },
    ],
  },
  {
    label: "Commercial",
    items: [
      {
        to: "/modules",
        label: "Modules",
        icon: Layers,
        responsibility: "Plan assignment and module licensing per institute",
      },
      {
        to: "/billing",
        label: "Billing & Renewals",
        icon: CreditCard,
        responsibility: "Offline payment verification · quotes · renewals",
      },
    ],
  },
  {
    label: "Governance",
    items: [
      {
        to: "/access",
        label: "Platform Access",
        icon: KeyRound,
        responsibility: "Nexus operator roles — Root, Operations, Billing, Support, Analyst",
      },
      {
        to: "/policies",
        label: "Policies & Alerts",
        icon: ShieldAlert,
        responsibility: "Platform alerts — billing, quota, security, SLA · not academic rules",
      },
      {
        to: "/audit",
        label: "Audit Log",
        icon: ScrollText,
        responsibility: "Nexus action history — institutes, plans, modules, billing, support",
      },
    ],
  },
  {
    label: "Platform Services",
    items: [
      {
        to: "/storage",
        label: "Storage Quotas",
        icon: HardDrive,
        responsibility: "Plan storage ceilings and institute quota monitoring",
      },
      {
        to: "/recycle",
        label: "Recycle Bin",
        icon: Trash2,
        responsibility: "Cross-institute soft-delete oversight · restore in Admin",
      },
      {
        to: "/notification-templates",
        label: "Notification Templates",
        icon: LayoutTemplate,
        responsibility: "Platform notification template catalog · not a designer or sender",
      },
      {
        to: "/certificates",
        label: "Certificate Templates",
        icon: Award,
        responsibility: "Certificate template library — PPT mapping, publish, versions (not issuing)",
      },
    ],
  },
  {
    label: "Support",
    items: [
      {
        to: "/support",
        label: "Support Center",
        icon: LifeBuoy,
        responsibility: "Institute support threads — issues, requests, feedback",
      },
    ],
  },
  {
    label: "Settings",
    items: [
      {
        to: "/settings",
        label: "Platform Settings",
        icon: Settings,
        responsibility: "Platform defaults, security, and operator preferences",
      },
    ],
  },
] as const;

/**
 * Legacy Admin-clone / institute-ops paths — redirect stubs only (not in sidebar).
 * Do not re-link these into the sidebar or restore Admin UI here.
 */
export const nexusLegacyInstituteRoutes = [
  "/students",
  "/students/$id",
  "/teachers",
  "/parents",
  "/accounts",
  "/classes",
  "/timetable",
  "/attendance",
  "/exams",
  "/notifications",
  "/announcements",
  "/events",
  "/complaints",
  "/guardian-links",
  "/permissions",
  "/alerts",
  "/templates",
] as const;

export const NEXUS_SEARCH_PLACEHOLDER = "Search institutes, plans, tickets, templates…";
