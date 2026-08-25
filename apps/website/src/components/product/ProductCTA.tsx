import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import type { ProductId } from "@/theme/products";
import { PRODUCT_FAMILY } from "@/theme/products";
import { contactSearch } from "@/lib/search";
import { Container } from "../layout/Container";
import { CTAButton } from "../conversion/CTAButton";
import { useReveal } from "@/motion/useReveal";

export function ProductCTA({
  product,
  title,
  body,
  primary,
  secondary,
}: {
  product?: ProductId;
  title?: string;
  body?: string;
  primary?: ReactNode;
  secondary?: ReactNode;
}) {
  const name = product ? PRODUCT_FAMILY[product].shortName : "LumenX";
  const revealRef = useReveal<HTMLElement>();
  return (
    <section ref={revealRef} className="site-section site-reveal" data-product={product}>
      <Container>
        <div className="site-cta-panel site-section-head">
          <h2 className="site-section-title">{title ?? `See ${name} in your institute.`}</h2>
          {body ? <p className="site-lede">{body}</p> : null}
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {primary ?? (
              <CTAButton asChild variant="invert">
                <Link to="/contact" search={contactSearch("trial")}>
                  Start 60-day trial
                </Link>
              </CTAButton>
            )}
            {secondary ?? (
              <CTAButton asChild variant="on-ink">
                <Link to="/contact" search={contactSearch("quote")}>
                  Talk to us
                </Link>
              </CTAButton>
            )}
          </div>
        </div>
      </Container>
    </section>
  );
}
