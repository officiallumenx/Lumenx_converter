import { type CSSProperties } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Section } from "../layout/Section";
import { SiteCard } from "../SiteCard";
import { ProductMark } from "../product/ProductMark";
import { DeviceMockup } from "../visual/DeviceMockup";
import { PRODUCT_FAMILY } from "@/theme/products";
import { HOME_SHOWCASE } from "@/content/home";
import {
  MockAdminHome,
  MockAdmissions,
  MockCareers,
  MockConnectHome,
  MockNexus,
  MockTransport,
} from "./HomeMocks";

function Preview({ kind }: { kind: (typeof HOME_SHOWCASE)[number]["preview"] }) {
  switch (kind) {
    case "admin":
      return (
        <DeviceMockup device="tablet" compact title="Admin">
          <MockAdminHome />
        </DeviceMockup>
      );
    case "connect":
      return (
        <DeviceMockup compact title="Connect">
          <MockConnectHome />
        </DeviceMockup>
      );
    case "transport":
      return (
        <DeviceMockup compact title="Transport">
          <MockTransport />
        </DeviceMockup>
      );
    case "admissions":
      return (
        <DeviceMockup compact title="Admissions">
          <MockAdmissions />
        </DeviceMockup>
      );
    case "careers":
      return (
        <DeviceMockup device="tablet" compact title="Careers">
          <MockCareers />
        </DeviceMockup>
      );
    case "nexus":
      return (
        <DeviceMockup device="tablet" compact title="Nexus">
          <MockNexus />
        </DeviceMockup>
      );
  }
}

export function HomeShowcase() {
  return (
    <Section
      id="products"
      eyebrow="Products"
      title="Each product has a job. None of them pretend to be the others."
      lede="Admin writes the source of truth. Connect is how people use it. Transport runs the trip. Admissions and Careers are Connect portals. Nexus is the service platform for licensing, support, and feedback."
    >
      <div className="grid gap-4 lg:grid-cols-2">
        {HOME_SHOWCASE.map((item, i) => {
          const meta = PRODUCT_FAMILY[item.id];
          return (
            <div
              key={item.id}
              className="site-stagger__item min-w-0"
              style={{ "--i": Math.min(i, 5) } as CSSProperties}
            >
              <SiteCard product={item.id} className="home-showcase-card">
                <ProductMark product={item.id} size="lg" />
                <p className="mt-4 text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
                  {meta.role}
                </p>
                <h3 className="mt-1 text-xl font-semibold tracking-tight">{meta.name}</h3>
                <p className="mt-2 text-sm text-muted-foreground">{item.description}</p>
                <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                  {item.points.map((point) => (
                    <li key={point} className="flex gap-2">
                      <span className="mt-1.5 size-1 shrink-0 rounded-full bg-foreground/35" aria-hidden />
                      <span>{point}</span>
                    </li>
                  ))}
                </ul>
                <div className="home-showcase-preview">
                  <Preview kind={item.preview} />
                </div>
                <Link
                  to="/products/$slug"
                  params={{ slug: item.id }}
                  className="site-btn site-btn--ghost mt-2 h-auto justify-start px-0 text-foreground"
                >
                  Explore {meta.shortName}
                  <ArrowRight className="size-4" />
                </Link>
              </SiteCard>
            </div>
          );
        })}
      </div>
    </Section>
  );
}
