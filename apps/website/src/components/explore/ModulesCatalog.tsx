import { Link } from "@tanstack/react-router";
import { cn } from "@lumenx/ui";
import { MODULE_SECTIONS, type ModuleSectionId } from "@/content/modules";
import { PRODUCT_FAMILY } from "@/theme/products";
import { FeatureCard } from "../content/FeatureCard";
import { ProductBadge } from "../product/ProductBadge";
import { cycleTabKey, useTabFocus } from "@/components/home/tabKeys";

export function ModulesCatalog({
  section,
  onSectionChange,
}: {
  section: ModuleSectionId;
  onSectionChange: (id: ModuleSectionId) => void;
}) {
  const ids = MODULE_SECTIONS.map((item) => item.id);
  const { setRef, focus } = useTabFocus<ModuleSectionId>();

  return (
    <div>
      <div
        className="home-role-tabs"
        role="tablist"
        aria-label="Module apps"
        onKeyDown={(event) => cycleTabKey(event, ids, section, onSectionChange, focus)}
      >
        {MODULE_SECTIONS.map((item) => (
          <button
            key={item.id}
            ref={setRef(item.id)}
            type="button"
            role="tab"
            aria-selected={item.id === section}
            aria-controls={`module-${item.id}`}
            tabIndex={item.id === section ? 0 : -1}
            className={cn("site-product-nav__item")}
            onClick={() => onSectionChange(item.id)}
          >
            {item.title}
          </button>
        ))}
      </div>

      <div className="mt-10 grid gap-12">
        {MODULE_SECTIONS.map((item) => (
          <article
            key={item.id}
            id={`module-${item.id}`}
            className={cn("scroll-mt-28", item.id === section && "site-crossfade")}
          >
            <div className="flex flex-wrap items-end justify-between gap-4">
              <div className="max-w-2xl">
                <h2 className="text-xl font-semibold tracking-tight">{item.title} modules</h2>
                <p className="mt-1 text-sm text-muted-foreground">{item.lede}</p>
              </div>
              <Link to="/products/$slug" params={{ slug: item.product }} className="inline-flex">
                <ProductBadge product={item.product} />
              </Link>
            </div>

            <div className="mt-6 grid gap-8">
              {item.buckets.map((bucket) => (
                <div key={bucket.id}>
                  <h3 className="text-base font-semibold tracking-tight">{bucket.title}</h3>
                  {bucket.lede ? (
                    <p className="mt-1 max-w-2xl text-sm text-muted-foreground">{bucket.lede}</p>
                  ) : null}
                  <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    {bucket.items.map((mod) => (
                      <FeatureCard key={`${bucket.id}-${mod.name}`} title={mod.name} product={item.product}>
                        <p>{mod.blurb}</p>
                      </FeatureCard>
                    ))}
                  </div>
                </div>
              ))}
            </div>

            <p className="mt-4 text-sm text-muted-foreground">
              Surface: {PRODUCT_FAMILY[item.product].name}
              {item.id === "connect" ? " — Parent, Teacher, and Student portals" : null}
              {item.id === "admissions" || item.id === "careers" ? " (via Connect portals)" : null}
            </p>
          </article>
        ))}
      </div>
    </div>
  );
}
