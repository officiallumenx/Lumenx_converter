import { CAREERS_STORAGE_KEYS, createBrowserAuthStorage } from "@lumenx/auth";
import type { FacultyType, JobApplication, TalentPoolEntry } from "./types";
import { computeProfileCompletion, getCandidateProfile } from "./profile-repository";

const storage = createBrowserAuthStorage();

export interface TalentCandidateCard {
  candidateId: string;
  name: string;
  headline: string;
  city: string;
  state: string;
  skills: string[];
  experienceYears: string;
  profileComplete: number;
  source: "talent_pool" | "rejected" | "demo";
  facultyType: FacultyType;
  note?: string;
  addedAt?: string;
}

const DEMO_TALENT: TalentCandidateCard[] = [
  {
    candidateId: "demo-talent-001",
    name: "Rahul Mehta",
    headline: "Frontend Developer · React & TypeScript",
    city: "Bengaluru",
    state: "Karnataka",
    skills: ["React", "TypeScript", "Tailwind", "REST APIs"],
    experienceYears: "4",
    profileComplete: 88,
    source: "demo",
    facultyType: "administrative",
    note: "Open to product and ed-tech roles",
  },
  {
    candidateId: "demo-talent-002",
    name: "Sneha Iyer",
    headline: "Digital Marketing Lead",
    city: "Chennai",
    state: "Tamil Nadu",
    skills: ["SEO", "Google Ads", "Content strategy", "Analytics"],
    experienceYears: "6",
    profileComplete: 92,
    source: "demo",
    facultyType: "administrative",
    note: "Previously at agency — B2B SaaS preferred",
  },
  {
    candidateId: "demo-talent-003",
    name: "Vikram Desai",
    headline: "Chartered Accountant · FP&A",
    city: "Mumbai",
    state: "Maharashtra",
    skills: ["Financial modelling", "GST", "Excel", "Reporting"],
    experienceYears: "5",
    profileComplete: 85,
    source: "demo",
    facultyType: "administrative",
  },
];

function readPoolEntries(organizationId: string): TalentPoolEntry[] {
  const prefix = `${CAREERS_STORAGE_KEYS.talentPool}_`;
  const entries: TalentPoolEntry[] = [];
  for (let i = 0; i < storage.length; i++) {
    const key = storage.key(i);
    if (!key?.startsWith(prefix)) continue;
    try {
      const raw = storage.getItem(key);
      if (!raw) continue;
      const list = JSON.parse(raw) as TalentPoolEntry[];
      for (const e of list) {
        if (e.instituteId === organizationId) entries.push(e);
      }
    } catch {
      continue;
    }
  }
  return entries;
}

function getUserName(candidateId: string): string | undefined {
  try {
    const raw = storage.getItem("ues_careers_users");
    if (!raw) return undefined;
    const users = JSON.parse(raw) as { id: string; name: string }[];
    return users.find((u) => u.id === candidateId)?.name;
  } catch {
    return undefined;
  }
}

function profileToCard(
  candidateId: string,
  facultyType: FacultyType,
  source: TalentCandidateCard["source"],
  note?: string,
  addedAt?: string,
): TalentCandidateCard {
  const profile = getCandidateProfile(candidateId);
  const name = getUserName(candidateId) ?? "Candidate";
  const exp =
    profile.teaching.academic?.teachingExperienceYears ??
    profile.experience[0]?.duration ??
    "—";
  return {
    candidateId,
    name,
    headline: profile.headline || name,
    city: profile.city,
    state: profile.state,
    skills: profile.skills.length ? profile.skills : profile.softSkills,
    experienceYears: exp,
    profileComplete: computeProfileCompletion(profile),
    source,
    facultyType,
    note,
    addedAt,
  };
}

function applicationToTalentCard(app: JobApplication): TalentCandidateCard {
  const base = profileToCard(app.candidateId, "academic", "rejected", `Applied for ${app.jobTitle}`, app.updatedAt);
  return {
    ...base,
    name: app.personal.name,
    headline: app.professional.currentRole || base.headline,
    city: app.address.city || base.city,
    state: app.address.state || base.state,
    experienceYears: app.professional.experienceYears,
    skills: app.skills.technicalSkills.split(",").map((s) => s.trim()).filter(Boolean) || base.skills,
  };
}

export function discoverTalentForOrg(
  organizationId: string,
  applications: JobApplication[],
  opts?: { q?: string; facultyType?: FacultyType | "all" },
): TalentCandidateCard[] {
  const poolEntries = readPoolEntries(organizationId);
  const rejectedApps = applications.filter(
    (a) => a.instituteId === organizationId && a.status === "rejected",
  );

  const fromPool = poolEntries.map((e) =>
    profileToCard(e.candidateId, e.facultyType, "talent_pool", e.note, e.addedAt),
  );
  const fromRejected = rejectedApps.map(applicationToTalentCard);

  const seen = new Set<string>();
  const merged: TalentCandidateCard[] = [];
  for (const c of [...fromPool, ...fromRejected, ...DEMO_TALENT]) {
    if (seen.has(c.candidateId)) continue;
    seen.add(c.candidateId);
    merged.push(c);
  }

  let results = merged;
  if (opts?.facultyType && opts.facultyType !== "all") {
    results = results.filter((c) => c.facultyType === opts.facultyType);
  }
  if (opts?.q) {
    const hay = opts.q.toLowerCase();
    results = results.filter(
      (c) =>
        c.name.toLowerCase().includes(hay) ||
        c.headline.toLowerCase().includes(hay) ||
        c.skills.some((s) => s.toLowerCase().includes(hay)),
    );
  }
  return results.sort((a, b) => b.profileComplete - a.profileComplete);
}
