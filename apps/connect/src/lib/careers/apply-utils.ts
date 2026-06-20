import type { ApplicationDraft, CandidateProfile, JobPosting } from "./types";
import { profileToApplyPrefill } from "./profile-repository";

export type QuickApplyField = "resume" | "city" | "state" | "email" | "mobile";

export function getMissingQuickApplyFields(
  profile: CandidateProfile,
  email?: string,
  phone?: string,
  draft?: ApplicationDraft,
): QuickApplyField[] {
  const missing: QuickApplyField[] = [];
  const resolvedEmail = draft?.personal?.email?.trim() || email?.trim();
  const resolvedPhone = draft?.personal?.mobile?.trim() || phone?.trim();
  const resolvedCity = draft?.address?.city?.trim() || profile.city?.trim();
  const resolvedState = draft?.address?.state?.trim() || profile.state?.trim();
  const hasResume = !!(profile.resumeFileName || profile.resumeDataUrl || draft?.documents?.resume);

  if (!resolvedEmail) missing.push("email");
  if (!resolvedPhone) missing.push("mobile");
  if (!resolvedCity) missing.push("city");
  if (!resolvedState) missing.push("state");
  if (!hasResume) missing.push("resume");
  return missing;
}

export function jobHasApplicationExtras(job: JobPosting): boolean {
  const ex = job.applicationExtras;
  if (!ex) return false;
  return !!(
    ex.coverLetter ||
    ex.portfolioUrl ||
    ex.demoVideo ||
    ex.expectedSalary ||
    (ex.customQuestions?.length ?? 0) > 0
  );
}

export function buildApplicationDraftFromProfile(
  jobId: string | undefined,
  profile: CandidateProfile,
  name: string,
  email?: string,
  phone?: string,
): ApplicationDraft {
  const prefill = profileToApplyPrefill(profile, name, email, phone);
  const documents: ApplicationDraft["documents"] = {};
  if (profile.resumeFileName) {
    documents.resume = { fileName: profile.resumeFileName };
  }

  return {
    step: 0,
    jobId,
    personal: {
      name,
      email: email ?? "",
      mobile: phone ?? "",
    },
    address: { country: "India", ...prefill.address },
    professional: {
      highestQualification: prefill.professional.highestQualification || "—",
      experienceYears: prefill.professional.experienceYears || "0",
      currentEmployer: prefill.professional.currentEmployer || "—",
      currentRole: prefill.professional.currentRole || profile.headline || "—",
      expectedSalary: prefill.professional.expectedSalary || "—",
      noticePeriod: prefill.professional.noticePeriod || "Immediate",
    },
    skills: {
      teachingSubjects: prefill.skills.teachingSubjects ?? "",
      sportsSpecialization: prefill.skills.sportsSpecialization ?? "",
      labSpecialization: prefill.skills.labSpecialization ?? "",
      technicalSkills: prefill.skills.technicalSkills || profile.skills.join(", ") || "General",
      languagesKnown: prefill.skills.languagesKnown || "English",
      grades: prefill.skills.grades ?? "",
      boards: prefill.skills.boards ?? "",
    },
    documents,
  };
}

export function validateApplicationExtras(
  job: JobPosting,
  extras: Record<string, string>,
  coverLetter: string,
  draft: ApplicationDraft,
): string | null {
  const req = job.applicationExtras;
  if (!req) return null;
  if (req.coverLetter && !coverLetter.trim()) return "Cover letter is required for this role";
  if (req.portfolioUrl && !extras.portfolioUrl?.trim()) return "Portfolio URL is required";
  if (req.demoVideo && !draft.documents?.demo_teaching_video) return "Demo video upload is required";
  if (req.expectedSalary && !extras.expectedSalary?.trim() && draft.professional?.expectedSalary === "—") {
    return "Expected salary is required";
  }
  for (const q of req.customQuestions ?? []) {
    if (q.required && !extras[q.id]?.trim()) return `${q.label} is required`;
  }
  return null;
}
