import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Link } from "@tanstack/react-router";
import { Building2 } from "lucide-react";
import { cn } from "@lumenx/ui";
import { HOW_STEP_IDS, HOW_STEPS, type HowStepId } from "@/content/how-it-works";
import { PRODUCT_FAMILY } from "@/theme/products";
import { ProductBadge } from "../product/ProductBadge";
import { ProductMark } from "../product/ProductMark";
import { CTAButton } from "../conversion/CTAButton";
import { cycleTabKey, useTabFocus } from "@/components/home/tabKeys";

const STEP_MS = 1800;

/**
 * Survives remounts from search-param navigation.
 * Without this, every tab click remounts the visual and autoplay starts from the beginning again.
 */
let howAutoplay: "idle" | "running" | "stopped" = "idle";

function prefersReducedMotion() {
  return typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

export function HowItWorksVisual({
  step,
  onStepChange,
}: {
  step: HowStepId;
  onStepChange: (id: HowStepId) => void;
}) {
  const index = Math.max(0, HOW_STEP_IDS.indexOf(step));
  const active = HOW_STEPS[index] ?? HOW_STEPS[0];
  const { setRef, focus } = useTabFocus<HowStepId>();
  const [playing, setPlaying] = useState(() => howAutoplay === "running");
  const rootRef = useRef<HTMLDivElement>(null);
  const onStepChangeRef = useRef(onStepChange);
  onStepChangeRef.current = onStepChange;

  const stopAutoplay = () => {
    howAutoplay = "stopped";
    setPlaying(false);
  };

  const startAutoplay = () => {
    howAutoplay = "running";
    setPlaying(true);
  };

  // One gentle intro pass only — never restart after the user takes control or after finish.
  // Module flag survives remounts caused by ?step= navigation.
  useEffect(() => {
    if (prefersReducedMotion()) {
      howAutoplay = "stopped";
      return;
    }
    if (howAutoplay === "stopped") return;
    if (howAutoplay === "idle") {
      // Deep link / mid-flow: show that step, do not force a full restart.
      if (step !== HOW_STEP_IDS[0]) {
        howAutoplay = "stopped";
        return;
      }
      howAutoplay = "running";
      setPlaying(true);
      return;
    }
    // Remount mid-sequence (search update): keep playing without resetting the step.
    setPlaying(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- mount / remount only; step read once
  }, []);

  useEffect(() => {
    if (!playing) return;
    if (prefersReducedMotion()) {
      stopAutoplay();
      return;
    }

    const t = window.setTimeout(() => {
      if (index >= HOW_STEP_IDS.length - 1) {
        howAutoplay = "stopped";
        setPlaying(false);
        return;
      }
      onStepChangeRef.current(HOW_STEP_IDS[index + 1]);
    }, STEP_MS);
    return () => window.clearTimeout(t);
  }, [playing, index]);

  useEffect(() => {
    if (!playing) return;

    const onWheel = () => stopAutoplay();
    const onTouch = () => stopAutoplay();
    const onKey = (event: KeyboardEvent) => {
      if (
        event.key === "ArrowDown" ||
        event.key === "ArrowUp" ||
        event.key === "PageDown" ||
        event.key === "PageUp" ||
        event.key === "Home" ||
        event.key === "End" ||
        event.key === " "
      ) {
        stopAutoplay();
      }
    };

    window.addEventListener("wheel", onWheel, { passive: true });
    window.addEventListener("touchmove", onTouch, { passive: true });
    window.addEventListener("keydown", onKey);

    const el = rootRef.current;
    const io = el
      ? new IntersectionObserver(
          (entries) => {
            if (!entries[0]?.isIntersecting) stopAutoplay();
          },
          { threshold: 0.2 },
        )
      : null;
    if (el && io) io.observe(el);

    return () => {
      window.removeEventListener("wheel", onWheel);
      window.removeEventListener("touchmove", onTouch);
      window.removeEventListener("keydown", onKey);
      io?.disconnect();
    };
  }, [playing]);

  const progress = HOW_STEP_IDS.length > 1 ? index / (HOW_STEP_IDS.length - 1) : 0;

  return (
    <div ref={rootRef}>
      <p className="how-chain" aria-hidden>
        {HOW_STEPS.map((item, i) => (
          <span key={item.id} className={cn("how-chain__item", item.id === active.id && "is-active")}>
            {i > 0 ? <span className="how-chain__sep">→</span> : null}
            {item.title}
          </span>
        ))}
      </p>
      <p className="sr-only">{HOW_STEPS.map((item) => item.title).join(" to ")}</p>

      <div className="how-progress" aria-hidden>
        <div className="how-progress__fill" style={{ "--p": progress } as CSSProperties} />
      </div>

      <div
        className="how-path"
        role="tablist"
        aria-label="How LumenX is layered"
        onKeyDown={(event) => {
          cycleTabKey(event, HOW_STEP_IDS, active.id, (id) => {
            stopAutoplay();
            onStepChange(id);
          }, focus);
        }}
      >
        {HOW_STEPS.map((item, i) => (
          <button
            key={item.id}
            ref={setRef(item.id)}
            type="button"
            role="tab"
            id={`how-tab-${item.id}`}
            aria-selected={item.id === active.id}
            aria-controls="how-panel"
            tabIndex={item.id === active.id ? 0 : -1}
            className={cn("how-node", item.id === active.id && "is-active", i < index && "is-done")}
            data-product={item.product}
            onClick={() => {
              stopAutoplay();
              onStepChange(item.id);
            }}
          >
            <span className="how-node__n">{i + 1}</span>
            {item.product ? (
              <ProductMark product={item.product} size="sm" />
            ) : (
              <span className="how-node__mark" aria-hidden>
                <Building2 className="size-3.5" />
              </span>
            )}
            <span className="how-node__title">{item.title}</span>
          </button>
        ))}
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        <CTAButton
          type="button"
          variant="secondary"
          size="md"
          onClick={() => {
            if (playing) {
              stopAutoplay();
              return;
            }
            if (index >= HOW_STEP_IDS.length - 1) {
              onStepChange(HOW_STEP_IDS[0]);
            }
            startAutoplay();
          }}
        >
          {playing ? "Pause" : "Play"}
        </CTAButton>
        <CTAButton
          type="button"
          variant="ghost"
          size="md"
          onClick={() => {
            stopAutoplay();
            onStepChange(HOW_STEP_IDS[0]);
          }}
        >
          Reset
        </CTAButton>
      </div>

      <div
        id="how-panel"
        role="tabpanel"
        aria-labelledby={`how-tab-${active.id}`}
        className="mt-8 site-card"
        data-product={active.product}
      >
        <p className="site-kicker">{active.kicker}</p>
        <h2 className="mt-2 text-2xl font-semibold tracking-tight">{active.title}</h2>
        <p className="mt-3 max-w-2xl text-muted-foreground">{active.body}</p>
        <div className="mt-6 grid gap-3 sm:grid-cols-2">
          <p className="rounded-lg border bg-muted/40 p-4 text-sm">
            <span className="font-medium text-foreground">Does. </span>
            {active.does}
          </p>
          <p className="rounded-lg border bg-muted/40 p-4 text-sm">
            <span className="font-medium text-foreground">Does not. </span>
            {active.doesNot}
          </p>
        </div>
        {active.product ? (
          <CTAButton asChild className="mt-6">
            <Link to="/products/$slug" params={{ slug: active.product }}>
              Explore {PRODUCT_FAMILY[active.product].shortName}
            </Link>
          </CTAButton>
        ) : (
          <div className="mt-6 flex flex-wrap gap-2">
            <ProductBadge product="admin" />
            <ProductBadge product="nexus" />
          </div>
        )}
      </div>
    </div>
  );
}
