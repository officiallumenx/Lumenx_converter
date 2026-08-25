import { Section } from "../layout/Section";
import { HOME_PROBLEM } from "@/content/home";

export function HomeProblem() {
  return (
    <Section
      id="problem"
      eyebrow="The problem"
      title="The institute is one organisation. The tools usually are not."
      lede="Office, families, transport, intake, and hiring each keep their own list. The work is copied. The story never matches."
    >
      <div className="home-problem-row">
        {HOME_PROBLEM.map((item) => (
          <article key={item.id} className="home-problem-card">
            <h3 className="text-sm font-semibold tracking-tight">{item.title}</h3>
            <p className="mt-2 text-sm text-muted-foreground">{item.body}</p>
          </article>
        ))}
      </div>
      <div className="home-problem-join">
        <p className="site-kicker" style={{ color: "oklch(0.78 0.08 210)" }}>
          Then LumenX
        </p>
        <p className="site-section-title mt-3">One platform. Separate apps for separate jobs. Shared records underneath.</p>
        <p className="site-lede mt-3">
          Administration, communication, transport, admissions, and careers stop living in parallel inboxes.
        </p>
      </div>
    </Section>
  );
}
