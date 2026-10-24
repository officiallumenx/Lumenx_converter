import { Link } from "@tanstack/react-router";
import { ArrowRight, CheckCircle2 } from "lucide-react";
import { Container } from "../layout/Container";
import { CTAButton } from "../conversion/CTAButton";
import { contactSearch } from "@/lib/search";

const HERO_POINTS = [
  "One institute record across Admin and Connect",
  "Transport, Admissions, and Careers when you need them",
  "60-day trial after verification — no payment on this site",
] as const;

/** Play-inspired full-bleed navy hero with LumenX brand and verified claims only. */
export function HomeHero() {
  return (
    <section className="play-hero" aria-labelledby="home-hero-title">
      <div className="play-hero__glow" aria-hidden />
      <Container className="play-hero__inner">
        <div className="play-hero__copy site-hero-enter">
          <p className="play-hero__kicker">Smart institute management</p>
          <h1 id="home-hero-title" className="play-hero__title">
            Run your entire institution from one connected platform.
          </h1>
          <p className="play-hero__lede">
            LumenX brings administration, academics, communication, transport, admissions, and
            careers together — so every role works from the same institute record.
          </p>
          <ul className="play-hero__points">
            {HERO_POINTS.map((point) => (
              <li key={point}>
                <CheckCircle2 className="size-4 shrink-0" aria-hidden />
                <span>{point}</span>
              </li>
            ))}
          </ul>
          <div className="site-cta-row play-hero__actions">
            <CTAButton asChild size="lg">
              <Link to="/contact" search={contactSearch("demo")}>
                Book a Demo
              </Link>
            </CTAButton>
            <CTAButton asChild variant="on-ink" size="lg">
              <Link to="/platform">
                Explore Platform
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </CTAButton>
          </div>
        </div>

        <figure className="play-hero__visual site-hero-enter site-hero-enter--late">
          <img
            src="/brand/lumenx-ecosystem.jpg"
            alt="LumenX connected education ecosystem — Admin, Connect, Transport, Admissions, and Careers around one institute hub"
            width={1024}
            height={576}
            decoding="async"
            fetchPriority="high"
            className="play-hero__img"
          />
        </figure>
      </Container>
    </section>
  );
}
