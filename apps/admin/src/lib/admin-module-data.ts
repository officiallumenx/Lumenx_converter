/** Demo data for new Admin modules — structured for future Connect/API integration. */

export const ADMIN_CLASSES = ["Grade 9", "Grade 10", "Grade 11", "Grade 12"] as const;
export const ADMIN_SECTIONS = ["A", "B", "C"] as const;

export const ADMIN_EXAMS = [
  { id: "EX-UT1", name: "Unit Test 1", term: "Term 2 · 2025–26" },
  { id: "EX-UT2", name: "Unit Test 2", term: "Term 2 · 2025–26" },
  { id: "EX-MID", name: "Mid-term Examination", term: "Term 2 · 2025–26" },
  { id: "EX-FIN", name: "Term 1 Final", term: "Term 1 · 2025–26", published: true },
] as const;

export const ADMIN_SUBJECTS = [
  "Mathematics",
  "Physics",
  "Chemistry",
  "English",
  "Biology",
  "History",
] as const;

export type MarkRow = {
  id: string;
  rollNo: string;
  name: string;
  classGrade: string;
  section: string;
  examId: string;
  marks: Record<string, number>;
  maxPerSubject: number;
  teacherPublished: boolean;
  adminPublished: boolean;
};

export const MARK_ROWS: MarkRow[] = [
  {
    id: "M1",
    rollNo: "1001",
    name: "Aanya Sharma",
    classGrade: "Grade 10",
    section: "A",
    examId: "EX-UT1",
    marks: { Mathematics: 46, Physics: 42, Chemistry: 44, English: 40, Biology: 45, History: 38 },
    maxPerSubject: 50,
    teacherPublished: true,
    adminPublished: false,
  },
  {
    id: "M2",
    rollNo: "1002",
    name: "Ethan Wright",
    classGrade: "Grade 10",
    section: "A",
    examId: "EX-UT1",
    marks: { Mathematics: 28, Physics: 31, Chemistry: 29, English: 35, Biology: 32, History: 30 },
    maxPerSubject: 50,
    teacherPublished: true,
    adminPublished: false,
  },
  {
    id: "M3",
    rollNo: "1003",
    name: "Priya Patel",
    classGrade: "Grade 10",
    section: "B",
    examId: "EX-UT1",
    marks: { Mathematics: 48, Physics: 47, Chemistry: 49, English: 44, Biology: 46, History: 42 },
    maxPerSubject: 50,
    teacherPublished: true,
    adminPublished: true,
  },
  {
    id: "M4",
    rollNo: "1101",
    name: "Sana Khan",
    classGrade: "Grade 11",
    section: "A",
    examId: "EX-UT1",
    marks: { Mathematics: 38, Physics: 36, Chemistry: 42, English: 41, Biology: 44, History: 35 },
    maxPerSubject: 50,
    teacherPublished: true,
    adminPublished: false,
  },
  {
    id: "M5",
    rollNo: "1001",
    name: "Aanya Sharma",
    classGrade: "Grade 10",
    section: "A",
    examId: "EX-UT2",
    marks: { Mathematics: 47, Physics: 44, Chemistry: 46, English: 42, Biology: 46, History: 40 },
    maxPerSubject: 50,
    teacherPublished: true,
    adminPublished: false,
  },
  {
    id: "M6",
    rollNo: "1002",
    name: "Ethan Wright",
    classGrade: "Grade 10",
    section: "A",
    examId: "EX-UT2",
    marks: { Mathematics: 32, Physics: 34, Chemistry: 30, English: 38, Biology: 35, History: 33 },
    maxPerSubject: 50,
    teacherPublished: true,
    adminPublished: false,
  },
  {
    id: "M7",
    rollNo: "1003",
    name: "Priya Patel",
    classGrade: "Grade 10",
    section: "B",
    examId: "EX-UT2",
    marks: { Mathematics: 49, Physics: 48, Chemistry: 50, English: 46, Biology: 47, History: 44 },
    maxPerSubject: 50,
    teacherPublished: true,
    adminPublished: true,
  },
  {
    id: "M8",
    rollNo: "1101",
    name: "Sana Khan",
    classGrade: "Grade 11",
    section: "A",
    examId: "EX-MID",
    marks: { Mathematics: 72, Physics: 68, Chemistry: 70, English: 65, Biology: 74, History: 60 },
    maxPerSubject: 80,
    teacherPublished: true,
    adminPublished: false,
  },
  {
    id: "M9",
    rollNo: "1102",
    name: "Marcus Lee",
    classGrade: "Grade 11",
    section: "A",
    examId: "EX-MID",
    marks: { Mathematics: 78, Physics: 75, Chemistry: 76, English: 72, Biology: 77, History: 70 },
    maxPerSubject: 80,
    teacherPublished: true,
    adminPublished: true,
  },
  {
    id: "M10",
    rollNo: "1001",
    name: "Aanya Sharma",
    classGrade: "Grade 10",
    section: "A",
    examId: "EX-FIN",
    marks: { Mathematics: 88, Physics: 82, Chemistry: 85, English: 78, Biology: 84, History: 74 },
    maxPerSubject: 100,
    teacherPublished: true,
    adminPublished: true,
  },
  {
    id: "M11",
    rollNo: "1002",
    name: "Ethan Wright",
    classGrade: "Grade 10",
    section: "A",
    examId: "EX-FIN",
    marks: { Mathematics: 52, Physics: 48, Chemistry: 50, English: 56, Biology: 54, History: 46 },
    maxPerSubject: 100,
    teacherPublished: true,
    adminPublished: true,
  },
  {
    id: "M12",
    rollNo: "1003",
    name: "Priya Patel",
    classGrade: "Grade 10",
    section: "B",
    examId: "EX-FIN",
    marks: { Mathematics: 95, Physics: 92, Chemistry: 96, English: 88, Biology: 91, History: 84 },
    maxPerSubject: 100,
    teacherPublished: true,
    adminPublished: true,
  },
];

export const TRANSPORT_ROUTES = [
  {
    id: "RT-01",
    code: "NCL",
    name: "North Campus Loop",
    stops: 12,
    students: 34,
    driver: "Rajesh Kumar",
    vehicle: "KA-01-LX-4521",
    morning: "07:15",
    afternoon: "15:40",
    status: "active" as const,
  },
  {
    id: "RT-02",
    code: "CCE",
    name: "City Center Express",
    stops: 8,
    students: 28,
    driver: "Suresh Nair",
    vehicle: "KA-01-LX-8832",
    morning: "07:30",
    afternoon: "15:55",
    status: "active" as const,
  },
  {
    id: "RT-03",
    code: "EGS",
    name: "East Gate Shuttle",
    stops: 6,
    students: 22,
    driver: "Anil Verma",
    vehicle: "KA-01-LX-1190",
    morning: "07:45",
    afternoon: "16:00",
    status: "maintenance" as const,
  },
];

export const TRANSPORT_VEHICLES = [
  {
    id: "VH-01",
    reg: "KA-01-LX-4521",
    model: "Tata Starbus",
    capacity: 40,
    route: "NCL",
    status: "active" as const,
  },
  {
    id: "VH-02",
    reg: "KA-01-LX-8832",
    model: "Ashok Leyland",
    capacity: 35,
    route: "CCE",
    status: "active" as const,
  },
  {
    id: "VH-03",
    reg: "KA-01-LX-1190",
    model: "Force Traveller",
    capacity: 28,
    route: "EGS",
    status: "maintenance" as const,
  },
];

export const TRANSPORT_DRIVERS = [
  {
    id: "DR-01",
    name: "Rajesh Kumar",
    phone: "+91 98765 43210",
    license: "DL-4521",
    route: "NCL",
    attendance: 98,
    compliance: "valid" as const,
  },
  {
    id: "DR-02",
    name: "Suresh Nair",
    phone: "+91 98765 43211",
    license: "DL-8832",
    route: "CCE",
    attendance: 96,
    compliance: "valid" as const,
  },
  {
    id: "DR-03",
    name: "Anil Verma",
    phone: "+91 98765 43212",
    license: "DL-1190",
    route: "EGS",
    attendance: 91,
    compliance: "expiring" as const,
  },
];

export const TRANSPORT_ASSIGNMENTS = [
  {
    studentId: "STU-1042",
    name: "Aanya Sharma",
    class: "10-A",
    route: "NCL",
    stop: "Green Park Gate",
    pickup: "07:05",
  },
  {
    studentId: "STU-1044",
    name: "Ethan Wright",
    class: "10-B",
    route: "CCE",
    stop: "Lakeview Apartments",
    pickup: "07:12",
  },
  {
    studentId: "STU-1045",
    name: "Sana Khan",
    class: "12-A",
    route: "NCL",
    stop: "Central Library",
    pickup: "07:25",
  },
  {
    studentId: "STU-1047",
    name: "Marcus Lee",
    class: "11-A",
    route: "NCL",
    stop: "Sharma Residence Stop",
    pickup: "07:18",
  },
  {
    studentId: "STU-1048",
    name: "Priya Patel",
    class: "9-B",
    route: "CCE",
    stop: "East Gate Circle",
    pickup: "07:32",
  },
];

export const TRANSPORT_SOS = [
  {
    id: "SOS-101",
    route: "NCL",
    time: "Today · 07:42",
    type: "Breakdown",
    status: "resolved" as const,
  },
  {
    id: "SOS-099",
    route: "CCE",
    time: "Yesterday · 15:50",
    type: "Medical emergency",
    status: "closed" as const,
  },
];

export const LEAVE_STUDENT = [
  {
    id: "LV-201",
    name: "Aanya Sharma",
    class: "10-A",
    from: "2026-06-05",
    to: "2026-06-06",
    reason: "Family function",
    status: "pending" as const,
    applied: "2 Jun 2026",
  },
  {
    id: "LV-198",
    name: "Julian Draxler",
    class: "11-C",
    from: "2026-06-03",
    to: "2026-06-03",
    reason: "Medical",
    status: "approved" as const,
    applied: "1 Jun 2026",
  },
  {
    id: "LV-195",
    name: "Alina Moreno",
    class: "9-A",
    from: "2026-05-28",
    to: "2026-05-30",
    reason: "Travel",
    status: "rejected" as const,
    applied: "26 May 2026",
  },
  {
    id: "LV-192",
    name: "Priya Patel",
    class: "9-B",
    from: "2026-06-08",
    to: "2026-06-08",
    reason: "Doctor appointment",
    status: "pending" as const,
    applied: "3 Jun 2026",
  },
  {
    id: "LV-190",
    name: "Marcus Lee",
    class: "11-A",
    from: "2026-06-01",
    to: "2026-06-01",
    reason: "Festival",
    status: "approved" as const,
    applied: "29 May 2026",
  },
];

export const LEAVE_TEACHER = [
  {
    id: "TLR-042",
    name: "Sarah Jenkins",
    dept: "Mathematics",
    from: "2026-06-10",
    to: "2026-06-12",
    type: "Casual",
    status: "pending" as const,
    toRole: "Principal",
  },
  {
    id: "TLR-041",
    name: "Marcus Whitfield",
    dept: "English",
    from: "2026-06-02",
    to: "2026-06-02",
    type: "Sick",
    status: "approved" as const,
    toRole: "Admin",
  },
  {
    id: "TLR-040",
    name: "David Koal",
    dept: "Physics",
    from: "2026-06-15",
    to: "2026-06-16",
    type: "Emergency",
    status: "rejected" as const,
    toRole: "Principal",
  },
  {
    id: "TLR-039",
    name: "Priya Iyer",
    dept: "Biology",
    from: "2026-05-26",
    to: "2026-05-26",
    type: "Permission",
    status: "approved" as const,
    toRole: "Admin",
  },
];

export const INSTITUTE_PROFILE = {
  name: "LumenX International School",
  founded: "1987",
  founder: "Dr. Helena Vance",
  principal: "Dr. Alistair Vance",
  vision: "Empowering learners to lead with curiosity, integrity, and excellence.",
  mission: "Deliver holistic education through innovation, inclusion, and community partnership.",
  ranking: "Top 5 · Regional Board Schools · 2025",
  logo: "LumenX crest",
  profilePhoto: "",
  phone: "+91 80 4521 8800",
  email: "office@lumenx.edu",
  address: "12 Knowledge Park, Sector 4, Bengaluru 560001",
  history: [
    { year: "1987", event: "Founded as a 120-student community school." },
    { year: "2004", event: "Expanded to senior secondary with science & commerce streams." },
    { year: "2018", event: "Digital campus initiative and multi-branch rollout." },
  ],
  awards: [
    { title: "Excellence in STEM Education", year: "2024", body: "National Education Council" },
    { title: "Green Campus Award", year: "2023", body: "Eco Schools Alliance" },
  ],
  achievements: [
    "100% board pass rate · Class 12 · 2025",
    "Inter-school robotics champions · 2024",
    "Model UNESCO delegation award · 2023",
  ],
};

export const FEE_CATEGORIES = [
  { id: "FC-TU", name: "Tuition", students: 2842, collected: "₹4.2 Cr", pending: "₹38 L" },
  { id: "FC-TR", name: "Transport", students: 612, collected: "₹42 L", pending: "₹8 L" },
  { id: "FC-EX", name: "Examination", students: 1204, collected: "₹18 L", pending: "₹3 L" },
  { id: "FC-AC", name: "Activity & Sports", students: 980, collected: "₹12 L", pending: "₹2 L" },
];

export const FEE_STUDENTS = [
  {
    id: "STU-1042",
    name: "Aanya Sharma",
    class: "10-A",
    total: 48500,
    paid: 48500,
    status: "paid" as const,
  },
  {
    id: "STU-1043",
    name: "Julian Draxler",
    class: "11-C",
    total: 52000,
    paid: 26000,
    status: "partial" as const,
  },
  {
    id: "STU-1046",
    name: "Alina Moreno",
    class: "9-A",
    total: 45000,
    paid: 0,
    status: "overdue" as const,
  },
  {
    id: "STU-1047",
    name: "Marcus Lee",
    class: "11-A",
    total: 50000,
    paid: 50000,
    status: "paid" as const,
  },
  {
    id: "STU-1048",
    name: "Priya Patel",
    class: "9-B",
    total: 44000,
    paid: 22000,
    status: "partial" as const,
  },
  {
    id: "STU-1049",
    name: "Omar Haddad",
    class: "12-B",
    total: 55000,
    paid: 55000,
    status: "paid" as const,
  },
];

export const ADMISSION_APPLICATIONS = [
  {
    id: "APP-2401",
    name: "Vihaan Mehta",
    grade: "Grade 9",
    stage: "review" as const,
    applied: "28 May 2026",
    docs: "2/4",
  },
  {
    id: "APP-2400",
    name: "Riya Kapoor",
    grade: "Grade 10",
    stage: "review" as const,
    applied: "27 May 2026",
    docs: "3/4",
  },
  {
    id: "APP-2398",
    name: "Ananya Iyer",
    grade: "Grade 11",
    stage: "interview" as const,
    applied: "25 May 2026",
    docs: "4/4",
  },
  {
    id: "APP-2396",
    name: "Aaditya Soni",
    grade: "Grade 9",
    stage: "interview" as const,
    applied: "24 May 2026",
    docs: "4/4",
  },
  {
    id: "APP-2395",
    name: "Rohan Das",
    grade: "Grade 10",
    stage: "verification" as const,
    applied: "22 May 2026",
    docs: "3/4",
  },
  {
    id: "APP-2390",
    name: "Meera Singh",
    grade: "Grade 9",
    stage: "approved" as const,
    applied: "18 May 2026",
    docs: "4/4",
  },
  {
    id: "APP-2389",
    name: "Arjun Nair",
    grade: "Grade 11",
    stage: "approved" as const,
    applied: "17 May 2026",
    docs: "4/4",
  },
  {
    id: "APP-2388",
    name: "Kabir Shah",
    grade: "Grade 12",
    stage: "waitlist" as const,
    applied: "15 May 2026",
    docs: "4/4",
  },
];

export const CAREER_JOBS = [
  {
    id: "JOB-12",
    title: "Physics Teacher",
    dept: "Science",
    applicants: 24,
    status: "open" as const,
  },
  {
    id: "JOB-11",
    title: "Lab Assistant",
    dept: "Science",
    applicants: 18,
    status: "interview" as const,
  },
  {
    id: "JOB-10",
    title: "Front Office Executive",
    dept: "Administration",
    applicants: 31,
    status: "shortlist" as const,
  },
  { id: "JOB-09", title: "Sports Coach", dept: "Sports", applicants: 12, status: "open" as const },
];

export const CAREER_CANDIDATES = [
  {
    id: "CAN-881",
    name: "Dr. Maya Robinson",
    job: "Physics Teacher",
    stage: "interview" as const,
    score: 4.6,
  },
  {
    id: "CAN-879",
    name: "Liang Ortega",
    job: "Lab Assistant",
    stage: "shortlist" as const,
    score: 4.2,
  },
  {
    id: "CAN-878",
    name: "Rahul Verma",
    job: "Physics Teacher",
    stage: "interview" as const,
    score: 4.4,
  },
  {
    id: "CAN-876",
    name: "Sneha Gupta",
    job: "Sports Coach",
    stage: "shortlist" as const,
    score: 4.5,
  },
  {
    id: "CAN-875",
    name: "Priya Nair",
    job: "Front Office Executive",
    stage: "hired" as const,
    score: 4.8,
  },
];

export const ACADEMIC_YEAR = {
  label: "2025 — 2026",
  start: "2025-04-01",
  end: "2026-03-31",
};

export const CALENDAR_HOLIDAYS = [
  { date: "2026-06-15", title: "Summer break begins", type: "holiday" as const },
  { date: "2026-08-15", title: "Independence Day", type: "holiday" as const },
  { date: "2026-09-05", title: "Teachers' Day", type: "event" as const },
  { date: "2026-10-02", title: "Gandhi Jayanti", type: "holiday" as const },
  { date: "2026-11-14", title: "Children's Day", type: "event" as const },
  { date: "2026-01-26", title: "Republic Day", type: "holiday" as const },
];

export const CALENDAR_EXAMS = [
  { date: "2026-06-20", title: "Unit Test 1 begins", type: "exam" as const },
  { date: "2026-09-20", title: "Mid-term week", type: "exam" as const },
  { date: "2026-12-01", title: "Unit Test 3 begins", type: "exam" as const },
  { date: "2027-02-15", title: "Pre-board exams", type: "exam" as const },
];

export const TEACHER_PERFORMANCE = [
  { id: "T1", name: "Priya Iyer", dept: "Biology", rating: 4.92, trend: "+0.18", rank: 1 },
  { id: "T2", name: "Sarah Jenkins", dept: "Mathematics", rating: 4.81, trend: "+0.12", rank: 2 },
  { id: "T3", name: "Hana Suzuki", dept: "Chemistry", rating: 4.74, trend: "+0.06", rank: 3 },
  { id: "T4", name: "David Koal", dept: "Physics", rating: 4.62, trend: "+0.04", rank: 4 },
  { id: "T5", name: "Omar Faris", dept: "History", rating: 4.55, trend: "+0.02", rank: 5 },
  { id: "T6", name: "Marcus Whitfield", dept: "English", rating: 4.42, trend: "-0.14", rank: 6 },
];

export const REPORT_CATALOG = [
  { id: "students", name: "Student roster & demographics", module: "Students" },
  { id: "teachers", name: "Faculty directory & assignments", module: "Teachers" },
  { id: "attendance", name: "Monthly attendance register", module: "Attendance" },
  { id: "marks", name: "Exam results by class", module: "Marks" },
  { id: "transport", name: "Route ridership & compliance", module: "Transport" },
  { id: "admissions", name: "Application funnel", module: "Admissions" },
  { id: "careers", name: "Hiring pipeline", module: "Careers" },
  { id: "complaints", name: "SLA & resolution summary", module: "Complaints" },
  { id: "fees", name: "Collection & defaulters", module: "Fees" },
  { id: "events", name: "Event participation", module: "Events" },
  { id: "leave", name: "Leave register & approvals", module: "Leave" },
  { id: "documents", name: "Document verification summary", module: "Documents" },
  { id: "audit", name: "Admin activity audit trail", module: "Audit" },
] as const;
