import { useMemo, useState } from "react";
import { cn } from "@lumenx/ui";
import { PRODUCTS, PRODUCT_LIST, type ProductSlug } from "@/content/products";
import { DeviceMockup } from "./visual/DeviceMockup";
import { ProductNavigation } from "./navigation/ProductNavigation";
import {
  AdminAttendance,
  AdminCommand,
  AdminPeople,
  ConnectAttendance,
  ConnectFees,
  ConnectHome,
  NexusInstitutes,
  NexusModules,
  NexusSub,
  TransportBoarding,
  TransportStops,
  TransportTrip,
} from "./product/previews";

const TABS: Record<ProductSlug, string[]> = {
  admin: ["Command", "People", "Attendance"],
  connect: ["Home", "Attendance", "Fees"],
  transport: ["Trip", "Stops", "Boarding"],
  nexus: ["Institutes", "Subscription", "Modules"],
};

function StageBody({
  product,
  tab,
  child,
  onChild,
}: {
  product: ProductSlug;
  tab: string;
  child: string;
  onChild: (v: string) => void;
}) {
  if (product === "admin" && tab === "Command") return <AdminCommand />;
  if (product === "admin" && tab === "People") return <AdminPeople />;
  if (product === "admin") return <AdminAttendance />;
  if (product === "connect" && tab === "Home") return <ConnectHome child={child} onChild={onChild} />;
  if (product === "connect" && tab === "Attendance") return <ConnectAttendance />;
  if (product === "connect") return <ConnectFees />;
  if (product === "transport" && tab === "Trip") return <TransportTrip />;
  if (product === "transport" && tab === "Stops") return <TransportStops />;
  if (product === "transport") return <TransportBoarding />;
  if (product === "nexus" && tab === "Institutes") return <NexusInstitutes />;
  if (product === "nexus" && tab === "Subscription") return <NexusSub />;
  return <NexusModules />;
}

export function DemoStage({
  product,
  onProductChange,
  compact = false,
}: {
  product: ProductSlug;
  onProductChange?: (slug: ProductSlug) => void;
  compact?: boolean;
}) {
  const meta = PRODUCTS[product];
  const tabs = TABS[product];
  const [tab, setTab] = useState(tabs[0]);
  const [child, setChild] = useState("Aanya");
  const activeTab = tabs.includes(tab) ? tab : tabs[0];

  const label = useMemo(() => `${meta.name} · ${activeTab}`, [meta.name, activeTab]);

  return (
    <div className={cn("grid gap-6", compact ? "" : "lg:grid-cols-[14rem_1fr]")}>
      {onProductChange && !compact ? (
        <ProductNavigation
          stacked
          products={PRODUCT_LIST.map((p) => ({ id: p.slug, label: p.shortName }))}
          active={product}
          onSelect={(id) => {
            if (!PRODUCT_LIST.some((p) => p.slug === id)) return;
            const slug = id as ProductSlug;
            onProductChange(slug);
            setTab(TABS[slug][0]);
          }}
        />
      ) : null}
      <div>
        <p className="sr-only" aria-live="polite">
          Showing {label}
        </p>
        <div className="mb-3 flex flex-wrap gap-2" role="tablist" aria-label={`${meta.shortName} panels`}>
          {tabs.map((t) => (
            <button
              key={t}
              type="button"
              role="tab"
              aria-selected={t === activeTab}
              className={cn(
                "min-h-10 rounded-full px-3 text-sm transition-colors duration-200",
                t === activeTab ? "bg-foreground text-background" : "bg-muted hover:bg-muted/80",
              )}
              onClick={() => setTab(t)}
            >
              {t}
            </button>
          ))}
        </div>
        <DeviceMockup device={meta.device} title="Interactive preview">
          <div key={`${product}-${activeTab}`} className="site-crossfade">
            <StageBody product={product} tab={activeTab} child={child} onChild={setChild} />
          </div>
        </DeviceMockup>
      </div>
    </div>
  );
}
