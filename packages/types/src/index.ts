export type Role = "parent" | "teacher" | "student";

export type { Institute, InstituteKind } from "./institute";
export type {
  TeacherRecord,
  TeacherRole,
  TeacherStatus,
} from "./staff";
export type {
  ConnectLoginAccountStatus,
  PortalAccessStatus,
  PortalAccountStatus,
  PortalInviteStatus,
} from "./account";
export type {
  AdminPortalDocStatus,
  CertificateLifecycleStatus,
  ContactInquiryStatus,
  InterviewMode,
} from "./portal";

export interface User {
  id: string;
  name: string;
  phone: string;
  email?: string;
  address?: string;
  avatar?: string;
  roles: Role[];
}

export interface Child {
  id: string;
  name: string;
  initials: string;
  className: string;
  section: string;
  rollNo: string;
  attendance: number;
  avgScore: number;
  trend: "up" | "down" | "flat";
  accent: "primary" | "success" | "warning";
}

export interface Achievement {
  id: string;
  title: string;
  description: string;
  icon:
    | "trophy"
    | "flame"
    | "medal"
    | "star"
    | "sparkles"
    | "target"
    | "heart"
    | "zap"
    | "crown"
    | "rocket";
  tier: "bronze" | "silver" | "gold" | "platinum";
  unlockedOn?: string;
  progress?: number; // 0-100, for in-progress
}

export interface Streak {
  id: string;
  label: string;
  current: number;
  best: number;
  unit: "days" | "weeks" | "submissions";
  tone: "primary" | "success" | "warning";
}

export interface Goal {
  id: string;
  title: string;
  metric: "attendance" | "marks" | "assignments" | "sports";
  target: number;
  current: number;
  unit: string;
  due: string;
}

export interface SportEvent {
  id: string;
  title: string;
  sport: string;
  date: string;
  time: string;
  venue: string;
  status: "upcoming" | "ongoing" | "completed";
  result?: string;
  /** Distinguishes sports matches from cultural activities on the same calendar. */
  kind?: "sport" | "cultural";
}

export interface SportTeam {
  id: string;
  name: string;
  sport: string;
  coach: string;
  members: number;
  practiceDays: string;
  rating: number;
}

export type NotificationCategory =
  | "academic"
  | "attendance"
  | "assignments"
  | "exams"
  | "fees"
  | "sports"
  | "events"
  | "holidays"
  | "emergency"
  | "circulars";

export interface AppNotification {
  id: string;
  title: string;
  desc: string;
  time: string;
  type: "info" | "warning" | "positive";
  category: NotificationCategory;
  unread?: boolean;
  priority?: "low" | "normal" | "high";
  /** Extended body shown when the notification is opened. */
  detail?: string;
  /** Starred notifications never auto-delete. */
  starred?: boolean;
  /** ISO timestamp used for 90-day retention. */
  createdAt?: string;
  /** Soft-deleted into notification recycle bin (15 days). */
  deletedAt?: string;
  /** Shared template id from `@lumenx/module-notifications` when applicable. */
  templateId?: string;
  /** In-app deep link path (e.g. `/fees`, `/student-attendance`). */
  href?: string;
}

/** Mandatory vs emergency alerts routed to parents/students (distinct from general notifications). */
export type AlertSeverity = "mandatory" | "emergency";

export type AlertCategory =
  | "absence"
  | "health"
  | "remark"
  | "safety"
  | "attendance"
  | "leave"
  | "general";

export interface SchoolAlert {
  id: string;
  title: string;
  summary: string;
  detail: string;
  severity: AlertSeverity;
  category: AlertCategory;
  time: string;
  source: string;
  /** Linked learner for parent multi-child households. */
  childName?: string;
  childId?: string;
  unread: boolean;
  acknowledged: boolean;
  actionRequired?: boolean;
  actionLabel?: string;
  /** Links alert to a leave request (teacher action / parent status). */
  relatedLeaveId?: string;
}

export type LeaveStatus = "pending" | "approved" | "rejected" | "dismissed";

export interface LeaveRequest {
  id: string;
  childId: string;
  childName: string;
  className: string;
  section: string;
  /** ISO date YYYY-MM-DD — first day of leave */
  leaveStartDate: string;
  /** ISO date YYYY-MM-DD — last day of leave (same as start for single-day leave) */
  leaveEndDate: string;
  description: string;
  status: LeaveStatus;
  appliedAt: string;
  updatedAt: string;
  teacherNote?: string;
}

export interface SubjectMark {
  subject: string;
  internal: number; // /20
  exam: number; // /80
  total: number; // /100
  grade: string;
  remark?: string;
}

export interface ReportCard {
  id: string;
  term: string;
  publishedOn: string;
  marks: SubjectMark[];
  percentage: number;
  grade: string;
  rank: number;
  status: "draft" | "published";
}

export interface FeeItem {
  id: string;
  title: string;
  term: string;
  amount: number;
  due: string;
  status: "paid" | "partial" | "overdue" | "upcoming";
  paidOn?: string;
  receiptNo?: string;
  /** When set to `exam`, shown under examination fees and on the exams page. */
  category?: "exam" | "general";
}

export interface SchoolEvent {
  id: string;
  title: string;
  kind:
    | "event"
    | "holiday"
    | "workshop"
    | "seminar"
    | "sports"
    | "celebration"
    | "exam-holiday"
    | "announcement";
  date: string; // ISO yyyy-mm-dd
  endDate?: string;
  time?: string;
  venue?: string;
  description?: string;
}

export * from "./demo-profiles";
