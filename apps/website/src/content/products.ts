import type { LucideIcon } from "lucide-react";
import {
  Building2,
  Bus,
  GraduationCap,
  Radar,
  Smartphone,
  Users,
} from "lucide-react";

export const PRODUCT_SLUGS = ["admin", "connect", "transport", "nexus"] as const;
export type ProductSlug = (typeof PRODUCT_SLUGS)[number];

export type ProductContent = {
  slug: ProductSlug;
  name: string;
  shortName: string;
  tagline: string;
  users: string;
  replaces: string;
  doesNotReplace: string;
  narrative: string;
  capabilities: string[];
  icon: LucideIcon;
  accentVar: string;
  device: "phone" | "tablet";
  demoCta: string;
  android: boolean;
};

export const PRODUCTS: Record<ProductSlug, ProductContent> = {
  admin: {
    slug: "admin",
    name: "LumenX Admin",
    shortName: "Admin",
    tagline: "Institute operations console",
    users: "Institute admin, principal, accountant, front office",
    replaces: "Spreadsheets and office WhatsApp groups",
    doesNotReplace: "The parent, teacher, or student app",
    narrative:
      "Admin is where the institute writes the source of truth — people, classes, fees, and day-to-day operations. Connect only shows what each role is allowed to see.",
    capabilities: [
      "Students, teachers, and parents in one directory",
      "Attendance, timetable, exams, and documents",
      "Fees, complaints, announcements, and admissions",
      "Route assignment when Transport is on",
    ],
    icon: Building2,
    accentVar: "var(--site-product-admin)",
    device: "tablet",
    demoCta: "View Admin preview",
    android: true,
  },
  connect: {
    slug: "connect",
    name: "LumenX Connect",
    shortName: "Connect",
    tagline: "Parents, teachers, and students",
    users: "Parent, teacher, student",
    replaces: "Separate parent, teacher, and student apps",
    doesNotReplace: "Institute configuration in Admin",
    narrative:
      "One mobile-first portal with strict role isolation. Parents switch children; teachers mark attendance; students see timetable, marks, and identity — never another role’s navigation.",
    capabilities: [
      "Institute → portal → credentials → OTP login",
      "Parent: multi-child, attendance, fees, messages",
      "Teacher: class attendance, assignments, timetable",
      "Student: timetable, marks, profile, and ID",
    ],
    icon: Smartphone,
    accentVar: "var(--site-product-connect)",
    device: "phone",
    demoCta: "View Connect preview",
    android: true,
  },
  transport: {
    slug: "transport",
    name: "LumenX Transport",
    shortName: "Transport",
    tagline: "Fleet, routes, and live trips",
    users: "Driver, transport coordinator; parents track via Connect",
    replaces: "Driver WhatsApp threads and paper manifests",
    doesNotReplace: "Fee collection or the parent portal",
    narrative:
      "A dedicated app for executing the day’s trips. Admin assigns students to routes; drivers run boarding and status; parents see trip status in Connect when the module is active.",
    capabilities: [
      "Routes, stops, vehicles, and drivers",
      "Daily trip execution and student boarding",
      "Delay and status for operations",
      "Incident notes for the office",
    ],
    icon: Bus,
    accentVar: "var(--site-product-transport)",
    device: "phone",
    demoCta: "View Transport preview",
    android: true,
  },
  nexus: {
    slug: "nexus",
    name: "LumenX Nexus",
    shortName: "Nexus",
    tagline: "Service platform for quality and feedback",
    users: "LumenX operators and group / trust heads",
    replaces: "Scattered support inboxes and multi-branch spreadsheets",
    doesNotReplace: "Day-to-day school office work in Admin",
    narrative:
      "Nexus is the LumenX service platform — licensing, support, feedback, and platform health in one place. It improves the institute experience after go-live, not only at signup. Admin still runs the school day. A single campus may never open Nexus; a group or operator will.",
    capabilities: [
      "Support center and institute feedback loops",
      "Quality signals across licensed institutes",
      "Trial, subscription, and renewals",
      "Module activation and platform health",
    ],
    icon: Radar,
    accentVar: "var(--site-product-nexus)",
    device: "tablet",
    demoCta: "View Nexus preview",
    android: false,
  },
};

export const PRODUCT_LIST = PRODUCT_SLUGS.map((slug) => PRODUCTS[slug]);

export function isProductSlug(value: string): value is ProductSlug {
  return (PRODUCT_SLUGS as readonly string[]).includes(value);
}

export const AUDIENCES = [
  {
    id: "office",
    title: "Principal & office",
    outcome: "Run the institute day without chasing notebooks.",
    product: "admin" as ProductSlug,
    icon: Building2,
    points: [
      "People, classes, and attendance in one console",
      "Fees and documents without parallel spreadsheets",
      "Announcements that actually reach families",
    ],
  },
  {
    id: "parent",
    title: "Parents",
    outcome: "See attendance, fees, and the bus without calling the office.",
    product: "connect" as ProductSlug,
    icon: Users,
    points: [
      "Switch between children in one account",
      "Attendance and fee status without office hours",
      "Trip status when Transport is on",
    ],
  },
  {
    id: "teacher",
    title: "Teachers",
    outcome: "Mark attendance and share class work from a phone.",
    product: "connect" as ProductSlug,
    icon: GraduationCap,
    points: [
      "Class roster and daily attendance",
      "Assignments and timetable in context",
      "No access to another role’s portal",
    ],
  },
  {
    id: "driver",
    title: "Drivers & transport in-charge",
    outcome: "Execute the trip from a dedicated app — not a leftover menu.",
    product: "transport" as ProductSlug,
    icon: Bus,
    points: [
      "Today’s manifest and stops",
      "Boarding counts the office can see",
      "Large controls built for the road",
    ],
  },
  {
    id: "group",
    title: "Group & trust operators",
    outcome: "Quality service across institutes — licensing, support, and feedback.",
    product: "nexus" as ProductSlug,
    icon: Radar,
    points: [
      "Support and institute feedback after go-live",
      "Approve institutes, trials, rate, and tenure",
      "Turn modules on and watch platform health",
    ],
  },
] as const;
