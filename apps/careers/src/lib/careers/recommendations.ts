import type { CandidateProfile, JobPosting } from "./types";
import { getJobs } from "./repositories";

export interface RecommendedJob {
  job: JobPosting;
  score: number;
  reasons: string[];
}

function parseExperienceYears(val: string): number {
  const m = val.match(/(\d+)/);
  return m ? Number(m[1]) : 0;
}

export function scoreJobForCandidate(
  job: JobPosting,
  profile: CandidateProfile | null,
): RecommendedJob {
  let score = 0;
  const reasons: string[] = [];

  if (!profile) {
    if (job.featured) {
      score += 20;
      reasons.push("Featured role");
    }
    if (job.trending) {
      score += 10;
      reasons.push("Trending");
    }
    return { job, score, reasons };
  }

  const profileSubjects = [...profile.subjects, ...(profile.teaching.academic?.subjects ?? [])].map(
    (s) => s.toLowerCase(),
  );

  const jobHay = `${job.title} ${job.department} ${job.skills.join(" ")}`.toLowerCase();
  const subjectHits = profileSubjects.filter((s) => s && jobHay.includes(s.toLowerCase()));
  if (subjectHits.length > 0) {
    score += 30;
    reasons.push(`Matches your subjects`);
  }

  const skillHits = profile.skills.filter((s) => jobHay.includes(s.toLowerCase()));
  if (skillHits.length > 0) {
    score += 20;
    reasons.push(`${skillHits.length} skill match${skillHits.length > 1 ? "es" : ""}`);
  }

  if (profile.city && job.city.toLowerCase() === profile.city.toLowerCase()) {
    score += 25;
    reasons.push("Same city");
  } else if (profile.state && job.state.toLowerCase() === profile.state.toLowerCase()) {
    score += 15;
    reasons.push("Same state");
  }

  const expYears = parseExperienceYears(job.experienceRequired);
  const candidateExp = parseExperienceYears(
    profile.teaching.academic?.teachingExperienceYears ??
      profile.teaching.sports?.coachingExperienceYears ??
      profile.experience[0]?.title ??
      "0",
  );
  if (candidateExp >= expYears) {
    score += 15;
    reasons.push("Experience fit");
  }

  if (profile.teaching.facultyType === job.facultyType) {
    score += 20;
    reasons.push("Faculty type match");
  }

  if (job.featured) {
    score += 10;
    reasons.push("Featured");
  }
  if (job.trending) {
    score += 5;
    reasons.push("Trending");
  }

  return { job, score: Math.min(100, score), reasons };
}

export function getRecommendedJobs(
  profile: CandidateProfile | null,
  limit = 6,
  source: JobPosting[] = getJobs(),
): RecommendedJob[] {
  return source
    .map((job) => scoreJobForCandidate(job, profile))
    .filter((r) => r.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}

export function getFeaturedJobs(source: JobPosting[] = getJobs()) {
  const featured = source.filter((j) => j.featured);
  if (featured.length > 0) return featured;
  return getRecentJobs(6, source);
}

export function getTrendingJobs(source: JobPosting[] = getJobs()) {
  const trending = source.filter((j) => j.trending);
  if (trending.length > 0) return trending;
  return getRecentJobs(6, source);
}

export function getRecentJobs(limit = 6, source: JobPosting[] = getJobs()) {
  return [...source].sort((a, b) => b.postedAt.localeCompare(a.postedAt)).slice(0, limit);
}

export function getJobsByInstitute(instituteId: string) {
  return getJobs().filter((j) => j.instituteId === instituteId);
}
