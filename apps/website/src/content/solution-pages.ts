import type { SolutionId } from "./solutions";

/** Audience-focused solution pages for the public IA (excludes applicants/careers from primary nav). */
export const PUBLIC_SOLUTION_IDS = [
  "institutions",
  "administrators",
  "teachers",
  "parents",
  "students",
  "drivers",
] as const;

export type PublicSolutionId = (typeof PUBLIC_SOLUTION_IDS)[number];

export function isPublicSolutionId(value: string): value is PublicSolutionId {
  return (PUBLIC_SOLUTION_IDS as readonly string[]).includes(value);
}

export function solutionPath(id: PublicSolutionId | SolutionId): string {
  if (isPublicSolutionId(id)) return `/solutions?role=${id}`;
  return "/solutions";
}

export type SolutionPageExtra = {
  id: PublicSolutionId;
  headline: string;
  workflow: readonly { title: string; body: string }[];
  capabilities: readonly string[];
};

export const SOLUTION_PAGES: Record<PublicSolutionId, SolutionPageExtra> = {
  institutions: {
    id: "institutions",
    headline: "Run the whole institute on one connected platform.",
    workflow: [
      { title: "Configure once", body: "Admin holds people, classes, fees, and modules for the campus." },
      { title: "Reach every role", body: "Families and teachers use Connect. Drivers use Transport when enabled." },
      { title: "Grow without retyping", body: "Admissions and Careers feed the same directory when you turn them on." },
    ],
    capabilities: [
      "One directory instead of parallel spreadsheets",
      "Admin + Connect as the campus core",
      "Transport, Admissions, and Careers on request",
    ],
  },
  administrators: {
    id: "administrators",
    headline: "Manage daily operations from one connected workspace.",
    workflow: [
      { title: "People first", body: "Students, teachers, and parents live in one directory with roles and access." },
      { title: "Run the day", body: "Attendance, timetable, exams, fees, and documents without chasing notebooks." },
      { title: "Convert intake and hires", body: "Accepted applications and approved hires become records the campus already uses." },
    ],
    capabilities: [
      "Attendance",
      "Students",
      "Teachers",
      "Fees",
      "Academics",
      "Reports",
      "Transport",
      "Documents",
      "Analytics",
    ],
  },
  teachers: {
    id: "teachers",
    headline: "Mark attendance and share class work from a phone.",
    workflow: [
      { title: "Open Connect", body: "Teachers use Connect — not the office Admin console." },
      { title: "Teach the day", body: "Attendance, diary, homework, marks, and timetable for assigned classes." },
      { title: "Stay in role", body: "Never another person’s navigation — parents and office stay separate." },
    ],
    capabilities: [
      "Class attendance",
      "Diary and homework",
      "Marks submission",
      "Timetable",
      "Messages",
      "Leave requests",
    ],
  },
  parents: {
    id: "parents",
    headline: "See attendance, fees, and the bus without calling the office.",
    workflow: [
      { title: "One family account", body: "Switch between children without collecting extra logins." },
      { title: "Stay informed", body: "Attendance, dues, homework, marks, and messages in Connect." },
      { title: "Follow the trip", body: "When Transport is on, see trip status and approach alerts — not a live GPS map." },
    ],
    capabilities: [
      "Multi-child switch",
      "Attendance and fees",
      "Homework and marks",
      "Messages and notices",
      "Trip status when Transport is on",
    ],
  },
  students: {
    id: "students",
    headline: "See your timetable, marks, and identity — nothing else.",
    workflow: [
      { title: "Your day", body: "Timetable, homework, exams, and marks for your own classes." },
      { title: "Your record", body: "Attendance, certificates, and digital ID when issued." },
      { title: "Your role only", body: "Not a parent account and not a teacher roster." },
    ],
    capabilities: [
      "Timetable",
      "Homework",
      "Marks and exams",
      "Own attendance",
      "Certificates and ID",
    ],
  },
  drivers: {
    id: "drivers",
    headline: "Execute the trip from a dedicated app — not a leftover menu.",
    workflow: [
      { title: "Today’s manifest", body: "Route, stops, and boarding in the Transport app." },
      { title: "Run the trip", body: "Board students and update trip status the office can see." },
      { title: "Escalate safely", body: "Emergency notes reach the office when something goes wrong on the road." },
    ],
    capabilities: [
      "Today’s trip overview",
      "Boarding at stops",
      "Trip status",
      "Route and bus information",
      "Emergency escalation",
    ],
  },
};
