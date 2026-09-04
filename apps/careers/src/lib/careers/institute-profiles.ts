import type { InstituteCareerProfile } from "./types";
import { JOB_POSTINGS } from "./jobs-data";
import { isApiAuthMode } from "@/auth/auth-mode";
import { isInstituteUuid } from "@/lib/institute-id";
import { loadInstitutePublicProfile } from "@/lib/institute-profile";
import type { DemoInstituteProfile } from "@lumenx/types";

function getJobsByInstitute(instituteId: string) {
  return JOB_POSTINGS.filter((j) => j.instituteId === instituteId);
}

export const INSTITUTE_CAREER_PROFILES: InstituteCareerProfile[] = [
  {
    instituteId: "ins-test1school",
    name: "Test1School",
    type: "school",
    city: "Hyderabad",
    state: "Telangana",
    logoInitials: "LX",
    logoGradient: "from-primary/80 to-chart-5/60",
    tagline: "Excellence in K-12 education since 1998",
    about:
      "Test1School is a premier K-12 institution with integrated digital learning, strong STEM programs, and championship sports teams.",
    principalName: "Dr. Alistair Vance",
    principalMessage:
      "We seek passionate educators who put students first. Join a community where innovation meets tradition.",
    culture: ["Student-first", "Collaborative teams", "Continuous learning", "Inclusive workplace"],
    mission: "Deliver holistic education with strong academics, sports, and digital fluency.",
    vision: "Every learner discovers their potential through excellence, empathy, and innovation.",
    benefits: [
      "Health insurance",
      "Professional development fund",
      "Performance bonus",
      "On-campus childcare",
    ],
    facilities: ["Olympic-size pool", "STEM labs", "Smart classrooms", "Sports complex"],
    achievements: ["NAAC A+", "State cricket champions", "98% board pass rate"],
    gallery: [
      { id: "lx-1", title: "Main Campus", gradient: "from-primary/30 to-emerald-500/20" },
      { id: "lx-2", title: "STEM Labs", gradient: "from-blue-500/25 to-cyan-500/15" },
      { id: "lx-3", title: "Sports Complex", gradient: "from-amber-500/20 to-orange-500/15" },
    ],
    contact: {
      phone: "+91 40 4455 8899",
      email: "careers@lumenx.edu",
      address: "Green Park Campus, Hyderabad 500032",
      hours: "Mon–Fri, 9:00 AM – 6:00 PM",
    },
    featured: true,
  },
  {
    instituteId: "ins-test1school",
    name: "Test1School",
    type: "school",
    city: "New Delhi",
    state: "Delhi",
    logoInitials: "DR",
    logoGradient: "from-blue-500/70 to-cyan-500/50",
    tagline: "CBSE excellence on the Yamuna riverside",
    about:
      "A CBSE school with arts academy, strong athletics, and a nurturing environment for faculty growth.",
    principalName: "Mrs. Kavita Menon",
    principalMessage:
      "Our teachers inspire creativity alongside academic rigour. We welcome coaches and faculty who lead by example.",
    culture: ["Creativity", "Athletic excellence", "Community service", "Mentorship"],
    mission: "Inspire lifelong learners through inclusive, innovative education.",
    vision: "Learning without boundaries — local roots, global outlook.",
    benefits: ["Sports kit allowance", "Skill certifications", "Festival bonuses"],
    facilities: ["Indoor sports arena", "Arts academy", "Digital library"],
    achievements: ["District football champions", "CBSE national toppers"],
    gallery: [
      { id: "dr-1", title: "Riverside Campus", gradient: "from-blue-500/25 to-sky-500/15" },
      { id: "dr-2", title: "Arts Academy", gradient: "from-purple-500/20 to-violet-500/15" },
    ],
    contact: {
      phone: "+91 11 4400 2200",
      email: "hr@dpsriverside.edu",
      address: "Riverside Enclave, New Delhi 110021",
      hours: "Mon–Fri, 9:30 AM – 4:30 PM",
    },
    featured: true,
  },
  {
    instituteId: "ins-test1school",
    name: "Test1School",
    type: "junior_college",
    city: "Mumbai",
    state: "Maharashtra",
    logoInitials: "SX",
    logoGradient: "from-amber-500/70 to-orange-500/50",
    tagline: "MPC, BiPC & commerce with JEE foundation",
    about:
      "Mumbai's trusted junior college for science and commerce streams with structured mentoring and strong labs.",
    principalName: "Fr. Michael D'Souza",
    principalMessage:
      "We prepare students for board excellence and competitive success. Faculty who mentor with care thrive here.",
    culture: ["Academic rigour", "Ethical leadership", "Mentoring", "Faith & service"],
    mission: "Structured mentoring, strong labs, and counselling for every stream.",
    vision: "Science & commerce excellence with ethical leadership.",
    benefits: ["Research sabbatical", "Library access", "Exam duty allowances"],
    facilities: ["Science labs", "Counselling cell", "Auditorium"],
    achievements: ["State rank holders", "IIT selections annually"],
    gallery: [{ id: "sx-1", title: "Fort Campus", gradient: "from-amber-500/20 to-orange-500/15" }],
    contact: {
      phone: "+91 22 2200 3300",
      email: "careers@stxavierjc.edu",
      address: "Fort Campus, Mumbai 400001",
      hours: "Mon–Sat, 9:00 AM – 5:00 PM",
    },
    popular: true,
  },
  {
    instituteId: "ins-test1school",
    name: "Test1School",
    type: "degree_college",
    city: "Pune",
    state: "Maharashtra",
    logoInitials: "FC",
    logoGradient: "from-rose-500/60 to-pink-500/40",
    tagline: "Heritage degree college since 1885",
    about:
      "One of India's oldest colleges offering undergraduate programs with vibrant campus life and research culture.",
    principalName: "Dr. Ramesh Kulkarni",
    principalMessage:
      "Test1School values scholarly faculty who blend teaching with research and student mentorship.",
    culture: ["Heritage", "Research", "Debate & culture", "Inclusivity"],
    mission: "Foster critical thinking and civic responsibility through quality higher education.",
    vision: "A globally respected institution rooted in Pune's intellectual tradition.",
    benefits: ["PF & gratuity", "Research grants", "Campus housing priority"],
    facilities: ["Central library", "Science blocks", "Sports grounds"],
    achievements: ["NAAC A", "National debate champions"],
    gallery: [
      { id: "fc-1", title: "Heritage Building", gradient: "from-rose-500/20 to-pink-500/15" },
    ],
    contact: {
      phone: "+91 20 6600 1100",
      email: "hr@fergusson.edu",
      address: "FC Road, Pune 411004",
      hours: "Mon–Fri, 10:00 AM – 5:00 PM",
    },
  },
  {
    instituteId: "ins-test1school",
    name: "Test1School",
    type: "degree_college",
    city: "Nagpur",
    state: "Maharashtra",
    logoInitials: "VN",
    logoGradient: "from-emerald-500/60 to-teal-500/40",
    tagline: "National Institute of Technology — Nagpur",
    about:
      "Premier engineering institute with strong academic and administrative teams supporting 10,000+ students.",
    principalName: "Prof. S. N. Sharma",
    principalMessage:
      "We recruit faculty and staff who uphold academic integrity and institutional excellence.",
    culture: ["Innovation", "Meritocracy", "Campus community", "National mission"],
    mission: "Advance technical education and research for national development.",
    vision: "Global leadership in engineering education and innovation.",
    benefits: ["Medical insurance", "Gratuity", "Book allowance", "Campus facilities"],
    facilities: ["Central library", "Research labs", "Hostels", "Sports complex"],
    achievements: ["NIRF top 50", "Strong placement record"],
    gallery: [{ id: "vn-1", title: "Main Gate", gradient: "from-emerald-500/20 to-teal-500/15" }],
    contact: {
      phone: "+91 712 222 8800",
      email: "recruitment@vnit.ac.in",
      address: "VNIT Campus, Nagpur 440010",
      hours: "Mon–Fri, 9:00 AM – 5:30 PM",
    },
  },
  {
    instituteId: "ins-test1school",
    name: "Test1School",
    type: "academy",
    city: "Varanasi",
    state: "Uttar Pradesh",
    logoInitials: "BH",
    logoGradient: "from-violet-500/60 to-indigo-500/40",
    tagline: "Coaching & foundation programs in Varanasi",
    about:
      "Growing academy offering foundation courses, test prep, and school partnership programs across UP.",
    principalName: "Mr. Anil Verma",
    principalMessage:
      "Join a fast-growing team shaping the next generation of competitive exam achievers.",
    culture: ["Growth mindset", "Results-driven", "Student counselling", "Team energy"],
    mission: "Accessible quality coaching with ethical admission practices.",
    vision: "North India's most trusted education academy.",
    benefits: ["Performance incentives", "Travel allowance", "Training programs"],
    facilities: ["Smart classrooms", "Test centres", "Counselling rooms"],
    achievements: ["500+ selections annually", "UP top coaching brand"],
    gallery: [
      { id: "bh-1", title: "Campus Block A", gradient: "from-violet-500/20 to-indigo-500/15" },
    ],
    contact: {
      phone: "+91 542 670 9900",
      email: "careers@bhuinstitute.edu",
      address: "BHU Campus Road, Varanasi 221005",
      hours: "Mon–Sat, 9:00 AM – 6:00 PM",
    },
  },
];

export function getInstituteProfile(instituteId: string): InstituteCareerProfile | undefined {
  const profile = INSTITUTE_CAREER_PROFILES.find((p) => p.instituteId === instituteId);
  if (!profile) return undefined;
  return { ...profile, openRolesCount: getJobsByInstitute(instituteId).length };
}

function careerProfileFromApi(
  instituteId: string,
  apiProfile: DemoInstituteProfile,
  demo?: InstituteCareerProfile,
): InstituteCareerProfile {
  return {
    instituteId,
    name: apiProfile.name,
    type: demo?.type ?? "school",
    city: demo?.city ?? "",
    state: demo?.state ?? "",
    logoInitials:
      demo?.logoInitials ??
      apiProfile.name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? "")
        .join("") ||
      "IN",
    logoGradient: demo?.logoGradient ?? "from-primary/80 to-chart-5/60",
    tagline: apiProfile.mission || demo?.tagline || "",
    about: apiProfile.vision || demo?.about || "",
    principalName: apiProfile.principal || demo?.principalName || "",
    principalMessage: demo?.principalMessage || "",
    culture: demo?.culture ?? [],
    mission: apiProfile.mission || demo?.mission || "",
    vision: apiProfile.vision || demo?.vision || "",
    benefits: demo?.benefits ?? [],
    facilities: demo?.facilities ?? [],
    achievements: apiProfile.achievements.length
      ? apiProfile.achievements
      : (demo?.achievements ?? []),
    gallery: demo?.gallery ?? [],
    contact: {
      phone: apiProfile.phone || demo?.contact.phone || "",
      email: apiProfile.email || demo?.contact.email || "",
      address: apiProfile.address || demo?.contact.address || "",
      hours: demo?.contact.hours || "",
    },
    featured: demo?.featured ?? false,
    openRolesCount: getJobsByInstitute(instituteId).length,
  };
}

export async function getInstituteProfileWithApiFallback(
  instituteId: string,
): Promise<InstituteCareerProfile | undefined> {
  const demo = getInstituteProfile(instituteId);
  if (!isApiAuthMode() || !isInstituteUuid(instituteId)) return demo;
  const apiProfile = await loadInstitutePublicProfile(instituteId);
  if (!apiProfile) return demo;
  return careerProfileFromApi(instituteId, apiProfile, demo);
}

export function getAllInstituteProfiles(): InstituteCareerProfile[] {
  return INSTITUTE_CAREER_PROFILES.map((p) => ({
    ...p,
    openRolesCount: getJobsByInstitute(p.instituteId).length,
  }));
}

export function filterInstitutes(opts: { q?: string; type?: string; state?: string }) {
  return getAllInstituteProfiles().filter((p) => {
    if (opts.type && opts.type !== "all" && p.type !== opts.type) return false;
    if (opts.state && opts.state !== "all" && p.state !== opts.state) return false;
    if (opts.q) {
      const hay = `${p.name} ${p.city} ${p.state} ${p.tagline}`.toLowerCase();
      if (!hay.includes(opts.q.toLowerCase())) return false;
    }
    return true;
  });
}

export const INSTITUTE_TYPE_LABEL: Record<InstituteCareerProfile["type"], string> = {
  school: "School",
  junior_college: "Junior College",
  degree_college: "Degree College",
  academy: "Academy",
  coaching: "Coaching Institute",
};

