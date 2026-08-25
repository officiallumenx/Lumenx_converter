import { studentCertificateRecords } from "@/lib/student/mock-data";
import { DEFAULT_DEMO_PROFILE_ID, getDemoProfile } from "@lumenx/types";
import { toLocalIsoDate } from "@/lib/leave-utils";
import { gradeFor } from "./marks-utils";
import { summarizeFeeItems } from "./fees-utils";

const DEMO_TODAY = toLocalIsoDate(new Date());

function demoDue(daysFromToday: number): string {
  const d = new Date(`${DEMO_TODAY}T12:00:00`);
  d.setDate(d.getDate() + daysFromToday);
  return toLocalIsoDate(d);
}

export const subjects = [
  "Mathematics",
  "Physics",
  "Chemistry",
  "English",
  "Computer Science",
  "History",
];
export const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

export const studentProfile = {
  id: "S-2041",
  name: "Aarav Sharma",
  class: "Class 10",
  section: "B",
  rollNo: "14",
  attendance: 92,
  bloodGroup: "O+",
  emergencyContact: "+91 98•••••12",
  parentName: "Rajesh Sharma",
  house: "Sapphire",
  idCardIssuedOn: "01 Apr 2024",
  idCardValidTill: "31 Mar 2027",
  email: "aarav.sharma@student.lumenx.edu",
  bio: "Interested in mathematics and robotics. Member of the school science club.",
  classTeacher: "Ananya Iyer",
  institute: "LumenX Academy",
  address: "12 Green Park Road, Sector 4, Hyderabad — 500032",
};

/** Profile-aware student — switches between school and college demo data. */
export function getConnectStudentProfile() {
  const p = getDemoProfile(DEFAULT_DEMO_PROFILE_ID).connect.studentProfile;
  return {
    id: p.id,
    name: p.name,
    class: p.year,
    section: p.section,
    course: p.department || p.course,
    department: p.department || p.course,
    classDisplay: p.classDisplay,
    rollNo: p.rollNo,
    attendance: p.attendance,
    bloodGroup: p.bloodGroup,
    emergencyContact: p.emergencyContact,
    parentName: p.parentName,
    house: p.house,
    idCardIssuedOn: p.idCardIssuedOn,
    idCardValidTill: p.idCardValidTill,
    email: p.email,
    bio: p.bio,
    classTeacher: p.classTeacher,
    institute: p.institute,
    address: p.address,
  };
}

export const childProfile = studentProfile;

export const teachers = [
  {
    id: "T1",
    name: "Ananya Iyer",
    subject: "Mathematics",
    isClassTeacher: true,
    phone: "+91 98•••••12",
    initials: "AI",
    email: "ananya.iyer@lumenx.edu",
    qualification: "M.Sc Mathematics, B.Ed",
    experienceYears: 12,
    room: "Staff Room · Block A",
    availability: "Mon–Fri, 2:00–3:30 PM",
    bio: "Class teacher for 10-B. Focuses on problem-solving and board exam readiness. Coordinates the school mathematics club.",
    languages: ["English", "Hindi", "Tamil"],
  },
  {
    id: "T2",
    name: "Rahul Verma",
    subject: "Physics",
    isClassTeacher: false,
    phone: "+91 98•••••34",
    initials: "RV",
    email: "rahul.verma@lumenx.edu",
    qualification: "M.Sc Physics, B.Ed",
    experienceYears: 9,
    room: "Lab 2 · Science Block",
    availability: "Tue & Thu, 3:00–4:00 PM",
    bio: "Leads practical sessions and NEET foundation batches. Encourages hands-on experiments in class.",
    languages: ["English", "Hindi"],
  },
  {
    id: "T3",
    name: "Priya Menon",
    subject: "English",
    isClassTeacher: false,
    phone: "+91 98•••••56",
    initials: "PM",
    email: "priya.menon@lumenx.edu",
    qualification: "M.A English Literature, B.Ed",
    experienceYears: 11,
    room: "Block B · Room 204",
    availability: "Wed, 1:30–2:30 PM",
    bio: "Guides essay writing, debate prep, and reading circles. Mentor for the school literary fest.",
    languages: ["English", "Malayalam"],
  },
  {
    id: "T4",
    name: "Sandeep Rao",
    subject: "Computer Science",
    isClassTeacher: false,
    phone: "+91 98•••••78",
    initials: "SR",
    email: "sandeep.rao@lumenx.edu",
    qualification: "B.Tech CSE, M.Ed",
    experienceYears: 7,
    room: "Computer Lab · Block C",
    availability: "Mon & Fri, 12:30–1:30 PM",
    bio: "Runs coding club and robotics workshops. Supports students in hackathons and tech fairs.",
    languages: ["English", "Hindi", "Kannada"],
  },
  {
    id: "T5",
    name: "Neha Kapoor",
    subject: "Chemistry",
    isClassTeacher: false,
    phone: "+91 98•••••90",
    initials: "NK",
    email: "neha.kapoor@lumenx.edu",
    qualification: "M.Sc Chemistry, B.Ed",
    experienceYears: 8,
    room: "Lab 1 · Science Block",
    availability: "Thu, 2:00–3:00 PM",
    bio: "Specialises in organic chemistry and lab safety. Helps students with science exhibition projects.",
    languages: ["English", "Hindi"],
  },
  {
    id: "T6",
    name: "Arjun Bhatt",
    subject: "History",
    isClassTeacher: false,
    phone: "+91 98•••••11",
    initials: "AB",
    email: "arjun.bhatt@lumenx.edu",
    qualification: "M.A History, B.Ed",
    experienceYears: 10,
    room: "Block B · Room 210",
    availability: "Fri, 11:30 AM–12:30 PM",
    bio: "Teaches modern Indian history and civics. Organises heritage walks and quiz competitions.",
    languages: ["English", "Hindi", "Gujarati"],
  },
] as const;

export const studentTimetable: Record<
  string,
  { time: string; subject: string; teacher: string }[]
> = {
  Monday: [
    { time: "08:30 – 09:15", subject: "Mathematics", teacher: "Ananya Iyer" },
    { time: "09:20 – 10:05", subject: "Physics", teacher: "Rahul Verma" },
    { time: "10:20 – 11:05", subject: "English", teacher: "Priya Menon" },
    { time: "11:10 – 11:55", subject: "Chemistry", teacher: "Neha Kapoor" },
    { time: "12:40 – 01:25", subject: "Computer Science", teacher: "Sandeep Rao" },
  ],
  Tuesday: [
    { time: "08:30 – 09:15", subject: "Physics", teacher: "Rahul Verma" },
    { time: "09:20 – 10:05", subject: "Mathematics", teacher: "Ananya Iyer" },
    { time: "10:20 – 11:05", subject: "History", teacher: "Arjun Bhatt" },
    { time: "11:10 – 11:55", subject: "English", teacher: "Priya Menon" },
    { time: "12:40 – 01:25", subject: "Chemistry", teacher: "Neha Kapoor" },
  ],
  Wednesday: [
    { time: "08:30 – 09:15", subject: "Chemistry", teacher: "Neha Kapoor" },
    { time: "09:20 – 10:05", subject: "Computer Science", teacher: "Sandeep Rao" },
    { time: "10:20 – 11:05", subject: "Mathematics", teacher: "Ananya Iyer" },
    { time: "11:10 – 11:55", subject: "Physics", teacher: "Rahul Verma" },
    { time: "12:40 – 01:25", subject: "English", teacher: "Priya Menon" },
  ],
  Thursday: [
    { time: "08:30 – 09:15", subject: "English", teacher: "Priya Menon" },
    { time: "09:20 – 10:05", subject: "History", teacher: "Arjun Bhatt" },
    { time: "10:20 – 11:05", subject: "Physics", teacher: "Rahul Verma" },
    { time: "11:10 – 11:55", subject: "Mathematics", teacher: "Ananya Iyer" },
    { time: "12:40 – 01:25", subject: "Chemistry", teacher: "Neha Kapoor" },
  ],
  Friday: [
    { time: "08:30 – 09:15", subject: "Mathematics", teacher: "Ananya Iyer" },
    { time: "09:20 – 10:05", subject: "Computer Science", teacher: "Sandeep Rao" },
    { time: "10:20 – 11:05", subject: "Chemistry", teacher: "Neha Kapoor" },
    { time: "11:10 – 11:55", subject: "Physics", teacher: "Rahul Verma" },
    { time: "12:40 – 01:25", subject: "History", teacher: "Arjun Bhatt" },
  ],
  Saturday: [
    { time: "08:30 – 09:15", subject: "English", teacher: "Priya Menon" },
    { time: "09:20 – 10:05", subject: "Mathematics", teacher: "Ananya Iyer" },
    { time: "10:20 – 11:05", subject: "Sports", teacher: "—" },
  ],
};

export const teacherTimetable: Record<string, { time: string; class: string; subject: string }[]> =
  {
    Monday: [
      { time: "08:30 – 09:15", class: "10-B", subject: "Mathematics" },
      { time: "10:20 – 11:05", class: "9-A", subject: "Mathematics" },
      { time: "12:40 – 01:25", class: "10-A", subject: "Mathematics" },
    ],
    Tuesday: [
      { time: "09:20 – 10:05", class: "10-B", subject: "Mathematics" },
      { time: "11:10 – 11:55", class: "8-C", subject: "Mathematics" },
    ],
    Wednesday: [
      { time: "10:20 – 11:05", class: "10-B", subject: "Mathematics" },
      { time: "12:40 – 01:25", class: "9-A", subject: "Mathematics" },
    ],
    Thursday: [
      { time: "11:10 – 11:55", class: "10-B", subject: "Mathematics" },
      { time: "12:40 – 01:25", class: "10-A", subject: "Mathematics" },
    ],
    Friday: [
      { time: "08:30 – 09:15", class: "10-B", subject: "Mathematics" },
      { time: "09:20 – 10:05", class: "8-C", subject: "Mathematics" },
    ],
    Saturday: [{ time: "09:20 – 10:05", class: "10-B", subject: "Mathematics" }],
  };

export type StudentAssignmentType = "assignment" | "homework";
export type StudentAssignmentStatus = "pending" | "submitted";

export type StudentAssignment = {
  id: string;
  title: string;
  subject: string;
  due: string;
  /** ISO date (YYYY-MM-DD) for due/overdue colour logic */
  dueDate?: string;
  status: StudentAssignmentStatus;
  class: string;
  type: StudentAssignmentType;
};

export const assignments: StudentAssignment[] = [
  {
    id: "A1",
    title: "Quadratic Equations Practice",
    subject: "Mathematics",
    due: "Tomorrow",
    dueDate: demoDue(1),
    status: "pending",
    class: "10-B",
    type: "assignment",
  },
  {
    id: "A2",
    title: "Newton's Laws – Worksheet",
    subject: "Physics",
    due: "In 3 days",
    dueDate: demoDue(3),
    status: "pending",
    class: "10-B",
    type: "assignment",
  },
  {
    id: "A3",
    title: "Essay: Climate Action",
    subject: "English",
    due: "May 28",
    dueDate: demoDue(-18),
    status: "pending",
    class: "10-B",
    type: "assignment",
  },
  {
    id: "A4",
    title: "Periodic Table Quiz",
    subject: "Chemistry",
    due: "In 5 days",
    dueDate: demoDue(5),
    status: "pending",
    class: "10-B",
    type: "assignment",
  },
  {
    id: "A5",
    title: "Trigonometry Review Sheet",
    subject: "Mathematics",
    due: "May 28",
    dueDate: demoDue(-12),
    status: "pending",
    class: "10-B",
    type: "assignment",
  },
  {
    id: "H1",
    title: "Read Chapter 4 — Organic Chemistry",
    subject: "Chemistry",
    due: "Tonight",
    dueDate: demoDue(0),
    status: "pending",
    class: "10-B",
    type: "homework",
  },
  {
    id: "H2",
    title: "Grammar exercises (Unit 6)",
    subject: "English",
    due: "May 30",
    dueDate: demoDue(-7),
    status: "pending",
    class: "10-B",
    type: "homework",
  },
  {
    id: "H3",
    title: "Map labeling — India physiography",
    subject: "Geography",
    due: "May 25",
    dueDate: demoDue(-21),
    status: "pending",
    class: "10-B",
    type: "homework",
  },
  {
    id: "H4",
    title: "Daily problem set — vectors",
    subject: "Physics",
    due: "In 2 days",
    dueDate: demoDue(2),
    status: "pending",
    class: "10-B",
    type: "homework",
  },
  {
    id: "A-TODAY",
    title: "Algebra revision — quadratic graphs",
    subject: "Mathematics",
    due: "Today",
    dueDate: DEMO_TODAY,
    status: "pending",
    class: "10-B",
    type: "assignment",
  },
  {
    id: "H-TODAY",
    title: "Reading comprehension — Chapter 12",
    subject: "English",
    due: "Today",
    dueDate: DEMO_TODAY,
    status: "pending",
    class: "10-B",
    type: "homework",
  },
];

/** Teacher view: who submitted which assignment and timing vs due date (demo data). */
export type AssignmentSubmissionTiming = "on_time" | "late" | "early";

export interface AssignmentSubmissionRow {
  assignmentId: string;
  studentName: string;
  roll: string;
  timing: AssignmentSubmissionTiming;
  submittedAt: string;
  note: string;
}

export const assignmentSubmissions: AssignmentSubmissionRow[] = [
  {
    assignmentId: "A3",
    studentName: "Aanya Patel",
    roll: "01",
    timing: "early",
    submittedAt: "10 May 2026 · 6:20 PM",
    note: "Essay + references attached as PDF.",
  },
  {
    assignmentId: "A3",
    studentName: "Aarav Sharma",
    roll: "14",
    timing: "on_time",
    submittedAt: "11 May 2026 · 3:05 PM",
    note: "Submitted via portal; see PDF.",
  },
  {
    assignmentId: "A3",
    studentName: "Kabir Khan",
    roll: "08",
    timing: "late",
    submittedAt: "13 May 2026 · 11:50 PM",
    note: "Late due to sports camp — PDF uploaded.",
  },
  {
    assignmentId: "A3",
    studentName: "Mira Kapoor",
    roll: "11",
    timing: "on_time",
    submittedAt: "11 May 2026 · 2:40 PM",
    note: "DOCX in school format.",
  },
];

export const exams = [
  {
    id: "E1",
    title: "Mid-Term Mathematics",
    subject: "Mathematics",
    date: "Mon 15 Jun",
    duration: "2h",
    room: "Hall 2",
    series: "Mid-Term 2026",
  },
  {
    id: "E2",
    title: "Mid-Term Physics",
    subject: "Physics",
    date: "Wed 17 Jun",
    duration: "2h",
    room: "Hall 1",
    series: "Mid-Term 2026",
  },
  {
    id: "E3",
    title: "Mid-Term Chemistry",
    subject: "Chemistry",
    date: "Fri 19 Jun",
    duration: "2h",
    room: "Hall 3",
    series: "Mid-Term 2026",
  },
  {
    id: "E4",
    title: "Mid-Term English",
    subject: "English",
    date: "Mon 22 Jun",
    duration: "2h",
    room: "Hall 2",
    series: "Mid-Term 2026",
  },
  {
    id: "E5",
    title: "Final Mathematics",
    subject: "Mathematics",
    date: "Mon 16 Mar",
    duration: "3h",
    room: "Hall 2",
    series: "Final 2026",
  },
];

export const performance = [
  { subject: "Mathematics", score: 88, prev: 82 },
  { subject: "Physics", score: 76, prev: 71 },
  { subject: "Chemistry", score: 64, prev: 70 },
  { subject: "English", score: 91, prev: 88 },
  { subject: "Computer Science", score: 95, prev: 90 },
  { subject: "History", score: 72, prev: 65 },
];

export const trend = [
  { term: "T1", score: 74 },
  { term: "T2", score: 78 },
  { term: "T3", score: 81 },
  { term: "T4", score: 84 },
  { term: "T5", score: 86 },
];

export const remarks = [
  {
    teacher: "Ananya Iyer",
    subject: "Mathematics",
    text: "Showing strong improvement in algebra. Keep practicing word problems.",
    date: "2 days ago",
    tone: "positive" as const,
  },
  {
    teacher: "Neha Kapoor",
    subject: "Chemistry",
    text: "Needs more focus on organic chemistry concepts.",
    date: "5 days ago",
    tone: "warning" as const,
  },
  {
    teacher: "Priya Menon",
    subject: "English",
    text: "Excellent essay submission this week.",
    date: "1 week ago",
    tone: "positive" as const,
  },
];

export const notifications = {
  parent: [
    {
      id: "n1",
      title: "Aarav was marked present",
      desc: "Mathematics • Period 1",
      time: "9:12 AM",
      type: "info",
    },
    {
      id: "n2",
      title: "New remark from Ms. Iyer",
      desc: "Showing strong improvement in algebra.",
      time: "Yesterday",
      type: "positive",
    },
    {
      id: "n3",
      title: "Mid-Term schedule released",
      desc: "Exams begin from 18 Nov",
      time: "Yesterday",
      type: "info",
    },
    {
      id: "n4",
      title: "Chemistry score below average",
      desc: "Consider extra practice this week",
      time: "2 days ago",
      type: "warning",
    },
  ],
  teacher: [
    {
      id: "n1",
      title: "Attendance pending",
      desc: "Class 10-B • Period 3",
      time: "Now",
      type: "warning",
    },
    {
      id: "n2",
      title: "5 new submissions",
      desc: "Quadratic Equations Practice",
      time: "1 hr ago",
      type: "info",
    },
    {
      id: "n3",
      title: "Staff meeting at 4 PM",
      desc: "Conference Room A",
      time: "Today",
      type: "info",
    },
  ],
  student: [
    {
      id: "n1",
      title: "New assignment",
      desc: "Quadratic Equations Practice • Due tomorrow",
      time: "10 min ago",
      type: "info",
    },
    {
      id: "n2",
      title: "Mid-Term schedule released",
      desc: "Starts 18 Nov",
      time: "Yesterday",
      type: "info",
    },
    {
      id: "n3",
      title: "You scored 88 in Math",
      desc: "Great improvement from last term!",
      time: "2 days ago",
      type: "positive",
    },
  ],
};

export const studentsInClass = [
  "Aanya Patel",
  "Aarav Sharma",
  "Aditya Singh",
  "Ananya Gupta",
  "Arjun Reddy",
  "Diya Nair",
  "Ishaan Mehta",
  "Kabir Khan",
  "Kavya Iyer",
  "Krishna Das",
  "Manya Joshi",
  "Mira Kapoor",
  "Neel Bose",
  "Pari Agarwal",
  "Reyansh Shah",
  "Riya Malhotra",
  "Rohan Bhatia",
  "Saanvi Rao",
  "Sara Pillai",
  "Vihaan Chopra",
  "Vivaan Saxena",
  "Yash Mishra",
  "Zara Ali",
  "Anvi Desai",
].map((name, i) => ({ id: `S${1000 + i}`, name, roll: String(i + 1).padStart(2, "0") }));

import type { Child } from "@lumenx/types";

export const children: Child[] = [
  {
    id: "C1",
    name: "Aarav Sharma",
    initials: "AS",
    className: "Class 10",
    section: "B",
    rollNo: "14",
    attendance: 92,
    avgScore: 84,
    trend: "up",
    accent: "primary",
  },
  {
    id: "C2",
    name: "Anaya Sharma",
    initials: "AN",
    className: "Class 7",
    section: "A",
    rollNo: "06",
    attendance: 96,
    avgScore: 91,
    trend: "up",
    accent: "success",
  },
  {
    id: "C3",
    name: "Vihaan Sharma",
    initials: "VS",
    className: "Class 4",
    section: "C",
    rollNo: "21",
    attendance: 88,
    avgScore: 76,
    trend: "flat",
    accent: "warning",
  },
];

/** Class teacher name per linked child (demo routing for leave alerts). */
export const classTeacherByChildId: Record<string, string> = {
  C1: "Ananya Iyer",
  C2: "Priya Menon",
  C3: "Sandeep Rao",
};

export function getClassTeacherForChild(childId: string): string {
  return classTeacherByChildId[childId] ?? "Class teacher";
}

/** Parent fees: outstanding / due items per child (no payment history until gateway). */
export const feeDuesByChild: Record<
  string,
  Array<{
    id: string;
    title: string;
    amount: number;
    due: string;
    status: "paid" | "partial" | "overdue" | "upcoming";
  }>
> = {
  C1: [
    {
      id: "pc1-t1",
      title: "Tuition Fee",
      amount: 21000,
      due: "15 Jan 2025",
      status: "upcoming",
    },
    {
      id: "pc1-1",
      title: "Transport Fee",
      amount: 8000,
      due: "30 Nov 2024",
      status: "overdue",
    },
    {
      id: "pc1-2",
      title: "Practical & viva examination fee",
      amount: 1800,
      due: "5 Dec 2025",
      status: "overdue",
    },
    {
      id: "pc1-3",
      title: "Mid-Term examination fee",
      amount: 3500,
      due: "20 Jun 2026",
      status: "upcoming",
    },
  ],
  C2: [
    {
      id: "pc2-t1",
      title: "Tuition Fee",
      amount: 18000,
      due: "15 Jan 2025",
      status: "upcoming",
    },
    {
      id: "pc2-1",
      title: "Annual activity fee",
      amount: 3200,
      due: "20 Jun 2026",
      status: "upcoming",
    },
    {
      id: "pc2-2",
      title: "Half-yearly examination fee",
      amount: 2800,
      due: "10 Jun 2026",
      status: "upcoming",
    },
  ],
  C3: [
    {
      id: "pc3-t1",
      title: "Tuition Fee",
      amount: 15000,
      due: "15 Jan 2025",
      status: "upcoming",
    },
    {
      id: "pc3-1",
      title: "Term stationery bundle",
      amount: 1200,
      due: "1 Jun 2026",
      status: "upcoming",
    },
  ],
};

import type { Achievement, Streak, Goal, SportEvent, SportTeam } from "@lumenx/types";

export const achievements: Achievement[] = [
  {
    id: "ach-1",
    title: "100% Attendance Week",
    description: "Showed up every day this week. Consistency unlocked.",
    icon: "flame",
    tier: "gold",
    unlockedOn: "2 days ago",
  },
  {
    id: "ach-2",
    title: "Most Improved",
    description: "Math score jumped +12 this term.",
    icon: "rocket",
    tier: "platinum",
    unlockedOn: "Last week",
  },
  {
    id: "ach-3",
    title: "Assignment Champion",
    description: "10 assignments submitted on time.",
    icon: "trophy",
    tier: "gold",
    unlockedOn: "1 week ago",
  },
  {
    id: "ach-4",
    title: "Discipline Excellence",
    description: "Zero late marks this month.",
    icon: "medal",
    tier: "silver",
    unlockedOn: "3 weeks ago",
  },
  {
    id: "ach-5",
    title: "Consistency Star",
    description: "5-week improvement streak.",
    icon: "star",
    tier: "gold",
    unlockedOn: "Today",
  },
  {
    id: "ach-6",
    title: "Sports Spirit",
    description: "Represented school in athletics meet.",
    icon: "zap",
    tier: "silver",
    unlockedOn: "Last month",
  },
  {
    id: "ach-7",
    title: "Top of the Class",
    description: "Reach top 5 in your section.",
    icon: "crown",
    tier: "platinum",
    progress: 70,
  },
  {
    id: "ach-8",
    title: "Reading Streak 30",
    description: "Read every day for 30 days.",
    icon: "sparkles",
    tier: "bronze",
    progress: 53,
  },
  {
    id: "ach-9",
    title: "Cultural Day Star",
    description: "Lead performer in the annual group dance showcase.",
    icon: "star",
    tier: "gold",
    unlockedOn: "Aug 2024",
  },
  {
    id: "ach-10",
    title: "100m Sprint Silver",
    description: "District athletics meet — 100m sprint, 2nd place.",
    icon: "medal",
    tier: "silver",
    unlockedOn: "Dec 2024",
  },
];

export const streaks: Streak[] = [
  { id: "s-att", label: "Attendance streak", current: 18, best: 24, unit: "days", tone: "success" },
  {
    id: "s-asg",
    label: "Assignment on-time",
    current: 7,
    best: 10,
    unit: "submissions",
    tone: "primary",
  },
  { id: "s-imp", label: "Improvement streak", current: 5, best: 5, unit: "weeks", tone: "warning" },
];

export const goals: Goal[] = [
  {
    id: "g1",
    title: "Reach 95% attendance",
    metric: "attendance",
    target: 95,
    current: 92,
    unit: "%",
    due: "End of term",
  },
  {
    id: "g2",
    title: "Average above 88%",
    metric: "marks",
    target: 88,
    current: 84,
    unit: "%",
    due: "Mid-Term",
  },
  {
    id: "g3",
    title: "Submit every assignment on time",
    metric: "assignments",
    target: 12,
    current: 9,
    unit: "tasks",
    due: "This month",
  },
  {
    id: "g4",
    title: "Make football team selection",
    metric: "sports",
    target: 100,
    current: 65,
    unit: "%",
    due: "Trials in 2 weeks",
  },
];

/** Institute / principal assigned goals shown alongside personal goals. */
export const instituteAssignedGoals: Goal[] = [
  {
    id: "ig1",
    title: "Principal challenge: 90%+ attendance",
    metric: "attendance",
    target: 90,
    current: 86,
    unit: "%",
    due: "Jun 2026",
  },
  {
    id: "ig2",
    title: "Zero pending lab submissions",
    metric: "assignments",
    target: 100,
    current: 78,
    unit: "%",
    due: "End of term",
  },
];

export const encouragements: { id: string; emoji: string; text: string }[] = [
  { id: "e1", emoji: "🌱", text: "Great improvement this week — keep nurturing the habit." },
  { id: "e2", emoji: "🎯", text: "Attendance improving consistently. You're closer to your goal!" },
  { id: "e3", emoji: "✨", text: "Excellent assignment completion this fortnight." },
  { id: "e4", emoji: "💪", text: "Small daily reps move the needle. Keep going!" },
];

export const classAchievements = [
  {
    id: "ca1",
    title: "Best Attendance Class",
    section: "10-B",
    value: "94% avg",
    tone: "success" as const,
  },
  {
    id: "ca2",
    title: "Most Improved Section",
    section: "9-A",
    value: "+8% term-on-term",
    tone: "primary" as const,
  },
  {
    id: "ca3",
    title: "Assignment Champions",
    section: "10-B",
    value: "98% on-time",
    tone: "warning" as const,
  },
];

export const sportsEvents: SportEvent[] = [
  {
    id: "se3",
    title: "Chess Tournament — Round 3",
    sport: "Chess",
    date: "Today",
    time: "4:00 PM",
    venue: "Activity Hall",
    status: "ongoing",
    kind: "sport",
  },
  {
    id: "se1",
    title: "Inter-house Football Final",
    sport: "Football",
    date: "Sat 14 Jun",
    time: "3:30 PM",
    venue: "Main Ground",
    status: "upcoming",
    kind: "sport",
  },
  {
    id: "se-c1",
    title: "Inter-house Group Dance",
    sport: "Dance",
    date: "Fri 20 Jun",
    time: "5:00 PM",
    venue: "Auditorium",
    status: "upcoming",
    kind: "cultural",
  },
  {
    id: "se2",
    title: "Annual Athletics Meet",
    sport: "Athletics",
    date: "Mon 23 Jun",
    time: "8:00 AM",
    venue: "Track & Field",
    status: "upcoming",
    kind: "sport",
  },
  {
    id: "se-c2",
    title: "Music Ensemble — Western Vocals",
    sport: "Music",
    date: "Wed 25 Jun",
    time: "4:30 PM",
    venue: "Auditorium",
    status: "upcoming",
    kind: "cultural",
  },
  {
    id: "se-c3",
    title: "Primary Cultural Showcase",
    sport: "Arts",
    date: "Sat 28 Jun",
    time: "10:00 AM",
    venue: "Activity Hall",
    status: "upcoming",
    kind: "cultural",
  },
  {
    id: "se4",
    title: "Basketball League",
    sport: "Basketball",
    date: "Wed 6 Nov",
    time: "—",
    venue: "Court A",
    status: "completed",
    result: "Won 42–36",
    kind: "sport",
  },
  {
    id: "se5",
    title: "Cricket Friendly",
    sport: "Cricket",
    date: "Mon 4 Nov",
    time: "—",
    venue: "Main Ground",
    status: "completed",
    result: "Drawn",
    kind: "sport",
  },
];

export const sportsTeams: SportTeam[] = [
  {
    id: "t-fb",
    name: "School Football XI",
    sport: "Football",
    coach: "Coach Imran",
    members: 18,
    practiceDays: "Mon · Wed · Fri",
    rating: 4.6,
  },
  {
    id: "t-bb",
    name: "Basketball Squad",
    sport: "Basketball",
    coach: "Coach Reena",
    members: 12,
    practiceDays: "Tue · Thu",
    rating: 4.4,
  },
  {
    id: "t-ath",
    name: "Athletics Core",
    sport: "Athletics",
    coach: "Coach Manish",
    members: 22,
    practiceDays: "Daily 6:00 AM",
    rating: 4.8,
  },
  {
    id: "t-ch",
    name: "Chess Club",
    sport: "Chess",
    coach: "Mr. Bhatt",
    members: 14,
    practiceDays: "Wed · Sat",
    rating: 4.5,
  },
];

/** Roster + last practice attendance for teacher clarity (demo). */
export const sportsTeamRoster: Record<
  string,
  { name: string; roll: string; presentLastSession: boolean; squadRank: number | null }[]
> = {
  "t-fb": studentsInClass.slice(0, 10).map((s, i) => ({
    name: s.name,
    roll: s.roll,
    presentLastSession: i % 5 !== 1,
    squadRank: i < 6 ? i + 1 : null,
  })),
  "t-bb": studentsInClass.slice(4, 14).map((s, i) => ({
    name: s.name,
    roll: s.roll,
    presentLastSession: i % 3 !== 0,
    squadRank: i < 5 ? i + 1 : null,
  })),
  "t-ath": studentsInClass.slice(0, 12).map((s, i) => ({
    name: s.name,
    roll: s.roll,
    presentLastSession: i % 4 !== 2,
    squadRank: i < 8 ? i + 1 : null,
  })),
  "t-ch": studentsInClass.slice(8, 18).map((s, i) => ({
    name: s.name,
    roll: s.roll,
    presentLastSession: i % 2 === 0,
    squadRank: i < 4 ? i + 1 : null,
  })),
};

export const sportsAttendance = [
  { week: "W1", attended: 3, total: 3 },
  { week: "W2", attended: 2, total: 3 },
  { week: "W3", attended: 3, total: 3 },
  { week: "W4", attended: 3, total: 3 },
  { week: "W5", attended: 2, total: 3 },
];

import type {
  ReportCard,
  SubjectMark,
  FeeItem,
  SchoolEvent,
  AppNotification,
  Institute,
} from "@lumenx/types";

/** Campuses available at Connect sign-in. */
export const registeredInstitutes: Institute[] = [
  {
    id: "ins-delhi-riverside",
    name: "Delhi Public School Riverside",
    code: "DPS-RV",
    kind: "school",
  },
  {
    id: "ins-st-xavier-jc",
    name: "St. Xavier's Junior College",
    code: "SX-JC-MUM",
    kind: "junior_college",
  },
  {
    id: "ins-fergusson",
    name: "Fergusson College (Autonomous)",
    code: "FC-PUN",
    kind: "degree_college",
  },
  {
    id: "ins-vnit",
    name: "Visvesvaraya National Institute of Technology",
    code: "VNIT-NGP",
    kind: "engineering",
  },
  {
    id: "ins-bhu",
    name: "Banaras Hindu University",
    code: "BHU-MAIN",
    kind: "university",
  },
];

export { gradeFor };

const buildReportCardMarks = (
  rows: Array<[subject: string, internal: number, exam: number, remark?: string]>,
): SubjectMark[] =>
  rows.map(([subject, internal, exam, remark]) => {
    const total = internal + exam;
    return {
      subject,
      internal,
      exam,
      total,
      grade: gradeFor(total),
      ...(remark ? { remark } : {}),
    };
  });

const avgPct = (marks: SubjectMark[]) =>
  Math.round(marks.reduce((s, m) => s + m.total, 0) / marks.length);

/** Build a report card so percentage and grade are always derived from the marks shown. */
const buildReportCard = (
  base: Pick<ReportCard, "id" | "term" | "publishedOn" | "status" | "rank">,
  rows: Array<[subject: string, internal: number, exam: number, remark?: string]>,
): ReportCard => {
  const marks = buildReportCardMarks(rows);
  const percentage = avgPct(marks);
  return { ...base, percentage, grade: gradeFor(percentage), marks };
};

export const reportCards: ReportCard[] = [
  buildReportCard(
    { id: "rc-u1", term: "Unit Test 1", publishedOn: "28 Jul 2024", status: "published", rank: 11 },
    [
      ["Mathematics", 17, 58, "Good start — revise geometry"],
      ["Physics", 15, 52, "Focus on units and formulas"],
      ["Chemistry", 14, 48],
      ["English", 18, 65, "Strong comprehension"],
      ["Computer Science", 19, 68, "Excellent logic skills"],
      ["History", 14, 50],
    ],
  ),
  buildReportCard(
    { id: "rc-u2", term: "Unit Test 2", publishedOn: "18 Sep 2024", status: "published", rank: 9 },
    [
      ["Mathematics", 18, 62, "Improved in algebra"],
      ["Physics", 16, 55],
      ["Chemistry", 13, 45],
      ["English", 19, 68],
      ["Computer Science", 20, 72],
      ["History", 15, 54],
    ],
  ),
  buildReportCard(
    { id: "rc-u3", term: "Unit Test 3", publishedOn: "8 Nov 2024", status: "published", rank: 8 },
    [
      ["Mathematics", 18, 66, "Strong improvement in algebra"],
      ["Physics", 16, 58, "Practice numericals"],
      ["Chemistry", 14, 52, "Focus on organic chemistry"],
      ["English", 19, 70, "Excellent essays"],
      ["Computer Science", 20, 74, "Outstanding"],
      ["History", 15, 56],
    ],
  ),
  buildReportCard(
    { id: "rc-hy", term: "Half-Yearly", publishedOn: "20 Dec 2024", status: "published", rank: 7 },
    [
      ["Mathematics", 18, 70, "Strong improvement in algebra"],
      ["Physics", 16, 60, "Practice numericals"],
      ["Chemistry", 14, 50, "Focus on organic chemistry"],
      ["English", 19, 72, "Excellent essays"],
      ["Computer Science", 20, 75, "Outstanding"],
      ["History", 15, 57],
    ],
  ),
  buildReportCard(
    { id: "rc-mid", term: "Mid-Term", publishedOn: "Draft", status: "draft", rank: 9 },
    [
      ["Mathematics", 17, 65],
      ["Physics", 15, 56],
      ["Chemistry", 13, 47],
      ["English", 18, 70],
      ["Computer Science", 19, 72],
      ["History", 14, 56],
    ],
  ),
];

export const fees: FeeItem[] = [
  {
    id: "f1",
    title: "Tuition Fee",
    term: "Q1 2024",
    amount: 21000,
    due: "15 Apr 2024",
    status: "paid",
    paidOn: "10 Apr 2024",
    receiptNo: "RCP-1041",
  },
  {
    id: "f2",
    title: "Tuition Fee",
    term: "Q2 2024",
    amount: 21000,
    due: "15 Jul 2024",
    status: "paid",
    paidOn: "12 Jul 2024",
    receiptNo: "RCP-1187",
  },
  {
    id: "f3",
    title: "Tuition Fee",
    term: "Q3 2024",
    amount: 21000,
    due: "15 Oct 2024",
    status: "partial",
    paidOn: "16 Oct 2024",
    receiptNo: "RCP-1322",
  },
  {
    id: "f4",
    title: "Transport Fee",
    term: "H2 2024",
    amount: 8000,
    due: "30 Nov 2024",
    status: "overdue",
  },
  {
    id: "f5",
    title: "Lab & Activity Fee",
    term: "2024-25",
    amount: 5000,
    due: "20 Dec 2024",
    status: "upcoming",
  },
  {
    id: "f-ex1",
    title: "Mid-term examination fee",
    term: "Nov 2024",
    amount: 3500,
    due: "10 Nov 2024",
    status: "paid",
    paidOn: "8 Nov 2024",
    receiptNo: "RCP-1401",
    category: "exam",
  },
  {
    id: "f-ex2",
    title: "Practical & viva examination fee",
    term: "Dec 2025",
    amount: 1800,
    due: "5 Dec 2025",
    status: "overdue",
    category: "exam",
  },
  {
    id: "f-ex3",
    title: "Final examination fee",
    term: "Mar 2026",
    amount: 4200,
    due: "15 Mar 2026",
    status: "upcoming",
    category: "exam",
  },
  {
    id: "f-ex4",
    title: "Half-yearly practical fee",
    term: "Jun 2026",
    amount: 2200,
    due: "10 Jun 2026",
    status: "upcoming",
    category: "exam",
  },
  {
    id: "f-ex5",
    title: "Mid-Term examination fee",
    term: "Jun 2026",
    amount: 3500,
    due: "20 Jun 2026",
    status: "upcoming",
    category: "exam",
  },
  {
    id: "f6",
    title: "Tuition Fee",
    term: "Q4 2024",
    amount: 21000,
    due: "15 Jan 2025",
    status: "upcoming",
  },
];

// Derived from the fee items via the shared fees engine, so the headline totals can never
// drift from the itemised list (single source of truth for paid/due/total).
const feeSummaryComputed = summarizeFeeItems(fees);
export const feeSummary = {
  total: feeSummaryComputed.totalAnnual,
  paid: feeSummaryComputed.totalPaid,
  due: feeSummaryComputed.totalOutstanding,
  nextDue: feeSummaryComputed.nextDueDate ?? "—",
};

export const schoolEvents: SchoolEvent[] = [
  {
    id: "ev1",
    title: "Annual Sports Day",
    kind: "sports",
    date: "2024-12-05",
    time: "8:00 AM",
    venue: "Main Ground",
    description: "Inter-house athletics, races and finals.",
  },
  { id: "ev2", title: "Diwali Break", kind: "holiday", date: "2024-11-01", endDate: "2024-11-05" },
  {
    id: "ev3",
    title: "Science Workshop",
    kind: "workshop",
    date: "2024-11-22",
    time: "10:00 AM",
    venue: "Lab Block",
    description: "Hands-on experiments with IIT-B mentors.",
  },
  {
    id: "ev4",
    title: "Parent-Teacher Meet",
    kind: "event",
    date: "2024-11-30",
    time: "9:00 AM",
    venue: "Auditorium",
    description: "Mid-term performance review.",
  },
  {
    id: "ev5",
    title: "Career Counselling Seminar",
    kind: "seminar",
    date: "2024-12-10",
    time: "2:00 PM",
    venue: "Hall A",
  },
  {
    id: "ev6",
    title: "Annual Day Celebration",
    kind: "celebration",
    date: "2024-12-20",
    time: "5:00 PM",
    venue: "Auditorium",
  },
  { id: "ev7", title: "Mid-Term Exams Begin", kind: "exam-holiday", date: "2024-11-18" },
  {
    id: "ev8",
    title: "Christmas Break",
    kind: "holiday",
    date: "2024-12-23",
    endDate: "2025-01-02",
  },
  { id: "ev9", title: "Republic Day", kind: "holiday", date: "2025-01-26" },
  {
    id: "ev11",
    title: "Spring Cultural Fest",
    kind: "celebration",
    date: "2026-05-28",
    time: "4:00 PM",
    venue: "Open Air Theatre",
    description: "Music, dance and art showcase.",
  },
  {
    id: "ev12",
    title: "Board Exam Preparation Workshop",
    kind: "workshop",
    date: "2026-06-04",
    time: "10:00 AM",
    venue: "Hall B",
    description: "Time management and stress handling.",
  },
  {
    id: "ev13",
    title: "Summer Break begins",
    kind: "holiday",
    date: "2026-06-15",
    endDate: "2026-07-31",
  },
];

/** Categorized notification feed used by /notifications. */
export const categorizedNotifications: Record<"parent" | "teacher" | "student", AppNotification[]> =
  {
    parent: [
      {
        id: "pn1",
        title: "Aarav was marked present",
        desc: "Mathematics • Period 1",
        time: "9:12 AM",
        type: "info",
        category: "attendance",
        unread: true,
        priority: "normal",
        detail:
          "Aarav Sharma was marked present for Period 1 (Mathematics) at 9:12 AM. Class 10-B · Roll 14. If this looks incorrect, contact the class teacher within 24 hours.",
      },
      {
        id: "pn2",
        title: "Term 1 report card published",
        desc: "Aarav scored 82% — Grade A",
        time: "Today",
        type: "positive",
        category: "academic",
        unread: true,
        priority: "high",
        detail:
          "The Half-Yearly report card is now available under Marks. Aggregate 82%, Grade A, class rank #7. Subject-wise breakdown and teacher remarks are included.",
      },
      {
        id: "pn3",
        title: "Tuition fee partially paid",
        desc: "₹7,000 pending for Q3 2024",
        time: "Yesterday",
        type: "warning",
        category: "fees",
        unread: true,
        priority: "high",
        detail:
          "Q3 2024 tuition received a partial payment on 16 Oct. ₹7,000 remains due. Clear the balance on the Fees page to avoid late fees.",
      },
      {
        id: "pn4",
        title: "Diwali break announced",
        desc: "School closed 1–5 Nov",
        time: "2 days ago",
        type: "info",
        category: "holidays",
        unread: false,
        priority: "normal",
      },
      {
        id: "pn5",
        title: "PTM scheduled",
        desc: "Parent-Teacher Meet on 30 Nov, 9 AM",
        time: "3 days ago",
        type: "info",
        category: "events",
        unread: false,
        priority: "normal",
      },
      {
        id: "pn6",
        title: "Chemistry below average",
        desc: "Consider extra practice this week",
        time: "4 days ago",
        type: "warning",
        category: "academic",
        unread: false,
        priority: "normal",
      },
      {
        id: "pn7",
        title: "Bus route 4 revised",
        desc: "Pickup time shifted by 10 minutes",
        time: "1 week ago",
        type: "info",
        category: "circulars",
        unread: false,
        priority: "low",
      },
      {
        id: "pn8",
        title: "Mid-Term exam schedule released",
        desc: "Starts 18 Nov · check Exams for full timetable",
        time: "5 days ago",
        type: "info",
        category: "exams",
        unread: true,
        priority: "high",
      },
      {
        id: "pn9",
        title: "Annual Day rehearsal",
        desc: "Class 10 students report to auditorium at 2 PM",
        time: "6 days ago",
        type: "info",
        category: "events",
        unread: false,
        priority: "normal",
      },
    ],
    teacher: [
      {
        id: "tn1",
        title: "Attendance pending",
        desc: "Class 10-B • Period 3",
        time: "Now",
        type: "warning",
        category: "attendance",
        unread: true,
        priority: "high",
      },
      {
        id: "tn2",
        title: "5 new submissions",
        desc: "Quadratic Equations Practice",
        time: "1 hr ago",
        type: "info",
        category: "assignments",
        unread: true,
        priority: "normal",
      },
      {
        id: "tn3",
        title: "Marks entry due",
        desc: "Mid-Term Mathematics — by Fri",
        time: "2 hr ago",
        type: "warning",
        category: "exams",
        unread: true,
        priority: "high",
      },
      {
        id: "tn4",
        title: "Staff meeting at 4 PM",
        desc: "Conference Room A",
        time: "Today",
        type: "info",
        category: "circulars",
        priority: "normal",
      },
      {
        id: "tn5",
        title: "Sports day duty roster",
        desc: "You're assigned to Track Field B",
        time: "Yesterday",
        type: "info",
        category: "sports",
        priority: "normal",
      },
      {
        id: "tn6",
        title: "Diwali break",
        desc: "School closed 1–5 Nov",
        time: "2 days ago",
        type: "info",
        category: "holidays",
        priority: "low",
      },
    ],
    student: [
      {
        id: "sn1",
        title: "New assignment",
        desc: "Quadratic Equations Practice • Due tomorrow",
        time: "10 min ago",
        type: "info",
        category: "assignments",
        unread: true,
        priority: "high",
        detail:
          "Mathematics assignment posted by Ananya Iyer. Submit PDF or photo scan before 8:00 AM tomorrow. Late submissions may lose 10% per day.",
      },
      {
        id: "sn2",
        title: "Term 1 report card",
        desc: "You scored 82% — Grade A",
        time: "Today",
        type: "positive",
        category: "academic",
        unread: true,
        priority: "high",
        detail:
          "Your Half-Yearly results are live. Open Marks to see subject-wise scores, pass/fail status, and performance charts. Class rank: #7.",
      },
      {
        id: "sn3",
        title: "Mid-Term schedule released",
        desc: "Starts 18 Nov",
        time: "Yesterday",
        type: "info",
        category: "exams",
        unread: false,
        priority: "high",
      },
      {
        id: "sn4",
        title: "You scored 88 in Math",
        desc: "Great improvement from last term!",
        time: "2 days ago",
        type: "positive",
        category: "academic",
        unread: false,
        priority: "normal",
      },
      {
        id: "sn5",
        title: "Football trials",
        desc: "Selection round on 16 Nov, 3:30 PM",
        time: "3 days ago",
        type: "info",
        category: "sports",
        unread: false,
        priority: "normal",
      },
      {
        id: "sn6",
        title: "Diwali break",
        desc: "School closed 1–5 Nov",
        time: "4 days ago",
        type: "info",
        category: "holidays",
        unread: false,
        priority: "low",
      },
      {
        id: "sn7",
        title: "Annual Day on 20 Dec",
        desc: "Rehearsals start next week",
        time: "1 week ago",
        type: "info",
        category: "events",
        unread: false,
        priority: "normal",
      },
      {
        id: "sn8",
        title: "School reopening notice",
        desc: "Classes resume 6 Jun after regional holiday",
        time: "3 days ago",
        type: "info",
        category: "circulars",
        unread: true,
        priority: "normal",
      },
      {
        id: "sn9",
        title: "Library book due reminder",
        desc: "Return 'Physics Vol. II' by Friday to avoid fine",
        time: "5 days ago",
        type: "warning",
        category: "circulars",
        unread: true,
        priority: "normal",
      },
    ],
  };

/** Mandatory & emergency alerts — separate from general notifications. */
export const schoolAlerts: Record<"parent" | "student", import("@lumenx/types").SchoolAlert[]> = {
  parent: [
    {
      id: "al-p1",
      title: "Sent to sick bay — pickup required",
      summary: "Aarav reported fever during Period 3. Nurse is monitoring.",
      detail:
        "Aarav Sharma was sent to the health office at 11:42 AM with a temperature of 38.2°C. He is resting in the sick bay. Please confirm pickup within 45 minutes or authorize the school to administer basic care per the medical consent form on file.",
      severity: "emergency",
      category: "health",
      time: "32 min ago",
      source: "Health office · Ms. Rekha",
      childName: "Aarav Sharma",
      childId: "C1",
      unread: true,
      acknowledged: false,
      actionRequired: true,
      actionLabel: "Confirm pickup",
    },
    {
      id: "al-p2",
      title: "Unplanned absence recorded",
      summary: "Aarav marked absent for Period 1 today — no prior leave application.",
      detail:
        "Attendance for Class 10-B shows Aarav absent in Period 1 (Mathematics). If this is incorrect or you had applied leave, submit clarification via Messages or call the attendance desk before 2 PM to avoid an unexplained absence flag.",
      severity: "mandatory",
      category: "absence",
      time: "2 hr ago",
      source: "Attendance desk",
      childName: "Aarav Sharma",
      childId: "C1",
      unread: true,
      acknowledged: false,
      actionRequired: true,
      actionLabel: "Submit clarification",
    },
    {
      id: "al-p3",
      title: "Urgent teacher remark",
      summary: "Class teacher flagged a behaviour concern requiring parent follow-up.",
      detail:
        "Ms. Ananya Iyer has posted an urgent remark regarding classroom conduct during the chemistry lab. Please review the full remark under Messages and confirm that you have discussed this with your child. A brief response is requested within 24 hours.",
      severity: "mandatory",
      category: "remark",
      time: "Yesterday",
      source: "Class teacher · Ms. Iyer",
      childName: "Aarav Sharma",
      childId: "C1",
      unread: true,
      acknowledged: false,
      actionRequired: true,
      actionLabel: "Mark as read",
    },
    {
      id: "al-p7",
      title: "Leave request pending approval",
      summary: "Aarav's leave for 4–5 Jun is awaiting class teacher review.",
      detail:
        "You submitted a leave request for Aarav Sharma (4–5 Jun, family wedding). Ms. Ananya Iyer has not yet approved or rejected it. Open Leave to track status or follow up with the class teacher.",
      severity: "mandatory",
      category: "leave",
      time: "Today · 9:15 AM",
      source: "Leave module",
      childName: "Aarav Sharma",
      childId: "C1",
      unread: true,
      acknowledged: false,
      actionRequired: true,
      actionLabel: "Review leave",
    },
    {
      id: "al-p5",
      title: "Allergy incident — resolved",
      summary: "Aarav had a mild reaction at lunch; antihistamine given per medical file.",
      detail:
        "During lunch, Aarav reported mild itching after the dessert course. The nurse reviewed his allergy profile (nuts) and administered antihistamine as authorized. Symptoms subsided within 20 minutes. This is logged for your records — no immediate pickup required unless symptoms return.",
      severity: "emergency",
      category: "health",
      time: "Yesterday",
      source: "Health office",
      childName: "Aarav Sharma",
      childId: "C1",
      unread: false,
      acknowledged: true,
      actionRequired: false,
    },
    {
      id: "al-p6",
      title: "Bus safety drill reminder",
      summary: "You confirmed receipt before Friday's evacuation drill.",
      detail:
        "All parents must confirm they received the updated bus safety protocol before the district-mandated evacuation drill on Friday. Students will practice emergency exit procedures during Period 6.",
      severity: "mandatory",
      category: "safety",
      time: "3 days ago",
      source: "Transport office",
      childName: "Aarav Sharma",
      childId: "C1",
      unread: false,
      acknowledged: true,
      actionRequired: false,
    },
    {
      id: "al-p8",
      title: "Early dismissal — inter-school event",
      summary: "Aarav returned by 1:30 PM from the quiz competition.",
      detail:
        "Aarav participated in the inter-school quiz at City Hall. The school bus dropped him at the regular stop by 1:30 PM. This alert is closed — no further action needed.",
      severity: "mandatory",
      category: "attendance",
      time: "Last week",
      source: "Activity coordinator",
      childName: "Aarav Sharma",
      childId: "C1",
      unread: false,
      acknowledged: true,
      actionRequired: false,
    },
    {
      id: "al-p4",
      title: "Anaya — quiz event pickup change",
      summary: "Anaya will return by 1:30 PM from the quiz competition.",
      detail:
        "Anaya Sharma is participating in the inter-school quiz at City Hall. The school bus will drop her at the regular stop by 1:30 PM. No action needed unless your pickup plan differs — reply to confirm alternate arrangements.",
      severity: "mandatory",
      category: "attendance",
      time: "Today · 8:00 AM",
      source: "Activity coordinator",
      childName: "Anaya Sharma",
      childId: "C2",
      unread: true,
      acknowledged: false,
      actionRequired: false,
    },
  ],
  student: [
    {
      id: "al-s1",
      title: "Report to sick bay after lunch",
      summary: "You were sent to the health office — inform your parent to confirm pickup.",
      detail:
        "You reported feeling unwell during Period 3. The nurse is monitoring you in the sick bay. Your parent has been notified. Stay in the health office until you are collected or cleared to return to class.",
      severity: "emergency",
      category: "health",
      time: "32 min ago",
      source: "Health office",
      unread: true,
      acknowledged: false,
      actionRequired: false,
    },
    {
      id: "al-s2",
      title: "Absence flagged — Period 1",
      summary: "You were marked absent this morning. Ask your parent to clarify if incorrect.",
      detail:
        "Your attendance record shows absent for Period 1 (Mathematics). If you were present, inform your class teacher immediately. Otherwise, your parent must submit leave clarification before end of day.",
      severity: "mandatory",
      category: "absence",
      time: "2 hr ago",
      source: "Attendance desk",
      unread: true,
      acknowledged: false,
      actionRequired: false,
    },
    {
      id: "al-s3",
      title: "Urgent remark from class teacher",
      summary: "Ms. Iyer posted a remark that needs your parent to confirm.",
      detail:
        "Your class teacher has flagged a behaviour concern from today's chemistry lab. Discuss this with your parents — they should open Alerts and mark it as read within 24 hours.",
      severity: "mandatory",
      category: "remark",
      time: "Yesterday",
      source: "Ms. Ananya Iyer",
      unread: true,
      acknowledged: false,
      actionRequired: false,
    },
    {
      id: "al-s5",
      title: "Homework overdue",
      summary: "Grammar exercises were due last night — hand them in at school today.",
      detail:
        "Your English homework (Grammar Unit 4) was due yesterday. Please complete it and hand it in to your teacher at school today. Contact your teacher if you had a valid reason.",
      severity: "mandatory",
      category: "general",
      time: "Today · 7:30 AM",
      source: "Ms. Priya · English",
      unread: true,
      acknowledged: false,
      actionRequired: false,
    },
    {
      id: "al-s4",
      title: "Fire drill — Friday Period 6",
      summary: "Mandatory participation. Review exit route for your classroom.",
      detail:
        "District-mandated evacuation drill on Friday during Period 6. Know your nearest exit from Room 10-B and assemble at the north field. No bags — line up quietly with your class.",
      severity: "mandatory",
      category: "safety",
      time: "3 days ago",
      source: "School administration",
      unread: false,
      acknowledged: true,
      actionRequired: false,
    },
    {
      id: "al-s6",
      title: "Sports day rehearsal",
      summary: "Report to auditorium at 2 PM — you confirmed attendance.",
      detail:
        "Annual Day rehearsal for Class 10 students. You marked this alert as read and confirmed you will attend at 2:00 PM in the main auditorium.",
      severity: "mandatory",
      category: "general",
      time: "4 days ago",
      source: "Activity coordinator",
      unread: false,
      acknowledged: true,
      actionRequired: false,
    },
    {
      id: "al-s7",
      title: "Fee receipt uploaded",
      summary: "Q2 tuition payment recorded — no action needed.",
      detail:
        "Your Q2 tuition payment has been recorded by the accounts office. Download the receipt from the Fees page if you need a copy for your records.",
      severity: "mandatory",
      category: "general",
      time: "1 week ago",
      source: "Accounts office",
      unread: false,
      acknowledged: true,
      actionRequired: false,
    },
  ],
};

export const studentCertificates = studentCertificateRecords;
