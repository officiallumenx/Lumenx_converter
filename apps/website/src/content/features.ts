import type { ProductId } from "@/theme/products";

export const FEATURE_GROUP_IDS = [
  "academic",
  "administration",
  "communication",
  "operations",
  "admissions",
  "careers",
  "documents",
  "activities",
] as const;

export type FeatureGroupId = (typeof FEATURE_GROUP_IDS)[number];

export type FeatureItem = {
  name: string;
  blurb: string;
  surfaces: string;
};

export type FeatureGroup = {
  id: FeatureGroupId;
  title: string;
  lede: string;
  related: readonly ProductId[];
  items: FeatureItem[];
};

export const FEATURE_GROUPS: FeatureGroup[] = [
  {
    id: "academic",
    title: "Academic",
    lede: "The teaching rhythm — captured once, visible to the right role.",
    related: ["admin", "connect"],
    items: [
      { name: "Attendance", blurb: "Teachers mark the class. The office reads the same day. Families see their child.", surfaces: "Admin · Connect" },
      { name: "Timetable", blurb: "Conflict-aware schedules the class actually follows.", surfaces: "Admin · Connect" },
      { name: "Exams & marks", blurb: "Schedules, marks, and report cards — not a public results website.", surfaces: "Admin · Connect" },
      { name: "Homework", blurb: "Assignments written by the teacher, read by the family and student.", surfaces: "Admin · Connect" },
    ],
  },
  {
    id: "administration",
    title: "Administration",
    lede: "The directory the rest of the platform reads.",
    related: ["admin"],
    items: [
      { name: "Students", blurb: "Profiles, guardians, and the record Admissions converts into.", surfaces: "Admin · Connect" },
      { name: "Teachers", blurb: "Faculty records and class assignment. Hires can arrive from Careers.", surfaces: "Admin · Connect" },
      { name: "Parents", blurb: "Guardian accounts with child linking — one Connect login per family.", surfaces: "Admin · Connect" },
      { name: "Roles & access", blurb: "Office roles with per-module access. Not another person’s Connect portal.", surfaces: "Admin" },
    ],
  },
  {
    id: "communication",
    title: "Communication",
    lede: "Reach the people who need it — without another WhatsApp group.",
    related: ["admin", "connect"],
    items: [
      { name: "Notifications", blurb: "In-app notices with category, priority, and a deep link into Connect.", surfaces: "All apps" },
      { name: "Complaints", blurb: "Cases with a clear owner instead of a scattered inbox.", surfaces: "Admin · Connect" },
      { name: "Announcements", blurb: "Office messages that land in the apps people already use.", surfaces: "Admin · Connect" },
    ],
  },
  {
    id: "operations",
    title: "Operations",
    lede: "Money, movement, and a view across the institute.",
    related: ["admin", "transport", "nexus"],
    items: [
      { name: "Fees", blurb: "Structures and dues in Admin. Families see balances in Connect. No public checkout here.", surfaces: "Admin · Connect" },
      { name: "Transport", blurb: "Routes and assignment in Admin. Trips in Transport. Status in Connect when the module is on.", surfaces: "Admin · Transport · Connect" },
      { name: "Analytics", blurb: "Institute views in Admin. Groups also see platform intelligence in Nexus.", surfaces: "Admin · Nexus" },
    ],
  },
  {
    id: "admissions",
    title: "Admissions",
    lede: "Intake that becomes a student record — not a second database.",
    related: ["admissions", "admin"],
    items: [
      { name: "Discovery & apply", blurb: "Institutes, programs, and openings before the file is submitted.", surfaces: "Connect portal" },
      { name: "Documents & waitlist", blurb: "Papers stay on the application. Waitlisted is a stage, not a side list.", surfaces: "Admin · Connect" },
      { name: "Decision & conversion", blurb: "Approve, reject, or waitlist. Admin converts accepted intake to a student.", surfaces: "Admin · Connect" },
    ],
  },
  {
    id: "careers",
    title: "Careers",
    lede: "Hiring in the same family, enabled per institute.",
    related: ["careers", "admin"],
    items: [
      { name: "Jobs & applications", blurb: "Posted and reviewed in the Careers portal — not as an Admin leftover.", surfaces: "Connect portal" },
      { name: "Interviews", blurb: "Detail on the application. Not a campus-wide interview calendar product.", surfaces: "Connect portal" },
      { name: "Hiring", blurb: "Admin converts an approved hire to a teacher the rest of the platform can use.", surfaces: "Admin · Connect" },
    ],
  },
  {
    id: "documents",
    title: "Documents",
    lede: "Templates the office issues — not files trapped in email.",
    related: ["admin", "connect"],
    items: [
      { name: "Certificates", blurb: "Library, builder, issue, and copies the student can see.", surfaces: "Admin · Connect" },
      { name: "Document requests", blurb: "Requests, packages, generate, and published files in Admin.", surfaces: "Admin · Connect" },
    ],
  },
  {
    id: "activities",
    title: "Activities",
    lede: "Class work and activity programmes already in the products.",
    related: ["connect", "admin"],
    items: [
      { name: "Diary", blurb: "Day book for the class, written in Admin and Connect teacher tools.", surfaces: "Admin · Connect" },
      { name: "Homework", blurb: "Assignments in the academic workflow.", surfaces: "Admin · Connect" },
      { name: "Activity workspace", blurb: "Sports and ECA attendance, diary, and practice for coordinators in Connect.", surfaces: "Connect" },
    ],
  },
];

export function isFeatureGroupId(value: string): value is FeatureGroupId {
  return (FEATURE_GROUP_IDS as readonly string[]).includes(value);
}
