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
  const copy = (
    <div className="site-hero-enter">
      <p className="site-kicker">{eyebrow}</p>
      <div className="mt-4 flex flex-wrap items-center gap-3">
        <ProductMark product={product} size="lg" />
        <h1 className="site-section-title">{title}</h1>
      </div>
      <div className="mt-3">
        <ProductBadge product={product} />
      </div>
      <p className="mt-4 text-lg text-muted-foreground">{tagline}</p>
      {audience ? (
        <p className="mt-4 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">For: </span>
          {audience}
        </p>
      ) : null}
      {narrative ? <p className="mt-6 text-base leading-relaxed">{narrative}</p> : null}
      {actions ? <div className="mt-8 flex flex-wrap gap-3">{actions}</div> : null}
    </div>
  );

  return (
    <section className="site-section pt-12 md:pt-16" data-product={product}>
      <Container>
        {visual ? (
          <SplitSection>
            {copy}
            <div className="site-hero-enter site-hero-enter--late">{visual}</div>
          </SplitSection>
        ) : (
          <div className="mx-auto max-w-3xl">{copy}</div>
        )}
      </Container>
    </section>
  );
}
