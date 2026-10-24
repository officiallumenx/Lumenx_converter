import { type CSSProperties } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowRight } from "lucide-react";
import { Section } from "../layout/Section";
import { SiteCard } from "../SiteCard";
import { ProductMark } from "../product/ProductMark";
import { PhoneMockup } from "../visual/PhoneMockup";
import { LaptopMockup } from "../visual/LaptopMockup";
import { PRODUCT_FAMILY, type ProductId } from "@/theme/products";
import { HOME_SHOWCASE } from "@/content/home";
import { CTAButton } from "../conversion/CTAButton";

const PRODUCT_SHOT: Partial<Record<ProductId, { src: string; device: "phone" | "laptop" }>> = {
  admin: { src: "/screenshots/admin/command.png", device: "laptop" },
  connect: { src: "/screenshots/connect/home.jpg", device: "phone" },
  transport: { src: "/screenshots/transport/driver-home.jpg", device: "phone" },
  admissions: { src: "/screenshots/admissions/signin.jpg", device: "phone" },
  careers: { src: "/screenshots/careers/home.jpg", device: "phone" },
};

function ProductShot({ id, label }: { id: ProductId; label: string }) {
  const shot = PRODUCT_SHOT[id];
  if (!shot) return null;
  const img = (
    <img
      src={shot.src}
      alt={`${label} product screen`}
      className="block h-auto w-full object-cover object-top"
      loading="lazy"
      decoding="async"
    />
  );
  if (shot.device === "laptop") {
    return <LaptopMockup compact>{img}</LaptopMockup>;
  }
  return <PhoneMockup compact>{img}</PhoneMockup>;
}

export function HomeShowcase() {
  const items = HOME_SHOWCASE.filter((item) => item.id !== "nexus");
  return (
    <Section
      id="products"
      align="center"
      eyebrow="Platform"
      title="Each surface has a job. Together they are one platform."
      lede="Admin writes the source of truth. Connect is how people use it. Transport runs the trip. Admissions and Careers complete intake and hiring into the same institute record."
    >
      <div className="play-product-grid">
        {items.map((item, i) => {
          const meta = PRODUCT_FAMILY[item.id];
          return (
            <div
              key={item.id}
              className="site-stagger__item min-w-0"
              style={{ "--i": Math.min(i, 5) } as CSSProperties}
            >
              <SiteCard product={item.id} className="play-product-card">
                <div className="play-product-card__body">
                  <ProductMark product={item.id} size="lg" />
                  <h3 className="site-card-title mt-4">{meta.name}</h3>
                  <p className="mt-1 text-sm font-medium text-[var(--product-accent)]">{item.tagline}</p>
                  <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{item.description}</p>
                  <ul className="mt-4 space-y-1.5 text-sm text-muted-foreground">
                    {item.points.map((point) => (
                      <li key={point} className="flex gap-2">
                        <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-[var(--product-accent)]" aria-hidden />
                        <span>{point}</span>
                      </li>
                    ))}
                  </ul>
                  <CTAButton asChild variant="ghost" size="md" className="mt-5 px-0">
                    <Link to="/platform/$slug" params={{ slug: item.id }}>
                      View {meta.shortName}
                      <ArrowRight className="size-4" aria-hidden />
                    </Link>
                  </CTAButton>
                </div>
                <div className="play-product-card__preview">
                  <ProductShot id={item.id} label={meta.name} />
                </div>
              </SiteCard>
            </div>
          );
        })}
      </div>
    </Section>
  );
}
