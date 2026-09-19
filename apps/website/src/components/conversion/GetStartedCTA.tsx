import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { contactSearch } from "@/lib/search";
import { Container } from "../layout/Container";
import { CTAButton } from "./CTAButton";
import { useReveal } from "@/motion/useReveal";

export function GetStartedCTA({
  title = "Ready when you are.",
  body = "Book a demo or start a 60-day trial after approval. This website does not take payment.",
  primary,
  secondary,
}: {
  title?: string;
  body?: string;
  primary?: ReactNode;
  secondary?: ReactNode;
}) {
  const revealRef = useReveal<HTMLElement>();
  return (
    <section ref={revealRef} className="site-section site-reveal">
      <Container>
        <div className="site-cta-panel site-section-head">
          <h2 className="site-section-title">{title}</h2>
          <p className="site-lede">{body}</p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            {primary ?? (
              <CTAButton asChild variant="invert">
                <Link to="/contact" search={contactSearch("demo")}>
                  Book a Demo
                </Link>
              </CTAButton>
            )}
            {secondary ?? (
              <CTAButton asChild variant="on-ink">
                <Link to="/get-started">Get Started</Link>
              </CTAButton>
            )}
          </div>
        </div>
      </Container>
    </section>
  );
}
