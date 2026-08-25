import { Link } from "@tanstack/react-router";
import { cn } from "@lumenx/ui";
import { FEATURE_GROUPS, type FeatureGroupId } from "@/content/features";
import { PRODUCT_FAMILY } from "@/theme/products";
import { FeatureCard } from "../content/FeatureCard";
import { ProductBadge } from "../product/ProductBadge";
import { cycleTabKey, useTabFocus } from "@/components/home/tabKeys";

export function FeaturesCatalog({
  group,
  onGroupChange,
}: {
  group: FeatureGroupId;
  onGroupChange: (id: FeatureGroupId) => void;
}) {
  const ids = FEATURE_GROUPS.map((item) => item.id);
  const { setRef, focus } = useTabFocus<FeatureGroupId>();

  return (
    <div>
      <div
        className="home-role-tabs"
        role="tablist"
        aria-label="Feature categories"
        onKeyDown={(event) => cycleTabKey(event, ids, group, onGroupChange, focus)}
      >
        {FEATURE_GROUPS.map((item) => (
          <button
            key={item.id}
            ref={setRef(item.id)}
            type="button"
            role="tab"
            aria-selected={item.id === group}
            aria-controls={`feature-${item.id}`}
            tabIndex={item.id === group ? 0 : -1}
            className={cn("site-product-nav__item")}
            onClick={() => onGroupChange(item.id)}
          >
            {item.title}
          </button>
        ))}
      </div>

      <div className="mt-10 grid gap-10">
        {FEATURE_GROUPS.map((item) => (
          <article
            key={item.id}
            id={`feature-${item.id}`}
            className={cn("scroll-mt-28", item.id === group && "site-crossfade")}
          >
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="max-w-2xl">
                <h2 className="text-xl font-semibold tracking-tight">{item.title}</h2>
                <p className="mt-1 text-sm text-muted-foreground">{item.lede}</p>
              </div>
              <div className="flex flex-wrap gap-2">
                {item.related.map((id) => (
                  <Link key={id} to="/products/$slug" params={{ slug: id }} className="inline-flex">
                    <ProductBadge product={id} />
                  </Link>
                ))}
              </div>
            </div>
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {item.items.map((capability) => (
                <FeatureCard key={capability.name} title={capability.name} product={item.related[0]}>
                  <p>{capability.blurb}</p>
                  <p className="mt-2 text-[11px] font-medium uppercase tracking-[0.12em]">{capability.surfaces}</p>
                </FeatureCard>
              ))}
            </div>
            <p className="mt-3 text-sm text-muted-foreground">
              Surfaces: {item.related.map((id) => PRODUCT_FAMILY[id].shortName).join(" · ")}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
