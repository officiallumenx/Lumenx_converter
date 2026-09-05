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
    city: "Bengaluru",
    state: "Karnataka",
    logoInitials: "T1",
    logoGradient: "from-primary/80 to-chart-5/60",
    tagline: "Excellence in K-12 education since 1987",
    about:
      "Test1School is the single demo institute for LumenX — integrated digital learning, strong STEM programs, and championship sports teams.",
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
      { id: "t1-1", title: "Main Campus", gradient: "from-primary/30 to-emerald-500/20" },
      { id: "t1-2", title: "STEM Labs", gradient: "from-blue-500/25 to-cyan-500/15" },
      { id: "t1-3", title: "Sports Complex", gradient: "from-amber-500/20 to-orange-500/15" },
    ],
    contact: {
      phone: "+91 80 4521 8800",
      email: "careers@test1school.edu",
      address: "12 Knowledge Park, Sector 4, Bengaluru 560001",
      hours: "Mon–Fri, 9:00 AM – 6:00 PM",
    },
    featured: true,
    popular: true,
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
      (apiProfile.name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part[0]?.toUpperCase() ?? "")
        .join("") ||
        "IN"),
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

