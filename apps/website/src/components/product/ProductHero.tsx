import type { ReactNode } from "react";
import type { ProductId } from "@/theme/products";
import { Container } from "../layout/Container";
import { SplitSection } from "../layout/SplitSection";
import { ProductMark } from "./ProductMark";
import { ProductBadge } from "./ProductBadge";

export function ProductHero({
  product,
  eyebrow = "Product",
  title,
  tagline,
  audience,
  narrative,
  actions,
  visual,
}: {
  product: ProductId;
  eyebrow?: string;
  title: string;
  tagline: string;
  audience?: string;
  narrative?: string;
  actions?: ReactNode;
  visual?: ReactNode;
}) {
  const wideVisual = product === "admin" || product === "nexus";

  const copy = (
    <div className="site-hero-enter site-product-hero__copy">
      <p className="site-kicker">{eyebrow}</p>
      <div className="mt-2.5 flex flex-wrap items-center gap-3">
        <ProductMark product={product} size="lg" />
        <h1 className="site-section-title">{title}</h1>
      </div>
      <div className="mt-2.5">
        <ProductBadge product={product} />
      </div>
      <p className="mt-3.5 text-lg leading-relaxed text-muted-foreground">{tagline}</p>
      {audience ? (
        <p className="mt-2.5 text-[0.9375rem] leading-relaxed text-muted-foreground">
          <span className="font-medium text-foreground">For: </span>
          {audience}
        </p>
      ) : null}
      {narrative ? <p className="mt-4 text-base leading-relaxed text-muted-foreground">{narrative}</p> : null}
      {actions ? <div className="site-cta-row mt-6">{actions}</div> : null}
    </div>
  );

  return (
    <section className="site-section site-section--product-hero" data-product={product}>
      <Container wide={wideVisual}>
        {visual ? (
          wideVisual ? (
            <div className="site-product-hero-wide">
              {copy}
              <div className="site-hero-enter site-hero-enter--late site-product-hero-wide__visual">{visual}</div>
            </div>
          ) : (
            <SplitSection>
              {copy}
              <div className="site-hero-enter site-hero-enter--late">{visual}</div>
            </SplitSection>
          )
        ) : (
          <div className="mx-auto max-w-3xl">{copy}</div>
        )}
      </Container>
    </section>
  );
}
