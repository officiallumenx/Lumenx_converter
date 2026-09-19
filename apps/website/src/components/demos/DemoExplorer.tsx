import { Link } from "@tanstack/react-router";
import { cn } from "@lumenx/ui";
import {
  DEMO_EXPLORE,
  DEMO_EXPLORE_IDS,
  type DemoExploreId,
  type DemoFlowId,
} from "@/content/demos";
import { PRODUCT_PAGES } from "@/content/product-pages";
import { PRODUCT_FAMILY } from "@/theme/products";
import { contactSearch } from "@/lib/search";
import { cycleTabKey, useTabFocus } from "../home/tabKeys";
import { ProductPreview } from "../product/ProductPreview";
import { ProductMark } from "../product/ProductMark";
import { CTAButton } from "../conversion/CTAButton";
import { DemoFlow } from "./DemoHub";

export function DemoExplorer({
  product,
  onProductChange,
  flow,
  onFlowChange,
}: {
  product: DemoExploreId;
  onProductChange: (id: DemoExploreId) => void;
  flow?: DemoFlowId;
  onFlowChange?: (id: DemoFlowId) => void;
}) {
  const { setRef, focus } = useTabFocus<DemoExploreId>();
  const item = DEMO_EXPLORE.find((entry) => entry.id === product) ?? DEMO_EXPLORE[0];
  const page = PRODUCT_PAGES[item.id];
  const meta = PRODUCT_FAMILY[item.id];
  const walkthrough = flow && item.flow ? flow : item.flow;

  return (
    <div>
      <div
        className="home-role-tabs"
        role="tablist"
        aria-label="Explore products"
        onKeyDown={(event) => cycleTabKey(event, DEMO_EXPLORE_IDS, item.id, onProductChange, focus)}
      >
        {DEMO_EXPLORE.map((entry) => (
          <button
            key={entry.id}
            ref={setRef(entry.id)}
            type="button"
            role="tab"
            id={`demo-product-${entry.id}`}
            aria-selected={entry.id === item.id}
            aria-controls="demo-product-panel"
            tabIndex={entry.id === item.id ? 0 : -1}
            className={cn("site-product-nav__item")}
            onClick={() => {
              onProductChange(entry.id);
              if (entry.flow) onFlowChange?.(entry.flow);
            }}
          >
            {PRODUCT_FAMILY[entry.id].shortName}
          </button>
        ))}
      </div>

      <div
        key={item.id}
        id="demo-product-panel"
        role="tabpanel"
        aria-labelledby={`demo-product-${item.id}`}
        className="mt-8 site-crossfade"
      >
        <div className="flex flex-wrap items-start gap-4">
          <ProductMark product={item.id} size="lg" />
          <div className="min-w-0 flex-1">
            <h2 className="text-2xl font-semibold tracking-tight">{meta.name}</h2>
            <p className="mt-2 max-w-2xl text-muted-foreground">{item.lede}</p>
          </div>
        </div>

        <div className="mt-8">
          <ProductPreview
            product={item.id}
            tabs={page.previewTabs.slice(0, 4)}
            device={page.device === "browser" ? "tablet" : page.device}
            interactiveChild={item.id === "connect"}
          />
        </div>

        {walkthrough ? (
          <div className="mt-12">
            <p className="site-kicker mb-4">Walk through a flow</p>
            <DemoFlow flow={walkthrough} />
          </div>
        ) : (
          <p className="mt-8 max-w-2xl text-sm text-muted-foreground">
            Careers is the LumenX hiring web app. The panels above are mock listings — they do not post a job or hire
            anyone.
          </p>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          <CTAButton asChild>
            <Link to="/contact" search={contactSearch("demo")}>
              Book a Demo
            </Link>
          </CTAButton>
          <CTAButton asChild variant="secondary">
            <Link to="/get-started">Get Started</Link>
          </CTAButton>
          <CTAButton asChild variant="ghost">
            <Link to="/platform/$slug" params={{ slug: item.id }}>
              {meta.shortName} product page
            </Link>
          </CTAButton>
        </div>
      </div>
    </div>
  );
}
