import { useState, type CSSProperties } from "react";
import { Link } from "@tanstack/react-router";
import { Section } from "../layout/Section";
import { ProductBadge } from "../product/ProductBadge";
import { WorkflowStep } from "../visual/WorkflowStep";
import { CTAButton } from "../conversion/CTAButton";
import { HOME_FLOWS } from "@/content/home";
import { cn } from "@lumenx/ui";
import { cycleTabKey, useTabFocus } from "./tabKeys";

export function HomeFlows() {
  const [active, setActive] = useState(HOME_FLOWS[0].id);
  const ids = HOME_FLOWS.map((flow) => flow.id);
  const { setRef, focus } = useTabFocus<string>();
  const flow = HOME_FLOWS.find((item) => item.id === active) ?? HOME_FLOWS[0];

  return (
    <Section
      id="together"
      eyebrow="How they work together"
      title="One record moves. The right app does the work."
      lede="These are the cross-product paths the platform actually runs — not a marketing diagram of invented hops."
      tone="muted"
    >
      <div
        className="home-eco-select"
        role="tablist"
        aria-label="Cross-product flows"
        onKeyDown={(event) => cycleTabKey(event, ids, active, setActive, focus)}
      >
        {HOME_FLOWS.map((item) => (
          <button
            key={item.id}
            ref={setRef(item.id)}
            type="button"
            role="tab"
            id={`flow-tab-${item.id}`}
            aria-selected={item.id === active}
            aria-controls="flow-panel"
            tabIndex={item.id === active ? 0 : -1}
            className={cn("site-product-nav__item")}
            onClick={() => setActive(item.id)}
          >
            {item.title}
          </button>
        ))}
      </div>

      <div
        key={flow.id}
        id="flow-panel"
        role="tabpanel"
        aria-labelledby={`flow-tab-${flow.id}`}
        className="mt-8 site-crossfade"
      >
        <p className="max-w-2xl text-sm text-muted-foreground">{flow.lede}</p>
        <div className="home-flow-steps mt-6">
          {flow.steps.map((step, i) => (
            <div
              key={`${flow.id}-${step.title}`}
              className="site-stagger__item"
              style={{ "--i": i } as CSSProperties}
            >
              <WorkflowStep step={i + 1} title={step.title}>
                <div className="mb-2">
                  <ProductBadge product={step.product} />
                </div>
                <p>{step.body}</p>
              </WorkflowStep>
            </div>
          ))}
        </div>
        <div className="mt-8">
          <CTAButton asChild variant="secondary">
            <Link to="/how-it-works" search={{}}>
              How the ecosystem is layered
            </Link>
          </CTAButton>
        </div>
      </div>
    </Section>
  );
}
