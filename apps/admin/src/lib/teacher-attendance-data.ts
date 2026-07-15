export type TeacherAttStatus = "present" | "late" | "absent" | "leave" | "half-day";

export type TeacherAttendanceRecord = {
  id: string;
  name: string;
  dept: string;
  status: TeacherAttStatus;
  checkIn: string | null;
  periodsToday: number;
  note?: string;
};

const FACULTY: Omit<TeacherAttendanceRecord, "status" | "checkIn" | "note">[] = [
  { id: "T-M1", name: "Sarah Jenkins", dept: "Mathematics", periodsToday: 6 },
  { id: "T-M2", name: "Raj Mehta", dept: "Mathematics", periodsToday: 5 },
  { id: "T-M3", name: "Lena Ortiz", dept: "Mathematics", periodsToday: 4 },
  { id: "T-M4", name: "Aiden Brooks", dept: "Mathematics", periodsToday: 4 },
  { id: "T-P1", name: "David Koal", dept: "Physics", periodsToday: 5 },
  { id: "T-P2", name: "Nina Volkov", dept: "Physics", periodsToday: 5 },
  { id: "T-P3", name: "James Chen", dept: "Physics", periodsToday: 4 },
  { id: "T-P4", name: "Ella Wright", dept: "Physics", periodsToday: 3 },
  { id: "T-E1", name: "Marcus Whitfield", dept: "English", periodsToday: 5 },
  { id: "T-E2", name: "Sofia Alvarez", dept: "English", periodsToday: 5 },
  { id: "T-E3", name: "Tom Hughes", dept: "English", periodsToday: 4 },
  { id: "T-E4", name: "Yuki Tanaka", dept: "English", periodsToday: 4 },
  { id: "T-B1", name: "Priya Iyer", dept: "Biology", periodsToday: 4 },
  { id: "T-B2", name: "Carlos Mendez", dept: "Biology", periodsToday: 4 },
  { id: "T-B3", name: "Amy Laurent", dept: "Biology", periodsToday: 3 },
  { id: "T-B4", name: "Noah Park", dept: "Biology", periodsToday: 3 },
  { id: "T-C1", name: "Hana Suzuki", dept: "Chemistry", periodsToday: 4 },
  { id: "T-C2", name: "Ibrahim Hale", dept: "Chemistry", periodsToday: 4 },
  { id: "T-C3", name: "Grace Miller", dept: "Chemistry", periodsToday: 3 },
  { id: "T-C4", name: "Leo Santos", dept: "Chemistry", periodsToday: 3 },
  { id: "T-H1", name: "Omar Faris", dept: "History", periodsToday: 3 },
  { id: "T-H2", name: "Claire Dubois", dept: "History", periodsToday: 3 },
  { id: "T-H3", name: "Ben Okonkwo", dept: "History", periodsToday: 2 },
  { id: "T-H4", name: "Zara Khan", dept: "History", periodsToday: 2 },
];

const STATUS_SEED: { status: TeacherAttStatus; checkIn: string | null; note?: string }[] = [
  { status: "present", checkIn: "08:04" },
  { status: "present", checkIn: "08:11" },
  { status: "present", checkIn: "08:18" },
  { status: "late", checkIn: "09:22", note: "Traffic delay" },
  { status: "late", checkIn: "09:08" },
  { status: "leave", checkIn: null, note: "Approved · medical" },
  { status: "leave", checkIn: null, note: "Approved · personal" },
  { status: "absent", checkIn: null, note: "Unreported" },
  { status: "absent", checkIn: null },
  { status: "half-day", checkIn: "08:35", note: "PM leave" },
];

export function createInitialTeacherAttendance(): TeacherAttendanceRecord[] {
  return FACULTY.map((t, i) => {
    const seed = STATUS_SEED[i % STATUS_SEED.length]!;
    return { ...t, ...seed };
  });
}

export const WEEKLY_PRESENCE = [
  { day: "Mon", rate: 96 },
  { day: "Tue", rate: 94 },
  { day: "Wed", rate: 97 },
  { day: "Thu", rate: 95 },
  { day: "Fri", rate: 93 },
  { day: "Sat", rate: 88 },
  { day: "Sun", rate: 0 },
] as const;

export const ATTENDANCE_ALERTS = [
  {
    id: "A1",
    tone: "danger" as const,
    title: "Unmarked absence",
    detail: "Marcus Whitfield · no check-in by 09:30",
    time: "09:32",
  },
  {
    id: "A2",
    tone: "warning" as const,
    title: "Repeated late",
    detail: "James Chen · 3rd late this week",
    time: "09:15",
  },
  {
    id: "A3",
    tone: "info" as const,
    title: "Substitute needed",
    detail: "Priya Iyer on leave · Grade 12 Biology P3",
    time: "08:50",
  },
];

export const DEPARTMENTS = [...new Set(FACULTY.map((t) => t.dept))].sort();

export function statusMeta(status: TeacherAttStatus) {
  const map = {
    present: { label: "Present", tone: "success" as const },
    late: { label: "Late", tone: "warning" as const },
    absent: { label: "Absent", tone: "danger" as const },
    leave: { label: "On leave", tone: "info" as const },
    "half-day": { label: "Half day", tone: "warning" as const },
  };
  return map[status];
}

/** Labels and help text for the admin mark-attendance controls. */
export const ATTENDANCE_STATUS_GUIDE: {
  value: TeacherAttStatus;
  label: string;
  shortLabel: string;
  description: string;
}[] = [
  {
    value: "present",
    label: "Present",
    shortLabel: "Present",
    description: "Teacher is on campus and teaching as scheduled (check-in recorded).",
  },
  {
    value: "late",
    label: "Late",
    shortLabel: "Late",
    description: "Teacher arrived after the institute cutoff (e.g. after 09:00).",
  },
  {
    value: "half-day",
    label: "Half day",
    shortLabel: "Half day",
    description: "Teacher attended only morning or afternoon (partial day).",
  },
  {
    value: "leave",
    label: "On leave",
    shortLabel: "Leave",
    description: "Approved leave from the Leave Center — do not mark absent.",
  },
  {
    value: "absent",
    label: "Absent",
    shortLabel: "Absent",
    description: "No check-in and no approved leave — follow up required.",
  },
];

export function defaultCheckIn(status: TeacherAttStatus): string | null {
  if (status === "present") return "08:15";
  if (status === "late") return "09:12";
  if (status === "half-day") return "08:40";
  return null;
}
