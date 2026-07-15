import { useMemo, useState } from "react";
import { Input, Badge } from "@lumenx/ui";
import { Search, Sparkles } from "lucide-react";
import { SectionCard } from "@/components/app/SectionCard";
import { useCareersAuth } from "@/careers-portal/core/CareersAuthProvider";
import { CareersPageHeader } from "@/careers-portal/shared/ui/CareersPageHeader";
import { ProfileStrengthBadge } from "@/careers-portal/shared/ui/v2/CareersV2Widgets";
import { getApplicationsForOrganization } from "@/lib/careers/repositories";
import { discoverTalentForOrg } from "@/lib/careers/recruiter-talent";

export function RecruiterTalentPage() {
  const { user } = useCareersAuth();
  const [q, setQ] = useState("");

  const talent = useMemo(() => {
    if (!user?.organizationId) return [];
    const apps = getApplicationsForOrganization(user.organizationId);
    return discoverTalentForOrg(user.organizationId, apps, { q: q || undefined });
  }, [user?.organizationId, q]);

  if (!user?.organizationId) return null;

  return (
    <div className="animate-in fade-in duration-300 space-y-6">
      <CareersPageHeader
        title="Talent discovery"
        subtitle="Browse candidates from your talent pool, past applicants, and recommended profiles"
        backTo="/careers/recruiter"
      />

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <Input
          className="pl-9"
          placeholder="Search by name, headline, or skill…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
        />
      </div>

      <SectionCard title={`Candidates (${talent.length})`}>
        {talent.length === 0 ? (
          <p className="text-sm text-muted-foreground py-8 text-center">
            No talent matches your search.
          </p>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2">
            {talent.map((c) => (
              <div key={c.candidateId} className="rounded-xl border border-border p-4 space-y-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-medium truncate">{c.name}</p>
                    <p className="text-xs text-muted-foreground truncate">{c.headline}</p>
                  </div>
                  <ProfileStrengthBadge
                    strength={c.profileComplete >= 80 ? "Strong" : "Developing"}
                    percent={c.profileComplete}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {c.city}, {c.state} · {c.experienceYears} yrs exp
                </p>
                <div className="flex flex-wrap gap-1">
                  {c.skills.slice(0, 4).map((s) => (
                    <Badge key={s} variant="outline" className="text-[10px]">
                      {s}
                    </Badge>
                  ))}
                </div>
                <div className="flex items-center gap-2 text-[10px] text-muted-foreground">
                  <Sparkles className="size-3" />
                  <span className="capitalize">{c.source.replace(/_/g, " ")}</span>
                  {c.note && <span>· {c.note}</span>}
                </div>
              </div>
            ))}
          </div>
        )}
      </SectionCard>
    </div>
  );
}
