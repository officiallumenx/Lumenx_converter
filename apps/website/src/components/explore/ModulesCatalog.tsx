import { useEffect, useMemo, useState } from "react";
import { Link } from "@tanstack/react-router";
import { cn, Input } from "@lumenx/ui";
import {
  MODULE_SECTIONS,
  type ModuleSection,
  type ModuleSectionId,
} from "@/content/modules";
import { PRODUCT_FAMILY } from "@/theme/products";
import { FeatureCard } from "../content/FeatureCard";
import { ProductBadge } from "../product/ProductBadge";
import { ProductMark } from "../product/ProductMark";
import { cycleTabKey, useTabFocus } from "@/components/home/tabKeys";

export type ModulesCatalogTab = "all" | ModuleSectionId;

const TABS: { id: ModulesCatalogTab; label: string }[] = [
  { id: "all", label: "All modules" },
  ...MODULE_SECTIONS.map((section) => ({
    id: section.id as ModulesCatalogTab,
    label: section.title,
  })),
];

function sectionMatches(section: ModuleSection, query: string): ModuleSection | null {
  if (!query) return section;
  const buckets = section.buckets
    .map((bucket) => {
      const bucketHit =
        bucket.title.toLowerCase().includes(query) ||
        (bucket.lede?.toLowerCase().includes(query) ?? false);
      const items = bucket.items.filter(
        (item) =>
          bucketHit ||
          item.name.toLowerCase().includes(query) ||
          item.blurb.toLowerCase().includes(query),
      );
      if (items.length === 0 && !bucketHit) return null;
      return { ...bucket, items: items.length > 0 ? items : bucket.items };
    })
    .filter((bucket): bucket is NonNullable<typeof bucket> => bucket !== null);

  if (buckets.length === 0) {
    if (
      section.title.toLowerCase().includes(query) ||
      section.lede.toLowerCase().includes(query)
    ) {
      return section;
    }
    return null;
  }
  return { ...section, buckets };
}

export function ModulesCatalog({
  section,
  onSectionChange,
  query,
  onQueryChange,
}: {
  section: ModulesCatalogTab;
  onSectionChange: (id: ModulesCatalogTab) => void;
  query: string;
  onQueryChange: (value: string) => void;
}) {
  const ids = TABS.map((tab) => tab.id);
  const { setRef, focus } = useTabFocus<ModulesCatalogTab>();
  const [pendingScroll, setPendingScroll] = useState<ModulesCatalogTab | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return MODULE_SECTIONS.map((item) => sectionMatches(item, q)).filter(
      (item): item is ModuleSection => item !== null,
    );
  }, [query]);

  // Always keep every matching app on one page; tabs only jump / highlight.
  const visible = filtered;

  useEffect(() => {
    if (!pendingScroll || pendingScroll === "all") return;
    const node = document.getElementById(`module-${pendingScroll}`);
    node?.scrollIntoView({ behavior: "smooth", block: "start" });
    setPendingScroll(null);
  }, [pendingScroll, visible]);

  function selectTab(id: ModulesCatalogTab) {
    onSectionChange(id);
    if (id !== "all") setPendingScroll(id);
    else window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div>
      <div className="mb-3 max-w-md">
        <label htmlFor="modules-search" className="sr-only">
          Search modules
        </label>
        <Input
          id="modules-search"
          type="search"
          value={query}
          onChange={(event) => onQueryChange(event.target.value)}
          placeholder="Search modules…"
          className="site-input"
        />
      </div>

      <div
        className="home-role-tabs sticky top-[calc(var(--site-header-h)+0.5rem)] z-10 -mx-1 mb-5 overflow-x-auto bg-background/90 px-1 py-1 backdrop-blur"
        role="tablist"
        aria-label="Module apps"
        onKeyDown={(event) => cycleTabKey(event, ids, section, selectTab, focus)}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            ref={setRef(tab.id)}
            type="button"
            role="tab"
            aria-selected={section === tab.id}
            tabIndex={section === tab.id ? 0 : -1}
            className={cn("site-product-nav__item")}
            onClick={() => selectTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-muted-foreground" role="status">
          No modules match that search. Try another term or clear the filter.
        </p>
      ) : (
        <div className="grid gap-8">
          {visible.map((item) => (
            <article
              key={item.id}
              id={`module-${item.id}`}
              data-product={item.product}
              className={cn(
                "site-catalog-section scroll-mt-28",
                section === item.id && "site-catalog-section--active site-crossfade",
              )}
            >
              <header className="site-catalog-section__head">
                <div className="flex min-w-0 items-start gap-3">
                  <ProductMark product={item.product} />
                  <div className="min-w-0 max-w-2xl">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {item.id === "connect"
                        ? "Connect · Parent, Teacher & Student"
                        : `${item.title} modules`}
                    </p>
                    <h2 className="mt-0.5 text-xl font-semibold tracking-tight">{item.title}</h2>
                    <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{item.lede}</p>
                  </div>
                </div>
                <Link to="/platform/$slug" params={{ slug: item.product }} className="inline-flex shrink-0">
                  <ProductBadge product={item.product} />
                </Link>
              </header>

              <div className="site-catalog-section__body">
                {item.buckets.map((bucket) => (
                  <div key={bucket.id} className="site-catalog-bucket">
                    <h3 className="site-catalog-bucket__title">{bucket.title}</h3>
                    {bucket.lede ? (
                      <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{bucket.lede}</p>
                    ) : null}
                    <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                      {bucket.items.map((mod) => (
                        <FeatureCard
                          key={`${bucket.id}-${mod.name}`}
                          title={mod.name}
                          product={item.product}
                        >
                          <p>{mod.blurb}</p>
                        </FeatureCard>
                      ))}
                    </div>
                  </div>
                ))}
              </div>

              <p className="site-catalog-section__foot">
                Surface: {PRODUCT_FAMILY[item.product].name}
                {item.id === "connect" ? " — Parent, Teacher, and Student portals" : null}
                {item.id === "admissions" ? " (via Connect portal)" : null}
                {item.id === "careers" ? " (Careers web app)" : null}
              </p>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
