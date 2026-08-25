import { Link } from "@tanstack/react-router";
import { cn } from "@lumenx/ui";
import {
  GET_STARTED_INTERESTS,
  GET_STARTED_STEPS,
  type GetStartedInterestId,
  type GetStartedStep,
} from "@/content/get-started";
import { PRODUCT_FAMILY } from "@/theme/products";
import { contactSearch } from "@/lib/search";
import { cycleTabKey, useTabFocus } from "../home/tabKeys";
import { ProductMark } from "../product/ProductMark";
import { ProductBadge } from "../product/ProductBadge";
import { SiteCard } from "../SiteCard";
import { CTAButton } from "./CTAButton";
import { Grid } from "../layout/Grid";

export function GetStartedFlow({
  step,
  interest,
  onStepChange,
  onInterestChange,
}: {
  step: GetStartedStep;
  interest?: GetStartedInterestId;
  onStepChange: (step: GetStartedStep) => void;
  onInterestChange: (id: GetStartedInterestId) => void;
}) {
  const view = GET_STARTED_INTERESTS.find((item) => item.id === interest);
  const { setRef, focus } = useTabFocus<GetStartedStep>();

  return (
    <div>
      <div
        className="demo-stepper__list mb-8"
        role="tablist"
        aria-label="Get started steps"
        onKeyDown={(event) => cycleTabKey(event, GET_STARTED_STEPS, step, onStepChange, focus)}
      >
        {GET_STARTED_STEPS.map((id, i) => (
          <button
            key={id}
            ref={setRef(id)}
            type="button"
            role="tab"
            aria-selected={id === step}
            tabIndex={id === step ? 0 : -1}
            className={cn("demo-step", id === step && "is-active", stepIndex(step) > i && "is-done")}
            onClick={() => onStepChange(id)}
          >
            <span className="demo-step__n">{i + 1}</span>
            {id === "explore" ? "Explore" : id === "choose" ? "Choose" : "Next"}
          </button>
        ))}
      </div>

      {step === "explore" ? (
        <div>
          <h2 className="text-xl font-semibold tracking-tight">What do you want to look at first?</h2>
          <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
            Pick a job. We’ll show the matching product — no form yet.
          </p>
          <Grid columns={2} stagger className="mt-6">
            {GET_STARTED_INTERESTS.map((item) => (
              <button
                key={item.id}
                type="button"
                className="w-full text-left"
                aria-pressed={item.id === interest}
                onClick={() => onInterestChange(item.id)}
              >
                <SiteCard product={item.product} quiet>
                  <ProductMark product={item.product} />
                  <h3 className="mt-3 text-lg font-semibold tracking-tight">{item.title}</h3>
                  <p className="mt-1 text-sm text-muted-foreground">{item.lede}</p>
                </SiteCard>
              </button>
            ))}
          </Grid>
        </div>
      ) : null}

      {step === "choose" ? (
        <div className="site-card site-crossfade" data-product={view?.product}>
          {view ? (
            <>
              <ProductBadge product={view.product} />
              <h2 className="mt-3 text-2xl font-semibold tracking-tight">{PRODUCT_FAMILY[view.product].name}</h2>
              <p className="mt-2 max-w-2xl text-muted-foreground">{view.lede}</p>
              <div className="mt-6 flex flex-wrap gap-3">
                <CTAButton asChild variant="secondary">
                  <Link to="/products/$slug" params={{ slug: view.product }}>
                    Read about {PRODUCT_FAMILY[view.product].shortName}
                  </Link>
                </CTAButton>
                {view.demo ? (
                  <CTAButton asChild variant="ghost">
                    <Link to="/demo" search={{ product: view.product }}>
                      Try the mock demo
                    </Link>
                  </CTAButton>
                ) : null}
                <CTAButton type="button" onClick={() => onStepChange("next")}>
                  Continue
                </CTAButton>
              </div>
            </>
          ) : (
            <>
              <h2 className="text-xl font-semibold tracking-tight">Choose an interest first.</h2>
              <p className="mt-2 text-sm text-muted-foreground">Go back one step and pick what you want to look at.</p>
              <CTAButton type="button" className="mt-6" onClick={() => onStepChange("explore")}>
                Explore
              </CTAButton>
            </>
          )}
        </div>
      ) : null}

      {step === "next" ? (
        <div className="site-card site-crossfade">
          <h2 className="text-2xl font-semibold tracking-tight">Whenever you’re ready.</h2>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            {view
              ? `You were looking at ${PRODUCT_FAMILY[view.product].shortName}. Nothing is submitted until you choose a path below.`
              : "Nothing is submitted until you choose a path below."}
          </p>
          <ul className="mt-6 grid gap-3 sm:grid-cols-2">
            {view?.demo ? (
              <li className="rounded-lg border bg-muted/40 p-4 text-sm">
                Explore {PRODUCT_FAMILY[view.product].shortName} with mock data. No account.
              </li>
            ) : (
              <li className="rounded-lg border bg-muted/40 p-4 text-sm">
                Groups use Nexus. A single campus lives in Admin.
              </li>
            )}
            <li className="rounded-lg border bg-muted/40 p-4 text-sm">
              A 60-day trial starts after the institute is approved. No payment on this site.
            </li>
          </ul>
          <div className="mt-8 flex flex-wrap gap-3">
            {view?.demo ? (
              <CTAButton asChild variant="secondary">
                <Link to="/demo" search={{ product: view.product }}>
                  Open demo
                </Link>
              </CTAButton>
            ) : null}
            <CTAButton asChild>
              <Link
                to="/contact"
                search={view?.product === "nexus" ? contactSearch("partner") : contactSearch("trial")}
              >
                {view?.product === "nexus" ? "Talk to us" : "Start 60-day trial"}
              </Link>
            </CTAButton>
            <CTAButton asChild variant="ghost">
              <Link to="/contact" search={contactSearch("quote")}>
                Request a quote
              </Link>
            </CTAButton>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function stepIndex(step: GetStartedStep) {
  return GET_STARTED_STEPS.indexOf(step);
}
