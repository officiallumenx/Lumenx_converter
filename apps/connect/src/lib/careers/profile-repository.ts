import { CAREERS_STORAGE_KEYS, createBrowserAuthStorage } from "@lumenx/auth";
import type {
  CandidateProfile,
  CertificationEntry,
  ExperienceEntry,
  InternshipEntry,
  LanguageEntry,
  LanguageProficiency,
  ProfileStrength,
  QualificationEntry,
  TeachingProfile,
} from "./types";

const storage = createBrowserAuthStorage();

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = storage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function writeJson(key: string, value: unknown) {
  storage.setItem(key, JSON.stringify(value));
}

function profilesKey(): string {
  return CAREERS_STORAGE_KEYS.profiles;
}

export function createProfileId(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
}

export function emptyTeachingProfile(): TeachingProfile {
  return {
    facultyType: "academic",
    academic: {
      subjects: [],
      grades: [],
      boards: [],
      teachingExperienceYears: "",
    },
  };
}

export function defaultCandidateProfile(candidateId: string): CandidateProfile {
  return {
    candidateId,
    headline: "",
    summary: "",
    experience: [],
    internships: [],
    qualifications: [],
    certifications: [],
    achievements: [],
    profileLinks: [],
    skills: [],
    softSkills: [],
    subjects: [],
    languageSkills: [],
    address: "",
    postalCode: "",
    city: "",
    state: "",
    country: "India",
    expectedSalary: "",
    availability: "Immediate",
    currentEmployer: "",
    employmentStatus: "employed",
    teaching: emptyTeachingProfile(),
    updatedAt: new Date().toISOString(),
  };
}

/** Migrate legacy stored profiles to the current schema. */
function normalizeProfile(raw: Record<string, unknown>, candidateId: string): CandidateProfile {
  const base = defaultCandidateProfile(candidateId);
  const merged = { ...base, ...raw, candidateId } as CandidateProfile & { languages?: string[] };

  if (!Array.isArray(merged.internships)) merged.internships = [];
  if (!Array.isArray(merged.softSkills)) merged.softSkills = [];
  if (!Array.isArray(merged.achievements)) merged.achievements = [];
  if (!Array.isArray(merged.profileLinks)) merged.profileLinks = [];
  if (!Array.isArray(merged.languageSkills)) {
    const legacy = merged.languages ?? [];
    merged.languageSkills = legacy.map((language, i) => ({
      id: `lang-${i}`,
      language,
      proficiency: "professional" as LanguageProficiency,
    }));
  }
  if (typeof merged.address !== "string") merged.address = "";
  if (typeof merged.postalCode !== "string") merged.postalCode = "";

  merged.qualifications = (merged.qualifications ?? []).map((q) => ({
    educationLevel: q.educationLevel ?? "bachelors",
    field: q.field ?? "",
    pursuing: q.pursuing ?? false,
    ...q,
  })) as QualificationEntry[];

  merged.experience = (merged.experience ?? []) as ExperienceEntry[];
  merged.internships = (merged.internships ?? []) as InternshipEntry[];
  merged.certifications = (merged.certifications ?? []) as CertificationEntry[];
  merged.languageSkills = (merged.languageSkills ?? []) as LanguageEntry[];

  return merged;
}

export const DEMO_CANDIDATE_PROFILE: CandidateProfile = {
  candidateId: "CAR-DEMO-001",
  headline: "Senior English Faculty · 6+ years CBSE experience",
  summary:
    "Passionate educator with expertise in English Literature and language pedagogy. Track record of board exam excellence, curriculum design, and student mentorship across CBSE and ICSE boards.",
  experience: [
    {
      id: "exp-1",
      title: "Senior English Teacher",
      organization: "City High School, Mumbai",
      from: "2020-06",
      current: true,
      description:
        "Grades 9–12, CBSE curriculum. Led English department initiatives and board exam prep.",
      employmentType: "full_time",
      location: "Mumbai, Maharashtra",
    },
    {
      id: "exp-2",
      title: "English Teacher",
      organization: "Green Valley School",
      from: "2018-07",
      to: "2020-05",
      description: "Middle and secondary school English instruction.",
      employmentType: "full_time",
      location: "Mumbai, Maharashtra",
    },
  ],
  internships: [
    {
      id: "int-1",
      title: "Teaching Intern",
      company: "Sunrise Academy",
      from: "2017-06",
      to: "2017-12",
      description: "Assisted senior teachers with lesson planning and classroom activities.",
      workMode: "onsite",
    },
  ],
  qualifications: [
    {
      id: "q-1",
      educationLevel: "masters",
      degree: "M.A English Literature",
      field: "English Literature",
      institution: "Mumbai University",
      year: "2017",
      grade: "8.2 CGPA",
    },
    {
      id: "q-2",
      educationLevel: "bachelors",
      degree: "B.Ed",
      field: "Education",
      institution: "SNDT University",
      year: "2018",
      grade: "First Class",
    },
  ],
  certifications: [
    {
      id: "c-1",
      name: "Google Certified Educator",
      issuer: "Google",
      year: "2023",
      credentialId: "GCE-2023-8842",
    },
    { id: "c-2", name: "CBSE Teacher Training", issuer: "CBSE", year: "2019" },
  ],
  achievements: [
    {
      id: "ach-1",
      title: "District Debate Coach of the Year",
      year: "2024",
      description: "Led school team to state finals",
    },
    {
      id: "ach-2",
      title: "92% board pass rate",
      year: "2025",
      description: "English department CBSE results",
    },
  ],
  profileLinks: [
    { id: "link-1", label: "LinkedIn", url: "https://linkedin.com/in/priya-nair" },
    { id: "link-2", label: "Portfolio", url: "https://example.com/portfolio" },
  ],
  skills: [
    "Classroom management",
    "Curriculum design",
    "Google Classroom",
    "LMS",
    "Lesson planning",
  ],
  softSkills: ["Communication", "Leadership", "Teamwork", "Problem solving", "Time management"],
  subjects: ["English Literature", "English Language"],
  languageSkills: [
    { id: "l-1", language: "English", proficiency: "native" },
    { id: "l-2", language: "Hindi", proficiency: "professional" },
    { id: "l-3", language: "Malayalam", proficiency: "conversational" },
  ],
  address: "14, Bandra West, Turner Road",
  postalCode: "400050",
  city: "Mumbai",
  state: "Maharashtra",
  country: "India",
  expectedSalary: "₹8–10 LPA",
  availability: "60 days notice",
  currentEmployer: "City High School",
  employmentStatus: "employed",
  resumeFileName: "priya_nair_resume.pdf",
  teaching: {
    facultyType: "academic",
    academic: {
      subjects: ["English Literature", "English Language"],
      grades: ["9", "10", "11", "12"],
      boards: ["CBSE", "ICSE"],
      teachingExperienceYears: "6",
      results: "92% board pass rate (2025)",
      achievements: "District debate coach",
    },
  },
  updatedAt: "2026-04-01T10:00:00Z",
};

function getAllProfiles(): Record<string, CandidateProfile> {
  return readJson<Record<string, CandidateProfile>>(profilesKey(), {});
}

function saveAllProfiles(profiles: Record<string, CandidateProfile>) {
  writeJson(profilesKey(), profiles);
}

export function getCandidateProfile(candidateId: string): CandidateProfile {
  const all = getAllProfiles();
  if (all[candidateId])
    return normalizeProfile(all[candidateId] as unknown as Record<string, unknown>, candidateId);
  if (candidateId === DEMO_CANDIDATE_PROFILE.candidateId) {
    saveAllProfiles({ ...all, [candidateId]: DEMO_CANDIDATE_PROFILE });
    return DEMO_CANDIDATE_PROFILE;
  }
  const profile = defaultCandidateProfile(candidateId);
  saveAllProfiles({ ...all, [candidateId]: profile });
  return profile;
}

export function saveCandidateProfile(profile: CandidateProfile): CandidateProfile {
  const updated = normalizeProfile(
    { ...profile, updatedAt: new Date().toISOString() },
    profile.candidateId,
  );
  const all = getAllProfiles();
  saveAllProfiles({ ...all, [profile.candidateId]: updated });
  return updated;
}

export function createInitialCandidateProfile(input: {
  candidateId: string;
  name: string;
  headline?: string;
  city?: string;
  state?: string;
}): CandidateProfile {
  const profile = saveCandidateProfile({
    ...defaultCandidateProfile(input.candidateId),
    headline: input.headline ?? "",
    city: input.city ?? "",
    state: input.state ?? "",
  });
  void input.name;
  return profile;
}

export function computeProfileCompletion(profile: CandidateProfile): number {
  const checks = [
    !!profile.photoDataUrl,
    profile.headline.length > 5,
    profile.summary.length > 20,
    profile.experience.length > 0 || profile.internships.length > 0,
    profile.qualifications.length > 0,
    profile.certifications.length > 0 || profile.achievements.length > 0,
    profile.skills.length > 0,
    profile.softSkills.length > 0,
    profile.languageSkills.length > 0,
    profile.address.length > 5 && profile.city.length > 0,
    profile.expectedSalary.length > 0,
    !!profile.resumeFileName || !!profile.resumeDataUrl,
    profile.profileLinks.length > 0,
  ];
  return Math.min(100, Math.round((checks.filter(Boolean).length / checks.length) * 100));
}

export function computeProfileStrength(profile: CandidateProfile): ProfileStrength {
  const pct = computeProfileCompletion(profile);
  if (pct >= 90) return "excellent";
  if (pct >= 70) return "strong";
  if (pct >= 45) return "developing";
  return "starter";
}

export function profileStrengthLabel(strength: ProfileStrength): string {
  switch (strength) {
    case "excellent":
      return "Excellent";
    case "strong":
      return "Strong";
    case "developing":
      return "Developing";
    case "starter":
      return "Getting started";
  }
}

export function profileToApplyPrefill(
  profile: CandidateProfile,
  name: string,
  email?: string,
  phone?: string,
) {
  const academic = profile.teaching.academic;
  const sports = profile.teaching.sports;
  const lab = profile.teaching.lab;
  const languagesKnown = profile.languageSkills
    .map((l) => `${l.language} (${l.proficiency})`)
    .join(", ");
  return {
    personal: {
      name,
      email: email ?? "",
      mobile: phone ?? "",
    },
    address: {
      address: profile.address,
      city: profile.city,
      state: profile.state,
      country: profile.country,
      postalCode: profile.postalCode,
    },
    professional: {
      highestQualification: profile.qualifications[0]?.degree ?? "",
      experienceYears:
        academic?.teachingExperienceYears ??
        sports?.coachingExperienceYears ??
        lab?.practicalExperienceYears ??
        "",
      currentEmployer: profile.currentEmployer,
      currentRole: profile.experience[0]?.title ?? profile.headline,
      expectedSalary: profile.expectedSalary,
      noticePeriod: profile.availability,
      employmentStatus: profile.employmentStatus,
    },
    skills: {
      teachingSubjects: profile.subjects.join(", ") || academic?.subjects.join(", ") || "",
      sportsSpecialization: sports?.sportsExpertise.join(", ") ?? "",
      labSpecialization: lab?.specializations.join(", ") ?? lab?.labType ?? "",
      technicalSkills: [...profile.skills, ...profile.softSkills].join(", "),
      languagesKnown,
      grades: academic?.grades.join(", ") ?? "",
      boards: academic?.boards.join(", ") ?? "",
    },
  };
}

export const EDUCATION_LEVEL_OPTIONS = [
  { value: "10th", label: "10th / SSC" },
  { value: "12th", label: "12th / HSC" },
  { value: "diploma", label: "Diploma" },
  { value: "bachelors", label: "Bachelor's" },
  { value: "masters", label: "Master's" },
  { value: "doctorate", label: "Doctorate / PhD" },
  { value: "certification", label: "Certification course" },
  { value: "other", label: "Other" },
] as const;

export const LANGUAGE_PROFICIENCY_OPTIONS = [
  { value: "basic", label: "Basic" },
  { value: "conversational", label: "Conversational" },
  { value: "professional", label: "Professional" },
  { value: "native", label: "Native / Bilingual" },
] as const;

export const SOFT_SKILL_SUGGESTIONS = [
  "Communication",
  "Leadership",
  "Teamwork",
  "Problem solving",
  "Time management",
  "Adaptability",
  "Critical thinking",
  "Creativity",
  "Emotional intelligence",
  "Conflict resolution",
  "Public speaking",
  "Negotiation",
] as const;

export const PROFILE_SECTIONS = [
  { id: "overview", label: "Overview" },
  { id: "contact", label: "Contact & address" },
  { id: "experience", label: "Experience & internships" },
  { id: "education", label: "Education" },
  { id: "certifications", label: "Certificates & achievements" },
  { id: "skills", label: "Skills & languages" },
  { id: "documents", label: "Resume & links" },
] as const;

export type ProfileSectionId = (typeof PROFILE_SECTIONS)[number]["id"];

export function getProfileSectionIndex(id: ProfileSectionId): number {
  return PROFILE_SECTIONS.findIndex((s) => s.id === id);
}

export function getProfileSectionLabel(id: ProfileSectionId): string {
  return PROFILE_SECTIONS.find((s) => s.id === id)?.label ?? id;
}

export function getNextProfileSection(id: ProfileSectionId): ProfileSectionId | null {
  const i = getProfileSectionIndex(id);
  if (i < 0 || i >= PROFILE_SECTIONS.length - 1) return null;
  return PROFILE_SECTIONS[i + 1]!.id;
}

export function getPrevProfileSection(id: ProfileSectionId): ProfileSectionId | null {
  const i = getProfileSectionIndex(id);
  if (i <= 0) return null;
  return PROFILE_SECTIONS[i - 1]!.id;
}
