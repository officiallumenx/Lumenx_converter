import type { InstituteProfileExtended } from "./types";

/** Extended institute profiles — Phase 2 + 10 media (demo) */
export const INSTITUTE_PROFILES: InstituteProfileExtended[] = [
  {
    instituteId: "ins-lumenx-academy",
    logoInitials: "LX",
    logoGradient: "from-primary/80 to-chart-5/60",
    shortDescription: "Premier K-12 with integrated LumenX Connect digital learning.",
    principalName: "Dr. Alistair Vance",
    principalMessage:
      "At LumenX Academy we nurture curiosity, character, and competence. Our admissions team partners with every family through a transparent, mobile-first journey.",
    history: "Founded in 1998, LumenX Academy has grown from 120 students to 2,800+ across Green Park Campus.",
    vision: "Every learner discovers their potential through excellence, empathy, and innovation.",
    mission: "Deliver holistic education with strong academics, sports, and digital fluency.",
    awards: ["NAAC A+", "Green Campus Award 2025", "National Science Olympiad Hub"],
    academicHighlights: ["98.2% board pass rate", "Integrated STEM from Grade 6", "University counselling cell"],
    sportsHighlights: ["State cricket champions", "Olympic-size pool", "Inter-school athletics record"],
    admissionOffice: {
      phone: "+91 40 4455 8800",
      email: "admissions@lumenx.edu",
      hours: "Mon–Sat, 9:00 AM – 5:00 PM",
      address: "Admissions Block, Green Park Campus, Hyderabad 500032",
    },
    campusPhotos: [
      { id: "lx-p1", type: "photo", title: "Main Campus", caption: "Green Park entrance", gradient: "from-primary/30 to-emerald-500/20" },
      { id: "lx-p2", type: "photo", title: "STEM Labs", caption: "Robotics & coding", gradient: "from-blue-500/25 to-cyan-500/15" },
      { id: "lx-p3", type: "photo", title: "Sports Complex", caption: "Pool & courts", gradient: "from-amber-500/20 to-orange-500/15" },
    ],
    videos: [
      { id: "lx-v1", type: "video", title: "Campus tour", caption: "5-min walkthrough", gradient: "from-violet-500/25 to-primary/20" },
    ],
    eventsGallery: [
      { id: "lx-e1", type: "photo", title: "Annual Day 2025", gradient: "from-rose-500/20 to-pink-500/15" },
      { id: "lx-e2", type: "photo", title: "Science Fair", gradient: "from-emerald-500/20 to-teal-500/15" },
    ],
    featured: true,
    popular: true,
    addedAt: "2024-01-15",
  },
  {
    instituteId: "ins-delhi-riverside",
    logoInitials: "DP",
    logoGradient: "from-blue-500/70 to-cyan-500/50",
    shortDescription: "CBSE school with IB pathway and arts academy in New Delhi.",
    principalName: "Mrs. Kavita Menon",
    principalMessage: "DPS Riverside welcomes families who value creativity alongside academic rigour.",
    history: "Established 2005 on the Yamuna riverside, serving 1,400 students.",
    vision: "Learning without boundaries — local roots, global outlook.",
    mission: "Inspire lifelong learners through inclusive, innovative education.",
    awards: ["CBSE national toppers 2025", "Green campus certification"],
    academicHighlights: ["IB pathway", "Smart classrooms", "Global exchange"],
    sportsHighlights: ["District football champions", "Indoor sports arena"],
    admissionOffice: {
      phone: "+91 11 4400 2200",
      email: "admissions@dpsriverside.edu",
      hours: "Mon–Fri, 9:30 AM – 4:30 PM",
      address: "Riverside Enclave, New Delhi 110021",
    },
    campusPhotos: [
      { id: "dp-p1", type: "photo", title: "Riverside Campus", gradient: "from-blue-500/25 to-sky-500/15" },
      { id: "dp-p2", type: "photo", title: "Arts Academy", gradient: "from-purple-500/20 to-violet-500/15" },
    ],
    videos: [{ id: "dp-v1", type: "video", title: "Student life", gradient: "from-blue-500/20 to-indigo-500/15" }],
    eventsGallery: [{ id: "dp-e1", type: "photo", title: "Cultural fest", gradient: "from-amber-500/20 to-yellow-500/15" }],
    featured: true,
    popular: true,
    addedAt: "2025-11-01",
  },
  {
    instituteId: "ins-st-xavier-jc",
    logoInitials: "SX",
    logoGradient: "from-amber-500/70 to-orange-500/50",
    shortDescription: "Mumbai junior college — MPC, BiPC, commerce with JEE foundation.",
    principalName: "Fr. Michael D'Souza",
    principalMessage: "We prepare students for board excellence and competitive entrance success.",
    history: "Serving Mumbai since 1963 with a legacy of science and commerce distinction.",
    vision: "Science & commerce excellence with ethical leadership.",
    mission: "Structured mentoring, strong labs, and counselling for every stream.",
    awards: ["State rank holders", "IIT selections annually"],
    academicHighlights: ["MPC & BiPC", "JEE foundation", "Counselling cell"],
    sportsHighlights: ["Inter-college cricket", "Hostel sports facilities"],
    admissionOffice: {
      phone: "+91 22 2200 3300",
      email: "admissions@stxaviersjc.edu",
      hours: "Mon–Sat, 10:00 AM – 4:00 PM",
      address: "Fort, Mumbai 400001",
    },
    campusPhotos: [
      { id: "sx-p1", type: "photo", title: "Science block", gradient: "from-amber-500/25 to-orange-500/15" },
    ],
    videos: [],
    eventsGallery: [{ id: "sx-e1", type: "photo", title: "Merit day", gradient: "from-emerald-500/20 to-green-500/15" }],
    featured: false,
    popular: true,
    addedAt: "2026-01-10",
  },
  {
    instituteId: "ins-fergusson",
    logoInitials: "FC",
    logoGradient: "from-emerald-500/70 to-teal-500/50",
    shortDescription: "Autonomous degree college on FC Road, Pune — heritage meets innovation.",
    principalName: "Dr. Suresh Patil",
    principalMessage: "Fergusson offers undergraduate excellence with research opportunities for motivated learners.",
    history: "Founded 1885 — one of Pune's oldest colleges, autonomous since 2016.",
    vision: "Heritage meets innovation in undergraduate education.",
    mission: "Balance tradition, research, and employability.",
    awards: ["SPPU gold medalists", "NAAC A"],
    academicHighlights: ["Autonomous curriculum", "UG research labs", "Placement cell"],
    sportsHighlights: ["Inter-college athletics", "Cricket & hockey teams"],
    admissionOffice: {
      phone: "+91 20 6600 4400",
      email: "admissions@fergusson.edu",
      hours: "Mon–Fri, 10:00 AM – 5:00 PM",
      address: "FC Road, Pune 411004",
    },
    campusPhotos: [{ id: "fc-p1", type: "photo", title: "Heritage building", gradient: "from-emerald-500/25 to-teal-500/15" }],
    videos: [{ id: "fc-v1", type: "video", title: "Campus heritage", gradient: "from-teal-500/20 to-cyan-500/15" }],
    eventsGallery: [],
    featured: false,
    popular: false,
    addedAt: "2026-02-15",
  },
  {
    instituteId: "ins-vnit",
    logoInitials: "VN",
    logoGradient: "from-violet-500/70 to-purple-500/50",
    shortDescription: "NIRF top-50 engineering institute with strong placements.",
    principalName: "Prof. Rakesh Kumar",
    principalMessage: "VNIT Nagpur shapes engineers ready for industry and entrepreneurship.",
    history: "Established 1960 as a regional engineering college, now NIT status.",
    vision: "Engineering the future through innovation and integrity.",
    mission: "Rigorous B.Tech/M.Tech programs with incubation support.",
    awards: ["90%+ placement rate", "NIRF top 50"],
    academicHighlights: ["B.Tech programs", "Incubation center", "Industry projects"],
    sportsHighlights: ["Annual sports meet", "Tech fest Avishkar"],
    admissionOffice: {
      phone: "+91 712 2800 5500",
      email: "admissions@vnit.ac.in",
      hours: "Mon–Fri, 9:00 AM – 5:00 PM",
      address: "South Ambazari Road, Nagpur 440010",
    },
    campusPhotos: [{ id: "vn-p1", type: "photo", title: "Main gate", gradient: "from-violet-500/25 to-purple-500/15" }],
    videos: [],
    eventsGallery: [{ id: "vn-e1", type: "photo", title: "Convocation", gradient: "from-indigo-500/20 to-violet-500/15" }],
    featured: true,
    popular: false,
    addedAt: "2026-03-01",
  },
  {
    instituteId: "ins-bhu",
    logoInitials: "BH",
    logoGradient: "from-rose-500/70 to-pink-500/50",
    shortDescription: "Central university in Varanasi — multi-faculty residential campus.",
    principalName: "Prof. Sudhir Jain",
    principalMessage: "BHU welcomes scholars seeking diverse programs on a historic residential campus.",
    history: "Founded 1916 by Pandit Madan Mohan Malaviya.",
    vision: "Knowledge for nation building.",
    mission: "Multi-disciplinary education with research and cultural heritage.",
    awards: ["Institute of Eminence", "Global rankings"],
    academicHighlights: ["Multi-faculty", "Residential campus", "Research output"],
    sportsHighlights: ["Inter-university tournaments", "Large sports grounds"],
    admissionOffice: {
      phone: "+91 542 6700 6600",
      email: "admissions@bhu.ac.in",
      hours: "Mon–Sat, 10:00 AM – 4:00 PM",
      address: "Varanasi 221005",
    },
    campusPhotos: [
      { id: "bhu-p1", type: "photo", title: "Main campus", gradient: "from-rose-500/25 to-orange-500/15" },
      { id: "bhu-p2", type: "photo", title: "Hostels", gradient: "from-amber-500/20 to-rose-500/15" },
    ],
    videos: [{ id: "bhu-v1", type: "video", title: "University overview", gradient: "from-rose-500/20 to-pink-500/15" }],
    eventsGallery: [{ id: "bhu-e1", type: "photo", title: "Convocation", gradient: "from-yellow-500/20 to-amber-500/15" }],
    featured: false,
    popular: true,
    addedAt: "2026-03-20",
  },
];

export function getInstituteProfileExtended(instituteId: string) {
  return INSTITUTE_PROFILES.find((p) => p.instituteId === instituteId);
}

export function getFeaturedInstitutes() {
  return INSTITUTE_PROFILES.filter((p) => p.featured).map((p) => p.instituteId);
}

export function getPopularInstitutes() {
  return INSTITUTE_PROFILES.filter((p) => p.popular).map((p) => p.instituteId);
}

export function getRecentlyAddedInstitutes(limit = 3) {
  return [...INSTITUTE_PROFILES]
    .sort((a, b) => b.addedAt.localeCompare(a.addedAt))
    .slice(0, limit)
    .map((p) => p.instituteId);
}
