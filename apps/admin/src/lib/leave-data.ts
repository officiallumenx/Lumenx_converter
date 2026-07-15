/** Leave Center — student & teacher leave requests (demo). */

export type LeaveStatus = "pending" | "approved" | "rejected" | "cancelled";

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
    status: "cancelled",
    applied: "2026-05-18",
    days: 3,
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
    toRole: "Principal",
    applied: "2026-06-04",
    days: 3,
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
  },
  {
    id: "TLR-040",
    name: "David Koal",
    dept: "Physics",
    from: "2026-06-15",
    to: "2026-06-16",
    type: "Emergency",
    status: "rejected",
    toRole: "Principal",
    applied: "2026-06-10",
    days: 2,
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
  },
  {
    id: "TLR-038",
    name: "Hana Suzuki",
    dept: "Chemistry",
    from: "2026-05-15",
    to: "2026-05-17",
    type: "Casual",
    status: "cancelled",
    toRole: "Principal",
    applied: "2026-05-12",
    days: 3,
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
  const all = [...students, ...teachers];
  const pending = all.filter((r) => r.status === "pending").length;
  const approved = all.filter((r) => r.status === "approved").length;
  const rejected = all.filter((r) => r.status === "rejected").length;
  const cancelled = all.filter((r) => r.status === "cancelled").length;
  const total = all.length;
  const approvalRate = total ? Math.round((approved / total) * 100) : 0;
  return { pending, approved, rejected, cancelled, total, approvalRate };
}
