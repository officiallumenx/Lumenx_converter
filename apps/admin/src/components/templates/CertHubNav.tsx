import { Link } from "@tanstack/react-router";
import { IconChip } from "@/components/IconChip";
import {
  CERT_HUB_PRIMARY_NAV,
  type CertHubView,
} from "@/lib/certificates/cert-hub-views";
import { FileCheck2, LayoutTemplate } from "lucide-react";

const ICONS: Record<CertHubView, typeof LayoutTemplate> = {
  templates: LayoutTemplate,
  published: FileCheck2,
};

export function CertHubNav({ active }: { active: CertHubView }) {
  return (
    <div className="mb-3 sm:mb-6 relative">
      <div className="-mx-1 px-1 overflow-x-auto lx-sidebar-scroll">
        <div className="lx-module-hub-nav flex gap-0.5 p-1 min-w-max rounded-xl border border-border bg-card">
          {CERT_HUB_PRIMARY_NAV.map(({ view, label, short }) => {
            const Icon = ICONS[view];
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
                <span className="hidden lg:inline">{label}</span>
                <span className="lg:hidden text-[10px]">{short}</span>
              </Link>
            );
          })}
        </div>
      </div>
    </div>
  );
}
