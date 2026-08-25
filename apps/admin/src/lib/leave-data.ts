/** Leave Center — teacher leave managed by Admin; student leave is teacher-managed in Connect. */

export type LeaveStatus = "pending" | "approved" | "rejected" | "cancelled" | "ignored";

export type StudentLeave = {
  id: string;
  name: string;
  class: string;
  from: string;
  to: string;
  reason: string;
  status: LeaveStatus;
  applied: string;
  days: number;
  /** Teacher note from Connect (read-only in Admin). */
  teacherNote?: string;
};

export type TeacherLeave = {
  id: string;
  name: string;
  dept: string;
  from: string;
  to: string;
  type: string;
  status: LeaveStatus;
  toRole: string;
  applied: string;
  days: number;
  reason?: string;
  /** Admin / principal explanation shown under rejected or ignored requests. */
  adminNote?: string;
  decidedAt?: string;
};

export type LeaveKind = "student" | "teacher";

const STUDENT_SEED: StudentLeave[] = [
  {
    id: "LV-201",
    name: "Aanya Sharma",
    class: "10-A",
    from: "2026-06-05",
    to: "2026-06-06",
    reason: "Family function",
    status: "pending",
    applied: "2026-06-02",
    days: 2,
  },
  {
    id: "LV-198",
    name: "Julian Draxler",
    class: "11-C",
    from: "2026-06-03",
    to: "2026-06-03",
    reason: "Medical",
    status: "approved",
    applied: "2026-06-01",
    days: 1,
    teacherNote: "Approved by class teacher.",
  },
  {
    id: "LV-195",
    name: "Alina Moreno",
    class: "9-A",
    from: "2026-05-28",
    to: "2026-05-30",
    reason: "Travel",
    status: "rejected",
    applied: "2026-05-26",
    days: 3,
    teacherNote: "Exam week — leave not possible.",
  },
  {
    id: "LV-192",
    name: "Priya Patel",
    class: "9-B",
    from: "2026-06-08",
    to: "2026-06-08",
    reason: "Doctor appointment",
    status: "pending",
    applied: "2026-06-03",
    days: 1,
  },
  {
    id: "LV-190",
    name: "Marcus Lee",
    class: "11-A",
    from: "2026-06-01",
    to: "2026-06-01",
    reason: "Festival",
    status: "approved",
    applied: "2026-05-29",
    days: 1,
  },
  {
    id: "LV-188",
    name: "Sana Khan",
    class: "12-A",
    from: "2026-05-20",
    to: "2026-05-22",
    reason: "Personal",
    status: "ignored",
    applied: "2026-05-18",
    days: 3,
    teacherNote: "Duplicate request — already covered by prior approval.",
  },
];

const TEACHER_SEED: TeacherLeave[] = [
  {
    id: "TLR-042",
    name: "Sarah Jenkins",
    dept: "Mathematics",
    from: "2026-06-10",
    to: "2026-06-12",
    type: "Casual",
    status: "pending",
    toRole: "Admin",
    applied: "2026-06-04",
    days: 3,
    reason: "Family travel — advance notice given to HOD.",
  },
  {
    id: "TLR-041",
    name: "Marcus Whitfield",
    dept: "English",
    from: "2026-06-02",
    to: "2026-06-02",
    type: "Sick",
    status: "approved",
    toRole: "Admin",
    applied: "2026-06-01",
    days: 1,
    reason: "Fever",
    adminNote: "Approved. Arrange substitute for period 3–4.",
    decidedAt: "2026-06-01",
  },
  {
    id: "TLR-040",
    name: "David Koal",
    dept: "Physics",
    from: "2026-06-15",
    to: "2026-06-16",
    type: "Emergency",
    status: "rejected",
    toRole: "Admin",
    applied: "2026-06-10",
    days: 2,
    reason: "Personal emergency",
    adminNote: "Board exam invigilation clash — please reschedule leave.",
    decidedAt: "2026-06-11",
  },
  {
    id: "TLR-039",
    name: "Priya Iyer",
    dept: "Biology",
    from: "2026-05-26",
    to: "2026-05-26",
    type: "Permission",
    status: "approved",
    toRole: "Admin",
    applied: "2026-05-25",
    days: 1,
    adminNote: "Half-day permission granted.",
    decidedAt: "2026-05-25",
  },
  {
    id: "TLR-038",
    name: "Hana Suzuki",
    dept: "Chemistry",
    from: "2026-05-15",
    to: "2026-05-17",
    type: "Casual",
    status: "ignored",
    toRole: "Admin",
    applied: "2026-05-12",
    days: 3,
    reason: "Personal work",
    adminNote: "Request incomplete — missing cover plan. Please re-apply with details.",
    decidedAt: "2026-05-13",
  },
];

export function getInitialStudentLeave(): StudentLeave[] {
  return STUDENT_SEED.map((r) => ({ ...r }));
}

export function getInitialTeacherLeave(): TeacherLeave[] {
  return TEACHER_SEED.map((r) => ({ ...r }));
}

export type LeaveMonthlyTrend = { month: string; student: number; teacher: number };

export function leaveMonthlyTrends(
  students: StudentLeave[],
  teachers: TeacherLeave[],
): LeaveMonthlyTrend[] {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun"];
  return months.map((month, i) => ({
    month,
    student: students.filter((_, idx) => idx % 6 === i).length + (i === 5 ? 3 : 1),
    teacher: teachers.filter((_, idx) => idx % 6 === i).length + (i >= 4 ? 1 : 0),
  }));
}

export function leaveSummary(students: StudentLeave[], teachers: TeacherLeave[]) {
  /** Admin KPIs focus on teacher leave — student leave is decided in Connect. */
  const pending = teachers.filter((r) => r.status === "pending").length;
  const approved = teachers.filter((r) => r.status === "approved").length;
  const rejected = teachers.filter((r) => r.status === "rejected").length;
  const ignored = teachers.filter((r) => r.status === "ignored").length;
  const cancelled = teachers.filter((r) => r.status === "cancelled").length;
  const total = teachers.length;
  const decided = approved + rejected + ignored;
  const approvalRate = decided ? Math.round((approved / decided) * 100) : 0;
  return {
    pending,
    approved,
    rejected,
    ignored,
    cancelled,
    total,
    approvalRate,
    studentPendingInConnect: students.filter((r) => r.status === "pending").length,
  };
}
