import type { AttendanceMarkStatus, AttendanceMethod } from "@lumenx/module-attendance";

export type AttendanceStatus = "present" | "absent";
export type MarkStatus = "draft" | "submitted" | "published";
export type PublishStatus = "draft" | "published" | "expired";
export type ComplaintStatus =
  | "draft"
  | "open"
  | "in_progress"
  | "forwarded"
  | "resolved"
  | "closed"
  | "archived";
export type RemarkType = "academic" | "behaviour" | "improvement" | "parent_note";

export interface TeacherProfile {
  id: string;
  name: string;
  employeeId: string;
  email: string;
  phone: string;
  subjects: string[];
  classes: string[];
  experienceYears: number;
  department: string;
  joinedOn: string;
  avatar?: string;
  language?: string;
  bio?: string;
  /** When true, teacher can open Transport (route monitor). School must offer transport. */
  hasTransport?: boolean;
  /** When true, teacher may mark when Attendance Owner = Attendance Incharge. */
  isAttendanceIncharge?: boolean;
}

export interface StudentAttentionItem {
  studentId: string;
  studentName: string;
  classLabel: string;
  reason: "low_attendance" | "low_marks" | "missing_assignments" | "behaviour";
  detail: string;
}

export interface TeacherPreferences {
  push: boolean;
  email: boolean;
  sms: boolean;
  examAlerts: boolean;
  attendanceAlerts: boolean;
  messageAlerts: boolean;
  eventAlerts: boolean;
}

export interface TeacherClass {
  id: string;
  className: string;
  section: string;
  subject: string;
  studentCount: number;
  isClassTeacher: boolean;
  attendanceRate: number;
  homeworkSubmissionRate: number;
  avgScore: number;
}

export interface TeacherStudent {
  id: string;
  name: string;
  roll: string;
  classId: string;
  className: string;
  section: string;
  attendancePct: number;
  homeworkSubmissionPct: number;
  avgScore: number;
  grade: string;
  avatarInitials: string;
}

export interface StudentPendingItem {
  id: string;
  title: string;
  type: "homework" | "assignment";
  dueDate: string;
  dueLabel: string;
  status: "pending" | "late" | "missing";
}

export interface StudentAttendanceSummary {
  rate: number;
  daysPresent: number;
  daysAbsent: number;
  recentAbsences: { date: string; reason?: string }[];
}

export interface StudentDetail extends TeacherStudent {
  email?: string;
  parentName: string;
  parentPhone: string;
  parentEmail?: string;
  marks: { exam: string; subject: string; total: number; grade: string; status: MarkStatus }[];
  achievements: { title: string; date: string }[];
  awards: { title: string; year: string }[];
  certificates: { title: string; issuedOn: string }[];
  remarks: StudentRemark[];
  growthSummary?: string;
  pendingWork: StudentPendingItem[];
  attendanceSummary: StudentAttendanceSummary;
}

export type StudentReturnContext = {
  from?: "classes" | "students";
  classId?: string;
};

export interface StudentRemark {
  id: string;
  studentId: string;
  studentName: string;
  type: RemarkType;
  text: string;
  authorId: string;
  authorName: string;
  createdAt: string;
  updatedAt?: string;
  visibleTo: ("teacher" | "parent" | "admin")[];
}

export interface TeacherExam {
  id: string;
  name: string;
  subject: string;
  classId: string;
  classLabel: string;
  startDate: string;
  endDate: string;
  date: string;
  description: string;
  room?: string;
  duration?: string;
  status: "upcoming" | "ongoing" | "completed";
  publishStatus: PublishStatus;
  marksStatus: MarkStatus;
}

export interface MarkEntry {
  studentId: string;
  studentName: string;
  roll: string;
  internal: number | null;
  exam: number | null;
  status: MarkStatus;
}

export interface TimetableSlot {
  id: string;
  day: string;
  time: string;
  subject: string;
  className: string;
  section: string;
  room?: string;
}

export interface TeacherNotification {
  id: string;
  title: string;
  body: string;
  category:
    | "announcements"
    | "events"
    | "exam_updates"
    | "staff_notices"
    | "messages"
    | "system"
    | "urgent";
  time: string;
  unread: boolean;
  /** Defaults to subject workspace when omitted. Activity items live in workspace-communication store. */
  portalScope?: "subject" | "activity";
  /** Optional deep link (e.g. /attendance for pending reminders). */
  href?: string;
}

export interface TeacherComplaint {
  id: string;
  title: string;
  body: string;
  category: string;
  priority: "normal" | "urgent" | "critical";
  status: ComplaintStatus;
  createdAt: string;
  response?: string;
}

export interface TeacherEvent {
  id: string;
  title: string;
  description: string;
  category: "academic" | "sports" | "program" | "holiday";
  date: string;
  time: string;
  location: string;
  classId?: string;
  createdBy: string;
}

export interface TeacherMessage {
  id: string;
  threadId: string;
  from: string;
  to: string;
  recipientRole: "parent" | "student" | "principal" | "class" | "teacher";
  subject: string;
  body: string;
  time: string;
  unread: boolean;
  archived: boolean;
  draft: boolean;
  /** Defaults to subject workspace when omitted. */
  portalScope?: "subject" | "activity";
}

export interface TeacherMessageTarget {
  id: string;
  label: string;
  role: TeacherMessage["recipientRole"];
  classId?: string;
  section?: string;
}

export interface TeacherLeaveRequest {
  id: string;
  teacherId: string;
  teacherName: string;
  type: "sick" | "casual" | "emergency" | "permission";
  to: "admin" | "principal";
  fromDate: string;
  toDate: string;
  reason: string;
  status: "pending" | "approved" | "rejected" | "ignored";
  submittedAt: string;
  reviewedNote?: string;
}

export interface TeacherSelfAttendanceRecord {
  id: string;
  date: string;
  inTime: string;
  outTime: string;
  status: "present" | "late" | "absent" | "leave";
  markedBy: "admin" | "principal";
  note?: string;
}

export interface DashboardSnapshot {
  todayClasses: TimetableSlot[];
  weekClassCount: number;
  attendancePending: { classId: string; label: string; count: number }[];
  /** Classes with attendance submitted today */
  attendanceCompleted: { classId: string; label: string; count: number }[];
  /** Alias count for remaining classes to mark (= pending length) */
  classesRemaining: number;
  pendingMarks: { examId: string; label: string; count: number }[];
  pendingHomework: { assignmentId: string; label: string; pendingCount: number }[];
  homeworkOverview: { classId: string; label: string; submissionPct: number }[];
  upcomingExams: TeacherExam[];
  upcomingEvents: TeacherEvent[];
  unreadMessages: number;
  recentComplaints: TeacherComplaint[];
  classPerformance: {
    classId: string;
    label: string;
    attendance: number;
    homework: number;
    avgScore: number;
  }[];
  recentNotifications: TeacherNotification[];
  announcements: { id: string; title: string; body: string; date: string }[];
  studentsNeedingAttention: StudentAttentionItem[];
}

export interface AttendanceReport {
  period: "daily" | "weekly" | "monthly";
  label: string;
  present: number;
  absent: number;
  rate: number;
  /** School working days in the report window (Sundays + holidays excluded). */
  workingDays: number;
}

export interface AttendanceRecord {
  classId: string;
  date: string;
  absentIds: string[];
  /** Students on approved leave — excluded from absent count */
  leaveIds?: string[];
  status: AttendanceMarkStatus;
  /** Engine slot id (daily / morning / afternoon / period). */
  slotId?: string;
  slotLabel?: string;
  method?: AttendanceMethod;
  configVersionId?: string;
}

export type AssignmentStatus = "pending" | "submitted" | "graded";
export type SubmissionTiming = "early" | "on_time" | "late" | "missing";

export interface TeacherAssignment {
  id: string;
  title: string;
  description: string;
  instructions: string;
  subject: string;
  classId: string;
  classLabel: string;
  section: string;
  due: string;
  dueDate: string;
  status: AssignmentStatus;
  publishStatus: PublishStatus;
  totalStudents: number;
  submittedCount: number;
  submissionRate: number;
  type: "homework" | "assignment";
}

export interface AssignmentSubmission {
  id: string;
  assignmentId: string;
  studentId: string;
  studentName: string;
  roll: string;
  timing: SubmissionTiming;
  submittedAt: string | null;
  note: string;
  graded: boolean;
  marks: number | null;
  maxMarks: number;
}

export interface HomeworkAttendanceRow {
  studentId: string;
  studentName: string;
  roll: string;
  classId: string;
  totalAssigned: number;
  submitted: number;
  onTime: number;
  late: number;
  missing: number;
  submissionPct: number;
  onTimePct: number;
}

export interface HomeworkClassSummary {
  classId: string;
  label: string;
  totalAssignments: number;
  avgSubmissionPct: number;
  avgOnTimePct: number;
  studentsBelow70: number;
}
