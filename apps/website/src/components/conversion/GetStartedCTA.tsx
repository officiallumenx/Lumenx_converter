import type { ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { contactSearch } from "@/lib/search";
import { Container } from "../layout/Container";
import { CTAButton } from "./CTAButton";
import { useReveal } from "@/motion/useReveal";

export function GetStartedCTA({
  title = "Ready when you are.",
  body = "Register the institute, complete verification, and run a full 60-day trial.",
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
