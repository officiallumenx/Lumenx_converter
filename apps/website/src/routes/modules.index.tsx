import { useMemo, useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/SiteShell";
import { Section } from "@/components/layout/Section";
import { Grid } from "@/components/layout/Grid";
import { SiteCard } from "@/components/SiteCard";
import { GetStartedCTA } from "@/components/conversion/GetStartedCTA";
import { CTAButton } from "@/components/conversion/CTAButton";
import { MODULE_CATEGORY_LIST, type ModuleCategoryId } from "@/content/module-categories";
import { PAGE_SEO, pageHead } from "@/lib/seo";
import { cn, Input } from "@lumenx/ui";
import { ArrowRight } from "lucide-react";

export const Route = createFileRoute("/modules/")({
  head: () => pageHead(PAGE_SEO.modules),
  component: ModulesIndexPage,
});

function ModulesIndexPage() {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState<ModuleCategoryId | "all">("all");

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return MODULE_CATEGORY_LIST.filter((category) => {
      if (active !== "all" && category.id !== active) return false;
      if (!q) return true;
      if (category.title.toLowerCase().includes(q) || category.lede.toLowerCase().includes(q)) {
        return true;
      }
      return category.items.some(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.blurb.toLowerCase().includes(q) ||
          item.surfaces.toLowerCase().includes(q),
      );
    }).map((category) => {
      if (!q) return category;
      const items = category.items.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.blurb.toLowerCase().includes(q) ||
          item.surfaces.toLowerCase().includes(q) ||
          category.title.toLowerCase().includes(q),
      );
      return { ...category, items: items.length > 0 ? items : category.items };
    });
  }, [active, query]);

  return (
    <SiteShell>
      <Section
        headingAs="h1"
        eyebrow="Modules"
        title="Browse by what the campus needs to do."
        lede="Functional categories drawn from the real product inventory — academics through growth. Pick a category, or search by name."
      >
        <div className="mb-6 max-w-md">
          <label htmlFor="modules-search" className="sr-only">
            Search modules
          </label>
          <Input
            id="modules-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search modules…"
            className="site-input"
          />
        </div>

        <div className="home-role-tabs mb-10" role="group" aria-label="Module categories">
          <button
            type="button"
            className={cn("site-product-nav__item")}
            aria-pressed={active === "all"}
            onClick={() => setActive("all")}
          >
            All
          </button>
          {MODULE_CATEGORY_LIST.map((category) => (
            <button
              key={category.id}
              type="button"
              className={cn("site-product-nav__item")}
              aria-pressed={active === category.id}
              onClick={() => setActive(category.id)}
            >
              {category.shortTitle}
            </button>
          ))}
        </div>

        <Grid columns={2} stagger>
          {filtered.map((category) => (
            <SiteCard key={category.id} quiet>
              <h2 className="text-lg font-semibold tracking-tight">{category.title}</h2>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{category.lede}</p>
              <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                {category.items.slice(0, 4).map((item) => (
                  <li key={item.name} className="flex gap-2">
                    <span className="mt-1.5 size-1 shrink-0 rounded-full bg-foreground/35" aria-hidden />
                    <span>
                      <span className="font-medium text-foreground">{item.name}</span>
                      {" — "}
                      {item.blurb}
                    </span>
                  </li>
                ))}
              </ul>
              <Link
                to="/modules/$category"
                params={{ category: category.id }}
                className="site-btn site-btn--ghost mt-4 h-auto justify-start px-0 text-foreground"
              >
                View {category.shortTitle}
                <ArrowRight className="size-4" />
              </Link>
            </SiteCard>
          ))}
        </Grid>

        {filtered.length === 0 ? (
          <p className="mt-8 text-sm text-muted-foreground" role="status">
            No modules match that search. Try another term or clear the filter.
          </p>
        ) : null}

        <div className="mt-10">
          <CTAButton asChild variant="secondary">
            <Link to="/resources/demo">Open demo</Link>
          </CTAButton>
        </div>
      </Section>
      <GetStartedCTA />
    </SiteShell>
  );
}
