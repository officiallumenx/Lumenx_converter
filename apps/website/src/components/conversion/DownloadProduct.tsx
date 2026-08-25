import { lazy, Suspense } from "react";
import { cn } from "@lumenx/ui";
import type { ProductId } from "@/theme/products";
import {
  DOWNLOADS,
  androidButtonLabel,
  androidHref,
  downloadTitle,
  iosButtonLabel,
  iosHref,
  platformStateLabel,
  qrHref,
  releaseLabel,
  webButtonLabel,
} from "@/content/downloads";
import { isDemoExploreId } from "@/content/demos";
import { ProductMark } from "../product/ProductMark";
import { CTAButton } from "./CTAButton";
import { DemoCTA } from "./DemoCTA";
import { SiteCard } from "../SiteCard";

const DownloadQr = lazy(() => import("./DownloadQr").then((m) => ({ default: m.DownloadQr })));

const PLATFORM_ORDER = ["web", "android", "ios"] as const;

export function DownloadProduct({
  id,
  compact = false,
  highlighted = false,
}: {
  id: ProductId;
  compact?: boolean;
  highlighted?: boolean;
}) {
  const channel = DOWNLOADS[id];
  const web = channel.webUrl;
  const android = androidHref(channel);
  const ios = iosHref(channel);
  const qr = compact ? null : qrHref(channel);
  const version = channel.version;
  const state = releaseLabel(channel);

  return (
    <SiteCard
      id={id}
      product={id}
      className={cn("scroll-mt-28", highlighted && "download-product--active")}
    >
      <div className={cn("grid gap-6", !compact && qr ? "lg:grid-cols-[minmax(0,1fr)_10.5rem]" : "")}>
        <div>
          <div className="flex flex-wrap items-start gap-3">
            <ProductMark product={id} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-semibold tracking-tight">{downloadTitle(id)}</h2>
                <span className="download-state">{state}</span>
              </div>
              {version ? (
                <p className="mt-1 text-xs text-muted-foreground">Version {version}</p>
              ) : null}
            </div>
          </div>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-muted-foreground">
            {compact ? channel.webNote : channel.description}
          </p>

          <dl className="download-platforms mt-5">
            {PLATFORM_ORDER.map((key) => {
              const offer = channel.platforms[key];
              const href = key === "web" ? web : key === "android" ? android : ios;
              return (
                <div key={key} className="download-platform">
                  <dt>{key === "ios" ? "iOS" : key === "web" ? "Web" : "Android"}</dt>
                  <dd>{platformStateLabel(offer, href)}</dd>
                </div>
              );
            })}
          </dl>

          <div className="mt-5 flex flex-wrap gap-2">
            {web ? (
              <CTAButton asChild size="md">
                <a href={web} target="_blank" rel="noreferrer">
                  {webButtonLabel(channel)}
                </a>
              </CTAButton>
            ) : isDemoExploreId(id) ? (
              <>
                <CTAButton type="button" size="md" disabled>
                  Coming soon
                </CTAButton>
                <DemoCTA product={id} variant="ghost">
                  Preview
                </DemoCTA>
              </>
            ) : null}

            <PlatformButton href={android} label={androidButtonLabel(channel)} />
            <PlatformButton href={ios} label={iosButtonLabel(channel)} />
          </div>
        </div>

        {qr ? (
          <Suspense fallback={<div className="download-qr min-h-[10.5rem]" aria-hidden />}>
            <DownloadQr value={qr} label="Scan to open" />
          </Suspense>
        ) : null}
      </div>
    </SiteCard>
  );
}

function PlatformButton({
  href,
  label,
}: {
  href: string | null;
  label: string;
}) {
  if (href) {
    return (
      <CTAButton asChild variant="secondary" size="md">
        <a href={href} target="_blank" rel="noreferrer">
          {label}
        </a>
      </CTAButton>
    );
  }
  return (
    <CTAButton type="button" variant="secondary" size="md" disabled>
      {label}
    </CTAButton>
  );
}
