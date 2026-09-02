import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "@tanstack/react-router";
import { Button, Input } from "@lumenx/ui";
import { Building2, MapPin, Search, Star, Users } from "lucide-react";
import { cn } from "@lumenx/ui";
import type { InstituteKind } from "@lumenx/types";
import {
  filterInstitutes,
  getInstituteById,
  INSTITUTE_KIND_LABEL,
  listAllInstitutes,
  LOCATIONS,
  readInstitutesScroll,
  saveInstitutesScroll,
  setSelectedInstituteId,
  getSelectedInstituteId,
} from "@/lib/institutes-data";
import { InstituteDetailPanel } from "./InstituteDetailPanel";

export function InstitutesBrowsePage({
  selectedId,
  initialState,
  initialCity,
}: {
  selectedId?: string;
  initialState?: string;
  initialCity?: string;
}) {
  const [q, setQ] = useState("");
  const [state, setState] = useState(initialState ?? "all");
  const [city, setCity] = useState(initialCity ?? "all");
  const [kind, setKind] = useState<InstituteKind | "all">("all");
  const listRef = useRef<HTMLDivElement>(null);

  const filtered = useMemo(
    () => filterInstitutes({ q, state, city, kind }),
    [q, state, city, kind],
  );

  const activeId = selectedId ?? getSelectedInstituteId() ?? filtered[0]?.id;
  const active = activeId ? getInstituteById(activeId) : undefined;

  useEffect(() => {
    const el = listRef.current;
    if (!el) return;
    el.scrollTop = readInstitutesScroll();
    const onScroll = () => saveInstitutesScroll(el.scrollTop);
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, []);

  const citiesInState = useMemo(() => {
    if (state === "all") return LOCATIONS.cities;
    return [
      ...new Set(listAllInstitutes().filter((i) => i.state === state).map((i) => i.city)),
    ].sort();
  }, [state]);

  return (
    <div className="animate-in fade-in duration-300">
      <div className="mb-4">
        <h1 className="font-display text-2xl font-bold sm:text-3xl">Explore institutes</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Browse schools and colleges · filter by location · tap for full details
        </p>
      </div>

      <div className="mb-4 flex flex-col gap-2 sm:flex-row sm:flex-wrap">
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
      </div>

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
        {/* Institute list — independent scroll, persists across navigation */}
        <div
          ref={listRef}
          className="lg:w-[min(100%,320px)] lg:shrink-0 lg:sticky lg:top-20 lg:max-h-[calc(100vh-7rem)] lg:overflow-y-auto lg:rounded-2xl lg:border lg:border-border lg:bg-card/50 lg:p-2 lg:scrollbar-thin"
          style={{ WebkitOverflowScrolling: "touch" }}
        >
          <p className="mb-2 px-1 text-xs text-muted-foreground lg:px-2">
            {filtered.length} institutes
          </p>
          <div className="space-y-2">
            {filtered.map((inst) => (
              <Link
                key={inst.id}
                to="/institutes/$instituteId"
                params={{ instituteId: inst.id }}
                onClick={() => setSelectedInstituteId(inst.id)}
                className={cn(
                  "block rounded-2xl border p-4 transition-all motion-safe:hover:border-primary/30 motion-safe:hover:shadow-md",
                  activeId === inst.id
                    ? "border-primary/40 bg-primary/5 shadow-sm"
                    : "border-border bg-card",
                )}
              >
                <div className={cn("mb-3 h-16 rounded-xl bg-gradient-to-br", inst.imageGradient)} />
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-sm leading-snug line-clamp-2">{inst.name}</p>
                    <p className="mt-0.5 flex items-center gap-1 text-xs text-muted-foreground">
                      <MapPin className="size-3 shrink-0" />
                      {inst.city}, {inst.state}
                    </p>
                  </div>
                  <span className="flex shrink-0 items-center gap-0.5 text-xs font-medium text-primary">
                    <Star className="size-3 fill-primary" /> {inst.rating}
                  </span>
                </div>
                <p className="mt-2 text-xs text-muted-foreground line-clamp-2">{inst.tagline}</p>
                <div className="mt-3 flex flex-wrap gap-2 text-[10px]">
                  <span className="rounded-full bg-muted px-2 py-0.5">
                    {INSTITUTE_KIND_LABEL[inst.kind]}
                  </span>
                  <span className="rounded-full bg-primary/10 px-2 py-0.5 text-primary">
                    {inst.heroStat}
                  </span>
                  <span className="rounded-full bg-muted px-2 py-0.5">{inst.seatsOpen} seats</span>
                </div>
              </Link>
            ))}
            {filtered.length === 0 && (
              <p className="py-8 text-center text-sm text-muted-foreground">
                No institutes match your filters.
              </p>
            )}
          </div>
        </div>

        {/* Detail panel — desktop inline; mobile uses separate route */}
        <div className="hidden min-w-0 flex-1 lg:block">
          {active ? (
            <InstituteDetailPanel institute={active} />
          ) : (
            <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-border py-20 text-center">
              <Building2 className="size-10 text-muted-foreground" />
              <p className="mt-3 text-sm text-muted-foreground">
                Select an institute to view full details
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Mobile hint */}
      <p className="mt-4 text-center text-xs text-muted-foreground lg:hidden">
        Tap an institute card to open full details
      </p>
    </div>
  );
}

export function InstitutePreviewStrip() {
  const preview = listAllInstitutes().slice(0, 4);
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <h2 className="font-display text-lg font-bold">Featured institutes</h2>
        <Link to="/institutes" className="text-xs text-primary hover:underline">
          View all
        </Link>
      </div>
      <div className="flex gap-3 overflow-x-auto pb-2 -mx-1 px-1 snap-x snap-mandatory scrollbar-thin">
        {preview.map((inst) => (
          <Link
            key={inst.id}
            to="/institutes/$instituteId"
            params={{ instituteId: inst.id }}
            className="snap-start shrink-0 w-[min(85vw,280px)] rounded-2xl border border-border bg-card p-4 shadow-soft"
          >
            <div className={cn("mb-3 h-20 rounded-xl bg-gradient-to-br", inst.imageGradient)} />
            <p className="font-semibold text-sm">{inst.name}</p>
            <p className="text-xs text-muted-foreground mt-1">
              {inst.city} · {inst.heroStat}
            </p>
            <div className="mt-2 flex items-center gap-2 text-xs text-primary">
              <Users className="size-3" /> {inst.seatsOpen} seats open
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
