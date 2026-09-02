import {
  defaultCandidateProfile,
  normalizeProfile,
} from "../profile-repository";
import type { CandidateProfile } from "../types";
import type { CandidateProfileDto } from "./types";

export function candidateProfileDtoToProfile(
  dto: CandidateProfileDto,
  candidateId: string,
): CandidateProfile {
  const payload =
    dto.payload && typeof dto.payload === "object"
      ? (dto.payload as Record<string, unknown>)
      : {};
  return normalizeProfile(
    {
      ...defaultCandidateProfile(candidateId),
      ...payload,
      candidateId,
      headline: dto.headline ?? payload.headline ?? "",
      summary: dto.summary ?? payload.summary ?? "",
      city: (payload.city as string) ?? "",
      state: (payload.state as string) ?? "",
      updatedAt: dto.updatedAt,
    },
    candidateId,
  );
}

export function candidateProfileToUpsertInput(
  profile: CandidateProfile,
  instituteId: string,
  user: { name: string; email?: string; phone?: string },
) {
  const { candidateId, headline, summary, updatedAt, ...payload } = profile;
  void candidateId;
  void updatedAt;
  return {
    instituteId,
    displayName: user.name.trim() || "Candidate",
    headline: headline || null,
    summary: summary || null,
    phone: user.phone ?? null,
    email: user.email ?? null,
    payload,
  };
}
