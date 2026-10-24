import { useState } from "react";
import { cn } from "@lumenx/ui";
import type { ProductId } from "@/theme/products";
import type { ProductDevice, ProductPreviewTab } from "@/content/product-pages";
import { cycleTabKey, useTabFocus } from "@/components/home/tabKeys";
import { DeviceMockup } from "../visual/DeviceMockup";
import { BrowserMockup } from "../visual/BrowserMockup";
import { LaptopMockup } from "../visual/LaptopMockup";
import { PhoneMockup } from "../visual/PhoneMockup";
import { PreviewPanel } from "./previews";

function PreviewShot({
  src,
  alt,
}: {
  src: string;
  alt: string;
}) {
  const [failed, setFailed] = useState(false);
  if (failed) {
    return (
      <div className="site-preview-shot-fallback" role="img" aria-label={`${alt} preview unavailable`}>
        <p className="text-sm font-medium text-foreground">Preview unavailable</p>
        <p className="mt-1 text-xs text-muted-foreground">The screenshot could not be loaded.</p>
      </div>
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      className="block h-auto w-full object-cover object-top"
      loading="eager"
      decoding="async"
      onError={() => setFailed(true)}
    />
  );
}

export function ProductPreview({
  product,
  tabs,
  device = "phone",
  interactiveChild = false,
  compact = false,
}: {
  product: ProductId;
  tabs: readonly ProductPreviewTab[];
  device?: ProductDevice;
  interactiveChild?: boolean;
  compact?: boolean;
}) {
  const realTabs = tabs.filter((tab) => Boolean(tab.image));
  const visibleTabs = realTabs.length > 0 ? realTabs : [];
  const [active, setActive] = useState(visibleTabs[0]?.id ?? "");
  const [child, setChild] = useState("Aanya");
  const ids = visibleTabs.map((tab) => tab.id);
  const { setRef, focus } = useTabFocus<string>();
  const current = visibleTabs.find((tab) => tab.id === active) ?? visibleTabs[0];
  if (!current) return null;

  const isDesktop = device === "browser";

  return (
    <div data-product={product} className="site-product-preview">
      <div
        className="site-preview-tabs mb-2"
        role="tablist"
        aria-label="Product preview"
        onKeyDown={(event) => cycleTabKey(event, ids, current.id, setActive, focus)}
      >
        {visibleTabs.map((tab) => (
          <button
            key={tab.id}
            ref={setRef(tab.id)}
            type="button"
            role="tab"
            id={`preview-tab-${product}-${tab.id}`}
            aria-selected={tab.id === current.id}
            aria-controls={`preview-panel-${product}`}
            tabIndex={tab.id === current.id ? 0 : -1}
            className={cn("site-preview-tab", tab.id === current.id && "site-preview-tab--active")}
            onClick={() => setActive(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div
        id={`preview-panel-${product}`}
        role="tabpanel"
        aria-labelledby={`preview-tab-${product}-${current.id}`}
        className="site-crossfade"
        key={current.id}
      >
        {current.image ? (
          isDesktop ? (
            <LaptopMockup title="Product preview" className="site-laptop--hero">
              <PreviewShot src={current.image} alt={current.label} />
            </LaptopMockup>
          ) : (
            <PhoneMockup title="Product preview" compact={compact}>
              <PreviewShot src={current.image} alt={current.label} />
            </PhoneMockup>
          )
        ) : isDesktop ? (
          <BrowserMockup title="Product preview">
            <PreviewPanel id={current.panel} child={child} onChild={interactiveChild ? setChild : undefined} />
          </BrowserMockup>
        ) : (
          <DeviceMockup device={device} title="Product preview" compact={compact}>
            <PreviewPanel id={current.panel} child={child} onChild={interactiveChild ? setChild : undefined} />
          </DeviceMockup>
        )}
      </div>
    </div>
  );
}
