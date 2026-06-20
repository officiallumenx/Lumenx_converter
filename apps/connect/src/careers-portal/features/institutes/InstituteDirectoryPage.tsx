import { Link } from "@tanstack/react-router";
import { useState } from "react";
import { Input } from "@lumenx/ui";
import { Search } from "lucide-react";
import { CareersPageHeader } from "@/careers-portal/shared/ui/CareersPageHeader";
import { InstituteCareerCard } from "@/careers-portal/shared/ui/v2/CareersV2Widgets";
import { filterInstitutes, INSTITUTE_TYPE_LABEL } from "@/lib/careers/institute-profiles";

export function InstituteDirectoryPage() {
  const [q, setQ] = useState("");
  const [type, setType] = useState("all");
  const institutes = filterInstitutes({ q: q || undefined, type: type !== "all" ? type : undefined });

  return (
    <div className="animate-in fade-in duration-300 space-y-6">
      <CareersPageHeader title="Institute career pages" subtitle="Explore culture, benefits, and open roles at leading institutes" />

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Search institutes…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select
          className="h-10 rounded-md border border-border bg-background px-3 text-sm"
          value={type}
          onChange={(e) => setType(e.target.value)}
        >
          <option value="all">All types</option>
          {Object.entries(INSTITUTE_TYPE_LABEL).map(([k, v]) => (
            <option key={k} value={k}>{v}</option>
          ))}
        </select>
      </div>

      {institutes.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-12">No institutes match your search.</p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {institutes.map((inst) => (
            <Link key={inst.instituteId} to="/careers/institutes/$instituteId" params={{ instituteId: inst.instituteId }}>
              <InstituteCareerCard
                name={inst.name}
                tagline={inst.tagline}
                city={inst.city}
                state={inst.state}
                logoInitials={inst.logoInitials}
                logoGradient={inst.logoGradient}
                openRolesCount={inst.openRolesCount}
                featured={inst.featured}
              />
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
