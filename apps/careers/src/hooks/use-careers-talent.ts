import { useEffect, useMemo, useState } from "react";
import { isApiAuthMode } from "@/auth/auth-mode";
import { useCareersAuth } from "@/careers-portal/core/CareersAuthProvider";
import { resolveCareersInstituteId } from "@/lib/careers/institute-context";
import { getApplicationsForOrganization } from "@/lib/careers/repositories";
import {
  discoverTalentForOrg,
  type TalentCandidateCard,
} from "@/lib/careers/recruiter-talent";
import { listTalentPool, type TalentPoolEntryDto } from "@/lib/careers/api";
import { useCareersApplications } from "@/hooks/use-careers-applications";

function talentPoolDtoToCard(dto: TalentPoolEntryDto): TalentCandidateCard {
  const note = dto.notes?.trim() || undefined;
  const name = note?.split("\n")[0]?.trim() || "Candidate";
  return {
    candidateId: dto.candidateUserId,
    name,
    headline: note?.split("\n")[1]?.trim() || "Talent pool candidate",
    city: "—",
    state: "—",
    skills: [],
    experienceYears: "—",
    profileComplete: 50,
    source: "talent_pool",
    facultyType: "academic",
    note,
    addedAt: dto.createdAt,
  };
}

export function useCareersTalent(search?: string) {
  const { user } = useCareersAuth();
  const apiMode = isApiAuthMode();
  const instituteId = resolveCareersInstituteId(user);
  const orgId = user?.organizationId ?? "";
  const { applications: apiApps } = useCareersApplications({ scope: "recruiter" });
  const [poolRows, setPoolRows] = useState<TalentPoolEntryDto[]>([]);
  const [loading, setLoading] = useState(apiMode);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!apiMode || !instituteId) {
      setPoolRows([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    void listTalentPool(instituteId)
      .then((rows) => {
        if (!cancelled) {
          setPoolRows(rows);
          setErrorMessage(null);
        }
      })
      .catch((err) => {
        if (!cancelled) {
          setPoolRows([]);
          setErrorMessage(err instanceof Error ? err.message : "Failed to load talent pool");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [apiMode, instituteId]);

  const talent = useMemo(() => {
    if (!orgId) return [];
    const apps = apiMode ? apiApps : getApplicationsForOrganization(orgId);
    if (apiMode) {
      const fromPool = poolRows.map(talentPoolDtoToCard);
      const fromRejected = discoverTalentForOrg(orgId, apps, { q: search }).filter(
        (c) => c.source === "rejected",
      );
      const seen = new Set<string>();
      const merged: TalentCandidateCard[] = [];
      for (const card of [...fromPool, ...fromRejected]) {
        if (seen.has(card.candidateId)) continue;
        seen.add(card.candidateId);
        merged.push(card);
      }
      if (!search) return merged.sort((a, b) => b.profileComplete - a.profileComplete);
      const hay = search.toLowerCase();
      return merged
        .filter(
          (c) =>
            c.name.toLowerCase().includes(hay) ||
            c.headline.toLowerCase().includes(hay) ||
            c.skills.some((s) => s.toLowerCase().includes(hay)),
        )
        .sort((a, b) => b.profileComplete - a.profileComplete);
    }
    return discoverTalentForOrg(orgId, apps, { q: search });
  }, [apiApps, apiMode, orgId, poolRows, search]);

  return { talent, loading, errorMessage, apiMode };
}
