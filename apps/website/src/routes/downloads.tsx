import { useEffect } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { SiteShell } from "@/components/SiteShell";
import { Section } from "@/components/layout/Section";
import { GetStartedCTA } from "@/components/conversion/GetStartedCTA";
import { DownloadProduct } from "@/components/conversion/DownloadProduct";
import { DOWNLOAD_LIST } from "@/content/downloads";
import { PRODUCT_FAMILY } from "@/theme/products";
import { parseDownloadsSearch } from "@/lib/search";
import { PAGE_SEO, pageHead } from "@/lib/seo";
import { cn } from "@lumenx/ui";

export const Route = createFileRoute("/downloads")({
  validateSearch: parseDownloadsSearch,
  head: () => pageHead(PAGE_SEO.downloads),
  component: DownloadsPage,
});

function DownloadsPage() {
  const search = Route.useSearch();
  const active = search.product;

  useEffect(() => {
    if (!active) return;
    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    document.getElementById(active)?.scrollIntoView({
      behavior: reduce ? "auto" : "smooth",
      block: "start",
    });
  }, [active]);

  return (
    <SiteShell>
      <Section
        headingAs="h1"
        eyebrow="Download center"
        title="Get the apps that exist. Nothing invented."
        lede="Open a web app when the origin is public. Android and iOS buttons stay Coming soon until a real listing or APK is configured. Admissions and Careers are Connect portals. Nexus is not listed here — it is for groups and operators."
      >
        <nav className="home-role-tabs mb-10" aria-label="Products">
          {DOWNLOAD_LIST.map((channel) => (
            <Link
              key={channel.id}
              to="/downloads"
              search={{ product: channel.id }}
              aria-current={channel.id === active ? "page" : undefined}
              className={cn("site-product-nav__item")}
            >
              {PRODUCT_FAMILY[channel.id].shortName}
            </Link>
          ))}
        </nav>

        <div className="grid gap-4">
          {DOWNLOAD_LIST.map((channel) => (
            <DownloadProduct
              key={channel.id}
              id={channel.id}
              highlighted={channel.id === active}
            />
          ))}
        </div>

        <div className="mt-10 max-w-2xl space-y-3 text-sm text-muted-foreground">
          <p>
            Android 8 or later when an APK or Play listing ships. Use a current Chrome or Edge for the web apps.
            Login details are issued by your institute office — not published on this website.
          </p>
          <p>
            Store and APK links are configuration. When a public URL exists, it appears on this page automatically.
            We do not invent Google Play, App Store, or version numbers.
          </p>
        </div>
      </Section>
      <GetStartedCTA
        title="Need access for the institute?"
        body="A 60-day trial starts after verification. Downloads here do not create an account."
      />
    </SiteShell>
  );
}
