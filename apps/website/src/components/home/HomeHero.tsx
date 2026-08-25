import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Container } from "../layout/Container";
import { CTAButton } from "../conversion/CTAButton";
import { ProductMark } from "../product/ProductMark";
import { PRODUCT_FAMILY, PRODUCT_FAMILY_LIST, type ProductId } from "@/theme/products";
import { ORBIT_ACTIONS } from "@/content/orbit-actions";
import { contactSearch } from "@/lib/search";
import { SiteLogo } from "../SiteLogo";
import { DepthStage } from "../experience/DepthStage";
import { ParticleField } from "../experience/ParticleField";
import { Magnetic } from "../experience/Magnetic";
import { experienceAllows, useExperienceTier } from "@/experience";
import { cn } from "@lumenx/ui";

/** Perfect hexagon around the hub — equal 60° steps from top (Admin). */
const ORBIT_R = 36;
const ORBIT_ORDER: ProductId[] = [
  "admin",
  "connect",
  "transport",
  "nexus",
  "careers",
  "admissions",
];

const ORBIT = ORBIT_ORDER.map((id, i) => {
  const rad = ((-90 + i * 60) * Math.PI) / 180;
  return {
    id,
    x: Number((50 + ORBIT_R * Math.cos(rad)).toFixed(2)),
    y: Number((50 + ORBIT_R * Math.sin(rad)).toFixed(2)),
  };
});

const HUB = { x: 50, y: 50 };
const HUB_CLEAR = 12;
const NODE_CLEAR = 10;

function OrbitLinks({
  active,
  flowEnabled,
}: {
  active: ProductId | null;
  flowEnabled: boolean;
}) {
  return (
    <svg className="home-orbit__svg" viewBox="0 0 100 100" aria-hidden>
      <defs>
        <marker
          id="home-orbit-arrow"
          viewBox="0 0 10 10"
          refX="8"
          refY="5"
          markerWidth="2.8"
          markerHeight="2.8"
          orient="auto-start-reverse"
        >
          <path d="M 0 1.4 L 8 5 L 0 8.6 Z" fill="currentColor" />
        </marker>
        <linearGradient id="home-orbit-ring" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="oklch(0.52 0.22 262 / 0.28)" />
          <stop offset="50%" stopColor="oklch(0.58 0.13 195 / 0.22)" />
          <stop offset="100%" stopColor="oklch(0.52 0.22 262 / 0.16)" />
        </linearGradient>
        <radialGradient id="home-orbit-core" cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="oklch(0.62 0.18 262 / 0.35)" />
          <stop offset="100%" stopColor="oklch(0.52 0.22 262 / 0)" />
        </radialGradient>
      </defs>
      <circle cx={HUB.x} cy={HUB.y} r="18" fill="url(#home-orbit-core)" className="home-orbit__core" />
      <circle
        cx={HUB.x}
        cy={HUB.y}
        r={ORBIT_R}
        fill="none"
        stroke="url(#home-orbit-ring)"
        strokeWidth="0.4"
        className="home-orbit__ring"
      />
      {ORBIT.map((node, index) => {
        const dx = node.x - HUB.x;
        const dy = node.y - HUB.y;
        const len = Math.hypot(dx, dy) || 1;
        const ux = dx / len;
        const uy = dy / len;
        const start = { x: HUB.x + ux * HUB_CLEAR, y: HUB.y + uy * HUB_CLEAR };
        const end = { x: node.x - ux * NODE_CLEAR, y: node.y - uy * NODE_CLEAR };
        const isActive = active === node.id;
        const path = `M ${start.x} ${start.y} L ${end.x} ${end.y}`;
        return (
          <g key={node.id}>
            <line
              className={cn("home-orbit__link", isActive && "is-active", active && !isActive && "is-dim")}
              data-product={node.id}
              x1={start.x}
              y1={start.y}
              x2={end.x}
              y2={end.y}
              stroke="currentColor"
              strokeWidth={isActive ? 0.55 : 0.4}
              strokeLinecap="round"
              markerEnd="url(#home-orbit-arrow)"
            />
            {flowEnabled ? (
              <>
                <line
                  className={cn(
                    "home-orbit__flow",
                    isActive && "is-active",
                    active && !isActive && "is-dim",
                  )}
                  data-product={node.id}
                  x1={start.x}
                  y1={start.y}
                  x2={end.x}
                  y2={end.y}
                  stroke="currentColor"
                  strokeWidth="0.35"
                  strokeLinecap="round"
                  strokeDasharray="1.1 2.6"
                />
                <circle
                  r={isActive ? 0.7 : 0.55}
                  className={cn("home-orbit__packet", isActive && "is-active")}
                  data-product={node.id}
                  fill="currentColor"
                >
                  <animateMotion
                    dur={`${3.4 + index * 0.4}s`}
                    repeatCount="indefinite"
                    path={path}
                  />
                </circle>
              </>
            ) : null}
          </g>
        );
      })}
    </svg>
  );
}

export function HomeHero() {
  const [active, setActive] = useState<ProductId | null>(null);
  const tier = useExperienceTier();
  const flowEnabled = experienceAllows(tier, "flow");
  const detail = active ? ORBIT_ACTIONS[active] : null;
  const activeMeta = active ? PRODUCT_FAMILY[active] : null;

  return (
    <section className="site-section pt-10 md:pt-12 pb-6 md:pb-8">
      <Container>
        <div className="home-hero site-hero-enter">
          <p className="site-kicker">Institute platform</p>
          <h1 className="site-hero-display mt-3">
            One ecosystem. Every part of the institute, connected.
          </h1>
          <p className="site-lede home-hero__lede">
            LumenX sits in the middle. Admin writes the source of truth. Connect is how families and teachers use it.
            Transport runs the day’s trips. Admissions and Careers live in the same family. Nexus is the service
            platform — support, feedback, and quality after go-live.
          </p>
          <div className="home-hero__actions">
            <Magnetic className="w-full sm:w-auto">
              <CTAButton asChild className="w-full sm:w-auto">
                <Link to="/contact" search={contactSearch("trial")}>
                  Start 60-day trial
                </Link>
              </CTAButton>
            </Magnetic>
            <CTAButton asChild variant="secondary" className="w-full sm:w-auto">
              <Link to="/products">See products</Link>
            </CTAButton>
          </div>
        </div>

        <DepthStage className="site-hero-enter site-hero-enter--late">
          <ParticleField />
          <div
            className={cn("home-orbit", active && "home-orbit--active")}
            aria-label="LumenX ecosystem: six products connected around one platform"
            onMouseLeave={() => setActive(null)}
          >
            <OrbitLinks active={active} flowEnabled={flowEnabled} />

            <div className="home-orbit__hub" aria-hidden={Boolean(active)}>
              <SiteLogo markOnly className="home-orbit__logo" />
              <p className="home-orbit__brand">LumenX</p>
              <p className="home-orbit__tag home-orbit__tag--hover">Hover a product to see what it does</p>
              <p className="home-orbit__tag home-orbit__tag--touch">Tap a product to see what it does</p>
            </div>

            {ORBIT.map((node) => {
              const meta = PRODUCT_FAMILY_LIST.find((p) => p.id === node.id)!;
              const isActive = active === node.id;
              return (
                <Link
                  key={node.id}
                  to="/products/$slug"
                  params={{ slug: node.id }}
                  data-product={node.id}
                  className={cn("home-orbit__node", isActive && "is-active", active && !isActive && "is-dim")}
                  style={{ left: `${node.x}%`, top: `${node.y}%` }}
                  aria-describedby={isActive ? "home-orbit-detail" : undefined}
                  onMouseEnter={() => setActive(node.id)}
                  onFocus={() => setActive(node.id)}
                  onClick={(event) => {
                    if (active !== node.id) {
                      event.preventDefault();
                      setActive(node.id);
                    }
                  }}
                  onBlur={(event) => {
                    const next = event.relatedTarget;
                    if (next instanceof Node && event.currentTarget.closest(".home-orbit")?.contains(next)) {
                      return;
                    }
                    setActive(null);
                  }}
                >
                  <ProductMark product={node.id} size="sm" />
                  <span className="min-w-0">
                    <span className="home-orbit__name">{meta.shortName}</span>
                    <span className="home-orbit__role">{meta.role}</span>
                  </span>
                </Link>
              );
            })}
          </div>
        </DepthStage>

        <div
          id="home-orbit-detail"
          className={cn("home-orbit-detail", detail && "is-visible")}
          data-product={active ?? undefined}
          aria-live="polite"
        >
          {detail && activeMeta ? (
            <>
              <div className="home-orbit-detail__head">
                <ProductMark product={active!} />
                <div>
                  <p className="home-orbit-detail__kicker">{activeMeta.shortName}</p>
                  <p className="home-orbit-detail__title">{detail.headline}</p>
                </div>
              </div>
              <ul className="home-orbit-detail__actions">
                {detail.actions.map((action) => (
                  <li key={action}>{action}</li>
                ))}
              </ul>
              <p className="home-orbit-detail__hint">
                Click the card to open {activeMeta.shortName}.
              </p>
            </>
          ) : (
            <p className="home-orbit-detail__idle">
              Move onto Admin, Connect, Transport, Admissions, Careers, or Nexus to see related actions.
            </p>
          )}
        </div>
      </Container>
    </section>
  );
}
