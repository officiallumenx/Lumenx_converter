import { Link } from "@tanstack/react-router";
import { cn } from "@lumenx/ui";
import { SOLUTIONS, type SolutionId } from "@/content/solutions";
import { PRODUCT_FAMILY } from "@/theme/products";
import { cycleTabKey, useTabFocus } from "@/components/home/tabKeys";
import { ProductBadge } from "../product/ProductBadge";
import { ProductMark } from "../product/ProductMark";
import { CTAButton } from "../conversion/CTAButton";
import { SolutionCard } from "../content/SolutionCard";
import { Grid } from "../layout/Grid";

export function SolutionsExplorer({
  role,
  onRoleChange,
}: {
  role: SolutionId;
  onRoleChange: (id: SolutionId) => void;
}) {
  const ids = SOLUTIONS.map((item) => item.id);
  const { setRef, focus } = useTabFocus<SolutionId>();
  const view = SOLUTIONS.find((item) => item.id === role) ?? SOLUTIONS[0];

  return (
    <div>
      <div
        className="home-role-tabs"
        role="tablist"
        aria-label="Who LumenX is for"
        onKeyDown={(event) => cycleTabKey(event, ids, view.id, onRoleChange, focus)}
      >
        {SOLUTIONS.map((item) => (
          <button
            key={item.id}
            ref={setRef(item.id)}
            type="button"
            role="tab"
            id={`solution-tab-${item.id}`}
            aria-selected={item.id === view.id}
            aria-controls="solution-panel"
            tabIndex={item.id === view.id ? 0 : -1}
            className={cn("site-product-nav__item")}
            onClick={() => onRoleChange(item.id)}
          >
            {item.title}
          </button>
        ))}
      </div>

      <div
        key={view.id}
        id="solution-panel"
        role="tabpanel"
        aria-labelledby={`solution-tab-${view.id}`}
        className="mt-8 site-card site-crossfade"
        data-product={view.product}
      >
        <div className="flex flex-wrap items-start gap-4">
          <ProductMark product={view.product} size="lg" />
          <div className="min-w-0 flex-1">
            <p className="site-kicker mb-2">{PRODUCT_FAMILY[view.product].name}</p>
            <h2 className="text-2xl font-semibold tracking-tight">{view.title}</h2>
            <p className="mt-2 max-w-2xl text-muted-foreground">{view.outcome}</p>
            <p className="mt-4 max-w-2xl text-sm leading-relaxed text-muted-foreground">{view.narrative}</p>
            <ul className="mt-5 grid gap-2 sm:grid-cols-3">
              {view.points.map((point) => (
                <li key={point} className="rounded-lg border bg-muted/40 p-4 text-sm">
                  {point}
                </li>
              ))}
            </ul>
            <div className="mt-6 flex flex-wrap items-center gap-2">
              {view.products.map((id) => (
                <Link key={id} to="/products/$slug" params={{ slug: id }} className="inline-flex">
                  <ProductBadge product={id} />
                </Link>
              ))}
            </div>
            <CTAButton asChild className="mt-6">
              <Link to="/products/$slug" params={{ slug: view.product }}>
                Explore {PRODUCT_FAMILY[view.product].shortName}
              </Link>
            </CTAButton>
          </div>
        </div>
      </div>

      <Grid columns={2} stagger className="mt-10">
        {SOLUTIONS.map((item) => (
          <button
            key={item.id}
            type="button"
            className="w-full text-left"
            onClick={() => onRoleChange(item.id)}
            aria-pressed={item.id === view.id}
          >
            <SolutionCard
              product={item.product}
              icon={item.icon}
              title={item.title}
              outcome={item.outcome}
              points={item.points}
              action={
                <p className="mt-3 text-xs font-medium uppercase tracking-[0.12em]">
                  {item.id === view.id ? "Showing above" : "Open this view"}
                </p>
              }
            />
          </button>
        ))}
      </Grid>
    </div>
  );
}
