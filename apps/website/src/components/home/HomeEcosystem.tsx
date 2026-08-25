import { useState } from "react";
import { Section } from "../layout/Section";
import { ProductMark } from "../product/ProductMark";
import { PRODUCT_FAMILY, PRODUCT_FAMILY_LIST, PRODUCT_IDS, type ProductId } from "@/theme/products";
import { HOME_SHOWCASE } from "@/content/home";
import { cn } from "@lumenx/ui";
import { cycleTabKey, useTabFocus } from "./tabKeys";
import { TiltSurface } from "../experience/TiltSurface";

const FLOW_ORDER: ProductId[] = [
  "admin",
  "connect",
  "transport",
  "admissions",
  "careers",
  "nexus",
];

export function HomeEcosystem() {
  const [active, setActive] = useState<ProductId>("connect");
  const { setRef, focus } = useTabFocus<ProductId>();
  const meta = PRODUCT_FAMILY[active];
  const story = HOME_SHOWCASE.find((item) => item.id === active);
  const flowIndex = Math.max(0, FLOW_ORDER.indexOf(active));

  return (
    <Section
      id="ecosystem"
      eyebrow="Ecosystem"
      title="Six products. One LumenX."
      lede="Each product has a role. Together they manage the institution — they share data, not another role’s navigation."
      tone="muted"
    >
      <div
        className="home-eco-select"
        role="tablist"
        aria-label="LumenX products"
        onKeyDown={(event) => cycleTabKey(event, PRODUCT_IDS, active, setActive, focus)}
      >
        {PRODUCT_FAMILY_LIST.map((p) => (
          <button
            key={p.id}
            ref={setRef(p.id)}
            type="button"
            role="tab"
            id={`eco-tab-${p.id}`}
            aria-selected={p.id === active}
            aria-controls="eco-panel"
            tabIndex={p.id === active ? 0 : -1}
            className={cn("site-product-nav__item")}
            onClick={() => setActive(p.id)}
          >
            {p.shortName}
          </button>
        ))}
      </div>

      <div className="home-eco-flow" aria-hidden>
        {FLOW_ORDER.map((id, i) => (
          <span
            key={id}
            data-product={id}
            className={cn("home-eco-flow__node", i <= flowIndex && "is-lit")}
          >
            {PRODUCT_FAMILY[id].shortName}
          </span>
        ))}
      </div>

      <div className="mt-8 grid gap-8 min-w-0 lg:grid-cols-[minmax(0,1fr)_20rem]">
        <div className="home-constellation" role="group" aria-label="Select a LumenX product">
          <div className="home-constellation__hub">
            <p className="text-sm font-semibold tracking-tight">LumenX</p>
            <p className="mt-1 max-w-[14rem] text-xs text-muted-foreground">
              Separate products. One institute record.
            </p>
          </div>
          {PRODUCT_FAMILY_LIST.map((p) => (
            <TiltSurface
              key={p.id}
              maxTilt={4}
              className={cn("min-w-0", `home-constellation__n-${p.id}`)}
            >
              <button
                type="button"
                data-product={p.id}
                aria-pressed={p.id === active}
                onClick={() => setActive(p.id)}
                className={cn(
                  "site-card site-card--product site-card--row text-left w-full h-full",
                  p.id === active ? "" : "site-card--quiet",
                )}
              >
                <ProductMark product={p.id} />
                <div className="min-w-0">
                  <p className="text-sm font-semibold tracking-tight">{p.shortName}</p>
                  <p className="text-xs text-muted-foreground">{p.role}</p>
                </div>
              </button>
            </TiltSurface>
          ))}
        </div>
        <aside
          key={active}
          id="eco-panel"
          role="tabpanel"
          aria-labelledby={`eco-tab-${active}`}
          className="site-card site-card--quiet site-crossfade"
          data-product={active}
        >
          <ProductMark product={active} size="lg" />
          <h3 className="mt-4 text-lg font-semibold tracking-tight">{meta.name}</h3>
          <p className="mt-2 text-sm text-muted-foreground">{story?.description}</p>
        </aside>
      </div>
    </Section>
  );
}
