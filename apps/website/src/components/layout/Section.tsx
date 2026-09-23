import type { ReactNode } from "react";
import { cn } from "@lumenx/ui";
import { Container } from "./Container";
import { SectionHeading } from "../content/SectionHeading";
import { useReveal } from "@/motion/useReveal";

export type SectionTone = "default" | "muted";

export function Section({
  id,
  eyebrow,
  title,
  lede,
  children,
  className,
  narrow = false,
  tone = "default",
  headingAs = "h2",
  dense = false,
}: {
  id?: string;
  eyebrow?: string;
  title?: string;
  lede?: string;
  children: ReactNode;
  className?: string;
  narrow?: boolean;
  tone?: SectionTone;
  headingAs?: "h1" | "h2" | "h3";
  /** Tighter top padding and heading gap — for catalogue pages. */
  dense?: boolean;
}) {
  const revealRef = useReveal<HTMLElement>();
  const hasHeading = Boolean(eyebrow || title || lede);
  return (
    <section
      id={id}
      ref={revealRef}
      className={cn(
        "site-section site-reveal",
        tone === "muted" && "site-section--muted",
        dense && "site-section--dense",
        className,
      )}
    >
      <Container narrow={narrow}>
        {hasHeading ? (
          <SectionHeading
            as={headingAs}
            eyebrow={eyebrow}
            title={title}
            lede={lede}
            className={cn("site-section-head", dense ? "mb-5" : "mb-10")}
          />
        ) : null}
        {children}
      </Container>
    </section>
  );
}
