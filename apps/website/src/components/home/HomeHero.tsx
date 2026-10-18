import { Link } from "@tanstack/react-router";
import { Container } from "../layout/Container";
import { CTAButton } from "../conversion/CTAButton";
import { contactSearch } from "@/lib/search";
import { Magnetic } from "../experience/Magnetic";

export function HomeHero() {
  return (
    <section className="site-section pt-10 md:pt-14 pb-6 md:pb-10">
      <Container>
        <div className="home-hero-split">
          <div className="home-hero site-hero-enter">
            <p className="site-kicker">Connected institute platform</p>
            <h1 className="site-hero-display mt-3">
              Run your entire institution from one connected platform.
            </h1>
            <p className="site-lede home-hero__lede">
              LumenX brings administration, academics, communication, transport, admissions and careers
              together — so every role works from the same institute record.
            </p>
            <div className="home-hero__actions">
              <Magnetic className="w-full sm:w-auto">
                <CTAButton asChild className="w-full sm:w-auto">
                  <Link to="/contact" search={contactSearch("demo")}>
                    Book a Demo
                  </Link>
                </CTAButton>
              </Magnetic>
              <CTAButton asChild variant="secondary" className="w-full sm:w-auto">
                <Link to="/platform">Explore Platform</Link>
              </CTAButton>
            </div>
          </div>

          <figure className="home-eco site-hero-enter site-hero-enter--late">
            <img
              src="/brand/lumenx-ecosystem.jpg"
              alt="LumenX connected education ecosystem — Admin, Connect, Transport, Admissions, Careers, classrooms, and families around one institute hub"
              width={1024}
              height={576}
              decoding="async"
              fetchPriority="high"
              className="home-eco__img"
            />
          </figure>
        </div>
      </Container>
    </section>
  );
}
