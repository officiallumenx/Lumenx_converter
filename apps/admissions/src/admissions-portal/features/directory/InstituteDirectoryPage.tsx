import { useEffect, useMemo, useState } from "react";
import { Input } from "@lumenx/ui";
import { Search } from "lucide-react";
import type { InstituteKind } from "@lumenx/types";
import { isApiAuthMode } from "@/auth/auth-mode";
import { loadAdmissionsDirectoryProfiles } from "@/lib/admissions/api-institute-directory";
import {
  filterInstitutes,
  listAllInstitutes,
  LOCATIONS,
  INSTITUTE_KIND_LABEL,
} from "@/lib/institutes-data";
import type { AdmissionInstituteProfile } from "@/lib/admissions/institutes-data";
import { InstituteDirectoryCard } from "@/admissions-portal/shared/ui/v2/AdmissionsV2Widgets";
import { useAdmissionsAuth } from "@/admissions-portal/core/AdmissionsAuthProvider";
import { toggleSavedInstitute } from "@/lib/admissions/saved-store";
import { SectionCard } from "@/components/app/SectionCard";

type SortKey = "rating" | "seats" | "name" | "recent";

function filterApiInstitutes(
  items: AdmissionInstituteProfile[],
  opts: { q: string; state: string; city: string; kind: InstituteKind | "all" },
) {
  return items.filter((i) => {
    if (opts.kind !== "all" && i.kind !== opts.kind) return false;
    if (opts.state !== "all" && i.state && i.state !== opts.state) return false;
    if (opts.city !== "all" && i.city && i.city !== opts.city) return false;
    if (opts.q) {
      const hay = `${i.name} ${i.code} ${i.city} ${i.state}`.toLowerCase();
      if (!hay.includes(opts.q.toLowerCase())) return false;
    }
    return true;
  });
}

export function InstituteDirectoryPage({
  initialState,
  initialCity,
}: {
  initialState?: string;
  initialCity?: string;
}) {
  const apiMode = isApiAuthMode();
  const { user } = useAdmissionsAuth();
  const [q, setQ] = useState("");
  const [state, setState] = useState(initialState ?? "all");
  const [city, setCity] = useState(initialCity ?? "all");
  const [kind, setKind] = useState<InstituteKind | "all">("all");
  const [sort, setSort] = useState<SortKey>("name");
  const [, refresh] = useState(0);
  const [apiItems, setApiItems] = useState<AdmissionInstituteProfile[]>([]);
  const [loading, setLoading] = useState(apiMode);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!apiMode) return;
    let cancelled = false;
    setLoading(true);
    setError(null);
    void loadAdmissionsDirectoryProfiles()
      .then((rows) => {
        if (!cancelled) setApiItems(rows);
      })
      .catch((err) => {
        if (!cancelled) {
          setApiItems([]);
          setError(err instanceof Error ? err.message : "Unable to load institutes.");
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [apiMode]);

  const filtered = useMemo(() => {
    let list = apiMode
      ? filterApiInstitutes(apiItems, { q, state, city, kind })
      : filterInstitutes({ q, state, city, kind });

    list = [...list].sort((a, b) => {
      if (sort === "rating") return b.rating - a.rating;
      if (sort === "seats") return b.seatsOpen - a.seatsOpen;
      if (sort === "name") return a.name.localeCompare(b.name);
      return b.rating - a.rating;
    });
    return { list };
  }, [apiMode, apiItems, q, state, city, kind, sort]);

  const citiesInState = useMemo(() => {
    const source = apiMode ? apiItems : listAllInstitutes();
    if (state === "all") {
      return [...new Set(source.map((i) => i.city).filter(Boolean))].sort();
    }
    return [...new Set(source.filter((i) => i.state === state).map((i) => i.city).filter(Boolean))].sort();
  }, [apiMode, apiItems, state]);

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

  if (apiMode && loading) {
    return (
      <div className="py-12 text-center text-sm text-muted-foreground">Loading institutes…</div>
    );
  }

  if (apiMode && error) {
    return <div className="py-12 text-center text-sm text-destructive">{error}</div>;
  }

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
            className="pl-9"
            placeholder="Search institutes…"
          />
        </div>
        <select
          className="h-10 rounded-md border border-border bg-background px-3 text-sm"
          value={state}
          onChange={(e) => {
            setState(e.target.value);
            setCity("all");
          }}
          aria-label="Filter by state"
        >
          <option value="all">All states</option>
          {(apiMode
            ? [...new Set(apiItems.map((i) => i.state).filter(Boolean))].sort()
            : LOCATIONS.states
          ).map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <select
          className="h-10 rounded-md border border-border bg-background px-3 text-sm"
          value={city}
          onChange={(e) => setCity(e.target.value)}
          aria-label="Filter by city"
        >
          <option value="all">All cities</option>
          {citiesInState.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
        <select
          className="h-10 rounded-md border border-border bg-background px-3 text-sm"
          value={kind}
          onChange={(e) => setKind(e.target.value as InstituteKind | "all")}
          aria-label="Filter by kind"
        >
          <option value="all">All types</option>
          {Object.entries(INSTITUTE_KIND_LABEL).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        <select
          className="h-10 rounded-md border border-border bg-background px-3 text-sm"
          value={sort}
          onChange={(e) => setSort(e.target.value as SortKey)}
          aria-label="Sort"
        >
          <option value="name">Name</option>
          {!apiMode && <option value="rating">Rating</option>}
          {!apiMode && <option value="seats">Seats</option>}
        </select>
      </div>

      <SectionCard title={`${filtered.list.length} institutes`}>
        {filtered.list.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">
            No institutes match your filters.
          </p>
        ) : (
          renderGrid(filtered.list)
        )}
      </SectionCard>
    </div>
  );
}
