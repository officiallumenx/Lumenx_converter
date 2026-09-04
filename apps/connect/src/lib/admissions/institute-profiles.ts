import type { InstituteProfileExtended } from "./types";

/** Extended institute profiles — Phase 2 + 10 media (demo) */
export const INSTITUTE_PROFILES: InstituteProfileExtended[] = [
  {
    instituteId: "ins-test1school",
    logoInitials: "LX",
    logoGradient: "from-primary/80 to-chart-5/60",
    shortDescription: "Premier K-12 with integrated LumenX Connect digital learning.",
    principalName: "Dr. Alistair Vance",
    principalMessage:
      "At Test1School we nurture curiosity, character, and competence. Our admissions team partners with every family through a transparent, mobile-first journey.",
    history:
      "Founded in 1998, Test1School has grown from 120 students to 2,800+ across Green Park Campus.",
    vision: "Every learner discovers their potential through excellence, empathy, and innovation.",
    mission: "Deliver holistic education with strong academics, sports, and digital fluency.",
    awards: ["NAAC A+", "Green Campus Award 2025", "National Science Olympiad Hub"],
    academicHighlights: [
      "98.2% board pass rate",
      "Integrated STEM from Grade 6",
      "University counselling cell",
    ],
    sportsHighlights: [
      "State cricket champions",
      "Olympic-size pool",
      "Inter-school athletics record",
    ],
    admissionOffice: {
      phone: "+91 40 4455 8800",
      email: "admissions@lumenx.edu",
      hours: "Mon–Sat, 9:00 AM – 5:00 PM",
      address: "Admissions Block, Green Park Campus, Hyderabad 500032",
    },
    campusPhotos: [
      {
        id: "lx-p1",
        type: "photo",
        title: "Main Campus",
        caption: "Green Park entrance",
        gradient: "from-primary/30 to-emerald-500/20",
      },
      {
        id: "lx-p2",
        type: "photo",
        title: "STEM Labs",
        caption: "Robotics & coding",
        gradient: "from-blue-500/25 to-cyan-500/15",
      },
      {
        id: "lx-p3",
        type: "photo",
        title: "Sports Complex",
        caption: "Pool & courts",
        gradient: "from-amber-500/20 to-orange-500/15",
      },
    ],
    videos: [
      {
        id: "lx-v1",
        type: "video",
        title: "Campus tour",
        caption: "5-min walkthrough",
        gradient: "from-violet-500/25 to-primary/20",
      },
    ],
    eventsGallery: [
      {
        id: "lx-e1",
        type: "photo",
        title: "Annual Day 2025",
        gradient: "from-rose-500/20 to-pink-500/15",
      },
      {
        id: "lx-e2",
        type: "photo",
        title: "Science Fair",
        gradient: "from-emerald-500/20 to-teal-500/15",
      },
    ],
    featured: true,
    popular: true,
    addedAt: "2024-01-15",
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

