import type {
  AttendanceReport,
  AssignmentSubmission,
  DashboardSnapshot,
  HomeworkAttendanceRow,
  HomeworkClassSummary,
  MarkEntry,
  StudentAttentionItem,
  StudentDetail,
  StudentRemark,
  TeacherAssignment,
  TeacherClass,
  TeacherComplaint,
  TeacherEvent,
  TeacherLeaveRequest,
  TeacherExam,
  TeacherSelfAttendanceRecord,
  TeacherMessage,
  TeacherMessageTarget,
  TeacherNotification,
  TeacherProfile,
  TeacherStudent,
  TimetableSlot,
} from "./types";
import { getInitials } from "@lumenx/utils";
import { gradeFor } from "@/lib/marks-utils";
import { getTodayDayName } from "@/lib/weekday";

export { getTodayDayName };

export const teacherProfile: TeacherProfile = {
  id: "T-1042",
  name: "Ananya Iyer",
  employeeId: "EMP-2024-1042",
  email: "ananya.iyer@lumenx.edu",
  phone: "+91 98765 43210",
  subjects: ["Mathematics"],
  classes: ["10-B", "10-A", "9-A", "8-C"],
  experienceYears: 8,
  department: "Science & Mathematics",
  joinedOn: "June 2018",
  bio: "Passionate mathematics educator with 8 years of experience in secondary education. Specialises in making abstract concepts concrete through visual learning and real-world applications. Class teacher for 10-B.",
  hasTransport: true,
};

export const teacherClasses: TeacherClass[] = [
  {
    id: "cls-10b-math",
    className: "10",
    section: "B",
    subject: "Mathematics",
    studentCount: 32,
    isClassTeacher: true,
    attendanceRate: 94,
    homeworkSubmissionRate: 87,
    avgScore: 78,
  },
  {
    id: "cls-10a-math",
    className: "10",
    section: "A",
    subject: "Mathematics",
    studentCount: 30,
    isClassTeacher: false,
    attendanceRate: 91,
    homeworkSubmissionRate: 91,
    avgScore: 82,
  },
  {
    id: "cls-9a-math",
    className: "9",
    section: "A",
    subject: "Mathematics",
    studentCount: 28,
    isClassTeacher: false,
    attendanceRate: 89,
    homeworkSubmissionRate: 84,
    avgScore: 75,
  },
  {
    id: "cls-8c-math",
    className: "8",
    section: "C",
    subject: "Mathematics",
    studentCount: 34,
    isClassTeacher: false,
    attendanceRate: 87,
    homeworkSubmissionRate: 79,
    avgScore: 71,
  },
];

const STUDENT_NAMES = [
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
  "Dev Malhotra",
  "Esha Verma",
  "Farhan Ali",
  "Gauri Nair",
  "Harsh Patel",
  "Ira Singh",
  "Jay Mehta",
  "Kiran Das",
];

const INSTITUTE_GRADES = ["6", "7", "8", "9", "10", "11", "12"] as const;
const INSTITUTE_SECTIONS = ["A", "B", "C"] as const;

function buildInstituteStudents(): TeacherStudent[] {
  const students: TeacherStudent[] = [];
  let nameIdx = 0;

  const classConfigs: { classId: string; className: string; section: string; count: number }[] = [];

  for (const cls of teacherClasses) {
    classConfigs.push({
      classId: cls.id,
      className: cls.className,
      section: cls.section,
      count: cls.studentCount,
    });
  }

  for (const grade of INSTITUTE_GRADES) {
    for (const section of INSTITUTE_SECTIONS) {
      if (teacherClasses.some((c) => c.className === grade && c.section === section)) continue;
      classConfigs.push({
        classId: `cls-${grade}${section.toLowerCase()}-inst`,
        className: grade,
        section,
        count: 22 + ((grade.charCodeAt(0) + section.charCodeAt(0)) % 12),
      });
    }
  }

  for (const cfg of classConfigs) {
    for (let i = 0; i < cfg.count; i++) {
      const name = STUDENT_NAMES[nameIdx % STUDENT_NAMES.length];
      const score = 50 + ((nameIdx * 7 + i * 3) % 50);
      students.push({
        id: `${cfg.classId}-s${String(i + 1).padStart(2, "0")}`,
        name,
        roll: String(i + 1).padStart(2, "0"),
        classId: cfg.classId,
        className: cfg.className,
        section: cfg.section,
        attendancePct: 75 + ((nameIdx * 13 + i) % 25),
        homeworkSubmissionPct: 58 + ((nameIdx * 11 + i * 2) % 42),
        avgScore: score,
        grade: gradeFor(score),
        avatarInitials: getInitials(name, 2),
      });
      nameIdx += 1;
    }
  }

  return students;
}

export const instituteStudents: TeacherStudent[] = buildInstituteStudents();

/** Students in classes assigned to this teacher */
export const teacherStudents: TeacherStudent[] = instituteStudents.filter((s) =>
  teacherClasses.some((c) => c.id === s.classId),
);

export function getStudentsByClass(classId: string): TeacherStudent[] {
  return instituteStudents.filter((s) => s.classId === classId);
}

export function getInstituteClassNames(): string[] {
  return [...new Set(instituteStudents.map((s) => s.className))].sort(
    (a, b) => Number(a) - Number(b),
  );
}

export function getInstituteSections(className?: string): string[] {
  const list =
    className && className !== "all"
      ? instituteStudents.filter((s) => s.className === className)
      : instituteStudents;
  return [...new Set(list.map((s) => s.section))].sort();
}

export const teacherAssignments: TeacherAssignment[] = [
  {
    id: "asg-1",
    title: "Quadratic Equations Practice",
    description: "Complete exercises 1–20 from Chapter 4.",
    instructions: "Show all working. Submit as PDF or photo.",
    subject: "Mathematics",
    classId: "cls-10b-math",
    classLabel: "10-B",
    section: "B",
    due: "Tomorrow",
    dueDate: "2026-06-02",
    status: "pending",
    publishStatus: "published",
    type: "homework",
    totalStudents: 32,
    submittedCount: 18,
    submissionRate: 56,
  },
  {
    id: "asg-2",
    title: "Trigonometry Worksheet",
    description: "Solve all problems on the attached worksheet.",
    instructions: "Submit as PDF. Include unit circle diagram.",
    subject: "Mathematics",
    classId: "cls-10b-math",
    classLabel: "10-B",
    section: "B",
    due: "In 3 days",
    dueDate: "2026-06-04",
    status: "pending",
    publishStatus: "draft",
    type: "homework",
    totalStudents: 32,
    submittedCount: 8,
    submissionRate: 25,
  },
  {
    id: "asg-3",
    title: "Essay: Climate Action",
    description: "500-word essay on climate action initiatives.",
    instructions: "Use APA references. Minimum 500 words.",
    subject: "Mathematics",
    classId: "cls-10b-math",
    classLabel: "10-B",
    section: "B",
    due: "Closed",
    dueDate: "2026-05-11",
    status: "graded",
    publishStatus: "expired",
    type: "assignment",
    totalStudents: 32,
    submittedCount: 28,
    submissionRate: 88,
  },
  {
    id: "asg-4",
    title: "Linear Equations — Daily Homework",
    description: "Complete today's problem set from the board.",
    instructions: "Neat handwriting. Due before 8 AM.",
    subject: "Mathematics",
    classId: "cls-9a-math",
    classLabel: "9-A",
    section: "A",
    due: "Today",
    dueDate: "2026-06-01",
    status: "pending",
    publishStatus: "published",
    type: "homework",
    totalStudents: 28,
    submittedCount: 22,
    submissionRate: 79,
  },
  {
    id: "asg-5",
    title: "Geometry Proof Practice",
    description: "Prove theorems 3.1–3.4 with diagrams.",
    instructions: "Draw diagrams with ruler and compass.",
    subject: "Mathematics",
    classId: "cls-10a-math",
    classLabel: "10-A",
    section: "A",
    due: "In 5 days",
    dueDate: "2026-06-06",
    status: "pending",
    publishStatus: "draft",
    type: "assignment",
    totalStudents: 30,
    submittedCount: 12,
    submissionRate: 40,
  },
  {
    id: "asg-6",
    title: "Polynomials — Week 3 Homework",
    description: "Factorisation and remainder theorem exercises.",
    instructions: "Submit scanned pages. Late submissions not accepted.",
    subject: "Mathematics",
    classId: "cls-9a-math",
    classLabel: "9-A",
    section: "A",
    due: "Expired",
    dueDate: "2026-05-20",
    status: "graded",
    publishStatus: "expired",
    type: "homework",
    totalStudents: 28,
    submittedCount: 24,
    submissionRate: 86,
  },
  {
    id: "asg-7",
    title: "Mid-term Revision Assignment",
    description: "Mixed problems covering Units 1–4.",
    instructions: "Closed for submissions. Review marks in Marks module.",
    subject: "Mathematics",
    classId: "cls-10b-math",
    classLabel: "10-B",
    section: "B",
    due: "Expired",
    dueDate: "2026-05-15",
    status: "graded",
    publishStatus: "expired",
    type: "assignment",
    totalStudents: 32,
    submittedCount: 30,
    submissionRate: 94,
  },
];

function buildSubmissions(): AssignmentSubmission[] {
  const rows: AssignmentSubmission[] = [];
  const timingCycle: AssignmentSubmission["timing"][] = ["on_time", "early", "late", "missing"];

  for (const asg of teacherAssignments) {
    const students = getStudentsByClass(asg.classId);
    students.forEach((s, i) => {
      const timing = timingCycle[i % timingCycle.length];
      const submitted = timing !== "missing";
      rows.push({
        id: `sub-${asg.id}-${s.id}`,
        assignmentId: asg.id,
        studentId: s.id,
        studentName: s.name,
        roll: s.roll,
        timing,
        submittedAt: submitted
          ? `${10 + (i % 5)} May 2026 · ${6 + (i % 6)}:${(i * 7) % 60}0 PM`
          : null,
        note: submitted ? "Submitted via Connect portal." : "",
        graded: asg.status === "submitted" && submitted,
        marks:
          submitted && asg.type === "assignment"
            ? Math.min(100, 55 + ((i * 13) % 45))
            : submitted && asg.type === "homework"
              ? Math.min(10, 6 + (i % 5))
              : null,
        maxMarks: asg.type === "assignment" ? 100 : 10,
      });
    });
  }
  return rows;
}

export const teacherAssignmentSubmissions = buildSubmissions();

export function getHomeworkAttendance(classId?: string): HomeworkAttendanceRow[] {
  const students = classId ? getStudentsByClass(classId) : teacherStudents;
  return students.map((s) => {
    const subs = teacherAssignmentSubmissions.filter((x) => x.studentId === s.id);
    const totalAssigned = subs.length;
    const submitted = subs.filter((x) => x.timing !== "missing").length;
    const onTime = subs.filter((x) => x.timing === "on_time" || x.timing === "early").length;
    const late = subs.filter((x) => x.timing === "late").length;
    const missing = subs.filter((x) => x.timing === "missing").length;
    const submissionPct = totalAssigned
      ? Math.round((submitted / totalAssigned) * 100)
      : s.homeworkSubmissionPct;
    const onTimePct = totalAssigned ? Math.round((onTime / totalAssigned) * 100) : 0;
    return {
      studentId: s.id,
      studentName: s.name,
      roll: s.roll,
      classId: s.classId,
      totalAssigned,
      submitted,
      onTime,
      late,
      missing,
      submissionPct,
      onTimePct,
    };
  });
}

export function getHomeworkClassSummaries(): HomeworkClassSummary[] {
  return teacherClasses.map((c) => {
    const rows = getHomeworkAttendance(c.id);
    const avgSubmissionPct = rows.length
      ? Math.round(rows.reduce((a, r) => a + r.submissionPct, 0) / rows.length)
      : c.homeworkSubmissionRate;
    const avgOnTimePct = rows.length
      ? Math.round(rows.reduce((a, r) => a + r.onTimePct, 0) / rows.length)
      : 0;
    return {
      classId: c.id,
      label: `${c.className}-${c.section} · ${c.subject}`,
      totalAssignments: teacherAssignments.filter((a) => a.classId === c.id).length,
      avgSubmissionPct,
      avgOnTimePct,
      studentsBelow70: rows.filter((r) => r.submissionPct < 70).length,
    };
  });
}

const sampleRemarks: StudentRemark[] = [
  {
    id: "rm-1",
    studentId: "cls-10b-math-s02",
    studentName: "Aarav Sharma",
    type: "academic",
    text: "Strong problem-solving skills in algebra. Encourage participation in math olympiad.",
    authorId: teacherProfile.id,
    authorName: teacherProfile.name,
    createdAt: "28 May 2026",
    visibleTo: ["teacher", "parent", "admin"],
  },
  {
    id: "rm-2",
    studentId: "cls-10b-math-s02",
    studentName: "Aarav Sharma",
    type: "improvement",
    text: "Needs to improve homework submission consistency.",
    authorId: teacherProfile.id,
    authorName: teacherProfile.name,
    createdAt: "15 May 2026",
    visibleTo: ["teacher", "parent", "admin"],
  },
];

export function getStudentDetail(id: string): StudentDetail | null {
  const base = instituteStudents.find((s) => s.id === id);
  if (!base) return null;
  const score = base.avgScore;
  const today = new Date().toISOString().slice(0, 10);

  const pendingWork = teacherAssignments
    .filter((a) => a.classId === base.classId && a.publishStatus === "published")
    .map((a) => {
      const sub = teacherAssignmentSubmissions.find(
        (x) => x.assignmentId === a.id && x.studentId === base.id,
      );
      const missing = !sub || sub.timing === "missing";
      if (!missing) return null;
      return {
        id: a.id,
        title: a.title,
        type: a.type,
        dueDate: a.dueDate,
        dueLabel: a.due,
        status: (a.dueDate < today ? "late" : "missing") as "pending" | "late" | "missing",
      };
    })
    .filter((p): p is NonNullable<typeof p> => p !== null)
    .slice(0, 6);

  const absentDays = Math.max(1, Math.round((100 - base.attendancePct) / 5));

  return {
    ...base,
    email: `${base.name.split(" ")[0].toLowerCase()}@student.lumenx.edu`,
    parentName: `Mr./Mrs. ${base.name.split(" ").slice(-1)[0]}`,
    parentPhone: "+91 98••••••••",
    parentEmail: `parent.${base.name.split(" ")[0].toLowerCase()}@email.com`,
    marks: [
      {
        exam: "Unit Test 1",
        subject: "Mathematics",
        total: score,
        grade: base.grade,
        status: "published",
      },
      {
        exam: "Mid-Term",
        subject: "Mathematics",
        total: Math.min(100, score + 5),
        grade: gradeFor(Math.min(100, score + 5)),
        status: "draft",
      },
    ],
    achievements: [
      { title: "Top 10 in class — Unit Test 1", date: "Apr 2026" },
      ...(score >= 85 ? [{ title: "Excellence in Mathematics", date: "Mar 2026" }] : []),
    ],
    awards: score >= 80 ? [{ title: "Academic Star", year: "2025-26" }] : [],
    certificates: [{ title: "Science Fair Participation", issuedOn: "Jan 2026" }],
    growthSummary:
      score >= 75
        ? "Steady improvement in Mathematics this term."
        : "Focus areas: homework consistency and exam preparation.",
    remarks: base.id === "cls-10b-math-s02" ? sampleRemarks : [],
    pendingWork,
    attendanceSummary: {
      rate: base.attendancePct,
      daysPresent: Math.round(180 * (base.attendancePct / 100)),
      daysAbsent: absentDays,
      recentAbsences:
        base.attendancePct < 92
          ? [
              { date: "12 May 2026", reason: "Unexcused" },
              { date: "3 May 2026", reason: "Medical" },
            ].slice(0, base.attendancePct < 85 ? 2 : 1)
          : [],
    },
  };
}

export const teacherExams: TeacherExam[] = [
  {
    id: "ex-ut2",
    name: "Unit Test 2",
    subject: "Mathematics",
    classId: "cls-10b-math",
    classLabel: "10-B",
    startDate: "2026-06-12",
    endDate: "2026-06-12",
    date: "12 Jun 2026",
    description: "Chapters 4–6. Duration 90 minutes.",
    room: "Hall 2",
    duration: "90 min",
    status: "upcoming",
    publishStatus: "draft",
    marksStatus: "draft",
  },
  {
    id: "ex-mid",
    name: "Mid-Term",
    subject: "Mathematics",
    classId: "cls-10b-math",
    classLabel: "10-B",
    startDate: "2026-05-28",
    endDate: "2026-05-28",
    date: "28 May 2026",
    description: "Full syllabus Term 1.",
    room: "Hall 1",
    duration: "2h",
    status: "completed",
    publishStatus: "published",
    marksStatus: "draft",
  },
  {
    id: "ex-ut1",
    name: "Unit Test 1",
    subject: "Mathematics",
    classId: "cls-10b-math",
    classLabel: "10-B",
    startDate: "2026-04-15",
    endDate: "2026-04-15",
    date: "15 Apr 2026",
    description: "Chapters 1–3.",
    room: "Hall 2",
    duration: "90 min",
    status: "completed",
    publishStatus: "published",
    marksStatus: "published",
  },
  {
    id: "ex-final",
    name: "Final Examination",
    subject: "Mathematics",
    classId: "cls-10b-math",
    classLabel: "10-B",
    startDate: "2027-03-15",
    endDate: "2027-03-20",
    date: "15 Mar 2027",
    description: "Board examination schedule.",
    room: "Hall 1",
    duration: "3h",
    status: "upcoming",
    publishStatus: "draft",
    marksStatus: "draft",
  },
];

export const teacherEvents: TeacherEvent[] = [
  {
    id: "ev-1",
    title: "Annual Day Rehearsal",
    description: "Class 10 report to auditorium.",
    category: "program",
    date: "5 Jun 2026",
    time: "2:00 PM",
    location: "Auditorium",
    classId: "cls-10b-math",
    createdBy: "Admin",
  },
  {
    id: "ev-2",
    title: "Inter-House Sports Meet",
    description: "Track and field events.",
    category: "sports",
    date: "8 Jun 2026",
    time: "8:00 AM",
    location: "Sports Ground",
    createdBy: "Sports Dept",
  },
  {
    id: "ev-3",
    title: "Parent-Teacher Meeting",
    description: "Term 2 review for Class 10.",
    category: "academic",
    date: "12 Jun 2026",
    time: "10:00 AM",
    location: "Block A",
    classId: "cls-10b-math",
    createdBy: "Principal",
  },
  {
    id: "ev-4",
    title: "Regional Holiday",
    description: "School closed.",
    category: "holiday",
    date: "5 Jun 2026",
    time: "All day",
    location: "—",
    createdBy: "Admin",
  },
];

export const teacherMessages: TeacherMessage[] = [
  {
    id: "msg-1",
    threadId: "t1",
    from: "Mrs. Patel (Parent)",
    to: "Ananya Iyer",
    recipientRole: "parent",
    subject: "Aanya's math progress",
    body: "Could we discuss Aanya's recent test scores?",
    time: "2h ago",
    unread: true,
    archived: false,
    draft: false,
  },
  {
    id: "msg-2",
    threadId: "t2",
    from: "Principal Office",
    to: "Ananya Iyer",
    recipientRole: "principal",
    subject: "Staff meeting reminder",
    body: "Reminder: staff meeting Friday 3 PM.",
    time: "Yesterday",
    unread: true,
    archived: false,
    draft: false,
  },
  {
    id: "msg-3",
    threadId: "t3",
    from: "Ananya Iyer",
    to: "Class 10-B Parents",
    recipientRole: "class",
    subject: "Homework reminder",
    body: "Please ensure quadratic equations worksheet is submitted by tomorrow.",
    time: "3 days ago",
    unread: false,
    archived: false,
    draft: false,
  },
];

export const teacherColleagues: TeacherMessageTarget[] = [
  { id: "col-1", label: "Mr. Ramesh (Physics)", role: "teacher" },
  { id: "col-2", label: "Ms. Preethi (English)", role: "teacher" },
  { id: "col-3", label: "Mr. Sunil (Chemistry)", role: "teacher" },
  { id: "col-4", label: "Ms. Deepa (Biology)", role: "teacher" },
  { id: "col-5", label: "Mr. Kiran (PE)", role: "teacher" },
  { id: "col-6", label: "Ms. Usha (Hindi)", role: "teacher" },
];

export const teacherLeaveRequestsSeed: TeacherLeaveRequest[] = [
  {
    id: "tlr-1",
    teacherId: teacherProfile.id,
    teacherName: teacherProfile.name,
    type: "casual",
    to: "principal",
    fromDate: "2026-06-10",
    toDate: "2026-06-10",
    reason: "Need to attend a family function.",
    status: "pending",
    submittedAt: "2026-06-01 10:05 AM",
  },
  {
    id: "tlr-2",
    teacherId: teacherProfile.id,
    teacherName: teacherProfile.name,
    type: "sick",
    to: "admin",
    fromDate: "2026-05-24",
    toDate: "2026-05-25",
    reason: "Fever and advised rest.",
    status: "approved",
    submittedAt: "2026-05-23 06:25 PM",
    reviewedNote: "Approved by transport admin.",
  },
];

export const teacherSelfAttendanceSeed: TeacherSelfAttendanceRecord[] = [
  {
    id: "tsa-1",
    date: "2026-06-01",
    inTime: "08:39 AM",
    outTime: "03:42 PM",
    status: "present",
    markedBy: "admin",
  },
  {
    id: "tsa-2",
    date: "2026-05-31",
    inTime: "08:57 AM",
    outTime: "03:38 PM",
    status: "late",
    markedBy: "admin",
    note: "Arrived after morning briefing.",
  },
  {
    id: "tsa-3",
    date: "2026-05-30",
    inTime: "--",
    outTime: "--",
    status: "leave",
    markedBy: "principal",
    note: "Casual leave approved.",
  },
];

export function getMarkEntries(examId: string, classId: string): MarkEntry[] {
  const exam = teacherExams.find((e) => e.id === examId);
  const cls = teacherClasses.find((c) => c.id === classId);
  if (!exam || !cls) return [];
  const students = getStudentsByClass(classId);
  return students.map((s, i) => ({
    studentId: s.id,
    studentName: s.name,
    roll: s.roll,
    internal: 14 + (i % 6),
    exam: 48 + ((i * 5) % 32),
    status: exam.marksStatus,
  }));
}

export const DAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"] as const;

const TIMETABLE_PERIOD_TIMES = [
  "08:30 – 09:15",
  "09:20 – 10:05",
  "10:20 – 11:05",
  "11:10 – 11:55",
  "12:40 – 01:25",
  "01:30 – 02:15",
  "02:20 – 03:05",
] as const;

const WEEKLY_SUBJECT_PLAN: Record<(typeof DAYS)[number], string[]> = {
  Monday: [
    "Mathematics",
    "English",
    "Physics",
    "Chemistry",
    "Hindi",
    "Biology",
    "Computer Science",
  ],
  Tuesday: [
    "English",
    "Mathematics",
    "Chemistry",
    "Physics",
    "Library",
    "Hindi",
    "Physical Education",
  ],
  Wednesday: ["Physics", "Mathematics", "English", "Biology", "Chemistry", "Art", "Hindi"],
  Thursday: [
    "Mathematics",
    "Hindi",
    "English",
    "Physics",
    "Computer Science",
    "Chemistry",
    "Biology",
  ],
  Friday: ["Mathematics", "English", "Biology", "Physics", "Hindi", "Chemistry", "Assembly"],
  Saturday: ["English", "Mathematics", "Physics", "Chemistry", "Sports", "Hindi", "Remedial Class"],
};

function buildClassTimetable(className: string, section: string, room: string): TimetableSlot[] {
  const slots: TimetableSlot[] = [];
  for (const day of DAYS) {
    const subjects = WEEKLY_SUBJECT_PLAN[day];
    subjects.forEach((subject, i) => {
      slots.push({
        id: `tt-${className}${section}-${day.slice(0, 3)}-${i}`,
        day,
        time: TIMETABLE_PERIOD_TIMES[i] ?? TIMETABLE_PERIOD_TIMES[0],
        subject,
        className,
        section,
        room:
          subject === "Library"
            ? "Library"
            : subject === "Sports" || subject === "Physical Education"
              ? "Ground"
              : subject === "Assembly"
                ? "Auditorium"
                : room,
      });
    });
  }
  return slots;
}

const CLASS_TIMETABLE_ROOMS: Record<string, string> = {
  "cls-10b-math": "201",
  "cls-10a-math": "203",
  "cls-9a-math": "105",
  "cls-8c-math": "102",
};

/** Full class timetables — all subjects for each assigned class */
export const classTimetableByClassId: Record<string, TimetableSlot[]> = Object.fromEntries(
  teacherClasses.map((c) => [
    c.id,
    buildClassTimetable(c.className, c.section, CLASS_TIMETABLE_ROOMS[c.id] ?? "101"),
  ]),
);

/** Teacher's own periods (Mathematics only) — derived from full class timetables */
export const teacherTimetableSlots: TimetableSlot[] = teacherClasses.flatMap((c) =>
  (classTimetableByClassId[c.id] ?? []).filter((s) => s.subject === "Mathematics"),
);

export function getClassTimetable(classId: string): TimetableSlot[] {
  return classTimetableByClassId[classId] ?? [];
}

export function getClassTimetableForDay(classId: string, day: string): TimetableSlot[] {
  return getClassTimetable(classId).filter((s) => s.day === day);
}

/** Current day if it is a teaching day, otherwise the first teaching day (for a default tab). */
export function getDefaultTeacherDay(): string {
  const today = getTodayDayName();
  return (DAYS as readonly string[]).includes(today) ? today : DAYS[0];
}

export const teacherNotifications: TeacherNotification[] = [
  {
    id: "tn-0",
    title: "🚨 Emergency: School closure tomorrow",
    body: "Due to heavy rainfall advisory, school is closed on 2 Jun. All classes cancelled. Parents notified.",
    category: "urgent",
    time: "Just now",
    unread: true,
  },
  {
    id: "tn-1",
    title: "Staff meeting — Friday 3 PM",
    body: "All subject teachers required in Conference Room A.",
    category: "staff_notices",
    time: "2h ago",
    unread: true,
  },
  {
    id: "tn-2",
    title: "Mid-Term marks deadline",
    body: "Publish Mathematics marks for Class 10-B by 5 Jun.",
    category: "exam_updates",
    time: "5h ago",
    unread: true,
  },
  {
    id: "tn-3",
    title: "Annual Day rehearsal",
    body: "Class 10 students report to auditorium at 2 PM.",
    category: "events",
    time: "Yesterday",
    unread: false,
  },
  {
    id: "tn-4",
    title: "New circular: Exam guidelines",
    body: "Updated grading policy for Term 2 examinations.",
    category: "announcements",
    time: "2 days ago",
    unread: false,
  },
  {
    id: "tn-5",
    title: "Parent-teacher week",
    body: "Schedule slots open from 10 Jun on Admin portal.",
    category: "announcements",
    time: "3 days ago",
    unread: false,
  },
  {
    id: "tn-6",
    title: "⚠ Water scarcity — carry water bottles",
    body: "Municipal supply disrupted. Students and staff advised to carry water. Cafeteria will serve limited beverages.",
    category: "urgent",
    time: "4h ago",
    unread: false,
  },
];

export const teacherComplaints: TeacherComplaint[] = [
  {
    id: "tc-0",
    title: "Draft: Request lab assistant for practicals",
    body: "Need an assistant for Class 10 chemistry practical sessions next month.",
    category: "Academic",
    priority: "normal",
    status: "draft",
    createdAt: "31 May 2026",
  },
  {
    id: "tc-1",
    title: "Projector malfunction in Lab 3",
    body: "Unable to display slides during Period 3. Needs urgent fix.",
    category: "Infrastructure",
    priority: "urgent",
    status: "in_progress",
    createdAt: "30 May 2026",
    response: "IT team assigned. Expected resolution by EOD.",
  },
  {
    id: "tc-2",
    title: "Student seating arrangement",
    body: "Request to rearrange seating for better visibility in 10-B.",
    category: "Classroom",
    priority: "normal",
    status: "open",
    createdAt: "28 May 2026",
  },
  {
    id: "tc-3",
    title: "Extra coaching hours approval",
    body: "Need approval for weekend math coaching for board prep.",
    category: "Academic",
    priority: "normal",
    status: "forwarded",
    createdAt: "25 May 2026",
    response: "Forwarded to Principal for review.",
  },
  {
    id: "tc-4",
    title: "Wi-Fi connectivity in staff room",
    body: "Intermittent disconnections affecting lesson prep.",
    category: "Technical",
    priority: "urgent",
    status: "resolved",
    createdAt: "22 May 2026",
    response: "Router replaced. Connection stable since 24 May.",
  },
  {
    id: "tc-5",
    title: "Broken whiteboard marker supply",
    body: "Markers out of stock in staff room.",
    category: "Supplies",
    priority: "normal",
    status: "closed",
    createdAt: "20 May 2026",
    response: "New stock delivered to staff room.",
  },
  {
    id: "tc-6",
    title: "Parking slot allocation",
    body: "Request for dedicated teacher parking near Block A.",
    category: "Administrative",
    priority: "normal",
    status: "archived",
    createdAt: "10 Apr 2026",
    response: "Allocated slot #12. Case closed and archived.",
  },
];

export const studentsNeedingAttentionData: StudentAttentionItem[] = [
  {
    studentId: "cls-10b-math-s01",
    studentName: "Arjun Mehta",
    classLabel: "10-B",
    reason: "low_attendance",
    detail: "Attendance 61% — below 75% threshold",
  },
  {
    studentId: "cls-10b-math-s05",
    studentName: "Priya Sharma",
    classLabel: "10-B",
    reason: "missing_assignments",
    detail: "3 assignments not submitted this month",
  },
  {
    studentId: "cls-9a-math-s03",
    studentName: "Rohan Das",
    classLabel: "9-A",
    reason: "low_marks",
    detail: "Scored 28/100 in Unit Test 2 — below pass mark",
  },
  {
    studentId: "cls-10a-math-s02",
    studentName: "Sneha Kulkarni",
    classLabel: "10-A",
    reason: "low_marks",
    detail: "Average marks dropped to 42% this term",
  },
  {
    studentId: "cls-8c-math-s04",
    studentName: "Vikram Reddy",
    classLabel: "8-C",
    reason: "behaviour",
    detail: "Remark added: Disruptive during class on 30 May",
  },
  {
    studentId: "cls-10b-math-s08",
    studentName: "Kavya Nair",
    classLabel: "10-B",
    reason: "low_attendance",
    detail: "Absent 8 of last 15 days",
  },
];

export interface TeacherFeeRecord {
  studentId: string;
  studentName: string;
  roll: string;
  className: string;
  section: string;
  classLabel: string;
  tuition: { amount: number; status: "paid" | "due" | "overdue" };
  examFee: { amount: number; status: "paid" | "due" | "overdue" };
  transport?: { amount: number; status: "paid" | "due" | "overdue" };
  totalDue: number;
}

function feeStatusForStudent(index: number, slot: 0 | 1 | 2): "paid" | "due" | "overdue" {
  const cycle: ("paid" | "due" | "overdue")[] = ["paid", "due", "overdue", "paid", "due"];
  return cycle[(index + slot) % cycle.length];
}

function buildTeacherClassFees(): TeacherFeeRecord[] {
  const rows: TeacherFeeRecord[] = [];
  for (const cls of teacherClasses) {
    const students = getStudentsByClass(cls.id).slice(0, 6);
    students.forEach((s, i) => {
      const tuitionStatus = feeStatusForStudent(i, 0);
      const examStatus = feeStatusForStudent(i, 1);
      const hasTransport = i % 3 !== 1;
      const transportStatus = hasTransport ? feeStatusForStudent(i, 2) : undefined;
      const tuition = { amount: 12000, status: tuitionStatus };
      const examFee = { amount: 1500, status: examStatus };
      const transport = hasTransport
        ? { amount: 3000, status: transportStatus! }
        : undefined;
      const totalDue =
        (tuition.status !== "paid" ? tuition.amount : 0) +
        (examFee.status !== "paid" ? examFee.amount : 0) +
        (transport && transport.status !== "paid" ? transport.amount : 0);
      rows.push({
        studentId: s.id,
        studentName: s.name,
        roll: s.roll,
        className: cls.className,
        section: cls.section,
        classLabel: `${cls.className}-${cls.section}`,
        tuition,
        examFee,
        transport,
        totalDue,
      });
    });
  }
  return rows;
}

export const teacherClassFees: TeacherFeeRecord[] = buildTeacherClassFees();

export const attendanceReports: AttendanceReport[] = [
  { period: "daily", label: "Today", present: 30, absent: 2, rate: 94 },
  { period: "weekly", label: "This week", present: 148, absent: 12, rate: 93 },
  { period: "monthly", label: "May 2026", present: 612, absent: 48, rate: 93 },
];

export const dashboardAnnouncements = [
  {
    id: "ann-1",
    title: "Board exam prep week",
    body: "Extra classes scheduled 8–10 AM next week.",
    date: "31 May 2026",
  },
  {
    id: "ann-2",
    title: "Holiday — 5 Jun",
    body: "School closed for regional festival.",
    date: "30 May 2026",
  },
];

export function getDashboardSnapshot(): DashboardSnapshot {
  const today = getTodayDayName();
  const todayClasses = teacherTimetableSlots.filter((s) => s.day === today);
  const weekClassCount = DAYS.reduce(
    (total, day) => total + teacherTimetableSlots.filter((s) => s.day === day).length,
    0,
  );
  return {
    todayClasses,
    weekClassCount,
    studentsNeedingAttention: studentsNeedingAttentionData,
    attendancePending: [
      { classId: "cls-10b-math", label: "10-B Mathematics", count: 32 },
      { classId: "cls-9a-math", label: "9-A Mathematics", count: 28 },
    ],
    pendingMarks: [
      { examId: "ex-mid", label: "Mid-Term • 10-B", count: 32 },
      { examId: "ex-ut2", label: "Unit Test 2 • 10-B", count: 32 },
    ],
    pendingHomework: teacherAssignments
      .filter((a) => a.status === "pending" && a.submissionRate < 80)
      .slice(0, 3)
      .map((a) => ({
        assignmentId: a.id,
        label: `${a.title} · ${a.classLabel}`,
        pendingCount: a.totalStudents - a.submittedCount,
      })),
    homeworkOverview: teacherClasses.map((c) => ({
      classId: c.id,
      label: `${c.className}-${c.section}`,
      submissionPct: c.homeworkSubmissionRate,
    })),
    upcomingExams: teacherExams.filter((e) => e.status === "upcoming").slice(0, 3),
    upcomingEvents: teacherEvents.slice(0, 3),
    unreadMessages: teacherMessages.filter((m) => m.unread).length,
    recentComplaints: teacherComplaints
      .filter((c) => c.status !== "closed" && c.status !== "archived" && c.status !== "draft")
      .slice(0, 3),
    classPerformance: teacherClasses.map((c) => ({
      classId: c.id,
      label: `${c.className}-${c.section}`,
      attendance: c.attendanceRate,
      homework: c.homeworkSubmissionRate,
      avgScore: c.avgScore,
    })),
    recentNotifications: teacherNotifications.filter((n) => n.unread).slice(0, 3),
    announcements: dashboardAnnouncements,
  };
}

export { gradeFor };
