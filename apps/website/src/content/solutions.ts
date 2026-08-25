import type { LucideIcon } from "lucide-react";
import {
  Briefcase,
  Building2,
  Bus,
  ClipboardList,
  GraduationCap,
  User,
  UserCheck,
  Users,
} from "lucide-react";
import type { ProductId } from "@/theme/products";

export const SOLUTION_IDS = [
  "institutions",
  "administrators",
  "teachers",
  "parents",
  "students",
  "drivers",
  "applicants",
  "careers",
] as const;

export type SolutionId = (typeof SOLUTION_IDS)[number];

export type SolutionView = {
  id: SolutionId;
  title: string;
  outcome: string;
  narrative: string;
  product: ProductId;
  products: readonly ProductId[];
  icon: LucideIcon;
  points: readonly string[];
};

export const SOLUTIONS: SolutionView[] = [
  {
    id: "institutions",
    title: "Institutions",
    outcome: "Run the whole institute on one set of records — not five disconnected tools.",
    narrative:
      "LumenX is the institute platform. Admin writes people, classes, and fees. Connect is how families and teachers use that record. Transport, Admissions, and Careers switch on per institute. Nexus is the service platform for groups — licensing, support, and feedback. A single campus may never open Nexus.",
    product: "admin",
    products: ["admin", "connect", "transport", "admissions", "careers", "nexus"],
    icon: Building2,
    points: [
      "One directory instead of parallel spreadsheets",
      "Modules enabled per institute when you need them",
      "About ₹12 per student each month, with a clear campus minimum",
    ],
  },
  {
    id: "administrators",
    title: "Administrators",
    outcome: "Run the institute day without chasing notebooks.",
    narrative:
      "Admin is the office console: students, teachers, parents, attendance, timetable, exams, fees, documents, complaints, and — when turned on — transport assignment, admissions conversion, and careers conversion. Roles decide who in the office can use which module.",
    product: "admin",
    products: ["admin"],
    icon: ClipboardList,
    points: [
      "People, classes, attendance, and fees in one place",
      "Certificates and document requests without email trails",
      "Convert accepted intake and hires into the directory",
    ],
  },
  {
    id: "teachers",
    title: "Teachers",
    outcome: "Mark attendance and share class work from a phone.",
    narrative:
      "Teachers use Connect, not Admin. They see assigned classes: attendance, diary, homework, marks, exams, timetable, and messages. An activity coordinator gets a sports and ECA workspace. They never receive another role’s navigation.",
    product: "connect",
    products: ["connect"],
    icon: GraduationCap,
    points: [
      "Class roster and daily attendance",
      "Diary, homework, marks, and timetable in context",
      "No leftover Admin or parent menu",
    ],
  },
  {
    id: "parents",
    title: "Parents",
    outcome: "See attendance, fees, and the bus without calling the office.",
    narrative:
      "Parents use Connect with a multi-child switch. They see presence, dues, homework, marks, messages, and — when Transport is on — trip status, boarding, and approach alerts. They do not see a live GPS map, and they do not configure the institute.",
    product: "connect",
    products: ["connect", "transport"],
    icon: Users,
    points: [
      "One account for every child",
      "Attendance and fee status without office hours",
      "Trip status and 30 / 15 / 5 minute approach alerts when Transport is on",
    ],
  },
  {
    id: "students",
    title: "Students",
    outcome: "See your timetable, marks, and identity — nothing else.",
    narrative:
      "Students use Connect for their own day: attendance, homework, timetable, exams, marks, certificates, and ID. Credentials come from the office. The student portal is not a parent account and not a teacher roster.",
    product: "connect",
    products: ["connect"],
    icon: User,
    points: [
      "Timetable, homework, marks, and ID",
      "Own attendance — not the class register",
      "Never another role’s navigation",
    ],
  },
  {
    id: "drivers",
    title: "Drivers",
    outcome: "Execute the trip from a dedicated app — not a leftover menu.",
    narrative:
      "Transport is a driver app: today’s route, stops, boarding, trip status, and an emergency note to the office. Admin assigns students to routes. Parents follow status in Connect. Device location is for stop setup and readiness — not a parent telematics stream.",
    product: "transport",
    products: ["transport", "admin", "connect"],
    icon: Bus,
    points: [
      "Today’s manifest and stops",
      "Boarding counts the office can see",
      "SOS as a note — not SMS or a phone call",
    ],
  },
  {
    id: "applicants",
    title: "Applicants",
    outcome: "Submit an application that can become a student record.",
    narrative:
      "Admissions helps applicants discover institutes and programs, apply, and attach documents. The office reviews and decides on the same file. Admin converts accepted intake to a student. After that, the family uses Connect.",
    product: "admissions",
    products: ["admissions", "admin", "connect"],
    icon: UserCheck,
    points: [
      "Discover, apply, and track on one file",
      "Waitlist and decisions without a second register",
      "After conversion, the family uses Connect as a parent",
    ],
  },
  {
    id: "careers",
    title: "Careers",
    outcome: "Find a role, apply, and move hiring forward in one place.",
    narrative:
      "Careers is for job seekers and institute recruiters. Candidates browse jobs, apply, and track interviews. Recruiters review applications in the Careers workspace. Admin converts an approved hire into a teacher record — Careers is not the classroom app.",
    product: "careers",
    products: ["careers", "admin", "connect"],
    icon: Briefcase,
    points: [
      "Jobs, applications, and interview updates",
      "Recruiter workspace for the institute",
      "Approved hires become teachers in Admin",
    ],
  },
];

export function isSolutionId(value: string): value is SolutionId {
  return (SOLUTION_IDS as readonly string[]).includes(value);
}
