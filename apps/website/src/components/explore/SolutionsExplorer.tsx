import { useEffect, useState } from "react";
import { Link } from "@tanstack/react-router";
import { cn } from "@lumenx/ui";
import { SOLUTIONS } from "@/content/solutions";
import {
  PUBLIC_SOLUTION_IDS,
  SOLUTION_PAGES,
  type PublicSolutionId,
} from "@/content/solution-pages";
import { PRODUCT_FAMILY } from "@/theme/products";
import { cycleTabKey, useTabFocus } from "@/components/home/tabKeys";
import { ProductBadge } from "../product/ProductBadge";
import { ProductMark } from "../product/ProductMark";
import { FeatureCard } from "../content/FeatureCard";
import { Grid } from "../layout/Grid";
import { SiteCard } from "../SiteCard";

export type SolutionsCatalogTab = "all" | PublicSolutionId;

const PUBLIC_SOLUTIONS = PUBLIC_SOLUTION_IDS.map((id) => {
  const view = SOLUTIONS.find((item) => item.id === id)!;
  const page = SOLUTION_PAGES[id];
  return { view, page };
});

const TABS: { id: SolutionsCatalogTab; label: string }[] = [
  { id: "all", label: "All solutions" },
  ...PUBLIC_SOLUTIONS.map(({ view }) => ({
    id: view.id as SolutionsCatalogTab,
    label: view.title,
  })),
];

export function SolutionsExplorer({
  role,
  onRoleChange,
}: {
  role: SolutionsCatalogTab;
  onRoleChange: (id: SolutionsCatalogTab) => void;
}) {
  const ids = TABS.map((tab) => tab.id);
  const { setRef, focus } = useTabFocus<SolutionsCatalogTab>();
  const [pendingScroll, setPendingScroll] = useState<SolutionsCatalogTab | null>(null);

  useEffect(() => {
    if (!pendingScroll || pendingScroll === "all") return;
    document.getElementById(`solution-${pendingScroll}`)?.scrollIntoView({
      behavior: "smooth",
      block: "start",
    });
    setPendingScroll(null);
  }, [pendingScroll]);

  function selectTab(id: SolutionsCatalogTab) {
    onRoleChange(id);
    if (id !== "all") setPendingScroll(id);
    else window.scrollTo({ top: 0, behavior: "smooth" });
  }

  return (
    <div>
      <div
        className="home-role-tabs sticky top-[calc(var(--site-header-h)+0.5rem)] z-10 -mx-1 mb-5 overflow-x-auto bg-background/90 px-1 py-1 backdrop-blur"
        role="tablist"
        aria-label="Solutions by audience"
        onKeyDown={(event) => cycleTabKey(event, ids, role, selectTab, focus)}
      >
        {TABS.map((tab) => (
          <button
            key={tab.id}
            ref={setRef(tab.id)}
            type="button"
            role="tab"
            aria-selected={role === tab.id}
            tabIndex={role === tab.id ? 0 : -1}
            className={cn("site-product-nav__item")}
            onClick={() => selectTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="grid gap-8">
        {PUBLIC_SOLUTIONS.map(({ view, page }) => {
          const Icon = view.icon;
          return (
            <article
              key={view.id}
              id={`solution-${view.id}`}
              data-product={view.product}
              className={cn(
                "site-catalog-section scroll-mt-28",
                role === view.id && "site-catalog-section--active site-crossfade",
              )}
            >
              <header className="site-catalog-section__head">
                <div className="flex min-w-0 items-start gap-3">
                  <ProductMark product={view.product} />
                  <div className="min-w-0 max-w-2xl">
                    <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                      {PRODUCT_FAMILY[view.product].name}
                    </p>
                    <h2 className="mt-0.5 flex flex-wrap items-center gap-2 text-xl font-semibold tracking-tight">
                      <Icon className="size-5 text-foreground/70" aria-hidden />
                      {view.title}
                    </h2>
                    <p className="mt-1 text-sm font-medium tracking-tight">{page.headline}</p>
                    {view.outcome !== page.headline ? (
                      <p className="mt-1 text-sm leading-relaxed text-muted-foreground">{view.outcome}</p>
                    ) : null}
                    <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{view.narrative}</p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  {view.products.map((id) => (
                    <Link key={id} to="/platform/$slug" params={{ slug: id }} className="inline-flex">
                      <ProductBadge product={id} />
                    </Link>
                  ))}
                </div>
              </header>

              <div className="site-catalog-section__body">
                <div className="site-catalog-bucket">
                  <h3 className="site-catalog-bucket__title">How the work moves</h3>
                  <Grid columns={3} stagger className="mt-3">
                    {page.workflow.map((step) => (
                      <SiteCard key={step.title} quiet>
                        <h4 className="text-sm font-semibold tracking-tight">{step.title}</h4>
                        <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{step.body}</p>
                      </SiteCard>
                    ))}
                  </Grid>
                </div>

                <div className="site-catalog-bucket">
                  <h3 className="site-catalog-bucket__title">What they actually use</h3>
                  <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {page.capabilities.map((item) => (
                      <FeatureCard key={item} title={item} product={view.product} />
                    ))}
                  </div>
                  <ul className="mt-4 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground sm:columns-2 sm:gap-x-10">
                    {view.points.map((point) => (
                      <li key={point} className="break-inside-avoid">
                        {point}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
