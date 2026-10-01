import type { CSSProperties } from "react";
import { Link } from "@tanstack/react-router";
import { ArrowUpRight } from "lucide-react";
import { Button } from "@lumenx/ui-admin";

export function HomeYearCallout({
  mode,
}: {
  mode: "missing" | "error";
}) {
  if (mode === "error") {
    return (
      <section className="lx-home-section lx-home-callout lx-home-callout--muted" style={{ "--lx-home-i": 0 } as CSSProperties}>
        <div className="min-w-0">
          <p className="lx-home-callout__title">Academic year</p>
          <p className="lx-home-callout__hint">
            Could not load academic years. This is not the same as having no year configured.
          </p>
        </div>
      </section>
    );
  }

  return (
    <section className="lx-home-section lx-home-callout lx-home-callout--amber" style={{ "--lx-home-i": 0 } as CSSProperties}>
      <div className="min-w-0">
        <p className="lx-home-callout__title">Academic year required</p>
        <p className="lx-home-callout__hint">
          Create or activate an academic year to unlock day-to-day Admin writes.
        </p>
      </div>
      <Link to="/academic-management" search={{ view: "years" }}>
        <Button variant="primary" size="sm" className="gap-1.5 shrink-0">
          Set academic year
          <ArrowUpRight className="size-3.5" />
        </Button>
      </Link>
    </section>
  );
}
