/** Shared attendance domain types — one engine for all methods & owners. */

export type AttendanceMethod =
  | "daily"
  | "morning_first_period"
  | "morning_afternoon"
  | "period_wise";

export type AttendanceOwner =
  | "class_teacher"
  | "current_period_teacher"
  | "attendance_incharge";

export type AttendanceConfigScope = "institute" | "class" | "section";

export type AttendanceConfigVersion = {
  id: string;
  effectiveFrom: string;
  method: AttendanceMethod;
  owner: AttendanceOwner;
  scope: AttendanceConfigScope;
  classTargets: string[];
  sectionTargets: string[];
  createdAt: string;
  createdBy: string;
};

export type AttendanceConfigSnapshot = {
  versions: AttendanceConfigVersion[];
};

export type AttendanceSlotKind = "day" | "morning" | "afternoon" | "period";

/** One capture unit for a date — shape follows Attendance Method. */
export type AttendanceSlot = {
  id: string;
  kind: AttendanceSlotKind;
  label: string;
  /** 0-based period index when kind is period */
  periodIndex?: number;
  subject?: string;
  time?: string;
};

export type AttendanceMarkStatus = "draft" | "submitted";

/**
 * Immutable snapshot of a submitted/draft register for one slot.
 * `method` / `owner` / `configVersionId` are frozen at save time so
 * later config changes never rewrite historical meaning.
 */
export type AttendanceSlotRegister = {
  id: string;
  configVersionId: string;
  method: AttendanceMethod;
  owner: AttendanceOwner;
  /** Stable section key — always canonical `10::B` (never `Grade 10::B`). */
  sectionKey: string;
  /** Canonical class id e.g. `10` (display labels belong in UI only). */
  classLabel: string;
  section: string;
  date: string;
  slotId: string;
  slotLabel: string;
  slotKind: AttendanceSlotKind;
  absentIds: string[];
  leaveIds: string[];
  status: AttendanceMarkStatus;
  markedById: string;
  markedByName: string;
  updatedAt: string;
  submittedAt?: string;
};

export type AttendanceActor = {
  teacherId: string;
  teacherName: string;
  /** Subjects this teacher teaches (for period matching). */
  subjects: string[];
  isClassTeacherForSection: boolean;
  isAttendanceIncharge: boolean;
  /** True if teacher is assigned to teach this section (any subject). */
  teachesSection: boolean;
};

export type PeriodInput = {
  index: number;
  subject: string;
  time: string;
};

export type OpenAttendanceWorkflowInput = {
  date: string;
  classLabel: string;
  section: string;
  sectionKey: string;
  periods?: PeriodInput[];
};

export type AttendanceWorkflow = {
  config: AttendanceConfigVersion;
  method: AttendanceMethod;
  owner: AttendanceOwner;
  slots: AttendanceSlot[];
  /** Slots this actor may mark under current owner rules. */
  markableSlotIds: string[];
  canMarkAny: boolean;
  blockedReason?: string;
};
