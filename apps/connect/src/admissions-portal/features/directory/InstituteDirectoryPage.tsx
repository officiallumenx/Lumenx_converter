import { useMemo, useState } from "react";
import { Input } from "@lumenx/ui";
import { Search, Sparkles, TrendingUp, Clock } from "lucide-react";
import type { InstituteKind } from "@lumenx/types";
import {
  ADMISSION_INSTITUTES,
  filterInstitutes,
  LOCATIONS,
  INSTITUTE_KIND_LABEL,
} from "@/lib/admissions/institutes-data";
import {
  getFeaturedInstitutes,
  getPopularInstitutes,
  getRecentlyAddedInstitutes,
} from "@/lib/admissions/institute-profiles";
import { InstituteDirectoryCard } from "@/admissions-portal/shared/ui/v2/AdmissionsV2Widgets";
import { useAdmissionsAuth } from "@/admissions-portal/core/AdmissionsAuthProvider";
import { toggleSavedInstitute } from "@/lib/admissions/saved-store";
import { SectionCard } from "@/components/app/SectionCard";

type SortKey = "rating" | "seats" | "name" | "recent";

export function InstituteDirectoryPage({
  initialState,
  initialCity,
}: {
  initialState?: string;
  initialCity?: string;
}) {
  const { user } = useAdmissionsAuth();
  const [q, setQ] = useState("");
  const [state, setState] = useState(initialState ?? "all");
  const [city, setCity] = useState(initialCity ?? "all");
  const [kind, setKind] = useState<InstituteKind | "all">("all");
  const [sort, setSort] = useState<SortKey>("rating");
  const [, refresh] = useState(0);

  const filtered = useMemo(() => {
    let list = filterInstitutes({ q, state, city, kind });
    const featured = new Set(getFeaturedInstitutes());
    const popular = new Set(getPopularInstitutes());
    const recent = new Set(getRecentlyAddedInstitutes(6));

    list = [...list].sort((a, b) => {
      if (sort === "rating") return b.rating - a.rating;
      if (sort === "seats") return b.seatsOpen - a.seatsOpen;
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "recent") {
        const ar = recent.has(a.id) ? 1 : 0;
        const br = recent.has(b.id) ? 1 : 0;
        return br - ar || b.rating - a.rating;
      }
      return 0;
    });
    return { list, featured, popular, recent };
  }, [q, state, city, kind, sort]);

  const citiesInState = useMemo(() => {
    if (state === "all") return LOCATIONS.cities;
    return [
      ...new Set(ADMISSION_INSTITUTES.filter((i) => i.state === state).map((i) => i.city)),
    ].sort();
  }, [state]);

  const featuredList = filtered.list.filter((i) => filtered.featured.has(i.id));
  const popularList = filtered.list.filter((i) => filtered.popular.has(i.id));
  const recentList = filtered.list.filter((i) => filtered.recent.has(i.id));

  const renderGrid = (items: typeof filtered.list) => (
    <div className="grid gap-4 sm:grid-cols-2">
      {items.map((inst) => (
        <InstituteDirectoryCard
          key={inst.id}
          institute={inst}
          onSaveToggle={() => {
            if (user) {
              toggleSavedInstitute(user.id, inst.id);
              refresh((n) => n + 1);
            }
          }}
        />
      ))}
    </div>
  );

  return (
    <div className="animate-in fade-in duration-300 space-y-8">
      <div>
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Institute directory</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Discover, compare, and apply to participating schools and colleges
        </p>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Search name, city, code…"
            className="pl-9"
          />
        </div>
        <select
          value={state}
          onChange={(e) => {
            setState(e.target.value);
            setCity("all");
          }}
          aria-label="Filter by state"
          className="h-10 rounded-md border border-border bg-background px-3 text-sm"
        >
          <option value="all">All states</option>
          {LOCATIONS.states.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          value={city}
          onChange={(e) => setCity(e.target.value)}
          aria-label="Filter by city"
          className="h-10 rounded-md border border-border bg-background px-3 text-sm"
        >
          <option value="all">All cities</option>
          {citiesInState.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          value={kind}
          onChange={(e) => setKind(e.target.value as InstituteKind | "all")}
          aria-label="Filter by type"
          className="h-10 rounded-md border border-border bg-background px-3 text-sm"
        >
          <option value="all">All types</option>
          {(Object.keys(INSTITUTE_KIND_LABEL) as InstituteKind[]).map((k) => (
            <option key={k} value={k}>
              {INSTITUTE_KIND_LABEL[k]}
            </option>
          ))}
        </select>
        <select
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          aria-label="Sort results"
          className="h-10 rounded-md border border-border bg-background px-3 text-sm"
        >
          <option value="rating">Sort: Rating</option>
          <option value="seats">Sort: Seats open</option>
          <option value="name">Sort: Name</option>
          <option value="recent">Sort: Recently added</option>
        </select>
      </div>

      {!q && state === "all" && city === "all" && kind === "all" && (
        <>
          {featuredList.length > 0 && (
            <SectionCard title="Featured institutes" hint="Highlighted partners">
              <div className="flex items-center gap-2 text-primary text-xs mb-3">
                <Sparkles className="size-3.5" /> Curated for 2026–27 admissions
              </div>
              {renderGrid(featuredList)}
            </SectionCard>
          )}
          {popularList.length > 0 && (
            <SectionCard title="Popular institutes">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-3">
                <TrendingUp className="size-3.5" /> Most viewed this season
              </div>
              {renderGrid(popularList)}
            </SectionCard>
          )}
          {recentList.length > 0 && (
            <SectionCard title="Recently added">
              <div className="flex items-center gap-2 text-muted-foreground text-xs mb-3">
                <Clock className="size-3.5" /> New on LumenX Admissions
              </div>
              {renderGrid(recentList)}
            </SectionCard>
          )}
        </>
      )}

      <SectionCard title={`All institutes (${filtered.list.length})`}>
        {filtered.list.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">
            No institutes match your filters.
          </p>
        ) : (
          renderGrid(filtered.list)
        )}
      </SectionCard>
    </div>
  );
}
