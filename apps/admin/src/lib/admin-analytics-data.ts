/** Mock analytics series for dashboard and analytics pages. */

export type Branch = {
  id: string;
  name: string;
  students: number;
  attendance: number;
  growth: number;
  performance: "high" | "medium" | "low";
};

export const BRANCHES: Branch[] = [
  { id: "alpha", name: "Branch Alpha", students: 2842, attendance: 94.2, growth: 8.4, performance: "high" },
  { id: "beta", name: "Branch Beta", students: 1920, attendance: 88.1, growth: 2.1, performance: "medium" },
  { id: "gamma", name: "Branch Gamma", students: 1104, attendance: 79.6, growth: -1.8, performance: "low" },
];

export const ENROLLMENT_MONTHLY = [
  { m: "Apr", v: 2680, new: 42 },
  { m: "May", v: 2710, new: 38 },
  { m: "Jun", v: 2735, new: 35 },
  { m: "Jul", v: 2758, new: 28 },
  { m: "Aug", v: 2782, new: 52 },
  { m: "Sep", v: 2795, new: 48 },
  { m: "Oct", v: 2808, new: 31 },
  { m: "Nov", v: 2816, new: 24 },
  { m: "Dec", v: 2824, new: 18 },
  { m: "Jan", v: 2830, new: 22 },
  { m: "Feb", v: 2836, new: 19 },
  { m: "Mar", v: 2842, new: 14 },
];

export const ATTENDANCE_MONTHLY = [
  { m: "Apr", v: 96.1 },
  { m: "May", v: 95.4 },
  { m: "Jun", v: 92.8 },
  { m: "Jul", v: 91.2 },
  { m: "Aug", v: 93.5 },
  { m: "Sep", v: 94.8 },
  { m: "Oct", v: 95.1 },
  { m: "Nov", v: 94.6 },
  { m: "Dec", v: 93.9 },
  { m: "Jan", v: 94.2 },
  { m: "Feb", v: 94.8 },
  { m: "Mar", v: 95.0 },
];

export const PERF_MONTHLY = [
  { m: "Apr", gpa: 3.38, att: 96 },
  { m: "May", gpa: 3.41, att: 95 },
  { m: "Jun", gpa: 3.39, att: 93 },
  { m: "Jul", gpa: 3.42, att: 91 },
  { m: "Aug", gpa: 3.44, att: 94 },
  { m: "Sep", gpa: 3.46, att: 95 },
  { m: "Oct", gpa: 3.48, att: 95 },
  { m: "Nov", gpa: 3.47, att: 94 },
  { m: "Dec", gpa: 3.45, att: 94 },
  { m: "Jan", gpa: 3.44, att: 94 },
  { m: "Feb", gpa: 3.46, att: 95 },
  { m: "Mar", gpa: 3.48, att: 95 },
];

export const FEE_COLLECTION_MONTHLY = [
  { m: "Apr", collected: 82, target: 88 },
  { m: "May", collected: 85, target: 88 },
  { m: "Jun", collected: 79, target: 88 },
  { m: "Jul", collected: 76, target: 88 },
  { m: "Aug", collected: 88, target: 90 },
  { m: "Sep", collected: 91, target: 90 },
  { m: "Oct", collected: 89, target: 90 },
  { m: "Nov", collected: 87, target: 90 },
  { m: "Dec", collected: 84, target: 90 },
  { m: "Jan", collected: 90, target: 92 },
  { m: "Feb", collected: 92, target: 92 },
  { m: "Mar", collected: 94, target: 92 },
];

export const EXAM_PASS_RATES = [
  { term: "Term 1", pass: 91.2, avg: 68 },
  { term: "Term 2", pass: 92.6, avg: 70 },
  { term: "Term 3", pass: 93.1, avg: 71 },
  { term: "Pre-board", pass: 94.8, avg: 73 },
];

export const PARENT_ENGAGEMENT = [
  { m: "Apr", v: 68 },
  { m: "May", v: 70 },
  { m: "Jun", v: 69 },
  { m: "Jul", v: 71 },
  { m: "Aug", v: 73 },
  { m: "Sep", v: 75 },
  { m: "Oct", v: 72 },
  { m: "Nov", v: 74 },
  { m: "Dec", v: 73 },
  { m: "Jan", v: 76 },
  { m: "Feb", v: 77 },
  { m: "Mar", v: 78 },
];

export const COMPLAINT_SLA = [
  { m: "Apr", resolved: 85, open: 12 },
  { m: "May", resolved: 87, open: 10 },
  { m: "Jun", resolved: 84, open: 14 },
  { m: "Jul", resolved: 86, open: 11 },
  { m: "Aug", resolved: 88, open: 9 },
  { m: "Sep", resolved: 90, open: 8 },
  { m: "Oct", resolved: 88, open: 10 },
  { m: "Nov", resolved: 91, open: 7 },
  { m: "Dec", resolved: 89, open: 9 },
  { m: "Jan", resolved: 92, open: 6 },
  { m: "Feb", resolved: 94, open: 5 },
  { m: "Mar", resolved: 93, open: 6 },
];

export const CONNECT_USAGE = [
  { m: "Apr", parent: 62, teacher: 88, student: 71 },
  { m: "May", parent: 64, teacher: 89, student: 72 },
  { m: "Jun", parent: 63, teacher: 87, student: 68 },
  { m: "Jul", parent: 65, teacher: 86, student: 55 },
  { m: "Aug", parent: 68, teacher: 90, student: 74 },
  { m: "Sep", parent: 72, teacher: 92, student: 78 },
  { m: "Oct", parent: 71, teacher: 91, student: 76 },
  { m: "Nov", parent: 73, teacher: 90, student: 75 },
  { m: "Dec", parent: 70, teacher: 88, student: 72 },
  { m: "Jan", parent: 74, teacher: 91, student: 77 },
  { m: "Feb", parent: 76, teacher: 93, student: 79 },
  { m: "Mar", parent: 78, teacher: 94, student: 81 },
];

export const SUBJECT_PERFORMANCE = [
  { subject: "Mathematics", avg: 72, pass: 88 },
  { subject: "Physics", avg: 68, pass: 82 },
  { subject: "Chemistry", avg: 70, pass: 85 },
  { subject: "Biology", avg: 74, pass: 90 },
  { subject: "English", avg: 76, pass: 92 },
  { subject: "History", avg: 78, pass: 94 },
  { subject: "Computer", avg: 81, pass: 96 },
];

export const GRADE_ATTENDANCE = [
  { grade: "Grade 9", attendance: 93.2, students: 520 },
  { grade: "Grade 10", attendance: 91.8, students: 498 },
  { grade: "Grade 11", attendance: 89.4, students: 472 },
  { grade: "Grade 12", attendance: 94.6, students: 445 },
];

export const AT_RISK_PIE = [
  { name: "On track", value: 2148, fill: "var(--chart-2)" },
  { name: "Watch list", value: 412, fill: "var(--chart-3)" },
  { name: "Intervention", value: 186, fill: "var(--chart-5)" },
  { name: "Critical", value: 96, fill: "var(--chart-4)" },
];

export const BRANCH_COMPARE_CHART = BRANCHES.map((b) => ({
  name: b.name.replace("Branch ", ""),
  attendance: b.attendance,
  students: b.students / 30,
  growth: b.growth + 50,
}));

export const CRITICAL_CLASSES = [
  { name: "Grade 11-C", rate: 76, students: 42 },
  { name: "Grade 9-B", rate: 79, students: 38 },
  { name: "Grade 10-B", rate: 81, students: 40 },
];

export const EXAM_PIPELINE = {
  upcoming: 3,
  grading: 2,
  avgScore: 72,
  published: 5,
  nextExamDays: 4,
  gradingPct: 68,
};

export const ANALYTICS_INSIGHTS = [
  {
    title: "Attendance recovered after August",
    body: "Institute attendance rose from 91.2% in July to 95.0% in March — strongest gains in Grade 12 (+2.4 pts).",
    tone: "success" as const,
  },
  {
    title: "Fee collection above target",
    body: "March collection hit 94% of term dues — up 12 pts vs June low. Remind 38 families with partial payments.",
    tone: "info" as const,
  },
  {
    title: "Branch Gamma needs focus",
    body: "Attendance 79.6% and negative growth. Grade 11-C and 9-B drive most at-risk flags for this branch.",
    tone: "warning" as const,
  },
];

export const ATTENDANCE_HEATMAP: Record<string, Record<string, number[]>> = {
  "2026-06": {
    "Grade 9-A": [92, 94, 91, 88, 95, 93, 90, 92, 94, 96, 93, 91, 89, 92, 94, 95, 93, 91, 90, 92, 94, 93, 91, 88, 90, 92, 94, 95],
    "Grade 10-A": [94, 96, 93, 91, 97, 95, 92, 94, 96, 98, 95, 93, 91, 94, 96, 97, 95, 93, 92, 94, 96, 95, 93, 90, 92, 94, 96, 97],
    "Grade 10-B": [78, 80, 76, 74, 82, 79, 77, 78, 81, 83, 80, 78, 76, 79, 81, 82, 80, 78, 77, 79, 81, 80, 78, 75, 77, 79, 81, 82],
    "Grade 11-A": [91, 93, 90, 88, 94, 92, 89, 91, 93, 95, 92, 90, 88, 91, 93, 94, 92, 90, 89, 91, 93, 92, 90, 87, 89, 91, 93, 94],
    "Grade 11-C": [72, 74, 70, 68, 76, 73, 71, 72, 75, 77, 74, 72, 70, 73, 75, 76, 74, 72, 71, 73, 75, 74, 72, 69, 71, 73, 75, 76],
    "Grade 12-A": [95, 97, 94, 92, 98, 96, 93, 95, 97, 99, 96, 94, 92, 95, 97, 98, 96, 94, 93, 95, 97, 96, 94, 91, 93, 95, 97, 98],
  },
  "2026-05": {
    "Grade 9-A": [90, 92, 89, 87, 93, 91, 88, 90, 92, 94, 91, 89, 87, 90, 92, 93, 91, 89, 88, 90, 92, 91, 89, 86, 88, 90, 92, 93],
    "Grade 10-A": [93, 95, 92, 90, 96, 94, 91, 93, 95, 97, 94, 92, 90, 93, 95, 96, 94, 92, 91, 93, 95, 94, 92, 89, 91, 93, 95, 96],
    "Grade 10-B": [76, 78, 74, 72, 80, 77, 75, 76, 79, 81, 78, 76, 74, 77, 79, 80, 78, 76, 75, 77, 79, 78, 76, 73, 75, 77, 79, 80],
    "Grade 11-A": [89, 91, 88, 86, 92, 90, 87, 89, 91, 93, 90, 88, 86, 89, 91, 92, 90, 88, 87, 89, 91, 90, 88, 85, 87, 89, 91, 92],
    "Grade 11-C": [70, 72, 68, 66, 74, 71, 69, 70, 73, 75, 72, 70, 68, 71, 73, 74, 72, 70, 69, 71, 73, 72, 70, 67, 69, 71, 73, 74],
    "Grade 12-A": [94, 96, 93, 91, 97, 95, 92, 94, 96, 98, 95, 93, 91, 94, 96, 97, 95, 93, 92, 94, 96, 95, 93, 90, 92, 94, 96, 97],
  },
};

export const MONTH_OPTIONS = ["2026-05", "2026-06", "2026-07"];

export function workingDaysInYear(holidays: number, yearDays = 365): number {
  return yearDays - holidays - 104;
}

export function sliceByRange<T>(data: T[], range: "term" | "year"): T[] {
  return range === "year" ? data : data.slice(-4);
}
