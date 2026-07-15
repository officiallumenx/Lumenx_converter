import type { Institute, InstituteKind } from "./index";

export type DemoProfileId = "multi_institute" | "single_institute" | "inter_college";

export type CampusKind = "school" | "college";

export type DemoAdminBranch = {
  id: string;
  name: string;
  students: number;
  attendance: number;
  growth: number;
  performance: "high" | "medium" | "low";
};

export type DemoInstituteSectionField = {
  id: string;
  label: string;
  value: string;
};

export type DemoInstituteSectionEntry = {
  id: string;
  heading: string;
  subheading: string;
  fields: DemoInstituteSectionField[];
};

export type DemoInstituteCustomSection = {
  id: string;
  title: string;
  entries: DemoInstituteSectionEntry[];
};

/** @deprecated Use DemoInstituteCustomSection */
export type DemoInstituteCustomField = DemoInstituteCustomSection;

export type DemoInstituteProfile = {
  name: string;
  founded: string;
  founder: string;
  principal: string;
  vision: string;
  mission: string;
  ranking: string;
  logo: string;
  profilePhoto: string;
  phone: string;
  email: string;
  address: string;
  history: { year: string; event: string }[];
  awards: { title: string; year: string; body: string }[];
  achievements: string[];
  customFields: DemoInstituteCustomSection[];
};

export type DemoAcademicLevel = {
  id: string;
  label: string;
  shortLabel: string;
};

export type DemoDepartment = {
  id: string;
  /** Short code shown in UI — MPC, BIPC, CEC, MEC */
  code: string;
  /** Full stream name */
  name: string;
  levelIds: string[];
};

/** @deprecated Use DemoDepartment — kept for config field name compatibility */
export type DemoDegreeCourse = DemoDepartment;

export type DemoClassGroup = {
  id: string;
  levelId: string;
  section: string;
  /** Department / stream id — MPC, BIPC, etc. */
  departmentId?: string;
  /** @deprecated Use departmentId */
  courseId?: string;
  displayName: string;
  teacher: string;
  students: number;
  capacity: number;
  room: string;
  hasTimetable: boolean;
};

export type DemoAcademicConfig = {
  mode: "school" | "college";
  levelLabel: string;
  departmentLabel: string;
  classPageTitle: string;
  classPageSubtitle: string;
  subjectLabel: string;
  subjectsPageTitle: string;
  levels: DemoAcademicLevel[];
  sections: string[];
  /** Junior-college streams — MPC, BIPC, CEC, MEC (empty for schools) */
  departments: DemoDepartment[];
  /** @deprecated Use departments */
  courses: DemoDepartment[];
  classGroups: DemoClassGroup[];
};

export type DemoConnectStudentProfile = {
  id: string;
  name: string;
  year: string;
  section: string;
  /** Stream / department code — MPC, BIPC, etc. */
  department: string;
  /** @deprecated Use department */
  course: string;
  classDisplay: string;
  rollNo: string;
  attendance: number;
  bloodGroup: string;
  emergencyContact: string;
  parentName: string;
  house: string;
  idCardIssuedOn: string;
  idCardValidTill: string;
  email: string;
  bio: string;
  classTeacher: string;
  institute: string;
  address: string;
};

export type DemoProfile = {
  id: DemoProfileId;
  label: string;
  shortLabel: string;
  description: string;
  campusKind: CampusKind;
  academic: DemoAcademicConfig;
  admin: {
    organizationName: string;
    headerSubtitle: string;
    principalName: string;
    principalTitle: string;
    branches: DemoAdminBranch[];
    showBranchSwitcher: boolean;
    branchSwitcherLabel: string;
    instituteProfile: DemoInstituteProfile;
  };
  connect: {
    portalName: string;
    loginHeroTitle: string;
    loginHeroSubtitle: string;
    institutePickerTitle: string;
    institutePickerHint: string;
    campusKindLabel: string;
    classLabel: string;
    registeredInstitutes: Institute[];
    defaultInstituteId: string;
    studentProfile: DemoConnectStudentProfile;
  };
};

export const DEMO_PROFILE_STORAGE_KEY = "lumenx_demo_profile";

export const DEFAULT_DEMO_PROFILE_ID: DemoProfileId = "multi_institute";

const MULTI_INSTITUTES: Institute[] = [
  {
    id: "ins-delhi-riverside",
    name: "Delhi Public School Riverside",
    code: "DPS-RV",
    kind: "school",
  },
  {
    id: "ins-lumenx-alpha",
    name: "LumenX Academy · Alpha",
    code: "LXA-ALP",
    kind: "school",
  },
  {
    id: "ins-lumenx-beta",
    name: "LumenX Academy · Beta",
    code: "LXA-BET",
    kind: "school",
  },
  {
    id: "ins-greenfield",
    name: "Greenfield Public School",
    code: "GPS-BLR",
    kind: "school",
  },
  {
    id: "ins-hillcrest",
    name: "Hillcrest International School",
    code: "HIS-CHN",
    kind: "school",
  },
];

const SINGLE_INSTITUTES: Institute[] = [
  {
    id: "ins-lumenx-academy",
    name: "LumenX Academy",
    code: "LXA-HYD",
    kind: "school",
  },
];

const INTER_COLLEGE_INSTITUTES: Institute[] = [
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
    id: "ins-commerce-pune",
    name: "Pune Commerce College",
    code: "PCC-PUN",
    kind: "degree_college",
  },
];

const SCHOOL_STUDENT_PROFILE: DemoConnectStudentProfile = {
  id: "S-2041",
  name: "Aarav Sharma",
  year: "Class 10",
  section: "B",
  department: "",
  course: "",
  classDisplay: "Class 10 · Sec B",
  rollNo: "14",
  attendance: 92,
  bloodGroup: "O+",
  emergencyContact: "+91 98•••••12",
  parentName: "Rajesh Sharma",
  house: "Sapphire",
  idCardIssuedOn: "01 Apr 2024",
  idCardValidTill: "31 Mar 2025",
  email: "aarav.sharma@student.lumenx.edu",
  bio: "Interested in mathematics and robotics. Member of the school science club.",
  classTeacher: "Ananya Iyer",
  institute: "LumenX Academy",
  address: "12 Green Park Road, Sector 4, Hyderabad — 500032",
};

const COLLEGE_STUDENT_PROFILE: DemoConnectStudentProfile = {
  id: "S-3042",
  name: "Neha Desai",
  year: "1st Year",
  section: "A",
  department: "MPC",
  course: "MPC",
  classDisplay: "MPC · 1st Year · Sec A",
  rollNo: "MPC-FY-A-042",
  attendance: 89,
  bloodGroup: "B+",
  emergencyContact: "+91 98•••••78",
  parentName: "Suresh Desai",
  house: "",
  idCardIssuedOn: "01 Jul 2025",
  idCardValidTill: "30 Jun 2026",
  email: "neha.desai@student.lumenx-colleges.edu",
  bio: "MPC 1st year student. Preparing for EAMCET and active in the science club.",
  classTeacher: "Prof. Meera Nair",
  institute: "St. Xavier's Junior College",
  address: "14 Hill Road, Bandra West, Mumbai — 400050",
};

const COLLEGE_DEPARTMENTS: DemoDepartment[] = [
  {
    id: "mpc",
    code: "MPC",
    name: "Maths · Physics · Chemistry",
    levelIds: ["fy", "sy"],
  },
  {
    id: "bipc",
    code: "BIPC",
    name: "Biology · Physics · Chemistry",
    levelIds: ["fy", "sy"],
  },
  {
    id: "cec",
    code: "CEC",
    name: "Civics · Economics · Commerce",
    levelIds: ["fy", "sy"],
  },
  {
    id: "mec",
    code: "MEC",
    name: "Maths · Economics · Commerce",
    levelIds: ["fy", "sy"],
  },
];

function collegeBatchId(deptId: string, levelId: string, section: string): string {
  return `${deptId}-${levelId}-${section.toLowerCase()}`;
}

function collegeDisplayName(deptCode: string, levelLabel: string, section: string): string {
  return `${deptCode} · ${levelLabel} · Sec ${section}`;
}

function buildCollegeClassGroups(): DemoClassGroup[] {
  const teachers = [
    "Prof. Meera Nair",
    "Prof. Raj Mehta",
    "Prof. David Koal",
    "Prof. Priya Iyer",
    "Prof. Sofia Alvarez",
    "Prof. Marcus Whitfield",
    "Prof. Nina Volkov",
    "Prof. James Chen",
  ];
  const rooms = ["Block A-101", "Block A-102", "Block B-201", "Block B-202", "Block C-301", "Lab-1"];
  const levelMeta = [
    { id: "fy", label: "1st Year" },
    { id: "sy", label: "2nd Year" },
  ] as const;
  const sectionMatrix: Record<string, string[]> = {
    mpc: ["A", "B", "C", "D"],
    bipc: ["A", "B", "C", "D"],
    cec: ["A", "B", "C"],
    mec: ["A", "B", "C"],
  };

  const groups: DemoClassGroup[] = [];
  let idx = 0;
  for (const dept of COLLEGE_DEPARTMENTS) {
    for (const level of levelMeta) {
      if (!dept.levelIds.includes(level.id)) continue;
      const sections = sectionMatrix[dept.id] ?? ["A", "B", "C"];
      for (const section of sections) {
        groups.push({
          id: collegeBatchId(dept.id, level.id, section),
          levelId: level.id,
          section,
          departmentId: dept.id,
          displayName: collegeDisplayName(dept.code, level.label, section),
          teacher: teachers[idx % teachers.length]!,
          students: 42 + (idx % 5) * 3,
          capacity: 50,
          room: rooms[idx % rooms.length]!,
          hasTimetable: idx % 4 !== 3,
        });
        idx++;
      }
    }
  }
  return groups;
}

export const SCHOOL_ACADEMIC: DemoAcademicConfig = {
  mode: "school",
  levelLabel: "Grade",
  departmentLabel: "Department",
  classPageTitle: "Classes & Sections",
  classPageSubtitle: "6 classes · 126 sections",
  subjectLabel: "Subject",
  subjectsPageTitle: "Subjects & Faculty",
  levels: [
    { id: "9", label: "Grade 9", shortLabel: "9" },
    { id: "10", label: "Grade 10", shortLabel: "10" },
    { id: "11", label: "Grade 11", shortLabel: "11" },
    { id: "12", label: "Grade 12", shortLabel: "12" },
  ],
  sections: ["A", "B", "C", "D"],
  departments: [],
  courses: [],
  classGroups: [
    {
      id: "12-A",
      levelId: "12",
      section: "A",
      displayName: "Grade 12-A",
      teacher: "Sarah Jenkins",
      students: 38,
      capacity: 40,
      room: "201",
      hasTimetable: true,
    },
    {
      id: "12-B",
      levelId: "12",
      section: "B",
      displayName: "Grade 12-B",
      teacher: "David Koal",
      students: 36,
      capacity: 40,
      room: "202",
      hasTimetable: true,
    },
    {
      id: "11-A",
      levelId: "11",
      section: "A",
      displayName: "Grade 11-A",
      teacher: "Priya Iyer",
      students: 41,
      capacity: 42,
      room: "301",
      hasTimetable: true,
    },
    {
      id: "11-C",
      levelId: "11",
      section: "C",
      displayName: "Grade 11-C",
      teacher: "Marcus Whitfield",
      students: 36,
      capacity: 42,
      room: "303",
      hasTimetable: false,
    },
    {
      id: "10-A",
      levelId: "10",
      section: "A",
      displayName: "Grade 10-A",
      teacher: "Hana Suzuki",
      students: 44,
      capacity: 44,
      room: "401",
      hasTimetable: true,
    },
    {
      id: "9-B",
      levelId: "9",
      section: "B",
      displayName: "Grade 9-B",
      teacher: "Omar Faris",
      students: 39,
      capacity: 42,
      room: "501",
      hasTimetable: false,
    },
  ],
};

export const COLLEGE_ACADEMIC: DemoAcademicConfig = {
  mode: "college",
  levelLabel: "Year",
  departmentLabel: "Department",
  classPageTitle: "Departments, Years & Sections",
  classPageSubtitle: "4 streams · 2 years · multiple sections per batch",
  subjectLabel: "Subject",
  subjectsPageTitle: "Subjects & Faculty",
  levels: [
    { id: "fy", label: "1st Year", shortLabel: "FY" },
    { id: "sy", label: "2nd Year", shortLabel: "SY" },
  ],
  sections: ["A", "B", "C", "D"],
  departments: COLLEGE_DEPARTMENTS,
  courses: COLLEGE_DEPARTMENTS,
  classGroups: buildCollegeClassGroups(),
};

export const DEMO_PROFILES: DemoProfile[] = [
  {
    id: "multi_institute",
    label: "Multi-institute · School group",
    shortLabel: "Multi-institute",
    description:
      "Group admin with multiple school branches — branch switcher, cross-campus analytics, shared staff pool.",
    campusKind: "school",
    academic: SCHOOL_ACADEMIC,
    admin: {
      organizationName: "LumenX Education Group",
      headerSubtitle: "Multi-branch school group · Admin OS",
      principalName: "Dr. Alistair Vance",
      principalTitle: "Group Principal · Root Admin",
      showBranchSwitcher: true,
      branchSwitcherLabel: "Branch",
      branches: [
        {
          id: "alpha",
          name: "Branch Alpha",
          students: 2842,
          attendance: 94.2,
          growth: 8.4,
          performance: "high",
        },
        {
          id: "beta",
          name: "Branch Beta",
          students: 1920,
          attendance: 88.1,
          growth: 2.1,
          performance: "medium",
        },
        {
          id: "gamma",
          name: "Branch Gamma",
          students: 1104,
          attendance: 79.6,
          growth: -1.8,
          performance: "low",
        },
      ],
      instituteProfile: {
        name: "LumenX International School Group",
        founded: "1987",
        founder: "Dr. Helena Vance",
        principal: "Dr. Alistair Vance",
        vision: "Empowering learners across every campus with curiosity, integrity, and excellence.",
        mission:
          "Deliver holistic education through innovation, inclusion, and community partnership across our school network.",
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
          {
            title: "Excellence in STEM Education",
            year: "2024",
            body: "National Education Council",
          },
          { title: "Green Campus Award", year: "2023", body: "Eco Schools Alliance" },
        ],
        achievements: [
          "100% board pass rate · Class 12 · 2025",
          "Inter-school robotics champions · 2024",
          "Model UNESCO delegation award · 2023",
        ],
      },
    },
    connect: {
      portalName: "LumenX Connect",
      loginHeroTitle: "One quiet place for your school life.",
      loginHeroSubtitle:
        "Real-time awareness for parents. Less friction for teachers. A clearer path for students — pick your campus.",
      institutePickerTitle: "Select your school",
      institutePickerHint:
        "Search by campus name or school code. Multiple schools in the LumenX group appear here.",
      campusKindLabel: "School",
      classLabel: "Class",
      registeredInstitutes: MULTI_INSTITUTES,
      defaultInstituteId: MULTI_INSTITUTES[0]!.id,
      studentProfile: SCHOOL_STUDENT_PROFILE,
    },
  },
  {
    id: "single_institute",
    label: "Single institute · School",
    shortLabel: "Single school",
    description:
      "One standalone school — no branch switcher, single-campus admin and Connect login.",
    campusKind: "school",
    academic: SCHOOL_ACADEMIC,
    admin: {
      organizationName: "LumenX Academy",
      headerSubtitle: "Single campus · School admin",
      principalName: "Dr. Priya Menon",
      principalTitle: "Principal · Admin",
      showBranchSwitcher: false,
      branchSwitcherLabel: "Campus",
      branches: [
        {
          id: "main",
          name: "Main Campus",
          students: 1842,
          attendance: 93.8,
          growth: 5.2,
          performance: "high",
        },
      ],
      instituteProfile: {
        name: "LumenX Academy",
        founded: "1998",
        founder: "Mrs. Lakshmi Reddy",
        principal: "Dr. Priya Menon",
        vision: "Every child known, challenged, and supported in one caring campus.",
        mission:
          "Provide quality CBSE education with strong values, sports, and digital learning on a single campus.",
        ranking: "A+ accredited · State Board · 2025",
        logo: "LumenX Academy crest",
        profilePhoto: "",
        phone: "+91 40 2789 4400",
        email: "principal@lumenx-academy.edu",
        address: "45 Jubilee Hills Road, Hyderabad 500033",
        history: [
          { year: "1998", event: "Opened as a single-block neighborhood school." },
          { year: "2012", event: "Added senior secondary labs and sports complex." },
          { year: "2022", event: "Full Connect rollout for parents and teachers." },
        ],
        awards: [
          { title: "Best Single-Campus School", year: "2024", body: "Telangana Education Board" },
        ],
        achievements: [
          "District topper in Class 10 · 2024",
          "State basketball runners-up · 2023",
        ],
      },
    },
    connect: {
      portalName: "LumenX Connect",
      loginHeroTitle: "Your school, one connected campus.",
      loginHeroSubtitle:
        "Parents, teachers, and students on a single school — no multi-campus picker needed.",
      institutePickerTitle: "Your school",
      institutePickerHint: "This demo uses one registered school. Sign in to LumenX Academy.",
      campusKindLabel: "School",
      classLabel: "Class",
      registeredInstitutes: SINGLE_INSTITUTES,
      defaultInstituteId: SINGLE_INSTITUTES[0]!.id,
      studentProfile: SCHOOL_STUDENT_PROFILE,
    },
  },
  {
    id: "inter_college",
    label: "Inter-college · College network",
    shortLabel: "Inter-college",
    description:
      "Federation of colleges — junior college, degree, and engineering campuses with college terminology.",
    campusKind: "college",
    academic: COLLEGE_ACADEMIC,
    admin: {
      organizationName: "LumenX Colleges Federation",
      headerSubtitle: "Inter-college network · Federation admin",
      principalName: "Prof. Rajesh Kapoor",
      principalTitle: "Director · Federation Admin",
      showBranchSwitcher: true,
      branchSwitcherLabel: "College",
      branches: [
        {
          id: "jc",
          name: "Junior College · Mumbai",
          students: 1620,
          attendance: 91.4,
          growth: 4.8,
          performance: "high",
        },
        {
          id: "deg",
          name: "Degree College · Pune",
          students: 2280,
          attendance: 87.2,
          growth: 3.1,
          performance: "medium",
        },
        {
          id: "eng",
          name: "Engineering Campus · Nagpur",
          students: 1940,
          attendance: 85.6,
          growth: 6.2,
          performance: "high",
        },
      ],
      instituteProfile: {
        name: "LumenX Colleges Federation",
        founded: "1965",
        founder: "Late Prof. Anand Desai",
        principal: "Prof. Rajesh Kapoor",
        vision: "Excellence in higher education across arts, science, commerce, and engineering.",
        mission:
          "Coordinate admissions, faculty, and academic standards across affiliated colleges in the federation.",
        ranking: "NAAC A++ cluster · Western India · 2025",
        logo: "LumenX Colleges seal",
        profilePhoto: "",
        phone: "+91 20 2567 3300",
        email: "director@lumenx-colleges.edu",
        address: "Fergusson Hill, Pune 411004",
        history: [
          { year: "1965", event: "Fergusson College joined the federation as founding member." },
          { year: "1992", event: "Engineering campus established at Nagpur." },
          { year: "2016", event: "Unified admissions and careers portal across colleges." },
        ],
        awards: [
          { title: "Best College Cluster", year: "2024", body: "AICTE Innovation Council" },
        ],
        achievements: [
          "92% placement rate · Engineering · 2025",
          "Inter-college research symposium · 2024",
        ],
      },
    },
    connect: {
      portalName: "LumenX Connect",
      loginHeroTitle: "Your college life, connected.",
      loginHeroSubtitle:
        "Parents and students across junior college, degree, and engineering campuses — pick your college at sign-in.",
      institutePickerTitle: "Select your college",
      institutePickerHint:
        "Search by college name or code. Junior college, degree, and engineering institutes in the federation.",
      campusKindLabel: "College",
      classLabel: "Dept / Year",
      registeredInstitutes: INTER_COLLEGE_INSTITUTES,
      defaultInstituteId: INTER_COLLEGE_INSTITUTES[0]!.id,
      studentProfile: COLLEGE_STUDENT_PROFILE,
    },
  },
];

export function isDemoProfileId(value: string | null | undefined): value is DemoProfileId {
  return value === "multi_institute" || value === "single_institute" || value === "inter_college";
}

export function readDemoProfileId(): DemoProfileId {
  if (typeof localStorage === "undefined") return DEFAULT_DEMO_PROFILE_ID;
  try {
    const raw = localStorage.getItem(DEMO_PROFILE_STORAGE_KEY);
    return isDemoProfileId(raw) ? raw : DEFAULT_DEMO_PROFILE_ID;
  } catch {
    return DEFAULT_DEMO_PROFILE_ID;
  }
}

export function writeDemoProfileId(id: DemoProfileId): void {
  try {
    localStorage.setItem(DEMO_PROFILE_STORAGE_KEY, id);
  } catch {
    void 0;
  }
}

export function getDemoProfile(id: DemoProfileId = readDemoProfileId()): DemoProfile {
  return DEMO_PROFILES.find((p) => p.id === id) ?? DEMO_PROFILES[0]!;
}

export const INSTITUTE_KIND_LABEL: Record<InstituteKind, string> = {
  school: "School",
  junior_college: "Junior college",
  degree_college: "Degree college",
  engineering: "Engineering",
  university: "University",
};
