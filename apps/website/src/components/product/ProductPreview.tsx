import { useState } from "react";
import { cn } from "@lumenx/ui";
import type { ProductId } from "@/theme/products";
import type { ProductDevice, ProductPreviewTab } from "@/content/product-pages";
import { cycleTabKey, useTabFocus } from "@/components/home/tabKeys";
import { DeviceMockup } from "../visual/DeviceMockup";
import { BrowserMockup } from "../visual/BrowserMockup";
import { PreviewPanel } from "./previews";

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
  const [active, setActive] = useState(tabs[0]?.id ?? "");
  const [child, setChild] = useState("Aanya");
  const ids = tabs.map((tab) => tab.id);
  const { setRef, focus } = useTabFocus<string>();
  const current = tabs.find((tab) => tab.id === active) ?? tabs[0];
  if (!current) return null;

  const body = (
    <div key={current.id} className="site-crossfade">
      <PreviewPanel
        id={current.panel}
        child={child}
        onChild={interactiveChild ? setChild : undefined}
      />
    </div>
  );

  return (
    <div data-product={product}>
      <div
        className="mb-3 flex flex-wrap gap-2"
        role="tablist"
        aria-label="Product preview"
        onKeyDown={(event) => cycleTabKey(event, ids, current.id, setActive, focus)}
      >
        {tabs.map((tab) => (
          <button
            key={tab.id}
            ref={setRef(tab.id)}
            type="button"
            role="tab"
            id={`preview-tab-${product}-${tab.id}`}
            aria-selected={tab.id === current.id}
            aria-controls={`preview-panel-${product}`}
            tabIndex={tab.id === current.id ? 0 : -1}
            className={cn(
              "min-h-10 rounded-full px-3 text-sm",
              tab.id === current.id ? "bg-foreground text-background" : "bg-muted hover:bg-muted/80",
            )}
            onClick={() => setActive(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      <div id={`preview-panel-${product}`} role="tabpanel" aria-labelledby={`preview-tab-${product}-${current.id}`}>
        {device === "browser" ? (
          <BrowserMockup title="Interactive preview">{body}</BrowserMockup>
        ) : (
          <DeviceMockup device={device} title="Interactive preview" compact={compact}>
            {body}
          </DeviceMockup>
        )}
      </div>
    </div>
  );
}
