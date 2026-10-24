import { lazy, Suspense } from "react";
import { Button, cn } from "@lumenx/ui";
import type { ProductId } from "@/theme/products";
import {
  DOWNLOADS,
  androidButtonLabel,
  androidHref,
  desktopButtonLabel,
  desktopHref,
  downloadTitle,
  platformStateLabel,
  qrHref,
  releaseLabel,
  webButtonLabel,
} from "@/content/downloads";
import { ProductMark } from "../product/ProductMark";
import { CTAButton } from "./CTAButton";
import { SiteCard } from "../SiteCard";

const DownloadQr = lazy(() => import("./DownloadQr").then((m) => ({ default: m.DownloadQr })));

const PLATFORM_ORDER = ["web", "android", "desktop"] as const;

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
  const desktop = desktopHref(channel);
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
              if (offer === "not-offered") return null;
              const href = key === "web" ? web : key === "android" ? android : desktop;
              const label = key === "web" ? "Web" : key === "desktop" ? "Windows" : "Android";
              const statusText = platformStateLabel(offer, href);
              const statusKind = href ? "live" : "pending";
              return (
                <div
                  key={key}
                  className={cn(
                    "download-platform",
                    key === "web" && href && "download-platform--link",
                  )}
                >
                  <dt>{label}</dt>
                  <dd data-status={statusKind}>{statusText}</dd>
                  {key === "web" && href ? (
                    <a
                      href={href}
                      className="download-platform__hit"
                      aria-label={`Open ${downloadTitle(id)} on the web`}
                    />
                  ) : null}
                </div>
              );
            })}
          </dl>

          <div className="mt-5 flex flex-wrap gap-2">
            {channel.platforms.web !== "not-offered" && web ? (
              <Button asChild className="font-semibold">
                <a href={web}>{webButtonLabel(channel)}</a>
              </Button>
            ) : null}

            {channel.platforms.android !== "not-offered" ? (
              android ? (
                <CTAButton asChild variant="secondary" size="md">
                  <a href={android} download>
                    {androidButtonLabel(channel)}
                  </a>
                </CTAButton>
              ) : (
                <CTAButton type="button" variant="secondary" size="md" disabled>
                  {androidButtonLabel(channel)}
                </CTAButton>
              )
            ) : null}

            {channel.platforms.desktop !== "not-offered" ? (
              desktop ? (
                <CTAButton asChild variant="secondary" size="md">
                  <a href={desktop} download>
                    {desktopButtonLabel(channel)}
                  </a>
                </CTAButton>
              ) : (
                <CTAButton type="button" variant="secondary" size="md" disabled>
                  {desktopButtonLabel(channel)}
                </CTAButton>
              )
            ) : null}
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
