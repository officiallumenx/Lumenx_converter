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
};

export const childProfile = studentProfile;

export const teachers = [
  {
    id: "T1",
    name: "Ananya Iyer",
    subject: "Mathematics",
    isClassTeacher: true,
    phone: "+91 98•••••12",
    initials: "AI",
  },
  {
    id: "T2",
    name: "Rahul Verma",
    subject: "Physics",
    isClassTeacher: false,
    phone: "+91 98•••••34",
    initials: "RV",
  },
  {
    id: "T3",
    name: "Priya Menon",
    subject: "English",
    isClassTeacher: false,
    phone: "+91 98•••••56",
    initials: "PM",
  },
  {
    id: "T4",
    name: "Sandeep Rao",
    subject: "Computer Science",
    isClassTeacher: false,
    phone: "+91 98•••••78",
    initials: "SR",
  },
  {
    id: "T5",
    name: "Neha Kapoor",
    subject: "Chemistry",
    isClassTeacher: false,
    phone: "+91 98•••••90",
    initials: "NK",
  },
  {
    id: "T6",
    name: "Arjun Bhatt",
    subject: "History",
    isClassTeacher: false,
    phone: "+91 98•••••11",
    initials: "AB",
  },
];

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

export const assignments = [
  {
    id: "A1",
    title: "Quadratic Equations Practice",
    subject: "Mathematics",
    due: "Tomorrow",
    status: "pending",
    class: "10-B",
  },
  {
    id: "A2",
    title: "Newton's Laws – Worksheet",
    subject: "Physics",
    due: "In 3 days",
    status: "pending",
    class: "10-B",
  },
  {
    id: "A3",
    title: "Essay: Climate Action",
    subject: "English",
    due: "Submitted",
    status: "submitted",
    class: "10-B",
  },
  {
    id: "A4",
    title: "Periodic Table Quiz",
    subject: "Chemistry",
    due: "In 5 days",
    status: "pending",
    class: "10-B",
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
    date: "Mon 18 Nov",
    duration: "2h",
    room: "Hall 2",
  },
  {
    id: "E2",
    title: "Mid-Term Physics",
    subject: "Physics",
    date: "Wed 20 Nov",
    duration: "2h",
    room: "Hall 1",
  },
  {
    id: "E3",
    title: "Mid-Term Chemistry",
    subject: "Chemistry",
    date: "Fri 22 Nov",
    duration: "2h",
    room: "Hall 3",
  },
  {
    id: "E4",
    title: "Mid-Term English",
    subject: "English",
    date: "Mon 25 Nov",
    duration: "2h",
    room: "Hall 2",
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

import type { Child } from "./types";

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
      id: "pc1-1",
      title: "Transport fee (H2)",
      amount: 8000,
      due: "30 Nov 2024",
      status: "overdue",
    },
    {
      id: "pc1-2",
      title: "Practical & viva examination fee",
      amount: 1800,
      due: "05 Dec 2024",
      status: "upcoming",
    },
  ],
  C2: [
    {
      id: "pc2-1",
      title: "Annual activity fee",
      amount: 3200,
      due: "20 Jun 2026",
      status: "upcoming",
    },
  ],
  C3: [
    {
      id: "pc3-1",
      title: "Term stationery bundle",
      amount: 1200,
      due: "01 Jun 2026",
      status: "upcoming",
    },
  ],
};

import type { Achievement, Streak, Goal, SportEvent, SportTeam } from "./types";

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
    id: "se1",
    title: "Inter-house Football Final",
    sport: "Football",
    date: "Sat 16 Nov",
    time: "3:30 PM",
    venue: "Main Ground",
    status: "upcoming",
  },
  {
    id: "se2",
    title: "Annual Athletics Meet",
    sport: "Athletics",
    date: "Fri 22 Nov",
    time: "8:00 AM",
    venue: "Track & Field",
    status: "upcoming",
  },
  {
    id: "se3",
    title: "Chess Tournament — Round 3",
    sport: "Chess",
    date: "Today",
    time: "4:00 PM",
    venue: "Activity Hall",
    status: "ongoing",
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

import type { ReportCard, FeeItem, SchoolEvent, AppNotification, Institute } from "./types";

/** Campuses available at sign-in — drives institute-scoped session context. */
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

const gradeFor = (pct: number) =>
  pct >= 90
    ? "A+"
    : pct >= 80
      ? "A"
      : pct >= 70
        ? "B+"
        : pct >= 60
          ? "B"
          : pct >= 50
            ? "C"
            : pct >= 40
              ? "D"
              : "F";

export { gradeFor };

export const reportCards: ReportCard[] = [
  {
    id: "rc-t1",
    term: "Term 1 (2024-25)",
    publishedOn: "12 Aug 2024",
    status: "published",
    percentage: 82,
    grade: "A",
    rank: 7,
    marks: [
      {
        subject: "Mathematics",
        internal: 18,
        exam: 70,
        total: 88,
        grade: "A",
        remark: "Strong improvement in algebra",
      },
      {
        subject: "Physics",
        internal: 16,
        exam: 60,
        total: 76,
        grade: "B+",
        remark: "Practice numericals",
      },
      {
        subject: "Chemistry",
        internal: 14,
        exam: 50,
        total: 64,
        grade: "B",
        remark: "Focus on organic chemistry",
      },
      {
        subject: "English",
        internal: 19,
        exam: 72,
        total: 91,
        grade: "A+",
        remark: "Excellent essays",
      },
      {
        subject: "Computer Sci",
        internal: 20,
        exam: 75,
        total: 95,
        grade: "A+",
        remark: "Outstanding",
      },
      { subject: "History", internal: 15, exam: 57, total: 72, grade: "B+" },
    ],
  },
  {
    id: "rc-mid",
    term: "Mid-Term (2024-25)",
    publishedOn: "Draft",
    status: "draft",
    percentage: 78,
    grade: "B+",
    rank: 9,
    marks: [
      { subject: "Mathematics", internal: 17, exam: 65, total: 82, grade: "A" },
      { subject: "Physics", internal: 15, exam: 56, total: 71, grade: "B+" },
      { subject: "Chemistry", internal: 13, exam: 47, total: 60, grade: "B" },
      { subject: "English", internal: 18, exam: 70, total: 88, grade: "A" },
      { subject: "Computer Sci", internal: 19, exam: 72, total: 91, grade: "A+" },
      { subject: "History", internal: 14, exam: 56, total: 70, grade: "B+" },
    ],
  },
];

export const feeSummary = {
  total: 84000,
  paid: 56000,
  due: 28000,
  nextDue: "30 Nov 2024",
};

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
    term: "Dec 2024",
    amount: 1800,
    due: "5 Dec 2024",
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
      },
      {
        id: "pn4",
        title: "Diwali break announced",
        desc: "School closed 1–5 Nov",
        time: "2 days ago",
        type: "info",
        category: "holidays",
        priority: "normal",
      },
      {
        id: "pn5",
        title: "PTM scheduled",
        desc: "Parent-Teacher Meet on 30 Nov, 9 AM",
        time: "3 days ago",
        type: "info",
        category: "events",
        priority: "normal",
      },
      {
        id: "pn6",
        title: "Chemistry below average",
        desc: "Consider extra practice this week",
        time: "4 days ago",
        type: "warning",
        category: "academic",
        priority: "normal",
      },
      {
        id: "pn7",
        title: "Bus route 4 revised",
        desc: "Pickup time shifted by 10 minutes",
        time: "1 week ago",
        type: "info",
        category: "circulars",
        priority: "low",
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
      },
      {
        id: "sn3",
        title: "Mid-Term schedule released",
        desc: "Starts 18 Nov",
        time: "Yesterday",
        type: "info",
        category: "exams",
        priority: "high",
      },
      {
        id: "sn4",
        title: "You scored 88 in Math",
        desc: "Great improvement from last term!",
        time: "2 days ago",
        type: "positive",
        category: "academic",
        priority: "normal",
      },
      {
        id: "sn5",
        title: "Football trials",
        desc: "Selection round on 16 Nov, 3:30 PM",
        time: "3 days ago",
        type: "info",
        category: "sports",
        priority: "normal",
      },
      {
        id: "sn6",
        title: "Diwali break",
        desc: "School closed 1–5 Nov",
        time: "4 days ago",
        type: "info",
        category: "holidays",
        priority: "low",
      },
      {
        id: "sn7",
        title: "Annual Day on 20 Dec",
        desc: "Rehearsals start next week",
        time: "1 week ago",
        type: "info",
        category: "events",
        priority: "normal",
      },
    ],
  };
