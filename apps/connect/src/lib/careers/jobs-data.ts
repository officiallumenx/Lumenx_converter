import type { JobCategory, JobPosting, FacultyType, WorkMode } from "./types";

export const JOB_CATEGORY_LABEL: Record<JobCategory, string> = {
  academic_faculty: "Academic Faculty",
  sports_faculty: "Sports Faculty",
  lab_faculty: "Lab Faculty",
  administrator: "Administrator",
  accountant: "Accountant",
  admissions_officer: "Admissions Officer",
  transport_staff: "Transport Staff",
  support_staff: "Support Staff",
  it_software: "IT & Software",
  sales_marketing: "Sales & Marketing",
  finance: "Finance & Accounting",
  human_resources: "Human Resources",
  operations: "Operations",
  healthcare: "Healthcare",
};

const RAW_JOBS: Omit<JobPosting, "facultyType" | "workMode">[] = [
  {
    id: "job-math-teacher",
    instituteId: "ins-lumenx-academy",
    instituteName: "LumenX Academy",
    city: "Hyderabad",
    state: "Telangana",
    title: "Senior Mathematics Teacher",
    department: "Secondary School",
    category: "academic_faculty",
    employmentType: "full_time",
    experienceRequired: "5+ years",
    postedAt: "2026-04-01",
    deadline: "2026-06-30",
    overview: "Lead mathematics instruction for Grades 9–12 with focus on board exam excellence.",
    responsibilities: ["Plan and deliver CBSE-aligned lessons", "Mentor junior faculty", "Conduct remedial sessions"],
    qualifications: ["M.Sc Mathematics", "B.Ed required", "Teaching certification preferred"],
    skills: ["Calculus", "Statistics", "Classroom management", "Digital teaching tools"],
    benefits: ["Health insurance", "Professional development fund", "Performance bonus"],
    location: "Green Park Campus, Hyderabad",
    imageGradient: "from-primary/30 to-chart-5/20",
    applicationExtras: { coverLetter: true, demoVideo: true },
  },
  {
    id: "job-physics-lab",
    instituteId: "ins-lumenx-academy",
    instituteName: "LumenX Academy",
    city: "Hyderabad",
    state: "Telangana",
    title: "Physics Lab Instructor",
    department: "Science Labs",
    category: "lab_faculty",
    employmentType: "full_time",
    experienceRequired: "3+ years",
    postedAt: "2026-04-05",
    deadline: "2026-07-15",
    overview: "Manage physics lab sessions and equipment for middle and high school students.",
    responsibilities: ["Prepare lab experiments", "Maintain lab safety", "Assist theory teachers"],
    qualifications: ["M.Sc Physics", "Lab safety certification"],
    skills: ["Experimental design", "Lab equipment", "Safety protocols"],
    benefits: ["Lab allowance", "Medical cover"],
    location: "Green Park Campus, Hyderabad",
    imageGradient: "from-chart-2/30 to-primary/10",
  },
  {
    id: "job-sports-coach",
    instituteId: "ins-delhi-riverside",
    instituteName: "Delhi Riverside School",
    city: "New Delhi",
    state: "Delhi",
    title: "Sports Coach — Cricket & Athletics",
    department: "Sports",
    category: "sports_faculty",
    employmentType: "full_time",
    experienceRequired: "4+ years",
    postedAt: "2026-03-20",
    deadline: "2026-06-01",
    overview: "Coach school cricket and athletics teams for inter-school competitions.",
    responsibilities: ["Daily training sessions", "Team selection", "Fitness programs"],
    qualifications: ["Sports degree or NIS certification", "First aid trained"],
    skills: ["Cricket coaching", "Athletics", "Youth mentoring"],
    benefits: ["Sports kit allowance", "Tournament travel"],
    location: "Riverside Campus, New Delhi",
    imageGradient: "from-success/20 to-primary/10",
  },
  {
    id: "job-english-faculty",
    instituteId: "ins-st-xavier-jc",
    instituteName: "St. Xavier Junior College",
    city: "Mumbai",
    state: "Maharashtra",
    title: "English Literature Faculty",
    department: "Humanities",
    category: "academic_faculty",
    employmentType: "full_time",
    experienceRequired: "6+ years",
    postedAt: "2026-04-10",
    deadline: "2026-07-30",
    overview: "Teach English literature and language for Grade 11–12 streams.",
    responsibilities: ["Curriculum delivery", "Essay workshops", "Debate club mentoring"],
    qualifications: ["M.A English", "B.Ed"],
    skills: ["Literature analysis", "Creative writing", "Public speaking"],
    benefits: ["Research sabbatical", "Library access"],
    location: "Fort Campus, Mumbai",
    imageGradient: "from-chart-4/25 to-muted",
  },
  {
    id: "job-chemistry-lab",
    instituteId: "ins-fergusson",
    instituteName: "Fergusson College",
    city: "Pune",
    state: "Maharashtra",
    title: "Chemistry Lab Assistant",
    department: "Science",
    category: "lab_faculty",
    employmentType: "part_time",
    experienceRequired: "2+ years",
    postedAt: "2026-04-12",
    deadline: "2026-05-31",
    overview: "Support undergraduate chemistry practical sessions.",
    responsibilities: ["Prepare reagents", "Maintain inventory", "Assist students"],
    qualifications: ["B.Sc Chemistry"],
    skills: ["Organic chemistry", "Lab safety", "Inventory management"],
    benefits: ["Flexible hours"],
    location: "FC Road, Pune",
    imageGradient: "from-warning/15 to-primary/10",
  },
  {
    id: "job-admin-coordinator",
    instituteId: "ins-fergusson",
    instituteName: "Fergusson College",
    city: "Pune",
    state: "Maharashtra",
    title: "Administrative Coordinator",
    department: "Administration",
    category: "administrator",
    employmentType: "full_time",
    experienceRequired: "3+ years",
    postedAt: "2026-03-28",
    deadline: "2026-06-15",
    overview: "Coordinate daily administrative operations and front office.",
    responsibilities: ["Office management", "Vendor coordination", "Event scheduling"],
    qualifications: ["Bachelor's degree", "MS Office proficiency"],
    skills: ["Communication", "Scheduling", "ERP systems"],
    benefits: ["PF", "Annual bonus"],
    location: "FC Road, Pune",
    imageGradient: "from-muted to-primary/10",
  },
  {
    id: "job-accountant",
    instituteId: "ins-vnit",
    instituteName: "VNIT Nagpur",
    city: "Nagpur",
    state: "Maharashtra",
    title: "Accounts Officer",
    department: "Finance",
    category: "accountant",
    employmentType: "full_time",
    experienceRequired: "5+ years",
    postedAt: "2026-04-01",
    deadline: "2026-06-30",
    overview: "Manage institute accounts, payroll, and audit compliance.",
    responsibilities: ["Monthly reconciliation", "Payroll processing", "Audit support"],
    qualifications: ["CA Inter or M.Com", "Tally / ERP experience"],
    skills: ["Accounting", "GST", "Excel"],
    benefits: ["Gratuity", "Medical insurance"],
    location: "VNIT Campus, Nagpur",
    imageGradient: "from-chart-3/20 to-muted",
  },
  {
    id: "job-admissions-officer",
    instituteId: "ins-bhu",
    instituteName: "BHU Institute",
    city: "Varanasi",
    state: "Uttar Pradesh",
    title: "Admissions Officer",
    department: "Admissions",
    category: "admissions_officer",
    employmentType: "full_time",
    experienceRequired: "2+ years",
    postedAt: "2026-04-08",
    deadline: "2026-07-01",
    overview: "Handle applicant queries and coordinate admission drives.",
    responsibilities: ["Counsel prospective students", "Document verification", "CRM updates"],
    qualifications: ["Graduate degree", "Counseling experience"],
    skills: ["Communication", "CRM", "Multilingual preferred"],
    benefits: ["Travel allowance", "Performance incentives"],
    location: "BHU Campus, Varanasi",
    imageGradient: "from-primary/20 to-chart-5/15",
    applicationExtras: {
      expectedSalary: true,
      customQuestions: [{ id: "languages", label: "Languages you can counsel in", required: true }],
    },
  },
  {
    id: "job-bus-driver",
    instituteId: "ins-lumenx-academy",
    instituteName: "LumenX Academy",
    city: "Hyderabad",
    state: "Telangana",
    title: "School Bus Driver",
    department: "Transport",
    category: "transport_staff",
    employmentType: "full_time",
    experienceRequired: "5+ years",
    postedAt: "2026-04-15",
    deadline: "2026-05-30",
    overview: "Safe transport for students on assigned routes.",
    responsibilities: ["Daily route driving", "Vehicle checks", "Student safety"],
    qualifications: ["Valid heavy vehicle license", "Clean driving record"],
    skills: ["Defensive driving", "Route knowledge"],
    benefits: ["Uniform", "Insurance"],
    location: "Hyderabad routes",
    imageGradient: "from-muted to-success/10",
  },
  {
    id: "job-it-support",
    instituteId: "ins-delhi-riverside",
    instituteName: "Delhi Riverside School",
    city: "New Delhi",
    state: "Delhi",
    title: "IT Support Specialist",
    department: "IT",
    category: "support_staff",
    employmentType: "full_time",
    experienceRequired: "2+ years",
    postedAt: "2026-04-02",
    deadline: "2026-06-20",
    overview: "Maintain school IT infrastructure and helpdesk.",
    responsibilities: ["Helpdesk tickets", "Network support", "Lab maintenance"],
    qualifications: ["B.Tech or diploma in IT"],
    skills: ["Windows", "Networking", "Hardware troubleshooting"],
    benefits: ["Skill certifications sponsored"],
    location: "New Delhi",
    imageGradient: "from-chart-2/20 to-muted",
  },
  {
    id: "job-biology-teacher",
    instituteId: "ins-st-xavier-jc",
    instituteName: "St. Xavier Junior College",
    city: "Mumbai",
    state: "Maharashtra",
    title: "Biology Teacher",
    department: "Science",
    category: "academic_faculty",
    employmentType: "contract",
    experienceRequired: "3+ years",
    postedAt: "2026-04-18",
    deadline: "2026-08-01",
    overview: "One-year contract for biology instruction Grade 11–12.",
    responsibilities: ["Board exam prep", "Lab coordination", "Parent meetings"],
    qualifications: ["M.Sc Biology", "B.Ed"],
    skills: ["NEET-oriented teaching", "Lab supervision"],
    benefits: ["Contract renewal option"],
    location: "Mumbai",
    imageGradient: "from-success/15 to-chart-4/10",
  },
  {
    id: "job-librarian",
    instituteId: "ins-vnit",
    instituteName: "VNIT Nagpur",
    city: "Nagpur",
    state: "Maharashtra",
    title: "Assistant Librarian",
    department: "Library",
    category: "support_staff",
    employmentType: "full_time",
    experienceRequired: "1+ years",
    postedAt: "2026-04-20",
    deadline: "2026-07-10",
    overview: "Manage library operations and digital catalog.",
    responsibilities: ["Catalog management", "Student assistance", "Events"],
    qualifications: ["Library science degree"],
    skills: ["Dewey system", "Digital archives"],
    benefits: ["Book allowance"],
    location: "VNIT Campus",
    imageGradient: "from-primary/15 to-muted",
  },
  {
    id: "job-fullstack-dev",
    instituteId: "ins-techbridge",
    instituteName: "TechBridge Solutions",
    city: "Bengaluru",
    state: "Karnataka",
    title: "Full Stack Developer",
    department: "Engineering",
    category: "it_software",
    employmentType: "full_time",
    experienceRequired: "3+ years",
    postedAt: "2026-05-01",
    deadline: "2026-08-15",
    overview: "Build scalable web products for education and enterprise clients.",
    responsibilities: ["React/Node development", "API design", "Code reviews"],
    qualifications: ["B.Tech / MCA", "Strong TypeScript"],
    skills: ["React", "Node.js", "PostgreSQL", "REST APIs"],
    benefits: ["Remote-friendly", "ESOP", "Learning budget"],
    location: "Hybrid — Bengaluru",
    imageGradient: "from-chart-2/25 to-primary/10",
    workMode: "hybrid",
  },
  {
    id: "job-digital-marketer",
    instituteId: "ins-growthhive",
    instituteName: "GrowthHive Media",
    city: "Pune",
    state: "Maharashtra",
    title: "Digital Marketing Specialist",
    department: "Marketing",
    category: "sales_marketing",
    employmentType: "full_time",
    experienceRequired: "2+ years",
    postedAt: "2026-05-05",
    deadline: "2026-08-01",
    overview: "Drive lead generation and brand campaigns across digital channels.",
    responsibilities: ["SEO/SEM", "Social campaigns", "Analytics reporting"],
    qualifications: ["Marketing degree or equivalent experience"],
    skills: ["Google Ads", "Meta Ads", "Analytics", "Content"],
    benefits: ["Performance bonus", "Flexible hours"],
    location: "Pune (On-site)",
    imageGradient: "from-chart-4/20 to-muted",
  },
  {
    id: "job-financial-analyst",
    instituteId: "ins-capitalwise",
    instituteName: "CapitalWise Advisors",
    city: "Mumbai",
    state: "Maharashtra",
    title: "Financial Analyst",
    department: "Finance",
    category: "finance",
    employmentType: "full_time",
    experienceRequired: "4+ years",
    postedAt: "2026-05-08",
    deadline: "2026-09-01",
    overview: "Support FP&A, budgeting, and investor reporting for growing portfolios.",
    responsibilities: ["Financial modelling", "Variance analysis", "Board decks"],
    qualifications: ["CA / CFA / MBA Finance"],
    skills: ["Excel", "Financial modelling", "Reporting"],
    benefits: ["Health cover", "Annual bonus"],
    location: "BKC, Mumbai",
    imageGradient: "from-chart-5/20 to-primary/5",
  },
];

const CATEGORY_TO_FACULTY: Record<JobCategory, FacultyType> = {
  academic_faculty: "academic",
  sports_faculty: "sports",
  lab_faculty: "lab",
  administrator: "administrative",
  accountant: "administrative",
  admissions_officer: "administrative",
  transport_staff: "administrative",
  support_staff: "administrative",
  it_software: "administrative",
  sales_marketing: "administrative",
  finance: "administrative",
  human_resources: "administrative",
  operations: "administrative",
  healthcare: "administrative",
};

const SALARY_MAP: Partial<Record<string, string>> = {
  "job-math-teacher": "₹9–12 LPA",
  "job-physics-lab": "₹6–8 LPA",
  "job-sports-coach": "₹5–7 LPA",
  "job-english-faculty": "₹8–10 LPA",
  "job-chemistry-lab": "₹4–5 LPA",
  "job-admin-coordinator": "₹4–6 LPA",
  "job-accountant": "₹7–9 LPA",
  "job-admissions-officer": "₹3.5–5 LPA",
  "job-bus-driver": "₹3–4 LPA",
  "job-it-support": "₹4–6 LPA",
  "job-biology-teacher": "₹7–9 LPA",
  "job-librarian": "₹3–4.5 LPA",
};

function enrichJob(raw: Omit<JobPosting, "facultyType" | "workMode"> & Partial<Pick<JobPosting, "facultyType" | "workMode" | "featured" | "trending" | "salaryDisplay">>): JobPosting {
  return {
    ...raw,
    facultyType: raw.facultyType ?? CATEGORY_TO_FACULTY[raw.category],
    workMode: raw.workMode ?? ("onsite" as WorkMode),
    salaryDisplay: raw.salaryDisplay ?? SALARY_MAP[raw.id] ?? "As per company norms",
    featured: raw.featured ?? ["job-math-teacher", "job-english-faculty", "job-sports-coach"].includes(raw.id),
    trending: raw.trending ?? ["job-biology-teacher", "job-admissions-officer", "job-physics-lab"].includes(raw.id),
  };
}

export const JOB_POSTINGS: JobPosting[] = RAW_JOBS.map(enrichJob);

export const LOCATIONS = {
  states: [...new Set(JOB_POSTINGS.map((j) => j.state))].sort(),
  cities: [...new Set(JOB_POSTINGS.map((j) => j.city))].sort(),
  companies: [...new Set(JOB_POSTINGS.map((j) => j.instituteName))].sort(),
};

export type ExperienceBand = "all" | "fresher" | "0-2" | "2-5" | "5+";

export const EXPERIENCE_BAND_LABEL: Record<Exclude<ExperienceBand, "all">, string> = {
  fresher: "Fresher",
  "0-2": "0–2 years",
  "2-5": "2–5 years",
  "5+": "5+ years",
};

/** Options shown when recruiters post a job — value is stored as experienceRequired */
export const JOB_EXPERIENCE_OPTIONS = [
  { value: "Fresher (0 years)", label: "Fresher / Entry level", hint: "No prior experience required" },
  { value: "0–1 year", label: "0–1 year", hint: "Internship or first role" },
  { value: "1–2 years", label: "1–2 years", hint: "Junior level" },
  { value: "2–5 years", label: "2–5 years", hint: "Mid level" },
  { value: "5–8 years", label: "5–8 years", hint: "Senior level" },
  { value: "8+ years", label: "8+ years", hint: "Lead / expert level" },
] as const;

function parseMinExperienceYears(text: string): number | null {
  const lower = text.toLowerCase();
  if (lower.includes("fresher") || lower.includes("entry level")) return 0;
  const match = lower.match(/(\d+)/);
  return match ? Number(match[1]) : null;
}

function matchesExperienceBand(jobExp: string, band: ExperienceBand): boolean {
  if (band === "all") return true;
  const min = parseMinExperienceYears(jobExp);
  if (min === null) return true;
  switch (band) {
    case "fresher":
      return min === 0;
    case "0-2":
      return min <= 2;
    case "2-5":
      return min >= 1 && min <= 5;
    case "5+":
      return min >= 5;
    default:
      return true;
  }
}

const SCROLL_KEY = "careers-jobs-scroll";

export function saveJobsScroll(top: number) {
  try {
    sessionStorage.setItem(SCROLL_KEY, String(top));
  } catch {
    void 0;
  }
}

export function readJobsScroll(): number {
  try {
    const v = sessionStorage.getItem(SCROLL_KEY);
    return v ? Number(v) : 0;
  } catch {
    return 0;
  }
}

export function getJobById(id: string) {
  return JOB_POSTINGS.find((j) => j.id === id);
}

export function filterJobs(
  opts: {
    q?: string;
    state?: string;
    city?: string;
    category?: JobCategory | "all";
    employmentType?: string;
    facultyType?: string;
    workMode?: string;
    experience?: ExperienceBand;
    sort?: "recent" | "deadline" | "title";
  },
  source: JobPosting[] = JOB_POSTINGS,
) {
  let results = source.filter((j) => {
    if (opts.state && opts.state !== "all" && j.state !== opts.state) return false;
    if (opts.city && opts.city !== "all" && j.city !== opts.city) return false;
    if (opts.category && opts.category !== "all" && j.category !== opts.category) return false;
    if (opts.employmentType && opts.employmentType !== "all" && j.employmentType !== opts.employmentType) return false;
    if (opts.facultyType && opts.facultyType !== "all" && j.facultyType !== opts.facultyType) return false;
    if (opts.workMode && opts.workMode !== "all" && j.workMode !== opts.workMode) return false;
    if (opts.experience && opts.experience !== "all" && !matchesExperienceBand(j.experienceRequired, opts.experience)) {
      return false;
    }
    if (opts.q) {
      const hay = [
        j.title,
        j.department,
        j.instituteName,
        j.city,
        j.state,
        j.overview,
        ...j.skills,
      ]
        .join(" ")
        .toLowerCase();
      if (!hay.includes(opts.q.toLowerCase())) return false;
    }
    return true;
  });
  if (opts.sort === "deadline") {
    results = [...results].sort((a, b) => a.deadline.localeCompare(b.deadline));
  } else if (opts.sort === "title") {
    results = [...results].sort((a, b) => a.title.localeCompare(b.title));
  } else {
    results = [...results].sort((a, b) => b.postedAt.localeCompare(a.postedAt));
  }
  return results;
}
