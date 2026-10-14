import { IconChip } from "@/components/IconChip";
import { Link } from "@tanstack/react-router";
import {
  CERT_HUB_PRIMARY_NAV,
  type CertHubView,
} from "@/lib/certificates/cert-hub-views";
import {
  Award,
  FileCheck2,
  LayoutDashboard,
  LayoutTemplate,
  ShieldCheck,
  Wand2,
} from "lucide-react";

const ICONS: Record<CertHubView, typeof LayoutDashboard> = {
  overview: LayoutDashboard,
  templates: LayoutTemplate,
  issue: Wand2,
  issued: FileCheck2,
  verify: ShieldCheck,
};

/** @deprecated Use CertHubNav instead. Kept for backward compatibility. */
export function TemplateHubNav({
  active,
  compact = false,
}: {
  active: CertHubView;
  compact?: boolean;
}) {
  return (
    <div className={`${compact ? "mb-2" : "mb-3 sm:mb-6"} -mx-1 px-1 overflow-x-auto lx-sidebar-scroll`}>
      <div className="lx-module-hub-nav flex gap-0.5 p-1 min-w-max rounded-xl border border-border bg-card">
        {CERT_HUB_PRIMARY_NAV.map(({ view, label, short }) => {
          const Icon = ICONS[view] ?? Award;
          const isActive = active === view;
          return (
            <Link
              key={view}
              to="/templates"
              search={{ view }}
              title={label}
              aria-current={isActive ? "page" : undefined}
              className={`group inline-flex items-center gap-1.5 px-2.5 sm:px-3 h-8 rounded-lg text-[11px] font-medium whitespace-nowrap transition-colors duration-150 ${
                isActive
                  ? "bg-muted/70 text-foreground border border-border shadow-xs"
                  : "border border-transparent text-muted-foreground hover:text-foreground hover:bg-surface-hover"
              }`}
            >
              <IconChip
                icon={Icon}
                size="xs"
                variant={isActive ? "brand" : "soft"}
                active={isActive}
              />
              <span className="hidden sm:inline">{label}</span>
              <span className="sm:hidden">{short}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
