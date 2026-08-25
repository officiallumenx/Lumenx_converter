import { useState } from "react";
import { Link } from "@tanstack/react-router";
import { Section } from "../layout/Section";
import { ProductBadge } from "../product/ProductBadge";
import { ProductMark } from "../product/ProductMark";
import { CTAButton } from "../conversion/CTAButton";
import { HOME_ROLES } from "@/content/home";
import { cn } from "@lumenx/ui";
import { cycleTabKey, useTabFocus } from "./tabKeys";

export function HomeRoles() {
  const [active, setActive] = useState(HOME_ROLES[0].id);
  const ids = HOME_ROLES.map((role) => role.id);
  const { setRef, focus } = useTabFocus<string>();
  const role = HOME_ROLES.find((item) => item.id === active) ?? HOME_ROLES[0];

  return (
    <Section
      id="roles"
      eyebrow="By role"
      title="The same records. A different door for each person."
      lede="Admin, teacher, parent, student, driver, applicant, and careers each get the surface that matches the job."
      tone="muted"
    >
      <div
        className="home-role-tabs"
        role="tablist"
        aria-label="Roles"
        onKeyDown={(event) => cycleTabKey(event, ids, active, setActive, focus)}
      >
        {HOME_ROLES.map((item) => (
          <button
            key={item.id}
            ref={setRef(item.id)}
            type="button"
            role="tab"
            id={`role-tab-${item.id}`}
            aria-selected={item.id === active}
            aria-controls="role-panel"
            tabIndex={item.id === active ? 0 : -1}
            className={cn("site-product-nav__item")}
            onClick={() => setActive(item.id)}
          >
            {item.title}
          </button>
        ))}
      </div>

      <div
        key={role.id}
        id="role-panel"
        role="tabpanel"
        aria-labelledby={`role-tab-${role.id}`}
        className="mt-8 site-card site-crossfade"
        data-product={role.product}
      >
        <div className="flex flex-wrap items-start gap-4">
          <ProductMark product={role.product} size="lg" />
          <div className="min-w-0 flex-1">
            <ProductBadge product={role.product} />
            <h3 className="mt-3 text-2xl font-semibold tracking-tight">{role.title}</h3>
            <p className="mt-2 max-w-2xl text-muted-foreground">{role.outcome}</p>
            <ul className="mt-5 grid gap-2 sm:grid-cols-3">
              {role.points.map((point) => (
                <li key={point} className="rounded-lg border bg-muted/40 p-4 text-sm">
                  {point}
                </li>
              ))}
            </ul>
          </div>
        </div>
        <div className="mt-8">
          <CTAButton asChild variant="secondary">
            <Link to="/solutions" search={{}}>
              Solutions by role
            </Link>
          </CTAButton>
        </div>
      </div>
    </Section>
  );
}
